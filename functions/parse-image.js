export async function onRequestPost(context) {
  const { request, env } = context

  const apiKey = env.CLAUDE_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'API key no configurada en Cloudflare' }, { status: 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'JSON inválido en el body' }, { status: 400 })
  }

  const { image, mimeType = 'image/jpeg' } = body
  if (!image) {
    return Response.json({ error: 'Falta el campo image (base64)' }, { status: 400 })
  }

  const prompt = `Extract swimming competition data from this Meet Mobile app screenshot and return ONLY valid JSON:
{
  "torneo": "tournament name",
  "prueba": "100m Mariposa",
  "fecha": "2025-12-20",
  "puesto": 1,
  "pileta": null,
  "tiempoFinal": 63.16,
  "parciales": [12.73, 28.45, 44.78, 63.16]
}
Rules:
- prueba: distance in meters + stroke in Spanish (Libre/Mariposa/Espalda/Pecho/Combinado). Example: "Hombres 100 Metro Mariposa" → "100m Mariposa"
- fecha: ISO YYYY-MM-DD from the date shown
- puesto: use PLACE (final place), not HEAT PLACE
- pileta: "25m" or "50m" or null if not visible
- tiempoFinal: FINALS time in decimal seconds. Example: "1:03.16" → 63.16
- parciales: cumulative split times in seconds including the final (last value = tiempoFinal). In the splits table the smaller number under each lap time is the cumulative — use those. Empty array if no splits visible.
- Missing text fields → empty string. Missing numbers → 0.
Return ONLY the JSON object, no markdown, no explanation.`

  let claudeRes
  try {
    claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: image },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })
  } catch {
    return Response.json({ error: 'Error conectando con Claude API' }, { status: 502 })
  }

  if (!claudeRes.ok) {
    const errText = await claudeRes.text()
    return Response.json({ error: `Claude API error ${claudeRes.status}: ${errText}` }, { status: 502 })
  }

  const claudeData = await claudeRes.json()
  const text = claudeData.content?.[0]?.text ?? ''

  let parsed
  try {
    const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    return Response.json({ error: 'No se pudo interpretar la respuesta', raw: text }, { status: 422 })
  }

  return Response.json(parsed)
}
