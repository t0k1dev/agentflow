// @ts-nocheck - Deno runtime (Supabase Edge Functions)
// TODO: Implement chat endpoint (issue #14)

Deno.serve(async (req: Request) => {
  return new Response(JSON.stringify({ message: 'Chat endpoint placeholder' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
