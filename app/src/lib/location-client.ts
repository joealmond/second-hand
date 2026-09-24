export async function detectCity(): Promise<string> {
  const response = await fetch('/api/location', { headers: { Accept: 'application/json' } })
  if (!response.ok) return ''
  const result = (await response.json()) as { city?: unknown }
  return typeof result.city === 'string' ? result.city.trim().slice(0, 120) : ''
}
