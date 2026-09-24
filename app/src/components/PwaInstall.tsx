import { RefreshCw, Smartphone, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'tovabb-pwa-install-dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function canRegisterServiceWorker() {
  const localPwaTest =
    window.location.hostname === 'localhost' && import.meta.env.VITE_ENABLE_PWA_LOCAL === 'true'
  return import.meta.env.PROD || localPwaTest
}

export function PwaInstall({ showInstallHelp = true }: { showInstallHelp?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [isDismissed, setIsDismissed] = useState(true)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [updateReady, setUpdateReady] = useState<ServiceWorkerRegistration | null>(null)
  const reloadOnControllerChange = useRef(false)

  useEffect(() => {
    if (isStandalone()) return

    setIsDismissed(window.localStorage.getItem(DISMISS_KEY) === 'true')
    setShowIosHelp(isIos())

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallPromptEvent)
    }
    const onAppInstalled = () => {
      setPromptEvent(null)
      setShowIosHelp(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !canRegisterServiceWorker()) return

    const serviceWorker = navigator.serviceWorker
    const onControllerChange = () => {
      if (!reloadOnControllerChange.current) return
      reloadOnControllerChange.current = false
      window.location.reload()
    }
    serviceWorker.addEventListener('controllerchange', onControllerChange)

    void serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        const showUpdateWhenSafe = () => {
          if (registration.waiting && serviceWorker.controller) setUpdateReady(registration)
        }

        showUpdateWhenSafe()
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') showUpdateWhenSafe()
          })
        })
      })
      .catch(() => {
        // Installation remains optional if the browser declines service workers.
      })

    return () => {
      serviceWorker.removeEventListener('controllerchange', onControllerChange)
      reloadOnControllerChange.current = false
    }
  }, [])

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, 'true')
    setIsDismissed(true)
  }

  const install = async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    setPromptEvent(null)
  }

  const reloadWithUpdate = () => {
    if (!updateReady?.waiting) return
    reloadOnControllerChange.current = true
    updateReady.waiting.postMessage({ type: 'SKIP_WAITING' })
    // The controller change, rather than this click, triggers the reload.
    // This gives the user control over when unsaved edits are interrupted.
  }

  if (!showInstallHelp) return null

  if (updateReady) {
    return (
      <aside aria-label="Alkalmazásfrissítés" className="pwa-card">
        <div className="pwa-card-row">
          <span className="icon-badge icon-badge-mint icon-badge-md" aria-hidden="true">
            <RefreshCw />
          </span>
          <div className="pwa-card-text">
            <h3>Elkészült egy frissítés</h3>
            <p>Mentsd el, amin éppen dolgozol, aztán töltsd újra az oldalt.</p>
          </div>
        </div>
        <div className="pwa-card-actions">
          <button className="btn btn-primary btn-sm" onClick={reloadWithUpdate} type="button">
            Újratöltés
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setUpdateReady(null)}
            type="button"
          >
            Később
          </button>
        </div>
      </aside>
    )
  }

  if (isDismissed || (!promptEvent && !showIosHelp)) return null

  return (
    <aside aria-label="Tovább telepítése" className="pwa-card">
      <div className="pwa-card-row">
        <span className="icon-badge icon-badge-mint icon-badge-md" aria-hidden="true">
          <Smartphone />
        </span>
        <div className="pwa-card-text">
          <h3>Tedd ki a kezdőképernyőre</h3>
          {showIosHelp ? (
            <p>Koppints a Megosztás gombra, majd válaszd a „Főképernyőhöz adás” pontot.</p>
          ) : (
            <p>Így egy koppintással fotózhatsz, mint egy alkalmazásban.</p>
          )}
        </div>
        <button className="icon-btn" onClick={dismiss} type="button" aria-label="Most nem">
          <X aria-hidden="true" />
        </button>
      </div>
      {promptEvent && (
        <div className="pwa-card-actions">
          <button className="btn btn-primary btn-sm" onClick={() => void install()} type="button">
            Telepítés
          </button>
        </div>
      )}
    </aside>
  )
}
