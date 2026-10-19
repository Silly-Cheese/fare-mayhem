import { useState, type CSSProperties } from 'react'
import { Zap, Heart, Star, Ticket, Utensils, Fuel, CreditCard } from 'lucide-react'
import { CARDS, type CardId } from '../game/cards'
import { DriverArt } from './Art'

const actionIcons = { snack: Utensils, ticket: Ticket, pitstop: Fuel, surge: CreditCard } as const
export function GameCard({ id, onClick, compact = false, disabled = false, selected = false, label }: { id: CardId; onClick?: () => void; compact?: boolean; disabled?: boolean; selected?: boolean; label?: string }) {
  const card = CARDS[id]
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const Icon = card.type === 'action' ? actionIcons[id as keyof typeof actionIcons] : null
  const style = { '--rx': `${tilt.x}deg`, '--ry': `${tilt.y}deg` } as CSSProperties
  return <button
    type="button" className={`game-card rating-${card.rating} ${compact ? 'compact' : ''} ${disabled ? 'muted' : ''} ${selected ? 'selected' : ''}`}
    style={style} disabled={disabled} aria-label={label ?? `${card.name}, ${card.nickname}, ${card.rating} star card, costs ${card.cost} fare`}
    onPointerMove={event => { if (event.pointerType === 'touch') return; const b = event.currentTarget.getBoundingClientRect(); setTilt({ x: ((b.height/2 - (event.clientY-b.top))/b.height)*12, y: (((event.clientX-b.left) - b.width/2)/b.width)*12 }) }}
    onPointerLeave={() => setTilt({ x: 0, y: 0 })} onClick={onClick}>
      <div className="card-inner">
        <div className="card-top"><span className="card-cost"><Zap size={13} fill="currentColor" />{card.cost}</span><span className="card-category">{card.type === 'driver' ? 'DRIVER' : 'ACTION'}</span></div>
        <div className={`card-illustration art-${id}`}>
          {card.kind ? <DriverArt kind={card.kind} /> : Icon ? <Icon className="action-icon" strokeWidth={1.6} /> : null}
          <span className="illustration-glow" />
        </div>
        <div className="card-content">
          <span className="card-title">{card.name}</span><span className="card-subtitle">{card.nickname}</span>
          <div className="card-rating" title={`${card.rating} star rarity`}>{Array.from({length:5}, (_, i) => <Star key={i} size={12} fill={i < card.rating ? 'currentColor' : 'none'} className={i < card.rating ? 'filled' : 'empty'} />)}</div>
          {!compact && <p className="card-ability">{card.ability}</p>}
        </div>
        {card.type === 'driver' && <div className="card-stats"><span><Zap size={13}/>{card.attack}</span><span><Heart size={13} fill="currentColor"/>{card.health}</span></div>}
      </div>
    </button>
}
