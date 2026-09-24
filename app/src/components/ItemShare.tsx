import { Link, useNavigate } from '@tanstack/react-router'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  ExternalLink,
  EyeOff,
  Info,
  Link as LinkIcon,
  Link2Off,
  LoaderCircle,
  PackageCheck,
  RotateCcw,
  Share,
} from 'lucide-react'
import { useConvexAuth } from 'convex/react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { takeIntent } from '@/lib/capture-intent'
import {
  composeListing,
  publicationProblems,
  type Destination,
  type ItemRecord,
} from '@/lib/item-contract'
import {
  daysSince,
  DESTINATION_LABELS,
  displayStatus,
  money,
  relativeDays,
} from '@/lib/item-display'
import { itemErrorMessage, useItemClient } from '@/lib/item-client'
import { env } from '@/lib/env'
import { previewUrl } from '@/lib/photo-client'
import { copyText, listingPhotoFiles, savePhotoFiles, shareLink } from '@/lib/share-client'
import { Chip, IconBadge, StatusPill } from './brand'
import { BuyerPreviewCard } from './BuyerPreviewCard'
import { Sheet, Switch } from './controls'

const isLocalTrial = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.VITE_CONVEX_URL)
const DESTINATIONS: Destination[] = ['jofogas', 'facebook']
const MARKETPLACE_URLS: Record<Destination, string> = {
  jofogas: 'https://www.jofogas.hu/',
  facebook: 'https://www.facebook.com/marketplace/',
}

