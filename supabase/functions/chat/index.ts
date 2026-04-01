// @ts-nocheck - Deno runtime (Supabase Edge Functions)
// TODO: Implement full chat endpoint (issue #14)
// This placeholder shows how RAG retrieval will be integrated.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { retrieveContext, formatContextForPrompt } from "../_shared/retrieval.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Placeholder — full implementation in issue #14
  // The chat function will:
  // 1. Receive { agent_id, message, conversation_id? }
  // 2. Load agent config (personality, model, temperature, etc.)
  // 3. Retrieve relevant KB chunks via retrieveContext()
  // 4. Build messages array with system prompt + RAG context + conversation history
  // 5. Call OpenAI Chat Completions API
  // 6. Store message & response in the messages table
  // 7. Return the assistant's response

  return new Response(
    JSON.stringify({ message: "Chat endpoint placeholder — see issue #14" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
