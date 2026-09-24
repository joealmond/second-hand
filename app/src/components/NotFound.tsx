import { Link } from '@tanstack/react-router'
import { ArrowLeft, House } from 'lucide-react'
import { Logo } from './brand'

/** 404 page, used as the router's defaultNotFoundComponent. */
export function NotFound() {
  return (
    <main className="status-page">
      <Logo size={26} />
      <div className="status-page-body">
        <h1 className="status-code">404</h1>
        <h2>Ez az oldal nem létezik</h2>
        <p>Lehet, hogy elírták a címet, vagy az oldal már megszűnt.</p>
        <div className="status-actions">
          <Link to="/" className="btn btn-primary">
            <House aria-hidden="true" />
            Főoldal
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
            <ArrowLeft aria-hidden="true" />
            Vissza
          </button>
        </div>
      </div>
    </main>
  )
}
