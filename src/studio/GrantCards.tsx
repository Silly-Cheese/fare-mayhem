import { useMemo, useState, type FormEvent } from 'react'
import { httpsCallable } from 'firebase/functions'
import { CheckCircle2, Gift, LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { functions } from '../firebase'
import { backendError } from '../game/backendErrors'
import type { OfficialCard } from './types'

const singleCall=httpsCallable<{recipientEmail:string;cardId:string;quantity:number},{granted:true}>(functions,'grantOfficialCards')
const deckCall=httpsCallable<{recipientEmail:string;cards:{id:string;qty:number}[]},{granted:true}>(functions,'grantOfficialDeck')
export function GrantCards({cards,onClose}:{cards:OfficialCard[];onClose:()=>void}){
  const [email,setEmail]=useState('')
  const [mode,setMode]=useState<'single'|'deck'>('single')
  const [chosen,setChosen]=useState('')
  const [quantity,setQuantity]=useState(1)
  const [deck,setDeck]=useState<Record<string,number>>({})
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const official=useMemo(()=>cards.filter(c=>c.status==='published').sort((a,b)=>a.name.localeCompare(b.name)),[cards])
  const total=Object.values(deck).reduce((n,qty)=>n+qty,0)
  const types=Object.values(deck).filter(n=>n>0).length
  async function submit(e:FormEvent){
    e.preventDefault()
    if(busy)return
    if(mode==='single'&&!chosen)return
    if(mode==='deck'&&(total!==25||types<9))return
    const message=mode==='single'?`Grant ${quantity} official ${official.find(c=>c.id===chosen)?.name||'card'} card(s) to ${email}?`:`Permanently grant ${total} real official cards to ${email} as a complete starter collection?`
    if(!window.confirm(message))return
    setBusy(true);setError('');setNotice('')
    try{
      if(mode==='single')await singleCall({recipientEmail:email,cardId:chosen,quantity})
      else await deckCall({recipientEmail:email,cards:Object.entries(deck).filter(([,qty])=>qty>0).map(([id,qty])=>({id,qty}))})
      setNotice(`Cards successfully issued to the Firebase account for ${email}. The player can refresh My Collection to see them.`)
    }catch(e){setError(backendError(e,'Owner Card Grants'))}
    finally{setBusy(false)}
  }
  function updateQty(id:string,n:number){setDeck(current=>({...current,[id]:n}))}
  return <section className="grant-panel"><div className="grant-head"><div><span className="eyebrow"><ShieldCheck size={14}/> SINGLE OWNER · VERIFIED DISTRIBUTION</span><h2>Give your official cards to players</h2><p>Issue cards to a real registered player. This does not create new character designs or require the OpenAI API. The server audits every grant. Once issued, these official cards cannot be permanently deleted.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close grants"><X size={19}/></button></div>
    <div className="grant-modes"><button type="button" className={mode==='single'?'active':''} onClick={()=>setMode('single')}>Single card grant</button><button type="button" className={mode==='deck'?'active':''} onClick={()=>setMode('deck')}>Complete 25-card test deck</button></div>
    <form onSubmit={e=>void submit(e)} className="grant-form">
      <label>Player's registered Fare Mayhem email<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="player@example.com"/></label>
      {!official.length&&<p>No published cards yet. Import and publish your original characters in Card Studio first.</p>}
      {mode==='single'?<>
        <label>Official card<select required value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Choose a published card</option>{official.map(c=><option key={c.id} value={c.id}>{c.name} · {c.edition}</option>)}</select></label>
        <label>Copies<input required type="number" min={1} max={25} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
      </>:<>
        <p>Choose exactly 25 copies across at least nine different published official cards. You may give one to three copies of any one card. This lets a second test account build a verified multiplayer deck without waiting for 25 daily practice wins.</p>
        <div className="grant-tally"><b>{total}/25 copies</b><span>{types} different cards (minimum 9)</span></div>
        <div className="grant-grid">{official.map(c=><label key={c.id} className="grant-card"><span>{c.name}<small>{c.edition} · {c.rarity==='standard'?`${c.stars} stars`:c.transcendentLabel}</small></span><select value={deck[c.id]||0} onChange={e=>updateQty(c.id,Number(e.target.value))} aria-label={`Copies of ${c.name}`}>{[0,1,2,3].map(n=><option value={n} key={n}>{n}</option>)}</select></label>)}</div>
      </>}
      {error&&<p role="alert" className="studio-warning">{error}</p>}
      {notice&&<p role="status" className="studio-success"><CheckCircle2 size={15}/>{notice}</p>}
      <button type="submit" className="button primary" disabled={busy||!official.length||(mode==='single'?!chosen||quantity<1||quantity>25:total!==25||types<9)}>{busy?<LoaderCircle className="spin" size={16}/>:<Gift size={16}/>} {busy?'Issuing…':mode==='single'?'Grant official card':'Grant complete 25-card set'}</button>
    </form>
  </section>
}
