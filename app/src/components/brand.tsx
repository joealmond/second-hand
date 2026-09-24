import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { STATUS_LABELS, type DisplayStatus } from '@/lib/item-display'

/** The mark is a price tag's ring followed by an arrow: "pass it on". */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect width="32" height="32" rx="9.5" className="logo-tile" />
      <circle cx="9.6" cy="16" r="2.3" className="logo-ring" />
      <path d="M14.6 16h9.4M20.2 11.4 24.8 16l-4.6 4.6" className="logo-arrow" />
    </svg>
  )
}

export function Logo({ size = 30, link = true }: { size?: number; link?: boolean }) {
  const inner = (
    <>
      <LogoMark size={size} />
      <span className="logo-word" style={{ fontSize: Math.round(size * 0.73) }}>
        Tovább
      </span>
    </>
  )
  return link ? (
    <Link to="/" className="logo">
      {inner}
    </Link>
  ) : (
    <span className="logo">{inner}</span>
  )
}

export function StatusPill({ status, large }: { status: DisplayStatus; large?: boolean }) {
  return (
    <span className={`status status-${status}${large ? ' status-lg' : ''}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

/** A kraft-style hang tag. The text stays a plain price for assistive technology. */
export function PriceTag({ children, size = 15 }: { children: ReactNode; size?: number }) {
  return (
    <span className="price-tag" style={{ '--tag-size': `${size}px` } as CSSProperties}>
      {children}
    </span>
  )
}

export function AiChip({ label = 'AI' }: { label?: string }) {
  return (
    <span className="ai-chip">
      <Sparkles aria-hidden="true" />
      {label}
    </span>
  )
}

export function Chip({
  children,
  icon,
  tone = 'neutral',
}: {
  children: ReactNode
  icon?: ReactNode
  tone?: 'neutral' | 'mint' | 'warn' | 'sand' | 'ghost'
}) {
  return (
    <span className={`chip chip-${tone}`}>
      {icon}
      {children}
    </span>
  )
}

export function IconBadge({
  children,
  tone = 'mint',
  size = 'md',
}: {
  children: ReactNode
  tone?: 'mint' | 'ai' | 'warn' | 'amber' | 'sunk' | 'ink'
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span className={`icon-badge icon-badge-${tone} icon-badge-${size}`} aria-hidden="true">
      {children}
    </span>
  )
}

export function CountBubble({ children }: { children: ReactNode }) {
  return <span className="count-bubble">{children}</span>
}
