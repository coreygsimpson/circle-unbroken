/**
 * POST /api/stream/:uid/audio
 * Triggers M4A audio extraction for a Cloudflare Stream video.
 * Returns { result: { audio: { status, url, percentComplete } } }
 *
 * GET /api/stream/:uid/audio
 * Polls the extraction status. Check result.audio.status === "ready".
 */
export async function onRequestPost(context) {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN } = context.env
  const { uid } = context.params

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}/downloads/audio`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}` },
    }
  )

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function onRequestGet(context) {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN } = context.env
  const { uid } = context.params

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}/downloads`,
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
