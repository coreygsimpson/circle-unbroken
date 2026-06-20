/**
 * GET /api/stream/:uid/status
 * Returns the current processing state of a Cloudflare Stream video.
 * Relevant fields: result.status.state ("inprogress" | "ready" | "error")
 */
export async function onRequestGet(context) {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN } = context.env
  const { uid } = context.params

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    {
      headers: { Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}` },
    }
  )

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
