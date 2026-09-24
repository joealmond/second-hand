import { Link, useNavigate } from '@tanstack/react-router'
import {
  Bike,
  Camera,
  CircleCheck,
  Images,
  LayoutGrid,
  List,
  LoaderCircle,
  LogOut,
  PackageCheck,
  Pencil,
  Search,
  Tag,
  TrendingDown,
  TriangleAlert,
  Upload,
  Watch,
  X,
} from 'lucide-react'
import { useConvexAuth } from 'convex/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { authClient, useSession } from '@/lib/auth-client'
import {
  rememberHomeIntent,
  rememberIntent,
  takeHomeIntent,
  type CaptureIntent,
} from '@/lib/capture-intent'
import { CATEGORY_LABELS, type ItemRecord } from '@/lib/item-contract'
import {
  daysSince,
  deriveTodos,
  DESTINATION_LABELS,
  displayStatus,
  itemMeta,
  money,
  postedSince,
  reportedDestinations,
  type DisplayStatus,
  type Todo,
} from '@/lib/item-display'
import { itemErrorMessage, useItemClient } from '@/lib/item-client'
import { previewUrl } from '@/lib/photo-client'
import { useMediaQuery } from '@/lib/use-media-query'
import { Chip, CountBubble, IconBadge, Logo, PriceTag, StatusPill } from './brand'
import { Menu, MenuItem, Segmented } from './controls'
import { useSellerAccount } from './SellerGate'

type Filter = 'all' | DisplayStatus
type View = 'grid' | 'list'
const VIEW_KEY = 'tovabb:home-view'
const CREATE_AFTER_AUTH_KEY = 'tovabb:create-after-auth'

const FILTERS: { value: Filter; label: string; nav: string; icon: ReactNode }[] = [
  { value: 'all', label: 'Mind', nav: 'Összes tárgy', icon: <LayoutGrid aria-hidden="true" /> },
  { value: 'draft', label: 'Piszkozat', nav: 'Piszkozatok', icon: <Pencil aria-hidden="true" /> },
  { value: 'active', label: 'Megosztva', nav: 'Megosztva', icon: <Tag aria-hidden="true" /> },
  { value: 'sold', label: 'Eladva', nav: 'Eladva', icon: <PackageCheck aria-hidden="true" /> },
]

function readView(): View | null {
  try {
    const stored = window.localStorage.getItem(VIEW_KEY)
    return stored === 'grid' || stored === 'list' ? stored : null
  } catch {
    return null
  }
}

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? [])
}

