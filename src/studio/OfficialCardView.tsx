import { useState, type CSSProperties } from 'react'
import { Heart, Zap } from 'lucide-react'
import type { OfficialCard } from './types'
import { ratingLabel } from './types'

export function OfficialCardView({ card, onClick, compact = false }: { card: OfficialCard; onClick?: () => void; compact?: boolean }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const artwork = card.cartoonUrl || card.originalUrl
  return <button type="button" className={`official-card ${compact ? 'small' : ''} ${card.rarity === 'transcendent' ? 'transcendent' : ''}`} style={{ '--rx': `${tilt.x}deg`, '--ry': `${tilt.y}deg` } as CSSProperties} onClick={onClick}
    onPointerMove={e => { if (e.pointerType === 'touch') return; const r = e.currentTarget.getBoundingClientRect(); setTilt({ x: ((r.height/2 - (e.clientY-r.top))/r.height)*9, y: (((e.clientX-r.left)-r.width/2)/r.width)*9 }) }} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
    <div className="official-card-head"><span>{card.kind === 'driver' ? 'DRIVER' : 'ACTION'}</span><b><Zap size={12}/> {card.cost}</b></div>
    <div className="official-card-art">{artwork ? <img src={artwork} alt={`${card.name} character artwork`} loading="lazy" /> : <div className="artwork-missing">ARTWORK PENDING</div>}</div>
    <div className="official-card-info"><strong>{card.name || 'Unnamed driver'}</strong><small>{card.nickname || card.edition}</small><span className="official-rating">{ratingLabel(card)}</span><p>{card.ability || 'Ability pending.'}</p></div>
    {card.kind === 'driver' && <div className="official-card-stats"><span><Zap size={13}/>{card.attack}</span><span><Heart size={13}/>{card.health}</span></div>}
  </button>
}
