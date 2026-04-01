-- ============================================
-- match_documents function for RAG retrieval
-- ============================================
-- Finds the most relevant document chunks for a given query embedding
-- using cosine similarity search via pgvector.
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding VECTOR(1536),
  match_agent_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    document_chunks.id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks
  WHERE document_chunks.agent_id = match_agent_id
    AND 1 - (document_chunks.embedding <=> query_embedding) >= match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;
