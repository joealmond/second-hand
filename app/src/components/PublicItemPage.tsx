import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  ExternalLink,
  Images,
  Info,
  Link2Off,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Share,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { CONDITION_LABELS, contactHref, defectText, type PublicItem } from '@/lib/item-contract'
import { formatHuf } from '@/lib/item-display'
import { publicPreviewUrl } from '@/lib/photo-client'
import { shareLink } from '@/lib/share-client'
import { Chip, Logo, PriceTag } from './brand'

export function PublicItemPage({
  shareId,
  initialItem,
}: {
  shareId: string
  initialItem: PublicItem | null
}) {
  const liveItem = useQuery(api.items.getPublic, { shareId })
  const item = liveItem === undefined ? initialItem : liveItem
  const [canGoBack, setCanGoBack] = useState(false)
  useEffect(() => setCanGoBack(window.history.length > 1), [])
  if (item === null) return <GonePage />

  const isSold = item.status === 'sold'
  const photos = item.photos.map((photo, index) => ({
    id: photo.id,
    src: publicPreviewUrl(shareId, photo.id),
    alt: `${item.title} – ${index + 1}. fotó`,
  }))
  async function share() {
    const result = await shareLink({ title: item!.title, url: window.location.href })
    if (result === 'copied') toast.success('A link a vágólapon van.')
    if (result === 'failed') toast.error('Nem sikerült megosztani. Másold ki a címsorból.')
  }

  return (
    <div className={isSold ? 'buyer is-sold' : 'buyer'}>
      <header className="public-header">
        {canGoBack && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Vissza"
            onClick={() => window.history.back()}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        )}
        <Logo size={26} />
        <span className="spacer" />
        <button
          type="button"
          className="btn btn-secondary btn-sm buyer-share"
          onClick={() => void share()}
        >
          <Share aria-hidden="true" />
          <span className="buyer-share-label">Megosztás</span>
        </button>
      </header>

      <main className="buyer-main">
        <Gallery photos={photos} />
        <div className="buyer-layout">
          <article className="buyer-content">
            {isSold && (
              <p className="sold-banner">
                <PackageCheck aria-hidden="true" />
                <span>Elkelt</span>
              </p>
            )}
            <div className="buyer-price-row buyer-price-inline">
              <PriceTag size={24}>{formatHuf(item.priceHuf)}</PriceTag>
              {item.negotiable && <Chip>Alkuképes</Chip>}
            </div>
            <h1>{item.title}</h1>
            <Location item={item} />
            <FactTiles item={item} />
            {item.description && (
              <section className="buyer-section">
                <h2>Leírás</h2>
                <p className="buyer-description">{item.description}</p>
              </section>
            )}
            <section className="buyer-section">
              <h2>Állapot és hibák</h2>
              <ConditionList item={item} />
            </section>
            <section className="buyer-section">
              <h2>Részletek</h2>
              <Details item={item} />
            </section>
            <TrustNote className="buyer-trust-inline" />
          </article>
          <aside className="buyer-side" aria-label="Kapcsolat">
            <div className="buyer-price-row">
              <PriceTag size={28}>{formatHuf(item.priceHuf)}</PriceTag>
              {item.negotiable && <Chip>Alkuképes</Chip>}
            </div>
            <ContactAction item={item} />
            <hr />
            <Location item={item} />
            <TrustNote />
          </aside>
        </div>
        <footer className="buyer-footer">
          <Logo size={26} />
          <p>Fotózd le. Segítünk továbbadni.</p>
          <Link to="/" className="text-link">
            Hirdess te is
            <ArrowRight aria-hidden="true" />
          </Link>
        </footer>
      </main>

      <div className="buyer-bar">
        <ContactAction item={item} compact />
      </div>
    </div>
  )
}

function contactCopy(item: PublicItem) {
  if (item.contactKind === 'phone')
    return { label: 'Felhívom az eladót', note: 'Az eladó telefonszámát hívod.', icon: <Phone /> }
  if (item.contactKind === 'link')
    return {
      label: 'Kapcsolatfelvételi link megnyitása',
      note: 'Az eladó által megadott oldalra visz.',
      icon: <ExternalLink />,
    }
  return {
    label: 'Írok az eladónak',
    note: 'Az üzeneted e-mailben megy az eladónak.',
    icon: <Mail />,
  }
}

