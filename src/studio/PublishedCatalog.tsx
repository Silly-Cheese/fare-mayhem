import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Images, Search, X } from 'lucide-react'
import { subscribePublished } from './api'
import type { OfficialCard } from './types'
import { ratingLabel } from './types'
import { OfficialCardView } from './OfficialCardView'
export function PublishedCatalog() {
  const [cards, setCards] = useState<OfficialCard[]>([])
  const [search, setSearch] = useState('')
  const [inspect, setInspect] = useState<OfficialCard | null>(null)
  const [original, setOriginal] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => subscribePublished(setCards, e => setError(e.message)), [])
  useEffect(() => { setOriginal(false) }, [inspect?.id])
  const shown = cards.filter(c => `${c.name} ${c.nickname} ${c.ability}`.toLowerCase().includes(search.toLowerCase()))
  return <section className="published-fleet"><div className="section-title"><div><span className="eyebrow">OFFICIAL FARE MAYHEM CARDS</span><h2>Out on the road.</h2><p>Released characters straight from the owner's desk. Training cards appear below.</p></div></div>
    <label className="searchbox"><Search size={17}/><input aria-label="Search official cards" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search released cards..." /></label>
    {error ? <p role="alert" className="studio-warning">Card registry unavailable: {error}. Firestore rules may still need deploying.</p> : shown.length ? <div className="published-grid">{shown.map(card=><OfficialCardView key={card.id} card={card} onClick={()=>setInspect(card)} />)}</div> : <div className="empty-fleet"><Images size={28}/><h3>{cards.length ? 'No drivers match that search.' : 'No official releases yet.'}</h3><p>{cards.length ? 'Try searching for a different driver.' : 'The training roster is ready below. Official cards appear here as soon as the owner publishes them.'}</p></div>}
    {inspect && <div className="dialog-cover" onMouseDown={e=>{if(e.target===e.currentTarget)setInspect(null)}}><section className="dialog published-inspection" role="dialog" aria-modal="true" aria-label={`Inspect ${inspect.name}`}><button className="icon-button dialog-close" onClick={()=>setInspect(null)} aria-label="Close"><X size={20}/></button><div className="published-inspection-art">{original && inspect.originalUrl ? <img src={inspect.originalUrl} alt={`Original artwork for ${inspect.name}`}/> : <OfficialCardView card={inspect} />}</div><div><span className="eyebrow">DRIVER RECORD · {inspect.edition.toUpperCase()}</span><h2>{inspect.name}</h2><h3>{inspect.nickname}</h3><p className="studio-highlight">{ratingLabel(inspect)} {inspect.rarity === 'transcendent' ? '· TRANSCENDENT' : '· DRIVER RATING'}</p><h4>On the clock</h4><p>{inspect.ability}</p>{inspect.flavor&&<><h4>Driver file</h4><p>{inspect.flavor}</p></>}{inspect.customerReview&&<blockquote>“{inspect.customerReview}”</blockquote>}{inspect.originalUrl&&<button className="button outline" onClick={()=>setOriginal(v=>!v)}>{original?'Show official card':'See original drawing'} <ArrowRight size={16}/></button>}<button className="text-button" onClick={()=>setInspect(null)}><ArrowLeft size={15}/> Back to registry</button></div></section></div>}
  </section>
}
