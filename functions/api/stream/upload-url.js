/**
 * POST /api/stream/upload-url
 * Returns a one-time TUS upload URL from Cloudflare Stream.
 * Keeps the API token server-side.
 *
 * Body: { name: string, maxDurationSeconds?: number }
 */
export async function onRequestPost(context) {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN } = context.env

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_STREAM_API_TOKEN) {
    return new Response(JSON.stringify({ error: 'Stream API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await context.request.json().catch(() => ({}))
  const { name = 'study-video', maxDurationSeconds = 7200 } = body

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds,
        meta: { name },
        requireSignedURLs: false,
      }),
    }
  )

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