function ContactAction({ item, compact }: { item: PublicItem; compact?: boolean }) {
  if (item.status === 'sold')
    return (
      <p className="sold-copy">
        <CircleCheck aria-hidden="true" />
        Ezt a tárgyat már eladták.
      </p>
    )
  const copy = contactCopy(item)
  return (
    <div className="contact-action">
      <a
        className="btn btn-primary btn-lg btn-full"
        href={contactHref(item.contactKind, item.contactValue, item.title)}
        {...(item.contactKind === 'link' ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {copy.icon}
        {copy.label}
      </a>
      {!compact && <p className="contact-note">{copy.note}</p>}
    </div>
  )
}

function Location({ item }: { item: PublicItem }) {
  return (
    <p className="buyer-location">
      <MapPin aria-hidden="true" />
      <span>
        <strong>{item.city}</strong> · személyes átvétel
        {item.pickupNote ? ` · ${item.pickupNote}` : ''}
      </span>
    </p>
  )
}

function workingIcon(condition: PublicItem['workingCondition']) {
  if (condition === 'working') return <CircleCheck className="tone-ok" aria-hidden="true" />
  if (condition === 'needs_repair')
    return <TriangleAlert className="tone-warn" aria-hidden="true" />
  return <CircleDashed className="tone-muted" aria-hidden="true" />
}

function FactTiles({ item }: { item: PublicItem }) {
  const defects =
    item.defectsStatus === 'listed'
      ? `${item.defects.length} ismert`
      : item.defectsStatus === 'none'
        ? 'Nem tud róla'
        : 'Nincs átnézve'
  const accessories =
    item.accessoriesStatus === 'complete'
      ? 'Minden megvan'
      : item.accessoriesStatus === 'listed'
        ? `${item.accessories.length} tétel`
        : 'Nincs megadva'
  const tiles: { icon: ReactNode; label: string; value: string }[] = [
    {
      icon: workingIcon(item.workingCondition),
      label: 'Működés',
      value:
        item.workingCondition === 'working'
          ? 'Kipróbálva'
          : item.workingCondition === 'needs_repair'
            ? 'Javítandó'
            : 'Nincs kipróbálva',
    },
    {
      icon:
        item.defectsStatus === 'listed' ? (
          <TriangleAlert className="tone-warn" aria-hidden="true" />
        ) : item.defectsStatus === 'none' ? (
          <CircleCheck className="tone-ok" aria-hidden="true" />
        ) : (
          <CircleDashed className="tone-muted" aria-hidden="true" />
        ),
      label: 'Hibák',
      value: defects,
    },
    {
      icon: <Package className="tone-muted" aria-hidden="true" />,
      label: 'Tartozékok',
      value: accessories,
    },
  ]
  return (
    <ul className="fact-tiles">
      {tiles.map((tile) => (
        <li key={tile.label}>
          {tile.icon}
          <span className="fact-label">{tile.label}</span>
          <span className="fact-value">{tile.value}</span>
        </li>
      ))}
    </ul>
  )
}

function ConditionList({ item }: { item: PublicItem }) {
  const rows: { icon: ReactNode; title: string; note?: string }[] = [
    {
      icon: workingIcon(item.workingCondition),
      title: CONDITION_LABELS[item.workingCondition],
      note:
        item.workingCondition === 'working'
          ? 'Az eladó kipróbálta'
          : item.workingCondition === 'unknown'
            ? 'Nincs ellenőrizve'
            : undefined,
    },
    ...(item.defectsStatus === 'listed'
      ? item.defects.map((defect) => ({
          icon: <TriangleAlert className="tone-warn" aria-hidden="true" />,
          title: defect,
        }))
      : [
          {
            icon:
              item.defectsStatus === 'none' ? (
                <CircleCheck className="tone-ok" aria-hidden="true" />
              ) : (
                <CircleDashed className="tone-muted" aria-hidden="true" />
              ),
            title: defectText(item),
            note: item.defectsStatus === 'unknown' ? 'Nincs ellenőrizve' : undefined,
          },
        ]),
    ...item.aestheticNotes.map((note) => ({
      icon: <Info className="tone-muted" aria-hidden="true" />,
      title: note,
      note: 'Külső állapot',
    })),
  ]
  return (
    <>
      <ul className="condition-list">
        {rows.map((row, index) => (
          <li key={`${row.title}-${index}`}>
            {row.icon}
            <span>
              <strong>{row.title}</strong>
              {row.note && <small>{row.note}</small>}
            </span>
          </li>
        ))}
      </ul>
      <p className="condition-legend">
        <span>
          <CircleCheck className="tone-ok" aria-hidden="true" />
          az eladó ellenőrizte
        </span>
        <span>
          <TriangleAlert className="tone-warn" aria-hidden="true" />
          ismert hiba
        </span>
        <span>
          <CircleDashed className="tone-muted" aria-hidden="true" />
          nincs ellenőrizve
        </span>
      </p>
    </>
  )
}

function Details({ item }: { item: PublicItem }) {
  const rows: [string, ReactNode][] = [
    ...(item.manufacturer ? [['Márka', item.manufacturer] as [string, ReactNode]] : []),
    ...(item.model ? [['Típus', item.model] as [string, ReactNode]] : []),
    ...(item.accessoriesStatus === 'complete'
      ? [['Tartozékok', 'Minden gyári tartozék megvan'] as [string, ReactNode]]
      : item.accessoriesStatus === 'listed'
        ? [['Tartozékok', item.accessories.join(', ')] as [string, ReactNode]]
        : []),
    ['Átvétel', `Személyesen, ${item.city}${item.pickupNote ? ` · ${item.pickupNote}` : ''}`],
  ]
  return (
    <dl className="details">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function TrustNote({ className = '' }: { className?: string }) {
  return (
    <p className={`trust-note ${className}`}>
      <ShieldCheck aria-hidden="true" />
      <span>
        A fotókat és az adatokat az eladó adta meg. Átvételkor nézd meg alaposan a tárgyat.
      </span>
    </p>
  )
}

interface GalleryPhoto {
  id: string
  src: string
  alt: string
}

/** Swipeable on phones, thumbnails on tablets, a mosaic on desktop; tap for full size. */
function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [viewer, setViewer] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!photos.length)
    return (
      <div className="public-gallery is-empty">
        <Images aria-hidden="true" />
        Nincs fotó
      </div>
    )
  function scrollToPhoto(next: number) {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: next * track.clientWidth, behavior: 'auto' })
    setIndex(next)
  }
  return (
    <div className={photos.length >= 3 ? 'public-gallery is-mosaic' : 'public-gallery'}>
      <div className="gallery-stage">
        <div
          className="gallery-track"
          ref={trackRef}
          onScroll={(event) => {
            const track = event.currentTarget
            setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)))
          }}
        >
          {photos.map((photo, photoIndex) => (
            <button
              key={photo.id}
              type="button"
              className="gallery-photo"
              disabled={!ready}
              aria-label={`${photoIndex + 1}. fotó nagyítása`}
              onClick={() => setViewer(photoIndex)}
            >
              <img src={photo.src} alt={photo.alt} loading={photoIndex ? 'lazy' : 'eager'} />
            </button>
          ))}
        </div>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-nav is-prev"
              aria-label="Előző fotó"
              disabled={!ready || index === 0}
              onClick={() => scrollToPhoto(index - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className="gallery-nav is-next"
              aria-label="Következő fotó"
              disabled={!ready || index >= photos.length - 1}
              onClick={() => scrollToPhoto(index + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <span className="gallery-count" aria-hidden="true">
              {index + 1} / {photos.length}
            </span>
            <span className="visually-hidden" aria-live="polite">
              {index + 1}. fotó, összesen {photos.length}
            </span>
            <span className="gallery-dots" aria-hidden="true">
              {photos.map((photo, photoIndex) => (
                <span key={photo.id} className={photoIndex === index ? 'is-active' : ''} />
              ))}
            </span>
            <button
              type="button"
              className="btn btn-light btn-sm gallery-all"
              disabled={!ready}
              onClick={() => setViewer(0)}
            >
              <Images aria-hidden="true" />
              Mind a {photos.length} fotó
            </button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="gallery-thumbs">
          {photos.map((photo, photoIndex) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`${photoIndex + 1}. fotó`}
              aria-pressed={photoIndex === index}
              disabled={!ready}
              onClick={() => scrollToPhoto(photoIndex)}
            >
              <img src={photo.src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <PhotoViewer photos={photos} start={viewer} onClose={() => setViewer(null)} />
    </div>
  )
}

function PhotoViewer({
  photos,
  start,
  onClose,
}: {
  photos: GalleryPhoto[]
  start: number | null
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  function scrollToPhoto(next: number) {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: next * track.clientWidth, behavior: 'auto' })
    setIndex(next)
  }
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (start !== null && !dialog.open) {
      setIndex(start)
      dialog.showModal()
      const track = trackRef.current
      if (track) track.scrollLeft = start * track.clientWidth
    }
    if (start === null && dialog.open) dialog.close()
  }, [start])
  return (
    <dialog
      ref={ref}
      className="photo-viewer"
      aria-label="Fotók"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && index > 0) scrollToPhoto(index - 1)
        if (event.key === 'ArrowRight' && index < photos.length - 1) scrollToPhoto(index + 1)
      }}
    >
      {start !== null && (
        <>
          <button
            type="button"
            className="icon-btn viewer-close"
            aria-label="Bezárás"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="viewer-nav is-prev"
                aria-label="Előző fotó"
                disabled={index === 0}
                onClick={() => scrollToPhoto(index - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                className="viewer-nav is-next"
                aria-label="Következő fotó"
                disabled={index >= photos.length - 1}
                onClick={() => scrollToPhoto(index + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </button>
              <span className="viewer-count" aria-live="polite">
                {index + 1} / {photos.length}
              </span>
            </>
          )}
          <div
            className="viewer-track"
            ref={trackRef}
            onScroll={(event) => {
              const track = event.currentTarget
              setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)))
            }}
          >
            {photos.map((photo) => (
              <img key={photo.id} src={photo.src} alt={photo.alt} />
            ))}
          </div>
        </>
      )}
    </dialog>
  )
}

function GonePage() {
  return (
    <main className="gone">
      <header className="public-header">
        <Logo size={26} />
      </header>
      <div className="gone-body">
        <span className="gone-icon" aria-hidden="true">
          <Link2Off />
        </span>
        <h1>Ez a hirdetés már nem elérhető</h1>
        <p>Lehet, hogy elkelt, vagy az eladó kikapcsolta a linket.</p>
      </div>
      <div className="card gone-card">
        <strong>Neked is van eladó tárgyad?</strong>
        <p>Fotózd le, és a Tovább kész hirdetést készít belőle.</p>
        <Link to="/" className="text-link">
          Kipróbálom
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </main>
  )
}