export function ItemHome() {
  const client = useItemClient()
  const account = useSellerAccount()
  const { data: session, isPending } = useSession()
  const { isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<ItemRecord[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<View | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [allTodos, setAllTodos] = useState(false)
  const [error, setError] = useState('')
  const [now] = useState(() => Date.now())

  useEffect(() => setView(readView()), [])

  const load = useCallback(async () => {
    if (!session?.user || !isAuthenticated) return
    try {
      setItems(await client.list())
    } catch (cause) {
      setError(itemErrorMessage(cause))
    }
  }, [client, isAuthenticated, session?.user])
  useEffect(() => {
    void load()
  }, [load])

  const createDraft = useCallback(async () => {
    setCreating(true)
    try {
      const item = await client.create()
      const intent = takeHomeIntent()
      if (intent) rememberIntent(item.id, intent)
      await navigate({ to: '/item/$itemId', params: { itemId: item.id } })
    } catch (cause) {
      setError(itemErrorMessage(cause))
    } finally {
      setCreating(false)
    }
  }, [client, navigate])
  useEffect(() => {
    if (isAuthenticated && window.sessionStorage.getItem(CREATE_AFTER_AUTH_KEY)) {
      window.sessionStorage.removeItem(CREATE_AFTER_AUTH_KEY)
      void createDraft()
    }
  }, [createDraft, isAuthenticated])

  /** Starts a new item: optionally straight into the camera or with picked photos. */
  async function begin(intent: CaptureIntent = {}) {
    setError('')
    rememberHomeIntent(intent)
    if (!session?.user) {
      setCreating(true)
      window.sessionStorage.setItem(CREATE_AFTER_AUTH_KEY, '1')
      try {
        const result = await authClient.signIn.anonymous()
        if (result.error) throw new Error(result.error.message ?? 'Nem indult el a munkamenet.')
      } catch (cause) {
        window.sessionStorage.removeItem(CREATE_AFTER_AUTH_KEY)
        takeHomeIntent()
        setError(itemErrorMessage(cause))
        setCreating(false)
      }
      return
    }
    if (!isAuthenticated) {
      setCreating(true)
      window.sessionStorage.setItem(CREATE_AFTER_AUTH_KEY, '1')
      return
    }
    await createDraft()
  }

  function beginWithFiles(files: File[]) {
    if (files.length) void begin({ files })
  }

  // A photo dropped anywhere on the page starts an item, instead of the browser
  // opening the image and leaving the app. The drop zone handles its own drops.
  const dropFiles = useRef(beginWithFiles)
  dropFiles.current = beginWithFiles
  useEffect(() => {
    const over = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
    }
    const drop = (event: globalThis.DragEvent) => {
      if (event.defaultPrevented || !event.dataTransfer?.files.length) return
      event.preventDefault()
      dropFiles.current(
        imageFiles(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
      )
    }
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])

  function chooseView(next: View) {
    setView(next)
    try {
      window.localStorage.setItem(VIEW_KEY, next)
    } catch {
      // A remembered view is a convenience only.
    }
  }

  function openTodo(todo: Todo) {
    if (todo.action === 'take-down') rememberIntent(todo.itemId, { soldSheet: true })
    if (todo.action === 'add-photo') rememberIntent(todo.itemId, { camera: true })
    if (todo.action === 'take-down' || todo.action === 'post')
      void navigate({ to: '/item/$itemId/preview', params: { itemId: todo.itemId } })
    else
      void navigate({
        to: '/item/$itemId',
        params: { itemId: todo.itemId },
        hash: todo.action === 'price-cut' ? 'ar' : undefined,
      })
  }

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: 0, draft: 0, active: 0, sold: 0 }
    for (const item of items ?? []) {
      result.all++
      result[displayStatus(item)]++
    }
    return result
  }, [items])
  const todos = useMemo(() => deriveTodos(items ?? [], now), [items, now])
  const needle = query.trim().toLocaleLowerCase('hu')
  const visible = (items ?? []).filter(
    (item) =>
      (filter === 'all' || displayStatus(item) === filter) &&
      [item.facts.title, item.facts.manufacturer, item.facts.model]
        .join(' ')
        .toLocaleLowerCase('hu')
        .includes(needle)
  )
  const stackPhotos = (items ?? [])
    .filter((item) => item.photos[0])
    .slice(0, 2)
    .map((item) => previewUrl(item.id, item.photos[0]!.id))
  const busy = creating || isPending
  const tabletUp = useMediaQuery('(min-width: 700px)')
  const desktop = useMediaQuery('(min-width: 1100px)')
  const effectiveView: View = !tabletUp ? 'grid' : (view ?? (desktop ? 'list' : 'grid'))

  const searchField = (id: string) => (
    <label className="search-field" htmlFor={id}>
      <span className="sr-only">Keresés a tárgyaid között</span>
      <Search aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Keresés a tárgyaid között"
        autoComplete="off"
      />
    </label>
  )

  return (
    <div className="home">
      <aside className="home-sidebar">
        <Logo size={32} />
        <button
          type="button"
          className="btn btn-accent btn-full"
          onClick={() => void begin()}
          disabled={busy}
        >
          {creating ? (
            <LoaderCircle className="spin" aria-hidden="true" />
          ) : (
            <Camera aria-hidden="true" />
          )}
          Új tárgy
        </button>
        <nav className="side-nav" aria-label="Tárgyak szűrése">
          {FILTERS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className="side-nav-item"
              aria-current={filter === entry.value ? 'page' : undefined}
              onClick={() => setFilter(entry.value)}
            >
              {entry.icon}
              <span>{entry.nav}</span>
              <span className="side-nav-count">{items ? counts[entry.value] : ''}</span>
            </button>
          ))}
        </nav>
        <div className="side-spacer" />
        {account && (
          <div className="side-account">
            <span className="avatar" aria-hidden="true">
              {account.initial}
            </span>
            <div className="side-account-text">
              <strong>{account.localTrial ? 'Helyi próba' : account.name}</strong>
              <span>{account.localTrial ? 'Ebben a böngészőben' : account.email}</span>
            </div>
            {account.canSignOut && (
              <button
                type="button"
                className="icon-btn"
                aria-label="Kilépés"
                onClick={account.signOut}
              >
                <LogOut aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </aside>

      <main className="home-main">
        <header className="home-header">
          <Logo size={30} />
          <div className="home-header-search">{searchField('home-search-wide')}</div>
          <div className="home-header-actions">
            <button
              type="button"
              className="icon-btn home-search-toggle"
              aria-label="Keresés a tárgyaid között"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((value) => !value)}
            >
              {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="btn btn-accent home-new-tablet"
              onClick={() => void begin()}
              disabled={busy}
            >
              {creating ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <Camera aria-hidden="true" />
              )}
              Új tárgy
            </button>
            {account && (
              <Menu
                label={`Fiók: ${account.localTrial ? 'helyi próba' : account.email}`}
                icon={<span className="avatar">{account.initial}</span>}
                className="account-menu"
              >
                <div className="menu-caption" role="presentation">
                  <strong>{account.localTrial ? 'Helyi próba' : account.name}</strong>
                  <span>{account.localTrial ? 'Ebben a böngészőben' : account.email}</span>
                </div>
                {account.canSignOut && (
                  <MenuItem icon={<LogOut aria-hidden="true" />} onSelect={account.signOut}>
                    Kilépés
                  </MenuItem>
                )}
              </Menu>
            )}
          </div>
        </header>
        {searchOpen && <div className="home-search-row">{searchField('home-search-phone')}</div>}

        <div className="home-title">
          <div className="home-title-hello">
            <p className="home-hello">Szia!</p>
            <h1>Mit adsz tovább ma?</h1>
          </div>
          <div className="home-title-desk">
            <h1 className="page-title">Tárgyaid</h1>
            {items && (
              <p>
                {counts.all} tárgy · {counts.active} hirdetve · {counts.sold} eladva
              </p>
            )}
          </div>
          <div className="home-title-search">{searchField('home-search-desk')}</div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className={todos.length ? 'home-top' : 'home-top is-single'}>
          <CaptureCard
            busy={busy}
            photos={stackPhotos}
            onCamera={() => void begin({ camera: true })}
            onFiles={beginWithFiles}
          />
          {todos.length > 0 && (
            <section className="todos" aria-labelledby="todos-heading">
              <div className="section-head">
                <h2 id="todos-heading">Teendők</h2>
                <CountBubble>{todos.length}</CountBubble>
              </div>
              <div className="todo-list">
                {(allTodos ? todos : todos.slice(0, 3)).map((todo) => (
                  <TodoCard key={todo.id} todo={todo} onOpen={() => openTodo(todo)} />
                ))}
              </div>
              {todos.length > 3 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm todos-more"
                  aria-expanded={allTodos}
                  onClick={() => setAllTodos((value) => !value)}
                >
                  {allTodos ? 'Kevesebb' : `Még ${todos.length - 3} teendő`}
                </button>
              )}
            </section>
          )}
        </div>

        <div
          className={dragging ? 'drop-zone is-dragging' : 'drop-zone'}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragOver={(event: DragEvent) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            beginWithFiles(
              imageFiles(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
            )
          }}
        >
          <Upload aria-hidden="true" />
          <span>Húzd ide egy tárgy fotóit – új hirdetés lesz belőlük.</span>
          <label className="btn btn-secondary btn-sm file-button">
            <input
              type="file"
              accept="image/*"
              multiple
              className="visually-hidden"
              disabled={busy}
              onClick={(event) => {
                event.currentTarget.value = ''
              }}
              onChange={(event) => beginWithFiles(imageFiles(event.target.files))}
            />
            Fájlok kiválasztása
          </label>
        </div>

        <section className="items" aria-labelledby="items-heading">
          <div className="section-head items-head">
            <h2 id="items-heading">Tárgyaid</h2>
            {items && <CountBubble>{counts.all}</CountBubble>}
            <span className="section-head-spacer" />
            {items && items.length > 0 && (
              <Segmented
                label="Nézet"
                compact
                value={effectiveView}
                onChange={chooseView}
                options={[
                  { value: 'grid', label: 'Rács', icon: <LayoutGrid aria-hidden="true" /> },
                  { value: 'list', label: 'Lista', icon: <List aria-hidden="true" /> },
                ]}
              />
            )}
          </div>
          {items && items.length > 0 && (
            <div className="filter-chips" role="group" aria-label="Szűrés állapot szerint">
              {FILTERS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  className="filter-chip"
                  aria-pressed={filter === entry.value}
                  onClick={() => setFilter(entry.value)}
                >
                  {entry.label}
                  <span>{counts[entry.value]}</span>
                </button>
              ))}
            </div>
          )}

          {items === null && session?.user && (
            <div className="item-grid" aria-busy="true" aria-label="Tárgyak betöltése">
              {[0, 1, 2].map((index) => (
                <div key={index} className="item-card is-skeleton" />
              ))}
            </div>
          )}
          {items?.length === 0 && (
            <div className="empty-card">
              <IconBadge tone="mint" size="lg">
                <Camera />
              </IconBadge>
              <h3>Még nincs tárgyad</h3>
              <p>Az első hirdetéshez egy fotó is elég. A részleteket segítünk kitölteni.</p>
            </div>
          )}
          {items && items.length > 0 && visible.length === 0 && (
            <div className="empty-inline">
              <p>Nincs ilyen tárgy.</p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setQuery('')
                  setFilter('all')
                }}
              >
                Szűrők törlése
              </button>
            </div>
          )}
          {visible.length > 0 &&
            (effectiveView === 'list' ? (
              <ItemTable items={visible} now={now} />
            ) : (
              <div className="item-grid">
                {visible.map((item) => (
                  <ItemCard key={item.id} item={item} now={now} />
                ))}
              </div>
            ))}
        </section>
      </main>

      <button
        type="button"
        className="fab"
        onClick={() => void begin({ camera: true })}
        disabled={busy}
      >
        {creating ? (
          <LoaderCircle className="spin" aria-hidden="true" />
        ) : (
          <Camera aria-hidden="true" />
        )}
        Új tárgy
      </button>
    </div>
  )
}

