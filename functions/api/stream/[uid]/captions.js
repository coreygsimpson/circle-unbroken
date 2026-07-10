/**
 * POST /api/stream/:uid/captions
 * Enables Cloudflare Stream auto-generated captions (English) for a video.
 * Call this once after the video reaches "ready" state.
 */
export async function onRequestPost(context) {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN } = context.env
  const { uid } = context.params

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}/captions/en`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auto_generated: true }),
    }
  )

  const data = await response.json()
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
