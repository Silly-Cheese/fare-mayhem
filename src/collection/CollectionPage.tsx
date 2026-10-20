import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { ArrowRight, Check, ChevronDown, Layers3, LoaderCircle, Plus, RefreshCw, ShieldCheck, Star, Trash2 } from 'lucide-react'
import { TradeDesk } from './TradeDesk'
import { backendError } from '../game/backendErrors'
import './collection.css'

type Card={id:string;name:string;nickname:string;rarity:string;stars:number;kind:string;imageUrl:string}
type Deck={slot:number;name:string;ids:string[]}
type Collection={cards:Card[];inventory:{id:string;quantity:number}[];decks:Deck[]}
const loadCollection=httpsCallable<Record<string,never>,Collection>(functions,'getCollectionDashboard')
const saveDeck=httpsCallable<{slot:number;name:string;ids:string[]},{saved:boolean}>(functions,'saveCollectionDeck')
export function CollectionPage({user,onRequireSignIn,onPlay}:{user:User|null;onRequireSignIn:()=>void;onPlay:(slot:number)=>void}){
  const [data,setData]=useState<Collection|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false),[slot,setSlot]=useState(1),[name,setName]=useState('My first dispatch'),[ids,setIds]=useState<string[]>([])
  const [tab,setTab]=useState<'collection'|'decks'|'trades'>('collection')
  async function refresh(){if(!user)return;setBusy(true);setError('');try{const value=(await loadCollection({})).data;setData(value)}catch(e){setError(backendError(e,'My Collection'))}finally{setBusy(false)}}
  useEffect(()=>{setData(null);setIds([]);if(user)void refresh()},[user?.uid])
  function pickSlot(n:number){setSlot(n);const saved=data?.decks.find(x=>x.slot===n);setIds(saved?.ids||[]);setName(saved?.name||`Dispatch Deck ${n}`)}
  function qty(id:string){return data?.inventory.find(x=>x.id===id)?.quantity||0}
  const owned=data?.cards.filter(c=>qty(c.id)>0)||[]
  const total=data?.inventory.reduce((n,item)=>n+item.quantity,0)||0
  const counts=new Map<string,number>()
  ids.forEach(id=>counts.set(id,(counts.get(id)||0)+1))
  function add(id:string){const copies=counts.get(id)||0;if(ids.length>=25||copies>=Math.min(3,qty(id)))return;setIds([...ids,id]);setNotice('')}
  function remove(id:string){const at=ids.lastIndexOf(id);if(at>=0){setIds(ids.filter((_,index)=>index!==at));setNotice('')}}
  async function save(){if(ids.length!==25)return;setBusy(true);setError('');setNotice('');try{await saveDeck({slot,name,ids});setNotice(`Deck ${slot} saved. You can use it in Secure Practice.`);await refresh()}catch(e){setError(backendError(e,'My Collection'))}finally{setBusy(false)}}
  if(!user)return <div className="page-content collection-page"><h1>My Collection</h1><p>Sign in to store the cards you earn and assemble official decks.</p><button className="button primary" onClick={onRequireSignIn}>Sign in <ArrowRight size={16}/></button></div>
  return <div className="page-content collection-page page-enter">
    <div className="collection-heading"><div><span className="eyebrow"><ShieldCheck size={15}/> PHASE 04 · VERIFIED OWNERSHIP</span><h1>My Collection<span className="punctuation">.</span></h1><p>Only cards awarded by the trusted game server or received through a verified trade belong to you. Published cards alone don't give you ownership.</p></div><button className="button outline" onClick={()=>void refresh()} disabled={busy}><RefreshCw size={17}/> Refresh</button></div>
    <div className="collection-summary"><div><b>{total}</b><span>Owned card copies</span></div><div><b>{owned.length}</b><span>Different cards</span></div><div><b>{data?.decks.length||0}/3</b><span>Saved decks</span></div></div>
    <div className="collection-switch"><button className={tab==='collection'?'active':''} onClick={()=>setTab('collection')}><Layers3 size={17}/> Owned cards</button><button className={tab==='decks'?'active':''} onClick={()=>setTab('decks')}><Star size={17}/> Deck builder</button><button className={tab==='trades'?'active':''} onClick={()=>setTab('trades')}><Layers3 size={17}/> Trading</button></div>
    {error&&<p className="studio-warning" role="alert">{error}</p>}
    {data&&tab==='trades'&&<TradeDesk uid={user.uid} cards={data.cards} inventory={data.inventory} refreshCollection={refresh}/>}
    {notice&&<p className="studio-success" role="status"><Check size={17}/> {notice}</p>}
    {busy&&!data&&<p className="collection-empty"><LoaderCircle size={21} className="spin"/> Loading collection…</p>}
    {data&&tab==='collection'&&<><div className="collection-info"><h2>Earn your next driver</h2><p>Win a Secure Practice match to earn up to one random published official card every 24 hours. Rewards only become available after the owner publishes original characters into the registry. Local training battles don't award cards.</p></div>
      {owned.length?<div className="collection-grid">{owned.map(c=><div className="owned-card" key={c.id}><div className="owned-image">{c.imageUrl?<img src={c.imageUrl} alt={c.name}/>:<Layers3 size={38}/>}</div><div className="owned-details"><b>{c.name}</b><small>{c.nickname} · {c.rarity==='transcendent'?'TRANSCENDENT':'★'.repeat(c.stars||1)}</small></div><span className="owned-count">×{qty(c.id)}</span></div>)}</div>:<div className="collection-empty"><Layers3 size={30}/><h3>Your glovebox is empty.</h3><p>Play Secure Practice and win a match after official characters have been released.</p></div>}</>}
    {data&&tab==='decks'&&<><div className="collection-info"><h2>Build your real deck</h2><p>Exactly 25 cards, with no more than three copies of any one card and never more copies than you own. All checks run again on the server when saving or starting a match.</p></div>
      <div className="deck-toolbar"><div className="deck-slots">{[1,2,3].map(n=><button key={n} className={slot===n?'active':''} onClick={()=>pickSlot(n)} type="button">Deck {n}</button>)}</div><label>Deck name<input maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label><strong className={ids.length===25?'deck-ready':''}>{ids.length} / 25 cards</strong></div>
      <div className="deck-builder"><section className="deck-pane"><h3>Your available cards</h3>{owned.length?owned.map(card=><div key={card.id} className="deck-line"><span><b>{card.name}</b><small>Owned: {qty(card.id)} · Deck: {counts.get(card.id)||0}</small></span><button type="button" className="button outline" disabled={ids.length>=25||(counts.get(card.id)||0)>=Math.min(3,qty(card.id))} onClick={()=>add(card.id)} aria-label={`Add ${card.name}`}><Plus size={16}/> Add</button></div>):<p>Win or receive official cards to build a deck.</p>}</section>
      <section className="deck-pane"><h3>Current dispatch order</h3>{[...counts.entries()].map(([id,n])=><div className="deck-line" key={id}><span><b>{data.cards.find(c=>c.id===id)?.name||'Retired card'}</b><small>×{n}</small></span><button className="button outline" onClick={()=>remove(id)} aria-label="Remove card"><Trash2 size={16}/> Remove</button></div>)}{!ids.length&&<p>No cards added yet. Choose from your collection.</p>}</section></div>
      <div className="deck-actions"><button className="button primary" disabled={busy||ids.length!==25||!name.trim()} onClick={()=>void save()}><Check size={17}/> Save verified deck</button><button className="button outline" disabled={!data.decks.some(d=>d.slot===slot)} onClick={()=>onPlay(slot)}>Practice with saved deck <ArrowRight size={17}/></button><span><ChevronDown size={14}/> Deck changes take effect after saving.</span></div></>}
  </div>
}