function CaptureCard({
  busy,
  photos,
  onCamera,
  onFiles,
}: {
  busy: boolean
  photos: string[]
  onCamera: () => void
  onFiles: (files: File[]) => void
}) {
  return (
    <section className="capture-card" aria-labelledby="capture-title">
      <div className="capture-card-top">
        <div>
          <h2 id="capture-title">Új tárgy</h2>
          <p>Fotózd le, a többit segítünk kitölteni.</p>
        </div>
        <div className="photo-stack" aria-hidden="true">
          {photos.length === 2 ? (
            photos.map((src) => <img key={src} src={src} alt="" />)
          ) : (
            <>
              <span className="photo-stack-art">
                <Bike />
              </span>
              <span className="photo-stack-art">
                <Watch />
              </span>
            </>
          )}
        </div>
      </div>
      <p className="capture-tip">
        Egy kép az egész tárgyról és egy közeli az állapotáról – általában ennyi elég.
      </p>
      <div className="capture-actions">
        <button type="button" className="btn btn-hero1" onClick={onCamera} disabled={busy}>
          <Camera aria-hidden="true" />
          Fotózás
        </button>
        <label
          className={busy ? 'btn btn-hero2 file-button is-disabled' : 'btn btn-hero2 file-button'}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="visually-hidden"
            disabled={busy}
            onClick={(event) => {
              event.currentTarget.value = ''
            }}
            onChange={(event) => onFiles(imageFiles(event.target.files))}
          />
          <Images aria-hidden="true" />
          Galériából
        </label>
      </div>
    </section>
  )
}

