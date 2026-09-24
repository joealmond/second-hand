/**
 * Hands a one-time intent from one screen to the next without putting it in the
 * URL: photos picked on the home screen, "open the camera", or "show the sold
 * sheet". Lives in memory only, so a reload or a second tab never replays it.
 */
export interface CaptureIntent {
  camera?: boolean
  files?: File[]
  soldSheet?: boolean
}

const intents = new Map<string, CaptureIntent>()

export function rememberIntent(itemId: string, intent: CaptureIntent) {
  intents.set(itemId, { ...intents.get(itemId), ...intent })
}

export function takeIntent(itemId: string): CaptureIntent | null {
  const intent = intents.get(itemId) ?? null
  intents.delete(itemId)
  return intent
}

// Before the item exists (for example while an anonymous session starts, which
// can remount the home screen) the intent waits here.
let homeIntent: CaptureIntent | null = null

export function rememberHomeIntent(intent: CaptureIntent) {
  homeIntent = intent.camera || intent.files?.length ? intent : null
}

export function takeHomeIntent(): CaptureIntent | null {
  const intent = homeIntent
  homeIntent = null
  return intent
}
