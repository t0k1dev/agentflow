// @ts-nocheck - Deno runtime (Supabase Edge Functions)
// Chat Edge Function — handles all agent conversations
// Used by: playground, embeddable widget, test links

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { retrieveContext, formatContextForPrompt } from "../_shared/retrieval.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple in-memory rate limiter: max 20 messages per minute per session
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 20) {
    return false;
  }

  entry.count++;
  return true;
}

// Periodically clean up expired rate limit entries to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60_000);

function errorResponse(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    // Parse request body
    const body = await req.json();
    const {
      agent_public_key,
      message,
      session_id,
      source,
      test_link_id,
    } = body;

    // Validate required fields
    if (!agent_public_key || typeof agent_public_key !== "string") {
      return errorResponse(400, "agent_public_key is required");
    }
    if (!message || typeof message !== "string") {
      return errorResponse(400, "message is required");
    }
    if (!session_id || typeof session_id !== "string") {
      return errorResponse(400, "session_id is required");
    }
    if (!source || !["playground", "widget", "test_link"].includes(source)) {
      return errorResponse(400, "source must be one of: playground, widget, test_link");
    }

    // Rate limiting
    if (!checkRateLimit(session_id)) {
      return errorResponse(429, "Rate limit exceeded. Please wait before sending more messages.");
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Step 1: Look up the agent by public_key ──
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("public_key", agent_public_key)
      .single();

    if (agentError || !agent) {
      return errorResponse(404, "Agent not found");
    }

    if (!agent.is_active) {
      return errorResponse(403, "This agent is currently inactive");
    }

    // ── Step 2: Get or create conversation ──
    let conversationId: string;

    const { data: existingConvo } = await supabase
      .from("conversations")
      .select("id")
      .eq("session_id", session_id)
      .eq("agent_id", agent.id)
      .single();

    if (existingConvo) {
      conversationId = existingConvo.id;
    } else {
      const insertData: Record<string, unknown> = {
        agent_id: agent.id,
        session_id,
        source,
      };
      if (source === "test_link" && test_link_id) {
        insertData.test_link_id = test_link_id;
      }

      const { data: newConvo, error: convoError } = await supabase
        .from("conversations")
        .insert(insertData)
        .select("id")
        .single();

      if (convoError || !newConvo) {
        console.error("Failed to create conversation:", convoError);
        return errorResponse(500, "Failed to create conversation");
      }
      conversationId = newConvo.id;
    }

    // ── Step 3: Save user message ──
    const { error: userMsgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
      });

    if (userMsgError) {
      console.error("Failed to save user message:", userMsgError);
    }

    // ── Step 4: RAG retrieval ──
    let ragContext = "";
    try {
      const chunks = await retrieveContext(supabase, message, agent.id, 5, 0.7);
      ragContext = formatContextForPrompt(chunks);
    } catch (ragError) {
      console.error("RAG retrieval error (continuing without context):", ragError);
    }

    // ── Step 5: Build the prompt ──
    // System message: personality + RAG context
    let systemContent = agent.personality || "You are a helpful AI assistant.";
    if (ragContext) {
      systemContent += ragContext;
    }

    // Fetch conversation history (last 20 messages)
    const { data: historyMessages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build OpenAI messages array
    const openAIMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemContent },
    ];

    // Add conversation history (excludes the just-inserted user message since
    // we already have it, but the DB query will include it — that's fine,
    // it'll be the last message in history which is the current user message)
    if (historyMessages && historyMessages.length > 0) {
      for (const msg of historyMessages) {
        if (msg.role === "user" || msg.role === "assistant") {
          openAIMessages.push({ role: msg.role, content: msg.content });
        }
      }
    } else {
      // If no history found (shouldn't happen since we just inserted), add current message
      openAIMessages.push({ role: "user", content: message });
    }

    // ── Step 6: Call OpenAI with streaming ──
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent.model || "gpt-4o-mini",
        messages: openAIMessages,
        temperature: agent.temperature ?? 0.7,
        max_tokens: agent.max_tokens ?? 1024,
        stream: true,
      }),
    });

    if (!openAIResponse.ok) {
      const errText = await openAIResponse.text();
      console.error(`OpenAI API error (${openAIResponse.status}):`, errText);
      return errorResponse(500, "I'm having trouble responding right now. Please try again.");
    }

    // ── Step 7: Stream response via SSE ──
    let fullResponse = "";
    let promptTokens = 0;
    let completionTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openAIResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                // Send done event
                controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                const finishReason = parsed.choices?.[0]?.finish_reason;

                if (delta?.content) {
                  fullResponse += delta.content;
                  // Forward the SSE event to the client
                  const sseEvent = `data: ${JSON.stringify({ content: delta.content })}\n\n`;
                  controller.enqueue(new TextEncoder().encode(sseEvent));
                }

                // Capture usage info from the final chunk (some models include it)
                if (parsed.usage) {
                  promptTokens = parsed.usage.prompt_tokens || 0;
                  completionTokens = parsed.usage.completion_tokens || 0;
                }
              } catch {
                // Skip unparseable chunks
              }
            }
          }
        } catch (streamError) {
          console.error("Stream processing error:", streamError);
          const errorEvent = `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
        } finally {
          // ── Step 8: Save assistant message after streaming completes ──
          try {
            if (fullResponse) {
              const totalTokens = promptTokens + completionTokens;
              await supabase
                .from("messages")
                .insert({
                  conversation_id: conversationId,
                  role: "assistant",
                  content: fullResponse,
                  token_usage: totalTokens > 0 ? totalTokens : null,
                });

              // Update conversation updated_at
              await supabase
                .from("conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", conversationId);
            }
          } catch (saveError) {
            console.error("Failed to save assistant message:", saveError);
          }

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat function error:", err);
    return errorResponse(500, "I'm having trouble responding right now. Please try again.");
  }
});
