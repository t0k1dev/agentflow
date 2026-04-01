// @ts-nocheck - Deno runtime (Supabase Edge Functions)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CHUNK_SIZE = 500; // ~500 tokens
const CHUNK_OVERLAP = 50; // ~50 token overlap
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 100;

interface EmbedRequest {
  knowledge_base_item_id: string;
  agent_id: string;
}

// Simple token estimator (~4 chars per token for English text)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Split text into chunks at sentence/paragraph boundaries
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^.!?]+[.!?]+\s*/g) || [paragraph];

    for (const sentence of sentences) {
      const combined = currentChunk + (currentChunk ? " " : "") + sentence.trim();
      const tokens = estimateTokens(combined);

      if (tokens > CHUNK_SIZE && currentChunk) {
        chunks.push(currentChunk.trim());

        // Create overlap from the end of the current chunk
        const words = currentChunk.trim().split(/\s+/);
        const overlapWords = words.slice(-Math.ceil(CHUNK_OVERLAP * 4 / 5)); // ~50 tokens of words
        currentChunk = overlapWords.join(" ") + " " + sentence.trim();
      } else {
        currentChunk = combined;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If no chunks were created (very short text), use the full text
  if (chunks.length === 0 && text.trim()) {
    chunks.push(text.trim());
  }

  return chunks;
}

// Generate embeddings via OpenAI in batches
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const embeddings = data.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.embedding);

    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

// Extract text from file content based on type
function extractTextFromFile(content: string, _fileName: string): string {
  // For TXT, MD, CSV — the content is already plain text
  // PDF parsing would require a library; for now we handle text-based formats
  return content;
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { knowledge_base_item_id, agent_id }: EmbedRequest = await req.json();

    if (!knowledge_base_item_id || !agent_id) {
      return new Response(
        JSON.stringify({ error: "knowledge_base_item_id and agent_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Retrieve the KB item
    const { data: kbItem, error: kbError } = await supabase
      .from("knowledge_base_items")
      .select("*")
      .eq("id", knowledge_base_item_id)
      .single();

    if (kbError || !kbItem) {
      return new Response(
        JSON.stringify({ error: "Knowledge base item not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Extract text
    let text = "";

    if (kbItem.source_type === "text") {
      text = kbItem.content || "";
    } else if (kbItem.source_type === "document") {
      if (!kbItem.file_path) {
        return new Response(
          JSON.stringify({ error: "Document has no file path" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ext = kbItem.file_path.split(".").pop()?.toLowerCase() || "";

      if (ext === "pdf") {
        // For PDF, we attempt to download and parse
        // Note: In production, use a proper PDF parser. For now, we download as text.
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("documents")
          .download(kbItem.file_path);

        if (downloadError || !fileData) {
          return new Response(
            JSON.stringify({ error: `Failed to download file: ${downloadError?.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // For PDF files, attempt to extract text
        // pdf-parse is not available in Deno, so we use a basic approach
        // In production, consider using a dedicated PDF extraction service
        try {
          text = await fileData.text();
        } catch {
          return new Response(
            JSON.stringify({ error: "Failed to extract text from PDF. Consider converting to TXT format." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (["txt", "md", "csv"].includes(ext)) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("documents")
          .download(kbItem.file_path);

        if (downloadError || !fileData) {
          return new Response(
            JSON.stringify({ error: `Failed to download file: ${downloadError?.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        text = await fileData.text();
      } else {
        return new Response(
          JSON.stringify({ error: `Unsupported file type: .${ext}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported source type: ${kbItem.source_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!text.trim()) {
      return new Response(
        JSON.stringify({ error: "Document is empty or contains no extractable text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Chunk the text
    const chunks = chunkText(text);

    // Step 4: Generate embeddings
    const embeddings = await generateEmbeddings(chunks);

    // Step 5: Delete existing chunks for this KB item (supports re-processing)
    await supabase
      .from("document_chunks")
      .delete()
      .eq("knowledge_base_item_id", knowledge_base_item_id);

    // Step 6: Store chunks with embeddings
    const chunkRecords = chunks.map((content, index) => ({
      knowledge_base_item_id,
      agent_id,
      content,
      embedding: JSON.stringify(embeddings[index]),
      chunk_index: index,
    }));

    // Insert in batches of 50 to avoid payload limits
    const BATCH_SIZE = 50;
    let totalInserted = 0;

    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(batch);

      if (insertError) {
        return new Response(
          JSON.stringify({
            error: `Failed to store chunks: ${insertError.message}`,
            chunks_stored: totalInserted,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      totalInserted += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        knowledge_base_item_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Embed function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
