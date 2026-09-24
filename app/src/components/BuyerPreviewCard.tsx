import { CircleCheck, CircleDashed, ImagePlus, Mail, MapPin, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  composeListing,
  type Destination,
  type ItemFacts,
  type ItemRecord,
} from '@/lib/item-contract'
import { money } from '@/lib/item-display'
import { previewUrl } from '@/lib/photo-client'
import { Chip, PriceTag } from './brand'
import { Segmented } from './controls'

export function conditionChips(facts: ItemFacts) {
  const working =
    facts.workingCondition === 'working' ? (
      <Chip tone="mint" icon={<CircleCheck aria-hidden="true" />}>
        Kipróbálva, működik
      </Chip>
    ) : facts.workingCondition === 'needs_repair' ? (
      <Chip tone="warn" icon={<TriangleAlert aria-hidden="true" />}>
        Javításra szorul
      </Chip>
    ) : (
      <Chip tone="sand" icon={<CircleDashed aria-hidden="true" />}>
        Nincs kipróbálva
      </Chip>
    )
  const defects =
    facts.defectsStatus === 'listed' ? (
      <Chip tone="warn" icon={<TriangleAlert aria-hidden="true" />}>
        {facts.defects.filter((defect) => defect.trim()).length || 1} ismert hiba
      </Chip>
    ) : facts.defectsStatus === 'none' ? (
      <Chip tone="mint" icon={<CircleCheck aria-hidden="true" />}>
        Nem tud hibáról
      </Chip>
    ) : (
      <Chip tone="sand" icon={<CircleDashed aria-hidden="true" />}>
        Hibák: nincs átnézve
      </Chip>
    )
  return (
    <>
      {working}
      {defects}
    </>
  )
}

/** A faithful miniature of the buyer page, plus the marketplace texts on request. */
export function BuyerPreviewCard({
  item,
  facts,
  withTexts,
  footer,
}: {
  item: ItemRecord
  facts: ItemFacts
  withTexts?: boolean
  footer?: ReactNode
}) {
  const [mode, setMode] = useState<'page' | Destination>('page')
  const photo = item.photos[0]
  return (
    <section className="card preview-card" aria-labelledby="buyer-preview-title">
      <h2 id="buyer-preview-title">Így látják a vevők</h2>
      {withTexts && (
        <Segmented
          label="Előnézet típusa"
          compact
          value={mode}
          onChange={setMode}
          options={[
            { value: 'page', label: 'Oldal' },
            { value: 'jofogas', label: 'Jófogás' },
            { value: 'facebook', label: 'Facebook' },
          ]}
        />
      )}
      {mode === 'page' ? (
        <div className="mini-buyer">
          {photo ? (
            <img src={previewUrl(item.id, photo.id)} alt="" />
          ) : (
            <span className="photo-placeholder">
              <ImagePlus aria-hidden="true" />
              Még nincs fotó
            </span>
          )}
          <div className="mini-buyer-body">
            <div className="chip-row">
              {facts.priceHuf === null ? (
                <Chip tone="sand">Nincs még ár</Chip>
              ) : (
                <PriceTag size={17}>{money(facts.priceHuf)}</PriceTag>
              )}
              {facts.negotiable && <Chip>Alkuképes</Chip>}
            </div>
            <strong className="mini-title">{facts.title || 'Névtelen tárgy'}</strong>
            <p className="mini-location">
              <MapPin aria-hidden="true" />
              {facts.city || 'Település még nincs megadva'} · személyes átvétel
            </p>
            <div className="chip-row">{conditionChips(facts)}</div>
            {withTexts && facts.description && <p className="mini-desc">{facts.description}</p>}
            {withTexts && (
              <span className="btn btn-primary btn-sm btn-full is-static" aria-hidden="true">
                <Mail />
                Írok az eladónak
              </span>
            )}
          </div>
        </div>
      ) : (
        <pre className="listing-text">{composeListing(facts, mode)}</pre>
      )}
      {footer}
    </section>
  )
}
