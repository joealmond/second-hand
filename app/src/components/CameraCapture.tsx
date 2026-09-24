import { Check, LoaderCircle, Sparkles, SwitchCamera, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Full-screen in-app camera. It stays open for several shots; every shot is
 * handed to the upload queue at once, and "Kész" returns to the item.
 */
export function CameraCapture({
  open,
  existing,
  remaining,
  aiHint,
  onClose,
  onCapture,
}: {
  open: boolean
  existing: number
  remaining: number
  /** The next angle the photo analysis asked for, if any. */
  aiHint: string | null
  onClose: () => void
  onCapture: (file: File) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [taken, setTaken] = useState(0)
  const [lastShot, setLastShot] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const start = useCallback(async () => {
    stop()
    setError('')
    setStarting(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('A böngésző nem támogatja a kamerát.')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stop()
        return
      }
      video.srcObject = stream
      await video.play()
    } catch (cause) {
      stop()
      const name = cause instanceof DOMException ? cause.name : ''
      setError(
        name === 'NotAllowedError'
          ? 'A kamera használata le van tiltva. A böngésző beállításaiban engedélyezheted, addig a galériából is feltölthetsz.'
          : 'A kamera nem indult el. Próbáld újra, vagy tölts fel a galériából.'
      )
    } finally {
      setStarting(false)
    }
  }, [facing, stop])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (open) void start()
    else stop()
    return stop
  }, [open, start, stop])

  useEffect(() => {
    if (open) return
    setTaken(0)
    setLastShot((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return null
    })
  }, [open])

  async function takePhoto() {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setError('A kamera képe még nem áll készen. Várj egy pillanatot.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setError('Nem sikerült elkészíteni a fotót.')
      return
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    )
    if (!blob) {
      setError('Nem sikerült elkészíteni a fotót.')
      return
    }
    onCapture(
      new File([blob], `kamera-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, {
        type: 'image/jpeg',
      })
    )
    setTaken((value) => value + 1)
    setLastShot((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return URL.createObjectURL(blob)
    })
  }

  const full = remaining - taken <= 0
  const shots = existing + taken
  const hint =
    aiHint && taken === 0
      ? { text: `Most ezt fotózd: ${aiHint}`, ai: true }
      : shots === 0
        ? { text: 'Először az egész tárgyat fotózd le, jó fényben.', ai: false }
        : shots === 1
          ? { text: 'Most egy közelit az állapotáról: kopás, címke, típustábla.', ai: false }
          : null
  return (
    <dialog
      ref={dialogRef}
      className="camera"
      aria-label="Kamera"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      {open && (
        <div className="camera-inner">
          <div className="camera-view">
            <video ref={videoRef} autoPlay muted playsInline aria-label="Élő kamerakép" />
            <div className="camera-top">
              <button
                type="button"
                className="icon-btn is-dark"
                onClick={onClose}
                aria-label="Kamera bezárása"
              >
                <X aria-hidden="true" />
              </button>
              <span className="camera-chip">
                {full ? 'Elérted a 8 fotót' : `${existing + taken + 1}. fotó`}
              </span>
              <span className="camera-top-spacer" />
            </div>
            {hint && !error && (
              <p className="camera-hint">
                {hint.ai && <Sparkles aria-hidden="true" />}
                {hint.text}
              </p>
            )}
            {starting && (
              <p className="camera-status" role="status">
                <LoaderCircle className="spin" aria-hidden="true" />
                Kamera indítása…
              </p>
            )}
            {error && (
              <div className="camera-error" role="alert">
                <p>{error}</p>
                <button type="button" className="btn btn-light btn-sm" onClick={() => void start()}>
                  Újrapróbálás
                </button>
                <label className="btn btn-light btn-sm">
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Fotó választása"
                    className="visually-hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        onCapture(file)
                        onClose()
                      }
                    }}
                  />
                  Fotó választása
                </label>
              </div>
            )}
          </div>
          <div className="camera-controls">
            <button
              type="button"
              className="camera-last"
              onClick={onClose}
              disabled={!lastShot}
              aria-label={`Vissza a fotókhoz (${existing + taken})`}
            >
              {lastShot && <img src={lastShot} alt="" />}
            </button>
            <button
              type="button"
              className="camera-shutter"
              onClick={() => void takePhoto()}
              disabled={starting || Boolean(error) || full}
              aria-label="Fénykép készítése"
            >
              <span />
            </button>
            <button
              type="button"
              className="icon-btn is-glass camera-switch"
              onClick={() =>
                setFacing((value) => (value === 'environment' ? 'user' : 'environment'))
              }
              disabled={starting}
              aria-label="Kamera váltása"
            >
              <SwitchCamera aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="btn camera-done" onClick={onClose}>
            <Check aria-hidden="true" />
            {taken ? `Kész · ${taken} fotó` : 'Kész'}
          </button>
        </div>
      )}
    </dialog>
  )
}
