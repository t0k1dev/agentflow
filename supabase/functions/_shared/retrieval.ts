// @ts-nocheck - Deno runtime (Supabase Edge Functions)
// Shared RAG retrieval utility for Supabase Edge Functions
// Used by the chat function to find relevant knowledge base chunks

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const EMBEDDING_MODEL = "text-embedding-3-small";

export interface RetrievedChunk {
  id: string;
  content: string;
  similarity: number;
}

/**
 * Generate an embedding for a single text string using OpenAI.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI embedding error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Retrieve the most relevant knowledge base chunks for a user message.
 *
 * 1. Embeds the user message via OpenAI text-embedding-3-small
 * 2. Calls the match_documents Postgres function (pgvector cosine similarity)
 * 3. Returns ranked chunks
 *
 * @param supabase - Supabase client (should use service role key)
 * @param userMessage - The user's message to find relevant context for
 * @param agentId - The agent whose knowledge base to search
 * @param matchCount - Maximum number of chunks to return (default: 5)
 * @param matchThreshold - Minimum similarity score 0-1 (default: 0.7)
 */
export async function retrieveContext(
  supabase: SupabaseClient,
  userMessage: string,
  agentId: string,
  matchCount: number = 5,
  matchThreshold: number = 0.7
): Promise<RetrievedChunk[]> {
  // Step 1: Embed the user message
  const queryEmbedding = await embedText(userMessage);

  // Step 2: Call match_documents RPC
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_agent_id: agentId,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });

  if (error) {
    console.error("match_documents RPC error:", error);
    // Return empty results instead of throwing — chat should still work without RAG
    return [];
  }

  return (data || []) as RetrievedChunk[];
}

/**
 * Format retrieved chunks into a context string for injection into the system prompt.
 *
 * @param chunks - The retrieved chunks from retrieveContext()
 * @returns A formatted context string, or empty string if no chunks
 */
export function formatContextForPrompt(chunks: RetrievedChunk[]): string {
  if (!chunks || chunks.length === 0) {
    return "";
  }

  const contextParts = chunks.map(
    (chunk, i) => `[${i + 1}] ${chunk.content}`
  );

  return `\n\nRelevant knowledge base context:\n${contextParts.join("\n\n")}`;
}
