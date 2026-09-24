import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Download,
  ExternalLink,
  Images,
  Link2Off,
  Lock,
  LoaderCircle,
  Mail,
  PackageCheck,
  Phone,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TriangleAlert,
  Globe,
} from 'lucide-react'
import { useConvexAuth } from 'convex/react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { strToU8, zipSync } from 'fflate'
import { useSession } from '@/lib/auth-client'
import { rememberIntent, takeIntent } from '@/lib/capture-intent'
import {
  ACCESSORY_CHOICES,
  CATEGORY_LABELS,
  composeListing,
  CONDITION_CHOICES,
  DEFECT_CHOICES,
  EMPTY_FACTS,
  FACT_SOURCE_KEYS,
  publicationProblems,
  type DefectsStatus,
  type FactSource,
  type FactSourceKey,
  type ItemFacts,
  type ItemRecord,
} from '@/lib/item-contract'
import { displayStatus, money } from '@/lib/item-display'
import { runLatestTask, type LatestTaskState } from '@/lib/latest-task'
import { isRevisionConflict, itemErrorMessage, useItemClient } from '@/lib/item-client'
import { previewUrl, uploadPhoto } from '@/lib/photo-client'
import { detectCity } from '@/lib/location-client'
import { downloadBlob, fileSlug } from '@/lib/share-client'
import { AiChip, Chip, IconBadge, StatusPill } from './brand'
import { BuyerPreviewCard } from './BuyerPreviewCard'
import { CameraCapture } from './CameraCapture'
import { Menu, MenuItem, Segmented, Sheet, Switch } from './controls'

/** Matches MAX_PHOTOS in convex/lib/itemValidators.ts. */
const MAX_PHOTOS = 8

type SaveState = 'loading' | 'saved' | 'saving' | 'error' | 'conflict'

export function shouldShowAiProgress(uploading: boolean, analyzingCount: number) {
  return uploading || analyzingCount > 0
}

function readError(cause: unknown) {
  return itemErrorMessage(cause)
}

