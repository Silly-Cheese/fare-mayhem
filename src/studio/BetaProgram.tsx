import {useEffect,useMemo,useState,type FormEvent} from 'react'
import {httpsCallable} from 'firebase/functions'
import {Check,Gift,LoaderCircle,RefreshCw,ShieldCheck,UserCheck,UserMinus,Users,X} from 'lucide-react'
import {functions} from '../firebase'
import {backendError} from '../game/backendErrors'
import type {OfficialCard} from './types'

type Tester={uid:string;email:string;displayName:string;active:boolean;assignedAtMs:number;welcomeGranted:boolean;welcomeCardCount:number}
type GiftChoice={id:string;qty:number}
const listTesters=httpsCallable<Record<string,never>,{testers:Tester[]}>(functions,'listBetaTesters')
const setTester=httpsCallable<{recipientEmail:string;active:boolean},{uid:string;active:boolean}>(functions,'setBetaTester')
const welcomeCall=httpsCallable<{uid:string;cards:GiftChoice[]},{granted:boolean;quantity:number;cardNames:string[]}>(functions,'grantBetaWelcome')
const dropCall=httpsCallable<{uid:string;cards:GiftChoice[]},{granted:boolean;quantity:number;cardNames:string[]}>(functions,'grantBetaCards')

export function BetaProgram({cards,onClose}:{cards:OfficialCard[];onClose:()=>void}){
  const [testers,setTesters]=useState<Tester[]>([])
  const [email,setEmail]=useState('')
  const [search,setSearch]=useState('')
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
  const [error,setError]=useState(''),[notice,setNotice]=useState('')
  const [selectedUid,setSelectedUid]=useState('')
  const [basket,setBasket]=useState<Record<string,number>>({})
  const [confirm,setConfirm]=useState<{type:'welcome'|'drop'|'remove'|'restore';tester:Tester}|null>(null)
  const published=useMemo(()=>cards.filter(c=>c.status==='published').sort((a,b)=>(a.releaseAudience==='beta'? -1:1)-(b.releaseAudience==='beta'?-1:1)||a.name.localeCompare(b.name)),[cards])
  const visible=published.filter(c=>`${c.name} ${c.nickname} ${c.edition}`.toLowerCase().includes(search.toLowerCase()))
  const giftCards=Object.entries(basket).filter(([id,qty])=>qty>0&&published.some(c=>c.id===id)).map(([id,qty])=>({id,qty}))
  const giftTotal=giftCards.reduce((sum,item)=>sum+item.qty,0)
  const selected=testers.find(t=>t.uid===selectedUid)

  async function refresh(){
    setLoading(true)
    try{setTesters((await listTesters({})).data.testers);setError('')}
    catch(e){setError(backendError(e,'Beta Tester Program'))}
    finally{setLoading(false)}
  }
  useEffect(()=>{void refresh()},[])
  async function assign(e:FormEvent){
    e.preventDefault();if(busy||!email.trim())return
    setBusy(true);setError('');setNotice('')
    try{const result=(await setTester({recipientEmail:email.trim(),active:true})).data
      setEmail('');setSelectedUid(result.uid)
      setNotice('Tester status assigned. Select their exact gift cards below when ready.')
      await refresh()
    }catch(e){setError(backendError(e,'Beta Tester Program'))}finally{setBusy(false)}
  }
  function changeQty(id:string,quantity:number){
    setBasket(prev=>({...prev,[id]:Number.isInteger(quantity)?Math.max(0,Math.min(25,quantity)):0}))
  }
  async function confirmAction(){
    if(!confirm||busy)return
    const {type,tester}=confirm
    setConfirm(null);setBusy(true);setError('');setNotice('')
    try{
      if(type==='welcome'||type==='drop'){
        const result=(await (type==='welcome'?welcomeCall:dropCall)({uid:tester.uid,cards:giftCards})).data
        setNotice(`${result.quantity} selected official card copies sent to ${tester.displayName||tester.email}: ${result.cardNames.join(', ')}. The tester can refresh My Collection.`)
        setBasket({})
      }else{
        await setTester({recipientEmail:tester.email,active:type==='restore'})
        setNotice(type==='remove'?`Beta status removed from ${tester.email}. Existing cards stay owned, but beta-only cards become unavailable until status is restored.`:`Beta status restored for ${tester.email}.`)
      }
      await refresh()
    }catch(e){setError(backendError(e,'Beta Tester Program'))}finally{setBusy(false)}
  }
  return <section className="beta-panel" aria-label="Beta Tester Program">
    <header className="beta-head"><div><span className="eyebrow"><ShieldCheck size={15}/> VERIFIED OWNER ONLY</span>
      <h2><Users size={25}/> Beta Tester Program</h2>
      <p>Assign testers, choose their exact free cards, and release special cards only to active testers. No randomized gifts.</p>
    </div><button type="button" className="icon-button" onClick={onClose} aria-label="Close Beta Tester Program"><X size={19}/></button></header>
    <div className="beta-metrics">
      <div><strong>{testers.filter(t=>t.active).length}</strong><span>Active testers</span></div>
      <div><strong>{testers.filter(t=>t.welcomeGranted).length}</strong><span>Welcome gifts delivered</span></div>
      <div><strong>{published.filter(c=>c.releaseAudience==='beta').length}</strong><span>Published Beta Only cards</span></div>
    </div>
    <form className="beta-assign" onSubmit={e=>void assign(e)}>
      <label>Assign an existing player by email<input type="email" required maxLength={254} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)} placeholder="player@example.com" autoComplete="off"/></label>
      <button className="button primary" type="submit" disabled={busy||!email.trim()}><UserCheck size={16}/> Assign Beta Tester</button>
    </form>
    <p className="beta-hint">In Card Studio, set a new card to <b>Beta Only</b> before publishing. Beta-only cards cannot be randomly won in practice or traded. Only active testers can use them in decks.</p>
    {error&&<p className="studio-warning" role="alert">{error}</p>}
    {notice&&<p className="studio-success" role="status"><Check size={16}/>{notice}</p>}
    <div className="beta-roster-head"><h3>Tester roster</h3><button className="button outline" type="button" disabled={busy||loading} onClick={()=>void refresh()}><RefreshCw size={16}/> Refresh</button></div>
    {loading&&<p className="beta-empty"><LoaderCircle size={19} className="spin"/> Loading testers…</p>}
    {!loading&&!testers.length&&<p className="beta-empty">No testers assigned. Start by entering a registered player's email.</p>}
    <div className="beta-roster">{testers.map(t=><div className="beta-tester" key={t.uid}>
      <div className="beta-tester-info"><strong>{t.displayName||'Fare Mayhem driver'}</strong><small>{t.email}</small><span className={t.active?'beta-tag active':'beta-tag'}>{t.active?'Beta Tester':'Inactive'}</span><small>{t.welcomeGranted?`${t.welcomeCardCount} welcome copies delivered`:'Welcome gift not sent'} · Assigned {new Date(t.assignedAtMs).toLocaleDateString()}</small></div>
      <div className="beta-tester-actions">
        {t.active&&<button type="button" className="button primary" disabled={busy} onClick={()=>{setSelectedUid(t.uid);setBasket({});setNotice('Choose the specific cards for this tester below.')}}><Gift size={15}/> Choose cards</button>}
        {t.active?<button type="button" className="button outline" disabled={busy} onClick={()=>setConfirm({type:'remove',tester:t})}><UserMinus size={15}/> Remove access</button>:<button type="button" className="button outline" disabled={busy} onClick={()=>setConfirm({type:'restore',tester:t})}><UserCheck size={15}/> Restore</button>}
      </div>
    </div>)}</div>
    {selected?.active&&<div className="beta-gift-builder">
      <div><span className="eyebrow">CURATED CARD DROP</span><h3>Choose exactly what {selected.displayName||selected.email} receives</h3><p>Select any published cards, including **Beta Only** editions. Enter copy counts from 0–25. Max 25 copies total per grant; no random selection.</p></div>
      <label className="beta-gift-search">Find a published card<input type="search" value={search} placeholder="Search by name or edition…" onChange={e=>setSearch(e.target.value)}/></label>
      <div className="beta-gift-grid">
        {visible.map(c=><label className="beta-gift-card" key={c.id}>
          <div className="beta-gift-card-title">{c.finishedUrl||c.cartoonUrl||c.originalUrl?<img src={c.finishedUrl||c.cartoonUrl||c.originalUrl} alt=""/>:null}<span><b>{c.name}</b><small>{c.edition}</small><em className={c.releaseAudience==='beta'?'beta-tag active':'beta-tag'}>{c.releaseAudience==='beta'?'BETA ONLY':'PUBLIC'}</em></span></div>
          <span>Copies <input type="number" min={0} max={25} disabled={busy} value={basket[c.id]||0} onChange={e=>changeQty(c.id,Number(e.target.value))}/></span>
        </label>)}
      </div>
      <div className="beta-gift-footer"><strong>{giftTotal}/25 copies · {giftCards.length} different cards</strong><div className="beta-tester-actions">
        {!selected.welcomeGranted&&<button type="button" className="button primary" disabled={busy||giftTotal<1||giftTotal>25} onClick={()=>setConfirm({type:'welcome',tester:selected})}><Gift size={15}/> Send one-time welcome gift</button>}
        <button type="button" className="button outline" disabled={busy||giftTotal<1||giftTotal>25} onClick={()=>setConfirm({type:'drop',tester:selected})}><Gift size={15}/> Send additional beta drop</button>
        <button type="button" className="button outline" onClick={()=>{setSelectedUid('');setBasket({})}}>Close</button>
      </div></div>
      <p className="beta-hint">Welcome gifts can be issued once per tester. You may send additional selected-card drops as you create new beta-only releases; every issue is audited.</p>
    </div>}
    {confirm&&<div className="beta-confirm" role="group" aria-label="Confirm beta tester action">
      <h4>Confirm {confirm.type==='welcome'?'welcome cards':confirm.type==='drop'?'additional card drop':confirm.type==='remove'?'access removal':'access restoration'}</h4>
      <p>{confirm.type==='welcome'||confirm.type==='drop'?`Issue ${giftTotal} specific card copies to ${confirm.tester.email}? ${giftCards.map(x=>`${published.find(c=>c.id===x.id)?.name||'Card'} ×${x.qty}`).join(', ')}. This changes their actual inventory.`:confirm.type==='remove'?`Remove beta status for ${confirm.tester.email}? Owned cards remain, but beta-only cards cannot be used while inactive.`:`Restore beta status for ${confirm.tester.email}?`}</p>
      <div className="beta-tester-actions"><button type="button" className="button primary" disabled={busy} onClick={()=>void confirmAction()}><Check size={16}/> Confirm</button><button type="button" className="button outline" onClick={()=>setConfirm(null)}>Cancel</button></div>
    </div>}
  </section>
}
