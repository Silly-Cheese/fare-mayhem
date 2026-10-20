import { useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { ArrowLeftRight, Check, RefreshCw, Send, X } from 'lucide-react'
import { functions } from '../firebase'
type Card={id:string;name:string}
type Part={id:string;qty:number}
type Trade={id:string;senderUid:string;recipientUid:string;offered:Part[];requested:Part[];status:string;createdAtMs:number;expiresAtMs:number}
const list=httpsCallable<Record<string,never>,{trades:Trade[]}>(functions,'listTradeOffers')
const create=httpsCallable<{email:string;offered:Part[];requested:Part[]},{id:string}>(functions,'createTradeOffer')
const respond=httpsCallable<{id:string;action:'accept'|'decline'|'cancel'},{success:boolean}>(functions,'respondTradeOffer')
export function TradeDesk({uid,cards,inventory,refreshCollection}:{uid:string;cards:Card[];inventory:{id:string;quantity:number}[];refreshCollection:()=>Promise<void>}){
  const [trades,setTrades]=useState<Trade[]>([]),[email,setEmail]=useState('')
  const [offer,setOffer]=useState<Part[]>([]),[request,setRequest]=useState<Part[]>([])
  const [error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false)
  const qty=(id:string)=>inventory.find(c=>c.id===id)?.quantity||0
  async function reload(){setBusy(true);setError('');try{setTrades((await list({})).data.trades)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
  useEffect(()=>{void reload()},[uid])
  function update(mode:'offer'|'request',id:string,n:number){
    const current=mode==='offer'?offer:request,setter=mode==='offer'?setOffer:setRequest
    const next=current.filter(x=>x.id!==id)
    if(n>0)next.push({id,qty:n})
    setter(next)
  }
  function name(id:string){return cards.find(c=>c.id===id)?.name||'Retired official card'}
  async function send(){
    if(!email||!offer.length||!request.length)return
    if(!window.confirm('Send this trade offer? The recipient must explicitly accept, and card ownership is rechecked at acceptance.'))return
    setBusy(true);setError('');setStatus('')
    try{await create({email,offered:offer,requested:request});setOffer([]);setRequest([]);setEmail('');setStatus('Trade offer sent. The recipient will see it when they open their trading desk.');await reload()}
    catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
  }
  async function decide(id:string,action:'accept'|'decline'|'cancel'){
    if(action==='accept'&&!window.confirm('Accept this trade and exchange the listed cards?'))return
    setBusy(true);setError('');setStatus('')
    try{await respond({id,action});setStatus('Trade updated.');await Promise.all([reload(),refreshCollection()])}
    catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
  }
  const available=cards.filter(x=>qty(x.id)>0)
  return <div className="trade-desk">
    <div className="collection-info"><h2>Verified card trading</h2><p>Send a private offer to another Fare Mayhem account by their sign-in email. Each exchange is checked and completed as one Firestore transaction. Pending offers do not lock your cards, so an offer may fail if inventory changes. No money, payments or real-world items are exchanged.</p></div>
    <div className="trade-form"><div><label>Recipient's Fare Mayhem account email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="another-player@example.com" maxLength={254}/></label>
      <div className="trade-lists"><section><h3>You give</h3>{available.length?available.map(c=><div className="trade-row" key={c.id}><span>{c.name}<small>Owned: {qty(c.id)}</small></span><select aria-label={`Copies of ${c.name} to offer`} value={offer.find(x=>x.id===c.id)?.qty||0} onChange={e=>update('offer',c.id,Number(e.target.value))}>{Array.from({length:Math.min(3,qty(c.id))+1},(_,n)=><option key={n} value={n}>{n}</option>)}</select></div>):<p>No tradeable cards yet.</p>}</section>
      <section><h3>You receive</h3>{cards.map(c=><div className="trade-row" key={c.id}><span>{c.name}</span><select aria-label={`Copies of ${c.name} requested`} value={request.find(x=>x.id===c.id)?.qty||0} onChange={e=>update('request',c.id,Number(e.target.value))}>{[0,1,2,3].map(n=><option value={n} key={n}>{n}</option>)}</select></div>)}</section></div>
      <button className="button primary" disabled={busy||!email||!offer.length||!request.length||offer.length>5||request.length>5} onClick={()=>void send()}><Send size={16}/> Send trade offer</button></div></div>
    <div className="trade-inbox-head"><h2>Trade inbox</h2><button className="button outline" onClick={()=>void reload()} disabled={busy}><RefreshCw size={16}/> Refresh offers</button></div>
    {error&&<p role="alert" className="studio-warning">{error}</p>}
    {status&&<p role="status" className="studio-success"><Check size={16}/> {status}</p>}
    {trades.length?<div className="trade-inbox">{trades.map(t=><article key={t.id} className="trade-offer"><div className="trade-offer-title"><span><ArrowLeftRight size={17}/> {t.senderUid===uid?'Outgoing offer':'Incoming offer'}</span><small>{t.status==='pending'&&Date.now()>t.expiresAtMs?'Expired':t.status.toUpperCase()}</small></div><div className="trade-sides"><div><b>Sender offers</b>{t.offered.map(c=><p key={c.id}>{name(c.id)} ×{c.qty}</p>)}</div><div><b>Recipient gives</b>{t.requested.map(c=><p key={c.id}>{name(c.id)} ×{c.qty}</p>)}</div></div>
      {t.status==='pending'&&Date.now()<=t.expiresAtMs&&<div className="trade-actions">{t.recipientUid===uid?<><button className="button primary" disabled={busy} onClick={()=>void decide(t.id,'accept')}><Check size={16}/> Accept</button><button className="button outline" disabled={busy} onClick={()=>void decide(t.id,'decline')}><X size={16}/> Decline</button></>:<button className="button outline" disabled={busy} onClick={()=>void decide(t.id,'cancel')}><X size={16}/> Cancel offer</button>}</div>}</article>)}</div>:<div className="collection-empty"><ArrowLeftRight size={28}/><h3>No trade offers yet.</h3><p>Sent and received offers will appear here.</p></div>}
  </div>
}