const TODO_ICONS: Record<Todo['action'], ReactNode> = {
  'take-down': <TriangleAlert />,
  'price-cut': <TrendingDown />,
  'add-photo': <Camera />,
  finish: <Pencil />,
  post: <CircleCheck />,
}

function TodoCard({ todo, onOpen }: { todo: Todo; onOpen: () => void }) {
  return (
    <article className="todo">
      <IconBadge tone={todo.tone}>{TODO_ICONS[todo.action]}</IconBadge>
      <div className="todo-text">
        <h3>{todo.title}</h3>
        <p className="todo-item">{todo.item}</p>
        <p>{todo.text}</p>
        <button type="button" className="btn btn-tonal btn-sm" onClick={onOpen}>
          {todo.cta}
        </button>
      </div>
    </article>
  )
}

function ItemCard({ item, now }: { item: ItemRecord; now: number }) {
  const photo = item.photos[0]
  return (
    <Link to="/item/$itemId" params={{ itemId: item.id }} className="item-card">
      <div className="item-card-photo">
        {photo ? (
          <img src={previewUrl(item.id, photo.id)} alt="" loading="lazy" />
        ) : (
          <span className="photo-placeholder">
            <Camera aria-hidden="true" />
            Nincs még fotó
          </span>
        )}
        <StatusPill status={displayStatus(item)} />
      </div>
      <div className="item-card-body">
        {item.facts.priceHuf === null ? (
          <Chip tone="sand">Nincs még ár</Chip>
        ) : (
          <PriceTag size={14}>{money(item.facts.priceHuf)}</PriceTag>
        )}
        <h3>{item.facts.title || 'Névtelen tárgy'}</h3>
        <p>{itemMeta(item, now)}</p>
      </div>
    </Link>
  )
}

