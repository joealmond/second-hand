import { Armchair, Bike, LoaderCircle, LogIn, Sparkles, Watch } from 'lucide-react'
import { useConvexAuth } from 'convex/react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { authClient, signOut, useSession } from '@/lib/auth-client'
import { env, isGoogleAuthEnabled } from '@/lib/env'
import { IconBadge, Logo, PriceTag } from './brand'

const isLocalTrial = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.VITE_CONVEX_URL)

function isAnonymous(user: unknown): boolean {
  return Boolean(user && typeof user === 'object' && 'isAnonymous' in user && user.isAnonymous)
}

export interface SellerAccount {
  name: string
  email: string
  initial: string
  localTrial: boolean
  canSignOut: boolean
  signOut: () => void
}

const SellerAccountContext = createContext<SellerAccount | null>(null)

export function useSellerAccount() {
  return useContext(SellerAccountContext)
}

export function SellerGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const seller = session?.user && !isAnonymous(session.user)

  if (isPending || isLoading || (seller && !isAuthenticated)) {
    return (
      <main className="centered-state">
        <LoaderCircle className="spin" aria-hidden="true" />
        <p>Belépés ellenőrzése…</p>
      </main>
    )
  }

  if (!seller && !isLocalTrial) {
    const googleSignIn = async () => {
      setSigningIn(true)
      setError('')
      try {
        const result = await authClient.signIn.social({
          provider: 'google',
          callbackURL: location.pathname,
          errorCallbackURL: location.pathname,
        })
        if (result.error) throw new Error(result.error.message ?? 'Nem sikerült belépni.')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Nem sikerült belépni.')
        setSigningIn(false)
      }
    }
    return (
      <Welcome
        signingIn={signingIn}
        error={error}
        googleEnabled={isGoogleAuthEnabled}
        onSignIn={() => void googleSignIn()}
      />
    )
  }

  const name = (seller ? session.user.name : '') || session?.user?.email || ''
  const account: SellerAccount = {
    name,
    email: seller ? session.user.email : '',
    initial: seller ? (name.trim()[0] ?? '?').toLocaleUpperCase('hu') : 'H',
    localTrial: !seller,
    canSignOut: Boolean(session?.user),
    signOut: () => void signOut(),
  }
  return <SellerAccountContext.Provider value={account}>{children}</SellerAccountContext.Provider>
}

const STEPS = [
  'Fotózd le a tárgyat',
  'Nézd át, amit az AI kitöltött',
  'Add fel, vagy küldd el a linket',
]

function Welcome({
  signingIn,
  error,
  googleEnabled,
  onSignIn,
}: {
  signingIn: boolean
  error: string
  googleEnabled: boolean
  onSignIn: () => void
}) {
  return (
    <main className="welcome">
      <div className="welcome-copy">
        <Logo size={32} link={false} />
        <div className="welcome-body">
          <div className="welcome-collage-small">
            <Collage />
          </div>
          <h1>
            Fotózd le.
            <br />
            Segítünk továbbadni.
          </h1>
          <p className="welcome-lead">
            A fotóidból kész hirdetés lesz – a Jófogásra, a Facebookra és saját linkre. Te csak
            átnézed.
          </p>
          <ol className="welcome-steps">
            {STEPS.map((step, index) => (
              <li key={step}>
                <span aria-hidden="true">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="welcome-actions">
            <button
              className="btn btn-primary btn-lg btn-full"
              type="button"
              disabled={signingIn || !googleEnabled}
              onClick={onSignIn}
            >
              {signingIn ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <LogIn aria-hidden="true" />
              )}
              Belépés Google-fiókkal
            </button>
            {!googleEnabled && (
              <p className="form-error" role="alert">
                A Google-belépés még nincs beállítva ebben a környezetben.
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <p className="welcome-fine">
              Zárt próbaverzió: meghívott fiókkal lehet belépni. A fotóid privátok, amíg nem hozol
              létre linket.
            </p>
          </div>
        </div>
      </div>
      <div className="welcome-hero" aria-hidden="true">
        <Collage wide />
        <div className="welcome-ai-card">
          <IconBadge tone="ai">
            <Sparkles />
          </IconBadge>
          <div>
            <strong>Felismertük: karóra</strong>
            <span>Cím, márka és leírás kitöltve. Te csak átnézed.</span>
          </div>
        </div>
      </div>
    </main>
  )
}

/** A photo-free illustration: private item photos never appear before sign-in. */
function Collage({ wide }: { wide?: boolean }) {
  return (
    <div className={wide ? 'collage is-wide' : 'collage'} aria-hidden="true">
      <span className="collage-photo collage-a">
        <Armchair />
      </span>
      <span className="collage-photo collage-b">
        <Watch />
      </span>
      {wide && (
        <span className="collage-photo collage-c">
          <Bike />
        </span>
      )}
      <span className="collage-tag collage-tag-a">
        <PriceTag size={wide ? 17 : 15}>18&nbsp;000&nbsp;Ft</PriceTag>
      </span>
      <span className="collage-tag collage-tag-b">
        <PriceTag size={wide ? 17 : 15}>34&nbsp;900&nbsp;Ft</PriceTag>
      </span>
    </div>
  )
}
