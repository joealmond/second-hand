import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PwaInstall } from './PwaInstall'

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: userAgent })
}

describe('PwaInstall', () => {
  const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

  afterEach(() => {
    window.localStorage.clear()
    setUserAgent('happy-dom')
    vi.unstubAllEnvs()
    if (serviceWorkerDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', serviceWorkerDescriptor)
    } else {
      Reflect.deleteProperty(navigator, 'serviceWorker')
    }
  })

  it('offers the browser-provided install prompt only after it is available', async () => {
    render(<PwaInstall />)
    expect(screen.queryByRole('button', { name: 'Telepítés' })).toBeNull()

    const prompt = vi.fn().mockResolvedValue({ outcome: 'accepted' })
    const event = new Event('beforeinstallprompt') as Event & { prompt: typeof prompt }
    event.prompt = prompt
    fireEvent(window, event)

    const installButton = await screen.findByRole('button', { name: 'Telepítés' })
    await act(async () => {
      fireEvent.click(installButton)
    })
    expect(prompt).toHaveBeenCalledOnce()
  })

  it('remembers when the optional suggestion is dismissed', async () => {
    render(<PwaInstall />)
    const event = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<never> }
    event.prompt = vi.fn()
    fireEvent(window, event)

    fireEvent.click(await screen.findByRole('button', { name: 'Most nem' }))
    expect(window.localStorage.getItem('tovabb-pwa-install-dismissed')).toBe('true')
    expect(screen.queryByLabelText('Tovább telepítése')).toBeNull()
  })

  it('gives iPhone users the native Add to Home Screen guidance', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
    render(<PwaInstall />)

    expect(await screen.findByText(/Főképernyőhöz adás/)).toBeDefined()
  })

  it('waits for an explicit update action before reloading for a new worker', async () => {
    vi.stubEnv('PROD', true)
    const waitingWorker = { postMessage: vi.fn() } as unknown as ServiceWorker
    const registration = Object.assign(new EventTarget(), {
      waiting: waitingWorker,
      installing: null,
    }) as unknown as ServiceWorkerRegistration
    const serviceWorker = Object.assign(new EventTarget(), {
      controller: {} as ServiceWorker,
      register: vi.fn().mockResolvedValue(registration),
    }) as unknown as ServiceWorkerContainer
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker })
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => undefined)

    render(<PwaInstall />)
    serviceWorker.dispatchEvent(new Event('controllerchange'))
    expect(reload).not.toHaveBeenCalled()

    fireEvent.click(await screen.findByRole('button', { name: 'Újratöltés' }))
    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    serviceWorker.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('can register the service worker without showing help on editor routes', async () => {
    render(<PwaInstall showInstallHelp={false} />)
    const event = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<never> }
    event.prompt = vi.fn()
    fireEvent(window, event)

    await act(async () => undefined)
    expect(screen.queryByLabelText('Tovább telepítése')).toBeNull()
  })
})
