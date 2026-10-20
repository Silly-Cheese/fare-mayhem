import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { ArrowRight, Clock3, Heart, LoaderCircle, Radio, RefreshCw, ShieldCheck, Swords, Users, Zap } from 'lucide-react'
import { backendError } from './backendErrors'
import './online.css'

type Driver={id:string;name:string;nickname:string;kind:'driver'|'action';cost:number;attack:number;health:number;effect:string;imageUrl:string;fullCard?:boolean;rating:string;source:string}
type Unit={id:string;cardId:string;hp:number;ready:boolean}
type Self={reputation:number;fare:number;maxFare:number;deck:string[];hand:string[];board:Unit[];fatigue:number;actionCardsPlayed?:number;actionAllowance?:number;quickArrivalCharges?:number}
type Rival={reputation:number;fare:number;maxFare:number;board:Unit[];handCount:number;deckCount:number}
type View={self:Self;rival:Rival;cards:Record<string,Driver>;turn:'self'|'rival';winner:'self'|'rival'|null;round:number;version:number;log:string[];pendingChoice?:{side:'player'|'opponent';kind:'third_eye_discard'|'action_target';effect?:string;first?:{side:'player'|'opponent';unitId:string}};pendingReaction?:{actor:'player'|'opponent';responder:'player'|'opponent';cardId:string;effect:string;cardName?:string};revealedOpponentHand?:string[]}
type Status={status:'idle'|'waiting'|'matched';joinedAtMs?:number;matchId?:string;role?:string;view?:View;turnDeadlineMs?:number}
type Action={type:'react';useNope:boolean;index?:number}|{type:'choose_target';targetSide:'player'|'opponent';unitId:string}|{type:'choose_discard';index:number}|{type:'end'|'forfeit'}|{type:'play';index:number}|{type:'attack';attackerId:string;targetId?:string}
const join=httpsCallable<{deckSlot:number},{status:string;matchId?:string}>(functions,'joinPvpQueue',{timeout:110000})
const leave=httpsCallable<Record<string,never>,{left:boolean}>(functions,'leavePvpQueue')
const statusCall=httpsCallable<Record<string,never>,Status>(functions,'getPvpStatus')
const act=httpsCallable<{matchId:string;version:number;action:Action},Status>(functions,'takePvpAction')
type PastMatch={matchId:string;won:boolean;rounds:number;finishedAtMs:number}
const historyCall=httpsCallable<Record<string,never>,{matches:PastMatch[]}>(functions,'getPvpHistory')
const explain=(error:unknown)=>backendError(error,'Online PvP')
function Piece({card,unit,select,active,disabled}:{card?:Driver;unit?:Unit;select?:()=>void;active?:boolean;disabled?:boolean}){
  if(!card)return <span className="online-empty">UNAVAILABLE CARD</span>
  return <button type="button" className={`online-piece ${active?'selected':''} ${card.fullCard?'full-print':''}`} disabled={disabled||!select} onClick={select}>
    {card.fullCard&&card.imageUrl?<><img className="online-full-print-image" src={card.imageUrl} loading="lazy" alt={`Complete ${card.name} card`}/>{unit&&<span className="online-live-hp"><Heart size={11}/>{unit.hp} HP · {unit.ready?'READY':'WAIT'}</span>}</>:<>
      <span className="online-piece-cost"><Zap size={12}/>{card.cost}</span>
      <span className="online-piece-image">{card.imageUrl?<img loading="lazy" alt="" src={card.imageUrl}/>:<span>🚕</span>}</span>
      <b>{card.name}</b><small>{card.nickname||card.kind} · {card.effect.replaceAll('_',' ')}</small>
      <span className="online-piece-power"><Swords size={12}/>{card.attack} <Heart size={12}/>{unit?.hp??card.health}{unit&&<em>{unit.ready?'Ready':'Waiting'}</em>}</span>
    </>}
  </button>
}
export function OnlineArena({user,onRequireSignIn}:{user:User|null;onRequireSignIn:()=>void}){
  const [state,setState]=useState<Status>({status:'idle'})
  const [slot,setSlot]=useState(1),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false),[choice,setChoice]=useState<number|null>(null),[attacker,setAttacker]=useState<string|null>(null)
  const [recent,setRecent]=useState<PastMatch[]>([])
  async function refresh(silent=false){
    if(!user)return
    if(!silent)setBusy(true)
    try{
      const latest=(await statusCall({})).data
      setState(previous=>{
        if(previous.status==='matched'&&latest.status==='matched'&&previous.matchId===latest.matchId&&
          (previous.view?.version||0)>(latest.view?.version||0))return previous
        return latest
      })
      setError('')
    }catch(e){if(!silent)setError(explain(e))}
    finally{if(!silent)setBusy(false)}
  }
  useEffect(()=>{
    if(!user){setState({status:'idle'});return}
    let active=true
    const check=async()=>{try{const value=(await statusCall({})).data;if(active)setState(previous=>previous.view?.version&&value.view?.version&&previous.matchId===value.matchId&&previous.view.version>value.view.version?previous:value)}catch(e){if(active)setError(explain(e))}}
    void check()
    void historyCall({}).then(r=>{if(active)setRecent(r.data.matches)}).catch(()=>{/* history is supplementary */})
    const handle=setInterval(()=>{void check()},10000)
    return()=>{active=false;clearInterval(handle)}
  },[user?.uid])
  async function queue(){
    setBusy(true);setError('');setNotice('')
    try{await join({deckSlot:slot});await refresh(true)}
    catch(e){setError(explain(e))}
    finally{setBusy(false)}
  }
  async function cancel(){
    setBusy(true);setError('')
    try{await leave({});setState({status:'idle'});setNotice('You left the matchmaking queue.')}
    catch(e){setError(explain(e));await refresh(true)}
    finally{setBusy(false)}
  }
  async function move(action:Action){
    if(busy||state.status!=='matched'||!state.view||!state.matchId)return
    if(action.type==='forfeit'&&!window.confirm('Forfeit this online match? Your opponent will win.'))return
    setBusy(true);setError('')
    try{const response=(await act({matchId:state.matchId,version:state.view.version,action})).data;setState(response);setChoice(null);setAttacker(null);if(response.view?.winner){void historyCall({}).then(x=>setRecent(x.data.matches)).catch(()=>{})}}
    catch(e){setError(explain(e));await refresh(true)}
    finally{setBusy(false)}
  }
  if(!user)return <section className="page-content online-page"><span className="eyebrow"><Users size={16}/> PHASE 05 · ONLINE MATCHES</span><h1>Fight another dispatcher.</h1><p>Sign in to find another player and compete using your verified card collection.</p><button className="button primary" onClick={onRequireSignIn}>Sign in to battle <ArrowRight size={17}/></button></section>
  const m=state.view,canAct=m?.turn==='self'&&!m?.winner&&!m?.pendingChoice&&!m?.pendingReaction
  return <section className="page-content online-page page-enter">
    <div className="online-heading"><div><span className="eyebrow"><Radio size={16}/> PHASE 05 · LIVE DISPATCH</span><h1>Online Arena<span className="punctuation">.</span></h1><p>Unranked online matches. Official, player-owned decks only. Each move is verified by the server.</p></div><button className="button outline" onClick={()=>void refresh()} disabled={busy}><RefreshCw size={17}/> Refresh</button></div>
    {error&&<p className="studio-warning" role="alert">{error}</p>}
    {notice&&<p className="studio-success" role="status">{notice}</p>}
    {state.status==='idle'&&<div className="online-lobby"><Users size={40}/><h2>Ready for another questionable ride?</h2><p>Build and save a 25-card deck in My Collection before joining. Matchmaking pairs two signed-in players; neither can see the other’s hand or deck order. The original demo cards are not eligible.</p><label>Use your saved collection deck <select value={slot} onChange={e=>setSlot(Number(e.target.value))}>{[1,2,3].map(n=><option key={n} value={n}>Deck {n}</option>)}</select></label><button className="button primary" disabled={busy} onClick={()=>void queue()}>{busy?<LoaderCircle className="spin" size={17}/>:<Swords size={17}/>} Find opponent</button><p className="online-hint">PvP is currently unranked and does not award cards. Matches time out after four minutes without a turn.</p></div>}
    {state.status==='waiting'&&<div className="online-lobby"><LoaderCircle size={43} className="spin"/><h2>Waiting for another dispatcher…</h2><p>Keep this page open. Another signed-in player with a complete saved deck must join. We'll check automatically every 10 seconds.</p><button className="button outline" disabled={busy} onClick={()=>void cancel()}>Leave queue</button><p className="online-hint">Queue reservations expire after five minutes. If it expires, you can join again.</p></div>}
    {state.status==='matched'&&m&&<><div className="online-matchbar"><span><ShieldCheck size={17}/> Verified multiplayer</span><span><Clock3 size={16}/> {m.winner?'Finished':m.turn==='self'?'Your turn':'Opponent’s turn'}</span><span>Round {m.round} · Revision {m.version}</span></div>
      <div className="online-score"><div><strong>RIVAL DISPATCHER</strong><b><Heart size={16}/>{m.rival.reputation} Reputation</b><small>{m.rival.handCount} hidden cards · {m.rival.deckCount} in deck</small></div><div><strong>YOU</strong><b><Heart size={16}/>{m.self.reputation} Reputation</b><small>{m.self.fare} / {m.self.maxFare} Fare · {m.self.deck.length} in deck</small></div></div>
      {m.pendingReaction?.responder===state.role&&<section className="collection-info" aria-label="Nope reaction"><h3>React to {m.pendingReaction.cardName||'an Action'}!</h3><p>Your opponent has played an Action. Use Nope! to cancel it, or let the Action resolve.</p><div className="online-controls">{m.self.hand.map((id,index)=>m.cards[id]?.effect==='nope_cancel_action'&&m.self.fare>=m.cards[id].cost?<button key={index} className="button primary" type="button" disabled={busy} onClick={()=>void move({type:'react',useNope:true,index})}>Use Nope! · {m.cards[id].cost} Fare</button>:null)}<button className="button outline" type="button" disabled={busy} onClick={()=>void move({type:'react',useNope:false})}>Allow Action</button></div></section>}
      {m.pendingReaction?.actor===state.role&&<p className="online-turn-note">Your opponent may respond with Nope! before this Action resolves.</p>}
      {m.pendingChoice?.kind==='action_target'&&<section className="collection-info" aria-label="Choose target Driver"><h3>Choose a Driver</h3><p>{m.pendingChoice.effect?.replaceAll('_',' ')} · {m.pendingChoice.first?'Select the second Driver.':'Select the Driver affected by the Action.'}</p><div className="online-controls">{([...m.self.board.map(u=>({u,targetSide:state.role as 'player'|'opponent'})),...m.rival.board.map(u=>({u,targetSide:(state.role==='player'?'opponent':'player') as 'player'|'opponent'}))]).map(({u,targetSide})=><button key={u.id} className="button outline" type="button" disabled={busy||m.pendingChoice?.first?.unitId===u.id} onClick={()=>void move({type:'choose_target',targetSide,unitId:u.id})}>{targetSide===state.role?'Your':'Opposing'} {m.cards[u.cardId]?.name||'Driver'}</button>)}</div></section>}
      {m.pendingChoice?.kind==='third_eye_discard'&&<section className="collection-info" aria-label="Third-Eye ability"><h3>Third-Eye: select a card from your opponent’s hand</h3><p>Your arrival ability revealed the opposing hand. Select one card to discard.</p><div className="online-controls">{(m.revealedOpponentHand||[]).map((id,index)=><button type="button" className="button outline" key={index} disabled={busy} onClick={()=>void move({type:'choose_discard',index})}>{m.cards[id]?.name||'Opponent card'} · discard</button>)}</div></section>}
      <div className="online-battlefield"><h3>Opponent's road</h3><div className="online-cardrow">{[0,1,2].map(i=>{const u=m.rival.board[i];return u?<Piece key={u.id} card={m.cards[u.cardId]} unit={u} active={!!attacker} disabled={!attacker||busy||!canAct} select={()=>attacker&&void move({type:'attack',attackerId:attacker,targetId:u.id})}/>:<div key={i} className="online-empty">Empty lane</div>})}</div>
        <p className="online-turn-note">{m.winner?(m.winner==='self'?'You won the match!':'Your opponent won the match.'):canAct?'Your dispatch is open. Play a card, attack, or finish your turn.':'Waiting for your opponent to act. Game state refreshes automatically.'}</p>
        <h3>Your road</h3><div className="online-cardrow">{[0,1,2].map(i=>{const u=m.self.board[i];return u?<Piece key={u.id} card={m.cards[u.cardId]} unit={u} active={attacker===u.id} disabled={!u.ready||busy||!canAct} select={()=>{setAttacker(attacker===u.id?null:u.id);setChoice(null)}}/>:<div key={i} className="online-empty">Empty lane</div>})}</div></div>
      <div className="online-hand"><div className="online-hand-head"><h3>Your hand</h3><span>{m.self.hand.length} cards · {m.self.fare} Fare</span></div><div className="online-cardrow">{m.self.hand.map((id,i)=><Piece key={`${m.version}-${i}`} card={m.cards[id]} active={choice===i} disabled={!canAct||busy} select={()=>{setChoice(choice===i?null:i);setAttacker(null)}}/>)}</div>
        <div className="online-controls">
          {choice!==null&&m.self.hand[choice]&&<button className="button primary" disabled={busy||!canAct||(m.cards[m.self.hand[choice]]?.kind==='action'&&((m.self.actionCardsPlayed||0)>=(m.self.actionAllowance||1)||m.cards[m.self.hand[choice]]?.effect==='nope_cancel_action'))||m.self.fare<Math.max(0,(m.cards[m.self.hand[choice]]?.cost??999)-(m.cards[m.self.hand[choice]]?.effect==='discount_self_cost_1'?1:0))||(m.cards[m.self.hand[choice]]?.kind==='driver'&&m.self.board.length>=3)} onClick={()=>void move({type:'play',index:choice})}><Zap size={16}/> Play card</button>}
          {attacker&&!m.rival.board.length&&<button className="button primary" disabled={busy||!canAct} onClick={()=>void move({type:'attack',attackerId:attacker})}><Swords size={16}/> Attack Reputation</button>}
          <button className="button outline" disabled={busy||!canAct} onClick={()=>void move({type:'end'})}><ArrowRight size={16}/> End turn</button>
          {!m.winner&&<button className="button subtle-danger" disabled={busy} onClick={()=>void move({type:'forfeit'})}>Forfeit</button>}
        </div></div>
      <div className="online-match-log"><h3>Dispatch feed</h3><p className="online-hint">Game log descriptions use Dispatcher 1's perspective. Hands and deck order remain private.</p>{m.log.map((msg,i)=><p key={`${m.version}-${i}`}>{msg}</p>)}</div>
      {m.winner&&<div className="online-result"><h2>{m.winner==='self'?'Victory!':'Match finished'}</h2><p>{m.winner==='self'?'Your driver reputation survived.':'The other dispatcher took this one.'} No cards or rankings change in unranked PvP.</p><button className="button primary" disabled={busy} onClick={()=>void queue()}>Find another opponent</button></div>}
    </>}
    {recent.length>0&&<section className="online-match-log online-history"><h3>Recent online matches</h3><div className="online-history-grid">{recent.map(item=><div key={item.matchId}><b>{item.won?'Victory':'Defeat'}</b><span>{item.rounds} rounds</span><small>{new Date(item.finishedAtMs).toLocaleDateString()}</small></div>)}</div></section>}
  </section>
}
