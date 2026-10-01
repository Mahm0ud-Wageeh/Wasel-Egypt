export type AiPayloadMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

export function buildAiChatPayload(
  messages: AiPayloadMessage[],
  language: 'ar' | 'en',
  coords?: { lat: number; lng: number },
) {
  const payload: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    language: 'ar' | 'en'
    lat?: number
    lng?: number
  } = {
    messages: messages
      .filter((message) => message.content.trim() !== '')
      .map(({ role, content }) => ({ role, content })),
    language,
  }

  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
    payload.lat = coords.lat
    payload.lng = coords.lng
  }

  return payload
}