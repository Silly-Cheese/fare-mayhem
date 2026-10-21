import {useEffect,useMemo,useState,type FormEvent} from 'react'
import {httpsCallable} from 'firebase/functions'
import {Check,Gift,LoaderCircle,RefreshCw,ShieldCheck,UserCheck,UserMinus,Users,X} from 'lucide-react'
import {functions} from '../firebase'
import {backendError} from '../game/backendErrors'
import type {OfficialCard} from './types'

type Tester={
  uid:string;email:string;displayName:string;active:boolean;assignedAtMs:number;
  welcomeGranted:boolean;welcomeCardCount:number
}
const listTesters=httpsCallable<Record<string,never>,{testers:Tester[]}>(functions,'listBetaTesters')
const setTester=httpsCallable<{recipientEmail:string;active:boolean},{uid:string;active:boolean}>(functions,'setBetaTester')
const grantWelcome=httpsCallable<{uid:string},{granted:boolean;quantity:number;cardNames:string[]}>(functions,'grantBetaWelcome')

export function BetaProgram({cards,onClose}:{cards:OfficialCard[];onClose:()=>void}){
  const [testers,setTesters]=useState<Tester[]>([])
  const [email,setEmail]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [confirm,setConfirm]=useState<{type:'gift'|'remove'|'restore';tester:Tester}|null>(null)
  const publishedStandards=useMemo(()=>cards.filter(c=>c.status==='published'&&c.rarity==='standard').length,[cards])
  const activeCount=testers.filter(t=>t.active).length
  async function refresh(){
    setLoading(true)
    try{setTesters((await listTesters({})).data.testers);setError('')}
    catch(e){setError(backendError(e,'Beta Tester Program'))}
    finally{setLoading(false)}
  }
  useEffect(()=>{void refresh()},[])
  async function assign(e:FormEvent){
    e.preventDefault()
    if(!email.trim()||busy)return
    setBusy(true);setError('');setNotice('')
    try{
      await setTester({recipientEmail:email.trim(),active:true})
      setNotice('Beta access granted. The player can sign in and see their Beta Tester status. Welcome cards are issued separately, once.')
      setEmail('')
      await refresh()
    }catch(e){setError(backendError(e,'Beta Tester Program'))}
    finally{setBusy(false)}
  }
  async function confirmAction(){
    if(!confirm||busy)return
    const {type,tester}=confirm
    setConfirm(null);setBusy(true);setError('');setNotice('')
    try{
      if(type==='gift'){
        const result=(await grantWelcome({uid:tester.uid})).data
        setNotice(`${result.quantity} free official cards issued to ${tester.displayName || tester.email}: ${result.cardNames.join(', ')}. They can refresh My Collection.`)
      }else{
        await setTester({recipientEmail:tester.email,active:type==='restore'})
        setNotice(type==='restore'?`Beta access restored for ${tester.email}.`:`Beta access removed for ${tester.email}. Previously issued cards remain theirs.`)
      }
      await refresh()
    }catch(e){setError(backendError(e,'Beta Tester Program'))}
    finally{setBusy(false)}
  }
  return <section className="beta-panel" aria-label="Beta Tester Program">
    <header className="beta-head">
      <div>
        <span className="eyebrow"><ShieldCheck size={15}/> VERIFIED OWNER ONLY</span>
        <h2><Users size={25}/> Beta Tester Program</h2>
        <p>Choose who gets the Beta Tester badge. Reward them with five free, real published standard cards, issued once per account. Players cannot assign themselves or claim additional packs.</p>
      </div>
      <button type="button" className="icon-button" onClick={onClose} aria-label="Close Beta Tester Program"><X size={19}/></button>
    </header>
    <div className="beta-metrics">
      <div><strong>{activeCount}</strong><span>Active testers</span></div>
      <div><strong>{testers.filter(t=>t.welcomeGranted).length}</strong><span>Welcome packs sent</span></div>
      <div><strong>{publishedStandards}</strong><span>Published standard cards</span></div>
    </div>
    <form className="beta-assign" onSubmit={e=>void assign(e)}>
      <label>Assign a registered player by email
        <input type="email" required maxLength={254} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)} placeholder="player@example.com" autoComplete="off"/>
      </label>
      <button className="button primary" type="submit" disabled={busy||!email.trim()}><UserCheck size={16}/> Assign Beta Tester</button>
    </form>
    <p className="beta-hint">The player must already have a Fare Mayhem account. Their account, sign-in methods and card collection stay unchanged. Only you can issue their free welcome cards.</p>
    {publishedStandards<5&&<p className="beta-warning"><Gift size={17}/> Assigning testers works now. Publish at least five distinct standard cards before sending welcome packs.</p>}
    {error&&<p role="alert" className="studio-warning">{error}</p>}
    {notice&&<p role="status" className="studio-success"><Check size={16}/>{notice}</p>}
    <div className="beta-roster-head"><h3>Tester roster</h3><button className="button outline" type="button" disabled={busy||loading} onClick={()=>void refresh()}><RefreshCw size={16}/> Refresh</button></div>
    {loading&&<p className="beta-empty"><LoaderCircle size={19} className="spin"/> Loading verified testers…</p>}
    {!loading&&!testers.length&&<p className="beta-empty">No testers assigned yet. Add your first tester using their existing account email above.</p>}
    <div className="beta-roster">{testers.map(t=><div className="beta-tester" key={t.uid}>
      <div className="beta-tester-info"><strong>{t.displayName||'Fare Mayhem driver'}</strong><small>{t.email}</small><span className={t.active?'beta-tag active':'beta-tag'}>{t.active?'Beta Tester':'Inactive'}</span><small>{t.welcomeGranted?`${t.welcomeCardCount} welcome cards delivered`:'Welcome reward not yet claimed'} · Assigned {new Date(t.assignedAtMs).toLocaleDateString()}</small></div>
      <div className="beta-tester-actions">
        {t.active&&!t.welcomeGranted&&<button type="button" className="button primary" disabled={busy||publishedStandards<5} onClick={()=>setConfirm({type:'gift',tester:t})}><Gift size={15}/> Send 5 free cards</button>}
        {t.active?<button type="button" className="button outline" disabled={busy} onClick={()=>setConfirm({type:'remove',tester:t})}><UserMinus size={15}/> Remove access</button>:<button type="button" className="button outline" disabled={busy} onClick={()=>setConfirm({type:'restore',tester:t})}><UserCheck size={15}/> Restore access</button>}
      </div>
    </div>)}</div>
    {confirm&&<div className="beta-confirm" role="group" aria-label="Confirm beta tester action">
      <h4>Confirm {confirm.type==='gift'?'free welcome cards':confirm.type==='remove'?'access removal':'access restoration'}</h4>
      <p>{confirm.type==='gift'?`Give ${confirm.tester.email} five random distinct published standard cards? This is permanent and can only happen once for this account.`:confirm.type==='remove'?`Remove Beta Tester status from ${confirm.tester.email}? They will keep their existing cards and can still use their regular account.`:`Restore Beta Tester status for ${confirm.tester.email}? This will not issue another welcome pack.`}</p>
      <div className="beta-tester-actions"><button className="button primary" type="button" disabled={busy} onClick={()=>void confirmAction()}><Check size={16}/> Confirm</button><button className="button outline" type="button" onClick={()=>setConfirm(null)}>Cancel</button></div>
    </div>}
  </section>
}
