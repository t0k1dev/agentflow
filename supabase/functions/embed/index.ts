// @ts-nocheck - Deno runtime (Supabase Edge Functions)
// TODO: Implement document embedding pipeline (issue #12)

Deno.serve(async (req: Request) => {
  return new Response(JSON.stringify({ message: 'Embed endpoint placeholder' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