function WhereChips({ item }: { item: ItemRecord }) {
  const status = displayStatus(item)
  const reported = reportedDestinations(item)
  if (!reported.length && !item.shareId) return <span className="muted">Még sehol</span>
  return (
    <div className="chip-row">
      {reported.map((destination) =>
        status === 'sold' ? (
          <Chip key={destination} tone="warn" icon={<TriangleAlert aria-hidden="true" />}>
            {DESTINATION_LABELS[destination]}: vedd le
          </Chip>
        ) : (
          <Chip key={destination} tone="sand">
            Saját jelzés: {DESTINATION_LABELS[destination]}
          </Chip>
        )
      )}
      {item.shareId &&
        (status === 'sold' ? (
          <Chip tone="sand">Link: Elkelt</Chip>
        ) : (
          <Chip tone="mint" icon={<CircleCheck aria-hidden="true" />}>
            Link
          </Chip>
        ))}
    </div>
  )
}

function ItemTable({ items, now }: { items: ItemRecord[]; now: number }) {
  return (
    <div className="item-table-wrap">
      <table className="item-table">
        <thead>
          <tr>
            <th scope="col">Tárgy</th>
            <th scope="col">Ár</th>
            <th scope="col">Állapot</th>
            <th scope="col">Hol van fent?</th>
            <th scope="col">Hirdetési idő</th>
            <th scope="col">
              <span className="sr-only">Műveletek</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const photo = item.photos[0]
            const since = postedSince(item)
            const status = displayStatus(item)
            return (
              <tr key={item.id}>
                <td>
                  <div className="table-item">
                    {photo ? (
                      <img src={previewUrl(item.id, photo.id)} alt="" loading="lazy" />
                    ) : (
                      <span className="photo-placeholder is-small">
                        <Camera aria-hidden="true" />
                      </span>
                    )}
                    <div>
                      <Link to="/item/$itemId" params={{ itemId: item.id }} className="table-title">
                        {item.facts.title || 'Névtelen tárgy'}
                      </Link>
                      <span>{CATEGORY_LABELS[item.facts.category]}</span>
                    </div>
                  </div>
                </td>
                <td className="table-price">{money(item.facts.priceHuf)}</td>
                <td>
                  <StatusPill status={status} />
                </td>
                <td>
                  <WhereChips item={item} />
                </td>
                <td className="muted">
                  {status === 'active' && since !== null ? `${daysSince(since, now)} nap` : '–'}
                </td>
                <td className="table-actions">
                  <Link
                    to="/item/$itemId"
                    params={{ itemId: item.id }}
                    className="btn btn-secondary btn-sm"
                    aria-label={`${item.facts.title || 'Névtelen tárgy'} szerkesztése`}
                  >
                    Szerkesztés
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