export function ItemEditor({ itemId }: { itemId: string }) {
  const client = useItemClient()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { data: session } = useSession()
  const navigate = useNavigate()
  const [item, setItem] = useState<ItemRecord | null>(null)
  const [facts, setFacts] = useState<ItemFacts>(EMPTY_FACTS)
  const [saveState, setSaveState] = useState<SaveState>('loading')
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzingCount, setAnalyzingCount] = useState(0)
  const [analysisNote, setAnalysisNote] = useState('')
  const [priceBusy, setPriceBusy] = useState(false)
  const [priceNote, setPriceNote] = useState('')
  const [correcting, setCorrecting] = useState(false)
  const [correction, setCorrection] = useState<{ original: string; suggestion: string } | null>(
    null
  )
  const [correctionNote, setCorrectionNote] = useState('')
  const [mutating, setMutating] = useState(false)
  const [staleDraft, setStaleDraft] = useState<ItemFacts | null>(null)
  const [actionError, setActionError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraBase, setCameraBase] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [confirmed, setConfirmed] = useState<ReadonlySet<FactSourceKey>>(new Set())
  const [contactOpen, setContactOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const latest = useRef(EMPTY_FACTS)
  const revision = useRef<number | null>(null)
  const queued = useRef<Promise<void>>(Promise.resolve())
  const timer = useRef<number | null>(null)
  const priceTimer = useRef<number | null>(null)
  const dirty = useRef(false)
  const itemRef = useRef<ItemRecord | null>(null)
  const lastQueuedFacts = useRef<ItemFacts | null>(null)
  const lastSave = useRef<Promise<ItemRecord> | null>(null)
  const analysisRunning = useRef(false)
  const analysisQueued = useRef(false)
  const uploadQueue = useRef<File[]>([])
  const uploadRunning = useRef(false)
  const intentHandled = useRef(false)
  const priceQueue = useRef<LatestTaskState<{ facts: ItemFacts; force: boolean }>>({
    running: false,
    pending: null,
  })
  const draftKey = `tovabb:draft:${session?.user?.id ?? 'local'}:${itemId}`

  const load = useCallback(async () => {
    setSaveState('loading')
    if (timer.current !== null) window.clearTimeout(timer.current)
    await queued.current
    dirty.current = false
    lastQueuedFacts.current = null
    lastSave.current = null
    setStaleDraft(null)
    try {
      const value = await client.get(itemId)
      if (!value)
        throw new Error('Ez a tárgy nem található, vagy nem a te munkamenetedhez tartozik.')
      setItem(value)
      itemRef.current = value
      setFacts(value.facts)
      latest.current = value.facts
      revision.current = value.revision
      setContactOpen(!value.facts.contactValue.trim())
      setNoteOpen(false)
      const localDraft =
        typeof window === 'undefined' ? null : window.sessionStorage.getItem(draftKey)
      if (localDraft) {
        try {
          const recovered = JSON.parse(localDraft) as { facts: ItemFacts; baseRevision: number }
          if (recovered.baseRevision === value.revision) {
            setFacts(recovered.facts)
            latest.current = recovered.facts
            dirty.current = true
            setSaveState('saved')
            toast('Visszaállítottuk a még nem mentett módosításaidat.')
          } else {
            setStaleDraft(recovered.facts)
            setSaveState('saved')
          }
        } catch {
          window.sessionStorage.removeItem(draftKey)
          setSaveState('saved')
        }
      } else {
        setSaveState('saved')
      }
    } catch (cause) {
      setSaveState('error')
      setMessage(readError(cause))
    }
  }, [client, draftKey, itemId])
  useEffect(() => {
    if (isAuthenticated) void load()
    else if (!authLoading) {
      setSaveState('error')
      setMessage('Ez a tárgy nem érhető el ebben a böngészőben. Nyisd meg ott, ahol létrehoztad.')
    }
  }, [isAuthenticated, authLoading, load])

  const save = useCallback(
    (next?: ItemFacts) => {
      const savingFacts = next ?? latest.current
      latest.current = savingFacts
      if (!dirty.current || revision.current === null || !itemRef.current)
        return Promise.resolve(itemRef.current!)
      if (lastQueuedFacts.current === savingFacts && lastSave.current) return lastSave.current
      setSaveState('saving')
      const task = queued.current.then(async () => {
        try {
          const saved = await client.save(itemId, revision.current!, savingFacts)
          revision.current = saved.revision
          itemRef.current = saved
          setItem(saved)
          if (latest.current === savingFacts) {
            dirty.current = false
            window.sessionStorage.removeItem(draftKey)
            setSaveState('saved')
          }
          return saved
        } catch (cause) {
          if (isRevisionConflict(cause)) {
            setSaveState('conflict')
          } else {
            setSaveState('error')
            setMessage(readError(cause))
          }
          throw cause
        }
      })
      lastQueuedFacts.current = savingFacts
      lastSave.current = task
      const clearFinishedSave = () => {
        if (lastSave.current === task) {
          lastSave.current = null
          lastQueuedFacts.current = null
        }
      }
      void task.then(clearFinishedSave, clearFinishedSave)
      queued.current = task.then(
        () => undefined,
        () => undefined
      )
      return task
    },
    [client, draftKey, itemId]
  )
  // Saves wait while a mutation, price search or photo analysis owns the revision,
  // then resume automatically; typing is never dropped meanwhile.
  useEffect(() => {
    if (
      !item ||
      saveState === 'loading' ||
      saveState === 'conflict' ||
      !dirty.current ||
      mutating ||
      priceBusy ||
      analyzingCount > 0
    )
      return
    timer.current = window.setTimeout(() => {
      timer.current = null
      void save(latest.current).catch(() => undefined)
    }, 800)
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [facts, priceBusy, analyzingCount, mutating]) // save only runs after a deliberate change

  // One-time hand-over from the home screen: picked photos or "open the camera".
  useEffect(() => {
    if (!item || intentHandled.current) return
    intentHandled.current = true
    const intent = takeIntent(item.id)
    if (intent?.files?.length) void addPhotos(intent.files)
    else if (intent?.camera) openCamera()
  }, [item])

  function openCamera() {
    setCameraBase((itemRef.current?.photos.length ?? 0) + uploadQueue.current.length)
    setCameraOpen(true)
  }

  function change(patch: Partial<ItemFacts>) {
    const next = { ...latest.current, ...patch }
    latest.current = next
    dirty.current = true
    window.sessionStorage.setItem(
      draftKey,
      JSON.stringify({ facts: next, baseRevision: revision.current })
    )
    setFacts(next)
    const touched = FACT_SOURCE_KEYS.filter((key) => key in patch)
    if (touched.length) setConfirmed((previous) => new Set([...previous, ...touched]))
    if (saveState !== 'conflict') setSaveState('saving')
    if ('manufacturer' in patch || 'model' in patch || 'title' in patch) {
      if (priceTimer.current !== null) window.clearTimeout(priceTimer.current)
      priceTimer.current = window.setTimeout(() => {
        priceTimer.current = null
        void researchPrice(next)
      }, 1400)
    }
  }
  async function flush() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    return await save(latest.current)
  }
  function adopt(changed: ItemRecord, includeFacts = false) {
    setItem(changed)
    itemRef.current = changed
    revision.current = changed.revision
    if (includeFacts) {
      setFacts(changed.facts)
      latest.current = changed.facts
      dirty.current = false
      window.sessionStorage.removeItem(draftKey)
    }
  }
  function adoptAiResult(changed: ItemRecord, base: ItemFacts, keys: (keyof ItemFacts)[]) {
    if (!dirty.current) {
      adopt(changed, true)
      return
    }
    const local = latest.current
    const merged = { ...local }
    for (const key of keys) {
      if (JSON.stringify(local[key]) === JSON.stringify(base[key]))
        (merged as Record<string, unknown>)[key] = changed.facts[key]
    }
    adopt(changed)
    latest.current = merged
    setFacts(merged)
    window.sessionStorage.setItem(
      draftKey,
      JSON.stringify({ facts: merged, baseRevision: changed.revision })
    )
  }
  function sourceOf(key: FactSourceKey): FactSource {
    if (confirmed.has(key)) return 'seller'
    return item?.factSources[key] ?? 'unknown'
  }
  function confirmFact(key: FactSourceKey) {
    if (!item) return
    setConfirmed((previous) => new Set(previous).add(key))
    void client.confirmFacts(item.id, [key]).catch((cause: unknown) => {
      setConfirmed((previous) => {
        const next = new Set(previous)
        next.delete(key)
        return next
      })
      setActionError(readError(cause))
    })
  }
  async function researchPrice(expected = latest.current, force = false) {
    if (!item) return
    const started = !priceQueue.current.running
    if (started) setPriceBusy(true)
    await runLatestTask(priceQueue.current, { facts: { ...expected }, force }, async (request) => {
      const requestedFacts = request.facts
      const identity = [requestedFacts.manufacturer, requestedFacts.model, requestedFacts.title]
        .filter(Boolean)
        .join(' ')
        .trim()
      if (
        !identity ||
        (!request.force &&
          (itemRef.current?.priceSuggestion?.query === identity ||
            (itemRef.current?.factSources.priceHuf === 'seller' &&
              requestedFacts.manufacturer.trim())))
      )
        return
      setPriceNote('')
      try {
        const saved = await flush()
        if (
          ![saved.facts.manufacturer, saved.facts.model, saved.facts.title].some((value) =>
            value.trim()
          )
        )
          return
        const changed = await client.researchPrice(item.id)
        adoptAiResult(changed, requestedFacts, ['manufacturer'])
        setSaveState(dirty.current ? 'saving' : 'saved')
        if (!changed.priceSuggestion)
          setPriceNote('A keresés közben módosult a tárgy, ezért az új adatokkal újrakezdjük.')
      } catch (cause) {
        setSaveState(dirty.current ? 'saving' : 'saved')
        setPriceNote(readError(cause))
      }
    })
    if (started) setPriceBusy(false)
  }
  async function requestCorrection() {
    if (!item || correcting || !latest.current.description.trim()) return
    setCorrecting(true)
    setCorrection(null)
    setCorrectionNote('')
    try {
      const result = await client.correctDescription(item.id, latest.current.description)
      setCorrection(result)
    } catch (cause) {
      setCorrectionNote(readError(cause))
    } finally {
      setCorrecting(false)
    }
  }
  async function enrichCapture(base: ItemFacts) {
    if (!item) return
    const cityPromise = detectCity().catch(() => '')
    let analysisError: unknown = null
    try {
      await client.analyzePhotos(item.id)
    } catch (cause) {
      analysisError = cause
    }
    const city = await cityPromise
    if (city) await client.setDetectedCity(item.id, city)
    const refreshed = await client.get(item.id)
    if (refreshed) {
      adoptAiResult(refreshed, base, [
        'category',
        'title',
        'manufacturer',
        'model',
        'description',
        'aestheticNotes',
        'accessoriesStatus',
        'accessories',
        'city',
      ])
    }
    if (analysisError) throw analysisError
    void researchPrice(latest.current)
  }
  async function analyzeAgain() {
    if (!item || !itemRef.current?.photos.length) return
    analysisQueued.current = true
    if (analysisRunning.current) return
    analysisRunning.current = true
    setAnalyzingCount(1)
    setAnalysisNote('')
    try {
      while (analysisQueued.current) {
        analysisQueued.current = false
        const base = latest.current
        try {
          await flush()
          await enrichCapture(base)
          setSaveState(dirty.current ? 'saving' : 'saved')
        } catch (cause) {
          setSaveState(dirty.current ? 'saving' : 'saved')
          setAnalysisNote(readError(cause))
        }
      }
    } finally {
      analysisRunning.current = false
      setAnalyzingCount(0)
    }
  }
  /** Queues photos; a shot taken while earlier ones upload is never dropped. */
  async function addPhotos(files: File[]) {
    if (!itemRef.current || !files.length) return
    uploadQueue.current.push(...files)
    if (uploadRunning.current) return
    uploadRunning.current = true
    setUploading(true)
    setMutating(true)
    setActionError('')
    let uploaded = 0
    let failure = ''
    try {
      await flush()
      while (uploadQueue.current.length) {
        const file = uploadQueue.current.shift()!
        if ((itemRef.current?.photos.length ?? 0) >= MAX_PHOTOS) {
          failure = `Egy tárgyhoz legfeljebb ${MAX_PHOTOS} fotó tartozhat.`
          uploadQueue.current = []
          break
        }
        try {
          const changed = await uploadPhoto(client, itemRef.current!.id, file)
          adopt(changed)
          uploaded++
        } catch (cause) {
          failure = readError(cause)
        }
      }
    } catch {
      uploadQueue.current = []
      failure = 'Előbb a mentést kell rendbe tenni, utána töltsd fel újra a fotót.'
    } finally {
      uploadRunning.current = false
      setUploading(false)
      setMutating(false)
    }
    if (failure) setActionError(failure)
    if (uploaded) {
      setSelectedPhoto(Math.max(0, (itemRef.current?.photos.length ?? 1) - 1))
      await analyzeAgain()
    }
  }
  async function removePhoto(photoId: string) {
    if (!item || mutating) return
    setMutating(true)
    try {
      await flush()
      const changed = await client.deletePhoto(item.id, photoId)
      adopt(changed)
      setSelectedPhoto((index) => Math.min(index, Math.max(0, changed.photos.length - 1)))
    } catch (cause) {
      setActionError(readError(cause))
    } finally {
      setMutating(false)
    }
  }
  async function deleteCurrentItem() {
    if (!item || mutating) return
    setMutating(true)
    try {
      await client.deleteItem(item.id)
      window.sessionStorage.removeItem(draftKey)
      await navigate({ to: '/' })
    } catch (cause) {
      setDeleteOpen(false)
      setActionError(readError(cause))
      setMutating(false)
    }
  }
  async function setSold(sold: boolean) {
    if (!item || mutating) return
    setMutating(true)
    try {
      await flush()
      const updated = await client.markSold(item.id, sold)
      adopt(updated)
      setSaveState('saved')
      if (
        sold &&
        (updated.shareId || updated.postings.some((p) => p.status === 'reported_posted'))
      ) {
        rememberIntent(updated.id, { soldSheet: true })
        await navigate({ to: '/item/$itemId/preview', params: { itemId: updated.id } })
      } else {
        toast.success(sold ? 'Eladottnak jelölted.' : 'Újra eladóként szerepel.')
      }
    } catch (cause) {
      setActionError(readError(cause))
    } finally {
      setMutating(false)
    }
  }
  async function exportItem() {
    if (!item || mutating) return
    setMutating(true)
    try {
      const current = await flush()
      const originals = await Promise.all(
        current.photos.map(async (photo) => {
          const response = await fetch(
            `/api/media?itemId=${encodeURIComponent(current.id)}&photoId=${encodeURIComponent(photo.id)}&original=1`
          )
          if (!response.ok) throw new Error(`Az eredeti fotó nem tölthető le (${response.status}).`)
          return [photo.name, new Uint8Array(await response.arrayBuffer())] as const
        })
      )
      const files: Record<string, Uint8Array> = {
        'manifest.json': strToU8(
          JSON.stringify(
            { version: 1, exportedAt: new Date().toISOString(), item: current },
            null,
            2
          )
        ),
        'listing.md': strToU8(composeListing(current.facts)),
        'jofogas.txt': strToU8(composeListing(current.facts, 'jofogas')),
        'facebook.txt': strToU8(composeListing(current.facts, 'facebook')),
      }
      originals.forEach(([name, bytes], index) => {
        files[`originals/${String(index + 1).padStart(2, '0')}-${name}`] = bytes
      })
      const archiveBytes = new Uint8Array(zipSync(files))
      downloadBlob(
        new Blob([archiveBytes.buffer], { type: 'application/zip' }),
        `${fileSlug(current.facts.title)}-export.zip`
      )
    } catch (cause) {
      setActionError(readError(cause))
    } finally {
      setMutating(false)
    }
  }
  async function goToShare() {
    try {
      await flush()
    } catch {
      // The share screen reloads the item; an unsaved draft stays in this tab.
    }
    await navigate({ to: '/item/$itemId/preview', params: { itemId } })
  }

  if (!item)
    return (
      <main className="centered-state">
        {saveState !== 'error' && <LoaderCircle className="spin" aria-hidden="true" />}
        <p role={saveState === 'error' ? 'alert' : undefined}>{message || 'Tárgy betöltése…'}</p>
        {saveState === 'error' && (
          <button className="btn btn-secondary" onClick={() => void navigate({ to: '/' })}>
            Vissza a tárgyakhoz
          </button>
        )}
      </main>
    )

  const problems = publicationProblems(facts, item.photos.length)
  const status = displayStatus(item)
  const suggestion = item.aiSuggestion
  const needsReview = FACT_SOURCE_KEYS.some((key) => {
    const source = sourceOf(key)
    return source === 'ai' || source === 'location'
  })
  const canAddPhotos = item.photos.length < MAX_PHOTOS
  const shareButton = (className: string) => (
    <button
      type="button"
      className={`btn btn-primary ${className}`}
      onClick={() => void goToShare()}
    >
      Előnézet és feladás
      <ArrowRight aria-hidden="true" />
    </button>
  )

  return (
    <div className="editor">
      <header className="editor-header">
        <Link to="/" className="back-link">
          <ChevronLeft aria-hidden="true" />
          Tárgyak
        </Link>
        <span className="spacer" />
        <SaveIndicator state={saveState} />
        <button
          type="button"
          className="btn btn-ghost btn-sm desk-only"
          onClick={() => void exportItem()}
          disabled={mutating}
        >
          <Download aria-hidden="true" />
          Letöltés (ZIP)
        </button>
        <Menu label="További műveletek">
          <MenuItem icon={<Download aria-hidden="true" />} onSelect={() => void exportItem()}>
            Letöltés (ZIP)
          </MenuItem>
          {status === 'sold' ? (
            <MenuItem icon={<RotateCcw aria-hidden="true" />} onSelect={() => void setSold(false)}>
              Mégsem kelt el
            </MenuItem>
          ) : (
            <MenuItem
              icon={<PackageCheck aria-hidden="true" />}
              onSelect={() => void setSold(true)}
            >
              Eladtam
            </MenuItem>
          )}
          <MenuItem
            danger
            icon={<Trash2 aria-hidden="true" />}
            onSelect={() => setDeleteOpen(true)}
          >
            Tárgy törlése
          </MenuItem>
        </Menu>
        {shareButton('desk-only')}
      </header>

      <div className="editor-title">
        <StatusPill status={status} />
        <h1>{facts.title || 'Új tárgy'}</h1>
      </div>

      {staleDraft && (
        <div className="notice notice-warn" role="alert">
          <CircleAlert aria-hidden="true" />
          <div>
            <strong>Van egy korábbi, nem mentett piszkozatod.</strong>
            <p>Közben máshol újabb változat készült. Melyikkel folytatod?</p>
            <div className="notice-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  window.sessionStorage.removeItem(draftKey)
                  setStaleDraft(null)
                }}
              >
                A mentett változattal
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  latest.current = staleDraft
                  dirty.current = true
                  window.sessionStorage.setItem(
                    draftKey,
                    JSON.stringify({ facts: staleDraft, baseRevision: revision.current })
                  )
                  setFacts(staleDraft)
                  setStaleDraft(null)
                  setSaveState('saving')
                }}
              >
                A piszkozatommal
              </button>
            </div>
          </div>
        </div>
      )}
      {saveState === 'conflict' && (
        <div className="notice notice-warn" role="alert">
          <CircleAlert aria-hidden="true" />
          <div>
            <strong>Egy másik lapon is szerkesztetted</strong>
            <p>Amíg nem töltöd be a legfrissebb változatot, nem mentünk, így semmi sem vész el.</p>
            <div className="notice-actions">
              <button className="btn btn-primary btn-sm" onClick={() => void load()}>
                Legfrissebb betöltése
              </button>
            </div>
          </div>
        </div>
      )}
      {saveState === 'error' && (
        <div className="notice notice-warn" role="alert">
          <CircleAlert aria-hidden="true" />
          <div>
            <strong>Nem sikerült menteni</strong>
            <p>{message}</p>
            <div className="notice-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => void flush().catch(() => undefined)}
              >
                Mentés újra
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="editor-grid">
        <div className="editor-media">
          <PhotoBlock
            item={item}
            selected={Math.min(selectedPhoto, Math.max(0, item.photos.length - 1))}
            uploading={uploading}
            queued={uploadQueue.current.length}
            busy={mutating}
            canAdd={canAddPhotos}
            error={actionError}
            onSelect={setSelectedPhoto}
            onCamera={openCamera}
            onFiles={(files) => void addPhotos(files)}
            onRemove={(photoId) => void removePhoto(photoId)}
            onDismissError={() => setActionError('')}
          />
          {shouldShowAiProgress(uploading, analyzingCount) ? (
            <div className="ai-progress" role="status" aria-live="polite">
              <LoaderCircle className="spin" aria-hidden="true" />
              <div>
                <strong>{uploading ? 'Fotók feltöltése…' : 'Az AI nézi a fotókat…'}</strong>
                <span>
                  {uploading
                    ? 'Utána automatikusan felismerjük a tárgyat.'
                    : 'Kitölti, amit lát, és szól, ha még egy kép segítene.'}
                </span>
              </div>
            </div>
          ) : suggestion ? (
            <PhotoCoach
              suggestion={suggestion}
              note={analysisNote}
              canAdd={canAddPhotos}
              onCamera={openCamera}
              onAnalyze={() => void analyzeAgain()}
            />
          ) : analysisNote ? (
            <p className="notice notice-warn" role="status">
              <CircleAlert aria-hidden="true" />
              <span>{analysisNote}</span>
            </p>
          ) : null}
        </div>

        <div className="editor-form">
          {needsReview && (
            <p className="ai-legend">
              <AiChip />
              <span>Az AI töltötte ki – ha jó, pipáld ki:</span>
              <span className="confirm-dot" aria-hidden="true">
                <Check />
              </span>
            </p>
          )}

          <section className="card form-card" aria-labelledby="sec-what">
            <h2 id="sec-what">Mi ez?</h2>
            <TextField
              id="f-title"
              label="Cím"
              value={facts.title}
              maxLength={140}
              placeholder="Rövid, felismerhető cím"
              source={sourceOf('title')}
              onConfirm={() => confirmFact('title')}
              onChange={(title) => change({ title })}
            />
            <div className="field-pair">
              <TextField
                id="f-brand"
                label="Márka"
                value={facts.manufacturer}
                placeholder="Például Bosch"
                source={sourceOf('manufacturer')}
                onConfirm={() => confirmFact('manufacturer')}
                onChange={(manufacturer) => change({ manufacturer })}
              />
              <TextField
                id="f-model"
                label="Típus"
                value={facts.model}
                placeholder="A címkéről vagy az adattábláról"
                source={sourceOf('model')}
                onConfirm={() => confirmFact('model')}
                onChange={(model) => change({ model })}
              />
            </div>
            <div className="field">
              <FieldLabel htmlFor="f-cat" label="Kategória" source={sourceOf('category')} />
              <div
                className={
                  isSuggested(sourceOf('category')) ? 'input-wrap has-confirm' : 'input-wrap'
                }
              >
                <select
                  id="f-cat"
                  className={isSuggested(sourceOf('category')) ? 'input is-suggested' : 'input'}
                  value={facts.category}
                  onChange={(event) =>
                    change({ category: event.target.value as ItemFacts['category'] })
                  }
                >
                  {(Object.entries(CATEGORY_LABELS) as [ItemFacts['category'], string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
                {isSuggested(sourceOf('category')) && (
                  <ConfirmButton label="Kategória" onConfirm={() => confirmFact('category')} />
                )}
              </div>
            </div>
            <TextArea
              id="f-desc"
              label="Leírás"
              value={facts.description}
              rows={6}
              placeholder={'Mi ez, milyen állapotban van, mit kap hozzá a vevő?'}
              source={sourceOf('description')}
              onConfirm={() => confirmFact('description')}
              onChange={(description) => change({ description })}
            />
            <div className="field-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={correcting || !facts.description.trim()}
                onClick={() => void requestCorrection()}
              >
                {correcting ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
                Helyesírás javítása
              </button>
            </div>
            {correctionNote && <p className="field-help is-error">{correctionNote}</p>}
            {correction && (
              <div className="suggestion-box">
                <div className="suggestion-head">
                  <AiChip label="Javaslat" />
                  <span>Javított helyesírás, felsorolásba rendezve. Tényt nem tesz hozzá.</span>
                </div>
                <p className="pre-line">{correction.suggestion}</p>
                <div className="notice-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={facts.description !== correction.original}
                    onClick={() => {
                      change({ description: correction.suggestion })
                      setCorrection(null)
                    }}
                  >
                    <Check aria-hidden="true" />
                    Elfogadom
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCorrection(null)}
                  >
                    Marad az eredeti
                  </button>
                </div>
                {facts.description !== correction.original && (
                  <p className="field-help">
                    Közben átírtad a leírást, ezért ez a javaslat már nem alkalmazható.
                  </p>
                )}
              </div>
            )}
          </section>

          <ConditionCard facts={facts} item={item} onChange={change} />

          <section className="card form-card" id="ar" aria-labelledby="sec-price">
            <h2 id="sec-price">Ár és átvétel</h2>
            <div className="field-pair is-price">
              <TextField
                id="f-price"
                label="Ár"
                big
                suffix="Ft"
                inputMode="numeric"
                value={
                  facts.priceHuf === null
                    ? ''
                    : new Intl.NumberFormat('hu-HU').format(facts.priceHuf)
                }
                placeholder="Még nem tudom"
                source={sourceOf('priceHuf')}
                onConfirm={() => confirmFact('priceHuf')}
                onChange={(value) => {
                  const digits = value.replace(/\D/g, '').slice(0, 9)
                  change({ priceHuf: digits ? Number(digits) : null })
                }}
              />
              <TextField
                id="f-city"
                label="Település"
                value={facts.city}
                placeholder="Például Budapest XI."
                source={sourceOf('city')}
                onConfirm={() => confirmFact('city')}
                help="A pontos címed nem kerül ki, csak a település."
                onChange={(city) => change({ city })}
              />
            </div>
            <Switch
              label="Alkuképes"
              description="A vevő ajánlatot tehet."
              checked={facts.negotiable}
              onChange={(negotiable) => change({ negotiable })}
            />
            <PriceAdvice
              item={item}
              facts={facts}
              busy={priceBusy}
              note={priceNote}
              onResearch={() => void researchPrice(latest.current, true)}
              onUse={(priceHuf) => change({ priceHuf })}
            />
            <TextField
              id="f-pickup"
              label="Átvételi megjegyzés"
              value={facts.pickupNote}
              placeholder="Például hétköznap 17 óra után"
              help="Nem kötelező."
              onChange={(pickupNote) => change({ pickupNote })}
            />
          </section>

          <section className="card form-card" aria-labelledby="sec-contact">
            <h2 id="sec-contact">Elérhetőség és jegyzet</h2>
            <div className="contact-rows">
              <div className="contact-row">
                <IconBadge tone="sunk" size="sm">
                  {facts.contactKind === 'phone' ? (
                    <Phone />
                  ) : facts.contactKind === 'link' ? (
                    <Globe />
                  ) : (
                    <Mail />
                  )}
                </IconBadge>
                <div className="contact-text">
                  <span>Így keresnek a vevők</span>
                  <strong>{contactSummary(facts)}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-expanded={contactOpen}
                  aria-controls="contact-edit"
                  onClick={() => setContactOpen((value) => !value)}
                >
                  {contactOpen ? 'Kész' : 'Módosítás'}
                </button>
              </div>
              {contactOpen && (
                <div className="contact-edit" id="contact-edit">
                  <Segmented
                    label="Kapcsolat módja"
                    compact
                    value={facts.contactKind}
                    onChange={(contactKind) => change({ contactKind })}
                    options={[
                      { value: 'email', label: 'E-mail' },
                      { value: 'phone', label: 'Telefon' },
                      { value: 'link', label: 'Link' },
                    ]}
                  />
                  <TextField
                    id="f-contact"
                    label={
                      facts.contactKind === 'email'
                        ? 'E-mail-cím'
                        : facts.contactKind === 'phone'
                          ? 'Telefonszám'
                          : 'Link'
                    }
                    type={
                      facts.contactKind === 'email'
                        ? 'email'
                        : facts.contactKind === 'phone'
                          ? 'tel'
                          : 'url'
                    }
                    inputMode={
                      facts.contactKind === 'email'
                        ? 'email'
                        : facts.contactKind === 'phone'
                          ? 'tel'
                          : 'url'
                    }
                    autoComplete={
                      facts.contactKind === 'email'
                        ? 'email'
                        : facts.contactKind === 'phone'
                          ? 'tel'
                          : 'url'
                    }
                    value={facts.contactValue}
                    placeholder={
                      facts.contactKind === 'email'
                        ? 'te@pelda.hu'
                        : facts.contactKind === 'phone'
                          ? '+36 30 123 4567'
                          : 'https://…'
                    }
                    help="Ezen keresztül írnak vagy telefonálnak a vevők."
                    onChange={(contactValue) => change({ contactValue })}
                  />
                </div>
              )}
              <div className="contact-row">
                <IconBadge tone="sunk" size="sm">
                  <Lock />
                </IconBadge>
                <div className="contact-text">
                  <span>Privát jegyzet – csak te látod</span>
                  <strong className={facts.privateNote ? '' : 'is-empty'}>
                    {facts.privateNote || 'Még nincs jegyzet'}
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-expanded={noteOpen}
                  aria-controls="note-edit"
                  onClick={() => setNoteOpen((value) => !value)}
                >
                  {noteOpen ? 'Kész' : facts.privateNote ? 'Módosítás' : 'Hozzáadás'}
                </button>
              </div>
              {noteOpen && (
                <div className="contact-edit" id="note-edit">
                  <TextArea
                    id="f-note"
                    label="Privát jegyzet"
                    value={facts.privateNote}
                    rows={3}
                    placeholder="Például: kinek ígértem, mikor jön megnézni"
                    help="Nem kerül bele a hirdetésbe és a vevői oldalba."
                    onChange={(privateNote) => change({ privateNote })}
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="editor-preview">
          <BuyerPreviewCard
            item={item}
            facts={facts}
            withTexts
            footer={
              item.shareId ? (
                <p className="preview-foot">
                  {item.publicationOutdated ? (
                    <CircleAlert aria-hidden="true" />
                  ) : (
                    <CircleCheck aria-hidden="true" />
                  )}
                  {item.publicationOutdated
                    ? 'A hirdetésoldal még a korábbi változatot mutatja.'
                    : 'A hirdetésoldal naprakész.'}
                </p>
              ) : (
                <p className="preview-foot">
                  <Link2Off aria-hidden="true" />
                  Még nincs link – a feladásnál hozhatod létre.
                </p>
              )
            }
          />
        </aside>
      </div>

      <div className="editor-bar">
        <ReadyLine problems={problems} />
        {shareButton('btn-lg')}
      </div>

      <CameraCapture
        open={cameraOpen}
        existing={cameraBase}
        remaining={MAX_PHOTOS - cameraBase}
        aiHint={suggestion?.photo.suggestedAngles[0] ?? null}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => void addPhotos([file])}
      />
      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} labelledBy="delete-title">
        <div className="sheet-head">
          <IconBadge tone="warn" size="lg">
            <Trash2 />
          </IconBadge>
          <h2 id="delete-title">Törlöd ezt a tárgyat?</h2>
        </div>
        <p className="sheet-text">
          A fotók, az adatok és a hirdetésoldal is törlődik. Ezt nem lehet visszavonni.
        </p>
        <div className="sheet-actions">
          <button
            type="button"
            className="btn btn-danger-solid btn-lg btn-full"
            disabled={mutating}
            onClick={() => void deleteCurrentItem()}
          >
            <Trash2 aria-hidden="true" />
            Végleges törlés
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-lg btn-full"
            onClick={() => setDeleteOpen(false)}
          >
            Mégse
          </button>
        </div>
      </Sheet>
    </div>
  )
}

function contactSummary(facts: ItemFacts) {
  const value = facts.contactValue.trim()
  const kind =
    facts.contactKind === 'email' ? 'E-mail' : facts.contactKind === 'phone' ? 'Telefon' : 'Link'
  return value ? `${kind} · ${value}` : 'Még nincs megadva'
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span className={`save-indicator is-${state}`} role="status">
      {state === 'saving' || state === 'loading' ? (
        <LoaderCircle className="spin" aria-hidden="true" />
      ) : state === 'saved' ? (
        <Check aria-hidden="true" />
      ) : (
        <CircleAlert aria-hidden="true" />
      )}
      {state === 'saving' || state === 'loading'
        ? 'Mentés…'
        : state === 'saved'
          ? 'Mentve'
          : state === 'conflict'
            ? 'Nincs mentve'
            : 'Mentési hiba'}
    </span>
  )
}

function ReadyLine({ problems }: { problems: string[] }) {
  return problems.length ? (
    <p className="ready-line is-missing">
      <CircleAlert aria-hidden="true" />
      Még {problems.length} dolog hiányzik a feladáshoz
    </p>
  ) : (
    <p className="ready-line">
      <CircleCheck aria-hidden="true" />
      Minden megvan a feladáshoz.
    </p>
  )
}

function isSuggested(source: FactSource) {
  return source === 'ai' || source === 'location'
}

function FieldLabel({
  htmlFor,
  label,
  source,
}: {
  htmlFor: string
  label: string
  source?: FactSource
}) {
  return (
    <div className="field-label-row">
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {source === 'ai' && <AiChip />}
      {source === 'location' && <Chip tone="neutral">Becsült hely</Chip>}
    </div>
  )
}

function ConfirmButton({
  label,
  onConfirm,
  bottom,
}: {
  label: string
  onConfirm: () => void
  bottom?: boolean
}) {
  return (
    <button
      type="button"
      className={bottom ? 'confirm-check is-bottom' : 'confirm-check'}
      aria-label={`${label}: jó így, megerősítem`}
      title="Jó így"
      onClick={onConfirm}
    >
      <span>
        <Check aria-hidden="true" />
      </span>
    </button>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  source,
  onConfirm,
  placeholder,
  help,
  suffix,
  big,
  type = 'text',
  inputMode,
  autoComplete,
  maxLength,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  source?: FactSource
  onConfirm?: () => void
  placeholder?: string
  help?: string
  suffix?: string
  big?: boolean
  type?: 'text' | 'email' | 'tel' | 'url'
  inputMode?: 'text' | 'numeric' | 'email' | 'tel' | 'url'
  autoComplete?: string
  maxLength?: number
}) {
  const suggested = source !== undefined && isSuggested(source)
  const classes = ['input', big && 'input-big', suggested && 'is-suggested', suffix && 'has-suffix']
    .filter(Boolean)
    .join(' ')
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} source={source} />
      <div className={suggested && onConfirm ? 'input-wrap has-confirm' : 'input-wrap'}>
        <input
          id={id}
          className={classes}
          type={type}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete ?? 'off'}
          maxLength={maxLength}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix && (
          <span className="input-suffix" aria-hidden="true">
            {suffix}
          </span>
        )}
        {suggested && onConfirm && <ConfirmButton label={label} onConfirm={onConfirm} />}
      </div>
      {help && (
        <p className="field-help" id={`${id}-help`}>
          {help}
        </p>
      )}
    </div>
  )
}