/** "Hol hirdeted?" – every place the item can go, and what the seller reported doing there. */
export function ItemShare({ itemId }: { itemId: string }) {
  const client = useItemClient()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [item, setItem] = useState<ItemRecord | null>(null)
  const [message, setMessage] = useState('Betöltés…')
  const [busy, setBusy] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [soldOpen, setSoldOpen] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[] | null>(null)
  const [savingPhotos, setSavingPhotos] = useState(false)

  const load = useCallback(async () => {
    try {
      const current = await client.get(itemId)
      if (!current) throw new Error('A tárgy nem található.')
      setItem(current)
      setMessage('')
      if (takeIntent(itemId)?.soldSheet) setSoldOpen(true)
    } catch (cause) {
      setMessage(itemErrorMessage(cause))
    }
  }, [client, itemId])
  useEffect(() => {
    if (isAuthenticated) void load()
    else if (!isLoading) setMessage('Ez az oldal ebben a böngészőben nem érhető el.')
  }, [isAuthenticated, isLoading, load])

  // Phones share photos through the system sheet, which needs the files ready
  // at the moment of the tap; fetch them ahead of time there.
  const photoKey = item?.photos.map((photo) => photo.id).join(',') ?? ''
  useEffect(() => {
    setPhotoFiles(null)
    if (!item?.photos.length || !window.matchMedia('(pointer: coarse)').matches) return
    let cancelled = false
    void listingPhotoFiles(item)
      .then((files) => {
        if (!cancelled) setPhotoFiles(files)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [photoKey])

  if (!item)
    return (
      <main className="centered-state">
        {message === 'Betöltés…' && <LoaderCircle className="spin" aria-hidden="true" />}
        <p role={message === 'Betöltés…' ? undefined : 'alert'}>{message}</p>
        {message !== 'Betöltés…' && (
          <button className="btn btn-secondary" onClick={() => void navigate({ to: '/' })}>
            Vissza a tárgyakhoz
          </button>
        )}
      </main>
    )

  const current = item
  const problems = publicationProblems(current.facts, current.photos.length)
  const status = displayStatus(current)
  const pageUrl = current.shareId ? `${window.location.origin}/p/${current.shareId}` : ''

  async function update(work: () => Promise<ItemRecord>, success?: string) {
    setBusy(true)
    try {
      const next = await work()
      setItem(next)
      if (success) toast.success(success)
      return next
    } catch (cause) {
      toast.error(itemErrorMessage(cause))
      return null
    } finally {
      setBusy(false)
    }
  }
  async function copyListing(destination: Destination) {
    const copied = await copyText(composeListing(current.facts, destination))
    if (copied) toast.success(`A ${DESTINATION_LABELS[destination]}-szöveg a vágólapon van.`)
    else toast.error('A vágólap nem érhető el. Jelöld ki a szöveget kézzel.')
  }
  async function savePhotos() {
    setSavingPhotos(true)
    try {
      const files = photoFiles ?? (await listingPhotoFiles(current))
      const result = await savePhotoFiles(files, current.facts.title)
      if (result === 'downloaded') toast.success('A fotók letöltődtek.')
    } catch (cause) {
      toast.error(itemErrorMessage(cause))
    } finally {
      setSavingPhotos(false)
    }
  }
  async function sendLink() {
    const result = await shareLink({ title: current.facts.title, url: pageUrl })
    if (result === 'copied') toast.success('A link a vágólapon van.')
    if (result === 'failed') toast.error('Nem sikerült megosztani. Másold ki a linket.')
  }
  async function copyLink() {
    if (await copyText(pageUrl)) toast.success('A link a vágólapon van.')
    else toast.error('A vágólap nem érhető el. Jelöld ki a linket kézzel.')
  }
  function setPosted(destination: Destination, posted: boolean) {
    void update(
      () =>
        client.setPosting(current.id, {
          destination,
          status: posted ? 'reported_posted' : 'reported_removed',
          url: '',
        }),
      posted
        ? `Feljegyeztük: feladtad a ${DESTINATION_LABELS[destination]}on.`
        : `Feljegyeztük: levetted a ${DESTINATION_LABELS[destination]}ról.`
    )
  }
  async function setSold(sold: boolean) {
    const next = await update(() => client.markSold(current.id, sold))
    if (next && sold) setSoldOpen(true)
    if (next && !sold) toast.success('Újra eladóként szerepel.')
  }

  return (
    <div className="share">
      <header className="share-header">
        <Link to="/item/$itemId" params={{ itemId }} className="back-link">
          <ChevronLeft aria-hidden="true" />
          Szerkesztés
        </Link>
        <span className="spacer" />
        <span className="desk-only">
          <StatusPill status={status} />
        </span>
        {status === 'sold' ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => void setSold(false)}
          >
            <RotateCcw aria-hidden="true" />
            Mégsem kelt el
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => void setSold(true)}
          >
            <PackageCheck aria-hidden="true" />
            Eladtam
          </button>
        )}
      </header>

      <div className="share-title">
        <p className="share-item-name">{current.facts.title || 'Névtelen tárgy'}</p>
        <h1>Hol hirdeted?</h1>
        <p className="share-lead">
          A szöveget és a fotókat előkészítettük. A feladás a tiéd – így a fiókjaid nálad maradnak.
        </p>
      </div>

      <div className="share-grid">
        <div className="share-main">
          {problems.length > 0 ? (
            <div className="notice notice-warn">
              <CircleAlert aria-hidden="true" />
              <div>
                <strong>Még ennyi kell a feladáshoz:</strong>
                <ul>
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
                <div className="notice-actions">
                  <Link to="/item/$itemId" params={{ itemId }} className="btn btn-secondary btn-sm">
                    Hiányzó adatok pótlása
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <p className="ready-banner">
              <CircleCheck aria-hidden="true" />
              Minden megvan a feladáshoz.
            </p>
          )}

          <section className="card channel-card is-page" aria-labelledby="page-title">
            <div className="channel-head">
              <IconBadge tone="mint" size="lg">
                <LinkIcon />
              </IconBadge>
              <div>
                <h2 id="page-title">Saját hirdetésoldal</h2>
                {current.shareId ? (
                  <p className="live-line">
                    <span className="live-dot" aria-hidden="true" />
                    {status === 'sold' ? 'Él a link, „Elkelt” felirattal' : 'Él a link'}
                  </p>
                ) : (
                  <p>
                    Egy link, amit bárhová elküldhetsz: Messengeren, Viberen, e-mailben vagy
                    csoportban.
                  </p>
                )}
              </div>
            </div>
            {current.shareId ? (
              <>
                <div className="link-row">
                  <label className="sr-only" htmlFor="share-url">
                    A hirdetésoldal címe
                  </label>
                  <input
                    id="share-url"
                    className="input is-readonly"
                    readOnly
                    value={pageUrl}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <div className="link-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void copyLink()}
                    >
                      <Copy aria-hidden="true" />
                      Link másolása
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void sendLink()}
                    >
                      <Share aria-hidden="true" />
                      Küldés
                    </button>
                  </div>
                </div>
                {current.publicationOutdated === true && (
                  <div className="notice notice-amber">
                    <CircleAlert aria-hidden="true" />
                    <div>
                      <strong>Módosítottál a hirdetésen.</strong> A vevők még a korábbit látják.
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy || problems.length > 0}
                      onClick={() =>
                        void update(
                          () => client.publish(current.id, current.revision),
                          'A hirdetésoldal frissült.'
                        )
                      }
                    >
                      Frissítés
                    </button>
                  </div>
                )}
                {current.publicationOutdated === undefined && (
                  <div className="notice notice-quiet">
                    <Info aria-hidden="true" />
                    <span>Ha módosítottál a tárgyon, frissítsd a hirdetésoldalt is.</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy || problems.length > 0}
                      onClick={() =>
                        void update(
                          () => client.publish(current.id, current.revision),
                          'A hirdetésoldal frissült.'
                        )
                      }
                    >
                      Hirdetésoldal frissítése
                    </button>
                  </div>
                )}
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={busy}
                    onClick={() =>
                      void update(
                        () => client.unpublish(current.id),
                        'A link kikapcsolva. Bármikor létrehozhatsz újat.'
                      )
                    }
                  >
                    <Link2Off aria-hidden="true" />
                    Link kikapcsolása
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rich-link">
                  <span className="rich-link-caption">Így jelenik meg egy üzenetben:</span>
                  <div className="rich-link-card">
                    {current.photos[0] ? (
                      <img src={previewUrl(current.id, current.photos[0].id)} alt="" />
                    ) : (
                      <span className="rich-link-empty" />
                    )}
                    <div>
                      <strong>{current.facts.title || 'Névtelen tárgy'}</strong>
                      <span>
                        {money(current.facts.priceHuf)}
                        {current.facts.city ? ` · ${current.facts.city}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-lg btn-full"
                  disabled={busy || problems.length > 0 || status === 'sold'}
                  onClick={() => setPublishOpen(true)}
                >
                  <LinkIcon aria-hidden="true" />
                  Link létrehozása
                </button>
                <p className="card-foot">Bármikor kikapcsolhatod.</p>
              </>
            )}
          </section>

          <div className="channel-pair">
            {DESTINATIONS.map((destination) => (
              <ChannelCard
                key={destination}
                destination={destination}
                item={current}
                busy={busy}
                savingPhotos={savingPhotos}
                onCopy={() => void copyListing(destination)}
                onSavePhotos={() => void savePhotos()}
                onPosted={(posted) => setPosted(destination, posted)}
              />
            ))}
          </div>
        </div>

        <aside className="share-side">
          <BuyerPreviewCard
            item={current}
            facts={current.facts}
            footer={
              current.shareId ? (
                <Link
                  to="/p/$shareId"
                  params={{ shareId: current.shareId }}
                  className="btn btn-secondary btn-sm btn-full"
                >
                  Hirdetésoldal megnyitása
                  <ExternalLink aria-hidden="true" />
                </Link>
              ) : (
                <p className="preview-foot">A link létrehozása után itt nyithatod meg.</p>
              )
            }
          />
        </aside>
      </div>

      <Sheet open={publishOpen} onClose={() => setPublishOpen(false)} labelledBy="publish-title">
        <div className="sheet-head">
          <IconBadge tone="mint" size="lg">
            <LinkIcon />
          </IconBadge>
          <h2 id="publish-title">Létrehozod a linket?</h2>
        </div>
        <p className="sheet-text">Aki megkapja, ezt fogja látni:</p>
        <ul className="check-list">
          <li>
            <Check aria-hidden="true" />
            {current.photos.length} fotó
          </li>
          <li>
            <Check aria-hidden="true" />
            Ár, cím és leírás
          </li>
          <li>
            <Check aria-hidden="true" />
            Állapot és hibák
          </li>
          <li>
            <Check aria-hidden="true" />
            Település: {current.facts.city}
          </li>
          <li>
            <Check aria-hidden="true" />
            Elérhetőség: {current.facts.contactValue}
          </li>
        </ul>
        <p className="sheet-note">
          <EyeOff aria-hidden="true" />A privát jegyzeted és az eredeti fotók nem látszanak.
        </p>
        <p className="sheet-small">
          {isLocalTrial
            ? 'Ez helyi link: csak ezen a gépen működik.'
            : 'A linket bármikor kikapcsolhatod.'}
        </p>
        <div className="sheet-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg btn-full"
            disabled={busy}
            onClick={() =>
              void update(
                () => client.publish(current.id, current.revision),
                'Kész a hirdetésoldal.'
              ).then((next) => {
                if (next) setPublishOpen(false)
              })
            }
          >
            {busy ? (
              <LoaderCircle className="spin" aria-hidden="true" />
            ) : (
              <LinkIcon aria-hidden="true" />
            )}
            Link létrehozása
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-lg btn-full"
            onClick={() => setPublishOpen(false)}
          >
            Mégse
          </button>
        </div>
      </Sheet>

      <Sheet open={soldOpen} onClose={() => setSoldOpen(false)} labelledBy="sold-title">
        <SoldSheetBody
          item={current}
          busy={busy}
          onRemoved={(destination) => setPosted(destination, false)}
        />
        <div className="sheet-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg btn-full"
            onClick={() => setSoldOpen(false)}
          >
            Kész
          </button>
        </div>
      </Sheet>
    </div>
  )
}

function ChannelCard({
  destination,
  item,
  busy,
  savingPhotos,
  onCopy,
  onSavePhotos,
  onPosted,
}: {
  destination: Destination
  item: ItemRecord
  busy: boolean
  savingPhotos: boolean
  onCopy: () => void
  onSavePhotos: () => void
  onPosted: (posted: boolean) => void
}) {
  const posting = item.postings.find((entry) => entry.destination === destination)
  const posted = posting?.status === 'reported_posted'
  const label = DESTINATION_LABELS[destination]
  return (
    <section className="card channel-card" aria-labelledby={`${destination}-title`}>
      <div className="channel-head">
        <span className="monogram" aria-hidden="true">
          {label[0]}
        </span>
        <div>
          <h2 id={`${destination}-title`}>{label}</h2>
          {posted && posting ? (
            <Chip tone="mint" icon={<CircleCheck aria-hidden="true" />}>
              Te jelölted feladottnak · {relativeDays(daysSince(posting.updatedAt, Date.now()))}
            </Chip>
          ) : (
            <p>
              {destination === 'jofogas'
                ? 'Országos apróhirdetés'
                : 'Marketplace vagy helyi adok-veszek csoport'}
            </p>
          )}
        </div>
      </div>
      {posted ? (
        <p className="channel-text">Ha itt módosítasz, a {label}on is írd át.</p>
      ) : (
        <ol className="steps">
          <li>Másold ki a szöveget</li>
          <li>Mentsd le a fotókat</li>
          <li>Nyisd meg a {label === 'Jófogás' ? 'Jófogást' : 'Facebookot'}, és illeszd be</li>
        </ol>
      )}
      <div className="two-btns">
        <button type="button" className="btn btn-secondary btn-sm btn-full" onClick={onCopy}>
          <Copy aria-hidden="true" />
          Szöveg másolása
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm btn-full"
          disabled={!item.photos.length || savingPhotos}
          onClick={onSavePhotos}
        >
          {savingPhotos ? (
            <LoaderCircle className="spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          Fotók mentése
        </button>
      </div>
      <details className="text-toggle">
        <summary>
          A hirdetés szövege
          <ChevronDown aria-hidden="true" />
        </summary>
        <pre className="listing-text">{composeListing(item.facts, destination)}</pre>
      </details>
      <a
        className="btn btn-ghost btn-sm channel-open"
        href={MARKETPLACE_URLS[destination]}
        target="_blank"
        rel="noreferrer"
      >
        {label} megnyitása
        <ExternalLink aria-hidden="true" />
      </a>
      {destination === 'jofogas' && !posted && (
        <p className="tip">
          <Info aria-hidden="true" />
          <span>
            Tipp: ha a feladásnál felajánlja, kérd, hogy a hirdetés a Facebook Marketplace-en is
            megjelenjen – így ott külön feladás nélkül is látják.
          </span>
        </p>
      )}
      <hr />
      <Switch
        label={`Feladtam a ${label}on`}
        description={
          destination === 'jofogas'
            ? 'Csak a saját jelzésed. Ha eladtad, emlékeztetünk, hogy vedd le.'
            : 'Csak a saját jelzésed. Csoportban is feladhatod ugyanezzel a szöveggel.'
        }
        checked={posted}
        disabled={busy}
        onChange={onPosted}
      />
    </section>
  )
}

function SoldSheetBody({
  item,
  busy,
  onRemoved,
}: {
  item: ItemRecord
  busy: boolean
  onRemoved: (destination: Destination) => void
}) {
  const places = DESTINATIONS.filter((destination) =>
    item.postings.some((posting) => posting.destination === destination)
  )
  const stillPosted = places.filter(
    (destination) =>
      item.postings.find((posting) => posting.destination === destination)?.status ===
      'reported_posted'
  )
  return (
    <>
      <div className="sheet-head">
        <IconBadge tone="ink" size="lg">
          <PackageCheck />
        </IconBadge>
        <div>
          <h2 id="sold-title">Eladva! Szép munka.</h2>
          <p>{item.facts.title || 'Névtelen tárgy'}</p>
        </div>
      </div>
      <p className="sheet-text">
        {stillPosted.length
          ? 'Vedd le a többi helyről is, hogy ne keressenek feleslegesen:'
          : 'Minden helyen rendben vagy.'}
      </p>
      <ul className="takedown-list">
        {places.map((destination) => {
          const posted = stillPosted.includes(destination)
          return (
            <li key={destination}>
              <div>
                <strong>{DESTINATION_LABELS[destination]}</strong>
                <span className={posted ? 'is-warn' : ''}>
                  {posted ? 'Feladottként jelölted' : 'Levettnek jelölted'}
                </span>
              </div>
              {posted ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => onRemoved(destination)}
                >
                  <Check aria-hidden="true" />
                  Levettem
                </button>
              ) : (
                <CircleCheck className="tone-ok" aria-label="Kész" />
              )}
            </li>
          )
        })}
        {item.shareId && (
          <li>
            <div>
              <strong>Hirdetésoldal</strong>
              <span>Mostantól „Elkelt” felirat látszik rajta.</span>
            </div>
            <CircleCheck className="tone-ok" aria-label="Kész" />
          </li>
        )}
      </ul>
    </>
  )
}