function TextArea({
  id,
  label,
  value,
  onChange,
  source,
  onConfirm,
  placeholder,
  help,
  rows = 4,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  source?: FactSource
  onConfirm?: () => void
  placeholder?: string
  help?: string
  rows?: number
}) {
  const suggested = source !== undefined && isSuggested(source)
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} source={source} />
      <div className={suggested && onConfirm ? 'input-wrap has-confirm' : 'input-wrap'}>
        <textarea
          id={id}
          className={suggested ? 'input is-suggested' : 'input'}
          value={value}
          rows={rows}
          placeholder={placeholder}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {suggested && onConfirm && <ConfirmButton label={label} onConfirm={onConfirm} bottom />}
      </div>
      {help && (
        <p className="field-help" id={`${id}-help`}>
          {help}
        </p>
      )}
    </div>
  )
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  choices,
  value,
  onChange,
}: {
  legend: string
  name: string
  choices: readonly (readonly [T, string])[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="choices">
      <legend>{legend}</legend>
      <div className="choice-list">
        {choices.map(([choice, label]) => (
          <label key={choice} className={value === choice ? 'choice is-selected' : 'choice'}>
            <input
              type="radio"
              name={name}
              checked={value === choice}
              onChange={() => onChange(choice)}
            />
            <span className="radio-dot" aria-hidden="true" />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function lines(value: string) {
  return value
    .split('\n')
    .map((entry) => entry.replace(/^\s*[•-]\s*/, '').trim())
    .filter(Boolean)
}

function ConditionCard({
  facts,
  item,
  onChange,
}: {
  facts: ItemFacts
  item: ItemRecord
  onChange: (patch: Partial<ItemFacts>) => void
}) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())
  const [focusLast, setFocusLast] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const rows = facts.defects.length ? facts.defects : ['']
  const known = new Set(facts.defects.map((defect) => defect.trim().toLocaleLowerCase('hu')))
  const suggestions = (item.aiSuggestion?.possibleDefects ?? []).filter(
    (defect) => !known.has(defect.trim().toLocaleLowerCase('hu')) && !dismissed.has(defect)
  )
  useEffect(() => {
    if (!focusLast) return
    setFocusLast(false)
    const inputs = listRef.current?.querySelectorAll('input')
    inputs?.[inputs.length - 1]?.focus()
  }, [focusLast])
  const setDefects = (defects: string[]) => onChange({ defectsStatus: 'listed', defects })
  const defectStatus = (value: DefectsStatus) =>
    onChange({ defectsStatus: value, defects: value === 'listed' ? facts.defects : [] })
  const notesSummary = facts.aestheticNotes.length
    ? facts.aestheticNotes.join(', ')
    : 'Nem kötelező · karcok, kopás'
  const accessorySummary =
    facts.accessoriesStatus === 'complete'
      ? 'Minden megvan'
      : facts.accessoriesStatus === 'listed'
        ? facts.accessories.join(', ') || 'Felsorolod, mi van meg'
        : 'Nem kötelező · töltő, doboz, papírok'
  return (
    <section className="card form-card" aria-labelledby="sec-state">
      <h2 id="sec-state">Milyen állapotban van?</h2>
      <ChoiceGroup
        legend="Működik?"
        name="working"
        choices={CONDITION_CHOICES}
        value={facts.workingCondition}
        onChange={(workingCondition) => onChange({ workingCondition })}
      />
      <ChoiceGroup
        legend="Van ismert hibája?"
        name="defects"
        choices={DEFECT_CHOICES}
        value={facts.defectsStatus}
        onChange={defectStatus}
      />
      {facts.defectsStatus === 'listed' && (
        <div className="defects">
          <ul className="defect-list" ref={listRef}>
            {rows.map((defect, index) => (
              <li key={index} className="defect-row">
                <TriangleAlert aria-hidden="true" />
                <input
                  aria-label={`${index + 1}. ismert hiba`}
                  value={defect}
                  placeholder="Például: karcos a hátlapja"
                  onChange={(event) => {
                    const next = [...rows]
                    next[index] = event.target.value
                    setDefects(next)
                  }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`${index + 1}. hiba törlése`}
                  onClick={() => setDefects(rows.filter((_, other) => other !== index))}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setDefects([...rows, ''])
              setFocusLast(true)
            }}
          >
            <Plus aria-hidden="true" />
            Hiba hozzáadása
          </button>
        </div>
      )}
      {suggestions.map((defect) => (
        <div key={defect} className="suggestion-box is-inline">
          <div className="suggestion-head">
            <AiChip label="A fotón látszik" />
            <strong>{defect}</strong>
          </div>
          <div className="notice-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDefects([...facts.defects.filter((entry) => entry.trim()), defect])}
            >
              <Plus aria-hidden="true" />
              Hozzáadom
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDismissed((previous) => new Set(previous).add(defect))}
            >
              Nem igaz
            </button>
          </div>
        </div>
      ))}
      <div className="more-rows">
        <details className="more-row" open={facts.aestheticNotes.length > 0 || undefined}>
          <summary>
            <span>
              <strong>Külső állapot</strong>
              <small>{notesSummary}</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <div className="more-body">
            <textarea
              key={facts.aestheticNotes.join('\n')}
              className="input"
              aria-label="Külső állapot, soronként egy megjegyzés"
              defaultValue={facts.aestheticNotes.join('\n')}
              onBlur={(event) => onChange({ aestheticNotes: lines(event.target.value) })}
              placeholder={'Karcolás a jobb oldalon\nEnyhe használati nyomok'}
              rows={3}
            />
            <p className="field-help">Soronként egy megjegyzés.</p>
          </div>
        </details>
        <details
          className="more-row"
          open={(facts.accessoriesStatus === 'listed' && facts.accessories.length > 0) || undefined}
        >
          <summary>
            <span>
              <strong>Tartozékok</strong>
              <small>{accessorySummary}</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <div className="more-body">
            <ChoiceGroup
              legend="Mi van meg hozzá?"
              name="accessories"
              choices={ACCESSORY_CHOICES}
              value={facts.accessoriesStatus}
              onChange={(accessoriesStatus) =>
                onChange({
                  accessoriesStatus,
                  accessories: accessoriesStatus === 'listed' ? facts.accessories : [],
                })
              }
            />
            {facts.accessoriesStatus === 'listed' && (
              <>
                <textarea
                  key={facts.accessories.join('\n')}
                  className="input"
                  aria-label="Tartozékok, soronként egy"
                  defaultValue={facts.accessories.join('\n')}
                  onBlur={(event) => onChange({ accessories: lines(event.target.value) })}
                  placeholder={'Töltő\nEredeti doboz'}
                  rows={3}
                />
                <p className="field-help">Soronként egy tétel.</p>
              </>
            )}
          </div>
        </details>
      </div>
    </section>
  )
}

function PriceAdvice({
  item,
  facts,
  busy,
  note,
  onResearch,
  onUse,
}: {
  item: ItemRecord
  facts: ItemFacts
  busy: boolean
  note: string
  onResearch: () => void
  onUse: (price: number) => void
}) {
  const suggestion = item.priceSuggestion
  const canSearch = Boolean(facts.model.trim() || facts.title.trim())
  if (!suggestion || busy)
    return (
      <div className="ai-row">
        <IconBadge tone="ai" size="sm">
          <Sparkles />
        </IconBadge>
        <div className="ai-row-text">
          <strong>Mennyit ér?</strong>
          <span>
            {busy
              ? 'Keresem a hasonló hirdetések árát…'
              : note ||
                (canSearch
                  ? 'Megnézzük a hasonló hirdetések árát.'
                  : 'Előbb adj címet vagy típust.')}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy || !canSearch}
          onClick={onResearch}
        >
          {busy && <LoaderCircle className="spin" aria-hidden="true" />}
          Árjavaslat
        </button>
      </div>
    )
  return (
    <div className="price-evidence">
      <div className="suggestion-head">
        <AiChip label="Árjavaslat" />
        {suggestion.priceHuf > 0 ? (
          <strong>{money(suggestion.priceHuf)}</strong>
        ) : (
          <strong>Összehasonlítható árat nem találtunk</strong>
        )}
      </div>
      {suggestion.priceHuf > 0 && (
        <p className="price-range">
          Hasonló hirdetések: {money(suggestion.lowHuf)} – {money(suggestion.highHuf)}
        </p>
      )}
      {suggestion.summary && <p className="price-summary">{suggestion.summary}</p>}
      <div className="notice-actions">
        {suggestion.priceHuf > 0 && facts.priceHuf !== suggestion.priceHuf && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onUse(suggestion.priceHuf)}
          >
            <Check aria-hidden="true" />
            Ezt az árat kérem
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onResearch}>
          <RotateCcw aria-hidden="true" />
          Újrakeresés
        </button>
      </div>
      {note && <p className="field-help">{note}</p>}
      {suggestion.sources.length > 0 && (
        <ul className="source-links">
          {suggestion.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
                <ExternalLink aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {suggestion.searchEntryPoint && (
        <iframe
          className="search-attribution"
          title="Google-keresési javaslatok"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          srcDoc={suggestion.searchEntryPoint}
        />
      )}
    </div>
  )
}

function PhotoBlock({
  item,
  selected,
  uploading,
  queued,
  busy,
  canAdd,
  error,
  onSelect,
  onCamera,
  onFiles,
  onRemove,
  onDismissError,
}: {
  item: ItemRecord
  selected: number
  uploading: boolean
  queued: number
  busy: boolean
  canAdd: boolean
  error: string
  onSelect: (index: number) => void
  onCamera: () => void
  onFiles: (files: File[]) => void
  onRemove: (photoId: string) => void
  onDismissError: () => void
}) {
  const galleryInput = (label: string, content: ReactNode, className: string) => (
    <label className={className}>
      <input
        type="file"
        accept="image/*"
        multiple
        aria-label={label}
        className="visually-hidden"
        onClick={(event) => {
          event.currentTarget.value = ''
        }}
        onChange={(event) => onFiles(Array.from(event.target.files ?? []))}
      />
      {content}
    </label>
  )
  const current = item.photos[selected]
  const errorBox = error && (
    <div className="notice notice-warn" role="alert">
      <CircleAlert aria-hidden="true" />
      <span>{error}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onDismissError}>
        Rendben
      </button>
    </div>
  )
  if (!current)
    return (
      <section className="photo-block" aria-label="Fotók">
        <div className="photo-empty">
          <IconBadge tone="mint" size="lg">
            <Camera />
          </IconBadge>
          <h2>Kezdd egy fotóval</h2>
          <p>Egy kép az egész tárgyról, egy közeli az állapotáról. A többit segítünk kitölteni.</p>
          <div className="photo-empty-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onCamera}
              disabled={uploading}
            >
              <Camera aria-hidden="true" />
              Fotózás
            </button>
            {galleryInput(
              'Galériából',
              <>
                <Images aria-hidden="true" />
                Galériából
              </>,
              'btn btn-secondary file-button'
            )}
          </div>
          {uploading && (
            <p className="photo-empty-status">
              <LoaderCircle className="spin" aria-hidden="true" />
              Feltöltés…
            </p>
          )}
        </div>
        <div className="photo-grid" />
        {errorBox}
      </section>
    )
  return (
    <section className="photo-block" aria-label="Fotók">
      <div className="photo-cover">
        <img src={previewUrl(item.id, current.id)} alt={`Kiválasztott fotó: ${current.name}`} />
        {selected === 0 && <span className="photo-chip is-left">Borítókép</span>}
        <span className="photo-chip is-right">
          {selected + 1} / {item.photos.length}
        </span>
        <button
          type="button"
          className="icon-btn photo-remove"
          aria-label={`${current.name} törlése`}
          disabled={busy}
          onClick={() => onRemove(current.id)}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
      <div className="photo-grid" role="group" aria-label="Fotók listája">
        {item.photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className="photo-thumb"
            aria-label={`${index + 1}. fotó`}
            aria-pressed={index === selected}
            onClick={() => onSelect(index)}
          >
            <img src={previewUrl(item.id, photo.id)} alt="" />
          </button>
        ))}
        {uploading &&
          Array.from({ length: Math.max(1, queued) }, (_, index) => (
            <span key={`pending-${index}`} className="photo-thumb is-pending" aria-hidden="true">
              <LoaderCircle className="spin" />
            </span>
          ))}
        {canAdd && (
          <>
            <button type="button" className="photo-add" onClick={onCamera} aria-label="Fotózás">
              <Camera aria-hidden="true" />
              Fotó
            </button>
            {galleryInput(
              'Galériából',
              <>
                <Images aria-hidden="true" />
                Galéria
              </>,
              'photo-add'
            )}
          </>
        )}
      </div>
      {errorBox}
    </section>
  )
}

function PhotoCoach({
  suggestion,
  note,
  canAdd,
  onCamera,
  onAnalyze,
}: {
  suggestion: NonNullable<ItemRecord['aiSuggestion']>
  note: string
  canAdd: boolean
  onCamera: () => void
  onAnalyze: () => void
}) {
  const { photo } = suggestion
  return (
    <section className="coach" aria-labelledby="coach-title">
      <div className="coach-head">
        <IconBadge tone="ai">
          <Sparkles />
        </IconBadge>
        <div>
          <h2 id="coach-title">Fotótipp</h2>
          <p>
            {photo.ready ? 'Jól felismerhető a tárgy.' : 'Érdemes még egy képet készíteni.'}{' '}
            {photo.summary}
          </p>
        </div>
      </div>
      {photo.issues.length > 0 && (
        <ul className="coach-list">
          {photo.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      {photo.suggestedAngles.length > 0 && (
        <p className="coach-next">
          <strong>Következő kép:</strong> {photo.suggestedAngles.join(', ')}
        </p>
      )}
      {suggestion.possibleDefects.length > 0 && (
        <p className="coach-warn">
          <TriangleAlert aria-hidden="true" />
          <span>
            A képeken ez látszhat: {suggestion.possibleDefects.join('; ')}. Nézd meg a hibáknál,
            hogy szerepel-e.
          </span>
        </p>
      )}
      {note && <p className="field-help is-error">{note}</p>}
      <div className="notice-actions">
        {canAdd && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCamera}>
            <Camera aria-hidden="true" />
            Fotózom
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onAnalyze}>
          <Sparkles aria-hidden="true" />
          Elemezd újra
        </button>
      </div>
    </section>
  )
}
