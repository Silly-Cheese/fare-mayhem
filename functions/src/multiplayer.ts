import { randomInt, randomUUID } from 'node:crypto'
import { getFirestore, type Transaction } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { createBattle, play, attack, endTurn, chooseDiscard, chooseTarget, respondToAction, officialBattleCard, type BattleState, type BattleCard, type Side } from './battle'

const db=()=>getFirestore()
const region='us-central1'
const queueRef=()=>db().doc('pvpQueues/main')
const playerRef=(uid:string)=>db().doc(`pvpPlayers/${uid}`)
const matchRef=(id:string)=>db().doc(`pvpMatches/${id}`)
const QUEUE_TTL=5*60*1000
const TURN_TTL=4*60*1000
const MAX_MATCH_AGE=3*60*60*1000
const slotOk=(v:unknown)=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=3
const idOk=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]{10,80}$/.test(v)
const uidOf=(auth:{uid:string}|undefined)=>{if(!auth?.uid)throw new HttpsError('unauthenticated','Sign in to use online battles.');return auth.uid}
const random=()=>randomInt(0,0x100000000)/0x100000000
type DeckData={ids:string[];cards:BattleCard[]}
async function verifiedDeck(tx:Transaction,uid:string,slot:number):Promise<DeckData>{
  const saved=await tx.get(db().doc(`playerDecks/${uid}/slots/slot-${slot}`))
  const ids=saved.get('ids') as unknown
  if(!Array.isArray(ids)||ids.length!==25||ids.some(x=>!idOk(x)))throw new HttpsError('failed-precondition','Save a complete 25-card deck in My Collection before matchmaking.')
  const counts=new Map<string,number>()
  for(const id of ids){counts.set(id,(counts.get(id)||0)+1);if(counts.get(id)!>3)throw new HttpsError('failed-precondition','Your deck contains too many copies of one card.')}
  const snapshots=await Promise.all([...counts.entries()].map(async([id,qty])=>{
    const [owned,card]=await Promise.all([
      tx.get(db().doc(`playerCollections/${uid}/cards/${id}`)),
      tx.get(db().doc(`cards/${id}`))
    ])
    if(card.get('effectKey')==='divine_judgment_resurrection'&&qty!==1)throw new HttpsError('failed-precondition','Only one God card per PvP deck.')
    if(!card.exists||card.get('status')!=='published'||Number(owned.get('quantity')||0)<qty)throw new HttpsError('failed-precondition','A saved deck contains cards you no longer own or which have been unpublished.')
    const definition=officialBattleCard(id,card.data()!)
    if(!definition)throw new HttpsError('failed-precondition','A deck card has invalid battle metadata.')
    return definition
  }))
  return {ids,cards:snapshots}
}
function visibleMatch(state:BattleState,side:Side){
  const own=state[side],other=state[side==='player'?'opponent':'player']
  const visible=new Set([...own.hand,...own.deck,...own.board.map(x=>x.cardId),...other.board.map(x=>x.cardId)])
  const revealedOpponentHand=state.pendingChoice?.side===side&&state.pendingChoice.kind==='third_eye_discard'?[...other.hand]:undefined
  if(revealedOpponentHand)for(const id of revealedOpponentHand)visible.add(id)
  const cards=Object.fromEntries(Object.entries(state.cards).filter(([id])=>visible.has(id)))
  return{
    self:own,
    rival:{reputation:other.reputation,fare:other.fare,maxFare:other.maxFare,board:other.board,handCount:other.hand.length,deckCount:other.deck.length},
    cards,turn:state.turn===side?'self':'rival',
    winner:state.winner===null?null:state.winner===side?'self':'rival',
    round:state.round,version:state.version,pendingChoice:state.pendingChoice?.side===side?state.pendingChoice:undefined,revealedOpponentHand,
    pendingReaction:state.pendingReaction&&[state.pendingReaction.actor,state.pendingReaction.responder].includes(side)?{...state.pendingReaction,cardName:state.cards[state.pendingReaction.cardId]?.name||'Action'}:undefined,
    // Battle engine log messages are written from player one's perspective.
    log:state.log
  }
}
/** Store a compact, private result for each participant. No browser may write these records. */
function writePvpHistory(tx:Transaction,id:string,firstUid:string,secondUid:string,winner:Side,round:number,finishedAtMs:number){
  for(const [uid,side,opponentUid] of [
    [firstUid,'player',secondUid],
    [secondUid,'opponent',firstUid]
  ] as const){
    tx.set(db().doc(`pvpHistory/${uid}/matches/${id}`),{
      matchId:id,opponentUid,won:winner===side,rounds:round,finishedAtMs,mode:'unranked-pvp'
    })
  }
}
function projection(document:FirebaseFirestore.DocumentSnapshot,uid:string){
  if(!document.exists)throw new HttpsError('not-found','This PvP match does not exist.')
  const first=document.get('firstUid'),second=document.get('secondUid')
  if(first!==uid&&second!==uid)throw new HttpsError('permission-denied','You are not part of that battle.')
  const side:Side=first===uid?'player':'opponent'
  const state=document.get('state') as BattleState
  return{status:'matched',matchId:document.id,role:side,view:visibleMatch(state,side),
    turnDeadlineMs:Number(document.get('turnDeadlineMs')||0),
    firstLabel:'Dispatcher 1',secondLabel:'Dispatcher 2'}
}
async function timedSnapshot(id:string,uid:string){
  const ref=matchRef(id),snapshot=await ref.get()
  if(!snapshot.exists)throw new HttpsError('not-found','PvP match not found.')
  if(snapshot.get('firstUid')!==uid&&snapshot.get('secondUid')!==uid)throw new HttpsError('permission-denied','Match membership required.')
  const state=snapshot.get('state') as BattleState
  if(state.winner||Date.now()<Number(snapshot.get('turnDeadlineMs')||0))return snapshot
  await db().runTransaction(async tx=>{
    const current=await tx.get(ref)
    if(!current.exists)return
    const data=current.get('state') as BattleState
    const deadline=Number(current.get('turnDeadlineMs')||0)
    if(data.winner||Date.now()<deadline)return
    const winner:Side=data.pendingReaction?.actor??(data.turn==='player'?'opponent':'player')
    const finishedAtMs=Date.now()
    tx.update(ref,{state:{...data,winner,version:data.version+1,log:['Time expired. The other dispatcher wins by forfeit.',...data.log].slice(0,24)},finishedAtMs,turnDeadlineMs:0,updatedAtMs:finishedAtMs})
    writePvpHistory(tx,id,current.get('firstUid'),current.get('secondUid'),winner,data.round,finishedAtMs)
  })
  return (await ref.get())
}

export const joinPvpQueue=onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:10,timeoutSeconds:90,enforceAppCheck:false},async request=>{
  const uid=uidOf(request.auth),slot=request.data?.deckSlot
  if(!slotOk(slot))throw new HttpsError('invalid-argument','Select a saved collection deck slot (1–3).')
  let outcome:{status:string;matchId?:string}={status:'waiting'}
  await db().runTransaction(async tx=>{
    const now=Date.now(),selfRef=playerRef(uid),waitingRef=queueRef()
    const [self,queue]=await Promise.all([tx.get(selfRef),tx.get(waitingRef)])
    if(self.get('status')==='matched'&&typeof self.get('matchId')==='string'){
      const prior=await tx.get(matchRef(self.get('matchId')))
      if(prior.exists&&!((prior.get('state') as BattleState).winner)&&now-Number(prior.get('createdAtMs')||0)<MAX_MATCH_AGE){
        outcome={status:'matched',matchId:prior.id};return
      }
    }
    const theirUid=queue.get('uid'),theirSlot=queue.get('deckSlot'),joinedAt=Number(queue.get('joinedAtMs')||0)
    if(theirUid===uid&&now-joinedAt<QUEUE_TTL){
      outcome={status:'waiting'};return
    }
    const own=await verifiedDeck(tx,uid,slot)
    if(typeof theirUid==='string'&&theirUid!==uid&&slotOk(theirSlot)&&now-joinedAt<QUEUE_TTL){
      const partner=await tx.get(playerRef(theirUid))
      if(partner.exists&&partner.get('status')==='waiting'&&partner.get('deckSlot')===theirSlot){
        let theirs:DeckData|undefined
        try{theirs=await verifiedDeck(tx,theirUid,theirSlot)}catch{/* stale or invalid queue entry */}
        if(theirs){
          const cards=[...own.cards,...theirs.cards]
          const game=createBattle(cards,random,theirs.ids,own.ids)
          const id=randomUUID()
          tx.create(matchRef(id),{firstUid:theirUid,secondUid:uid,state:game,createdAtMs:now,updatedAtMs:now,turnDeadlineMs:now+TURN_TTL})
          tx.set(playerRef(theirUid),{status:'matched',matchId:id,updatedAtMs:now})
          tx.set(selfRef,{status:'matched',matchId:id,updatedAtMs:now})
          tx.delete(waitingRef)
          outcome={status:'matched',matchId:id};return
        }
      }
    }
    tx.set(waitingRef,{uid,deckSlot:slot,joinedAtMs:now})
    tx.set(selfRef,{status:'waiting',deckSlot:slot,updatedAtMs:now})
    outcome={status:'waiting'}
  })
  return outcome
})

export const leavePvpQueue=onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:8,enforceAppCheck:false},async request=>{
  const uid=uidOf(request.auth)
  await db().runTransaction(async tx=>{
    const selfRef=playerRef(uid),waitingRef=queueRef()
    const [self,queue]=await Promise.all([tx.get(selfRef),tx.get(waitingRef)])
    if(self.get('status')==='matched')throw new HttpsError('failed-precondition','Your online battle has already started. Use Forfeit in that match.')
    if(queue.get('uid')===uid)tx.delete(waitingRef)
    tx.set(selfRef,{status:'idle',updatedAtMs:Date.now()})
  })
  return{left:true}
})

export const getPvpStatus=onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:12,enforceAppCheck:false},async request=>{
  const uid=uidOf(request.auth),pointer=await playerRef(uid).get()
  if(!pointer.exists||pointer.get('status')==='idle')return{status:'idle'}
  if(pointer.get('status')==='waiting'){
    const queue=await queueRef().get()
    if(queue.get('uid')!==uid||Date.now()-Number(queue.get('joinedAtMs')||0)>=QUEUE_TTL)return{status:'idle'}
    return{status:'waiting',joinedAtMs:queue.get('joinedAtMs')}
  }
  const id=pointer.get('matchId')
  if(typeof id!=='string'||!idOk(id))return{status:'idle'}
  const latest=await timedSnapshot(id,uid)
  return projection(latest,uid)
})

export const takePvpAction=onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:12,timeoutSeconds:35,enforceAppCheck:false},async request=>{
  const uid=uidOf(request.auth),id=request.data?.matchId,action=request.data?.action,version=request.data?.version
  if(!idOk(id))throw new HttpsError('invalid-argument','Invalid match.')
  if(!action||typeof action!=='object'||!['play','attack','end','forfeit','choose_discard','choose_target','react'].includes(action.type))throw new HttpsError('invalid-argument','Invalid match action.')
  if(!Number.isInteger(version)||version<1)throw new HttpsError('invalid-argument','Invalid match revision.')
  const ref=matchRef(id)
  await db().runTransaction(async tx=>{
    const snap=await tx.get(ref)
    if(!snap.exists)throw new HttpsError('not-found','Battle not found.')
    const side:Side=snap.get('firstUid')===uid?'player':'opponent'
    if(snap.get('firstUid')!==uid&&snap.get('secondUid')!==uid)throw new HttpsError('permission-denied','You are not in this match.')
    const current=snap.get('state') as BattleState
    if(current.winner)throw new HttpsError('failed-precondition','Match has finished.')
    if(current.version!==version)throw new HttpsError('aborted','Your opponent moved. Refresh the current battle.')
    const now=Date.now()
    let next:BattleState|null=null
    if(now>=Number(snap.get('turnDeadlineMs')||0)){
      next={...current,winner:current.pendingReaction?.actor??(current.turn==='player'?'opponent':'player'),version:current.version+1,log:['The decision window timed out.',...current.log].slice(0,24)}
    }else if(action.type==='forfeit'){
      next={...current,winner:side==='player'?'opponent':'player',version:current.version+1,log:['A dispatcher forfeited.',...current.log].slice(0,24)}
    }else{
      if(current.pendingReaction){
        if(action.type!=='react'||current.pendingReaction.responder!==side)throw new HttpsError('failed-precondition','Wait for the pending Action reaction.')
      }else{
        if(current.turn!==side)throw new HttpsError('failed-precondition','Wait for your opponent’s turn.')
        if(current.pendingChoice&&!(action.type==='choose_discard'||action.type==='choose_target'))throw new HttpsError('failed-precondition','Resolve the current card choice first.')
      }
      if(action.type==='react'&&typeof action.useNope==='boolean'&&(!action.useNope||(Number.isInteger(action.index)&&action.index>=0&&action.index<8)))next=respondToAction(current,side,action.useNope,action.index)
      else if(action.type==='choose_target'&&typeof action.unitId==='string'&&/^unit-\d{1,7}$/.test(action.unitId)&&(action.targetSide==='player'||action.targetSide==='opponent'))next=chooseTarget(current,side,action.targetSide,action.unitId)
      else if(action.type==='choose_discard'&&Number.isInteger(action.index)&&action.index>=0&&action.index<8)next=chooseDiscard(current,side,action.index)
      else if(action.type==='end')next=endTurn(current)
      else if(action.type==='play'&&Number.isInteger(action.index)&&action.index>=0&&action.index<8)next=play(current,side,action.index)
      else if(action.type==='attack'&&typeof action.attackerId==='string'&&/^unit-\d{1,7}$/.test(action.attackerId)
        &&(action.targetId===undefined||(typeof action.targetId==='string'&&/^unit-\d{1,7}$/.test(action.targetId))))
        next=attack(current,side,action.attackerId,action.targetId)
      if(!next)throw new HttpsError('failed-precondition','That move is not allowed by the battle rules.')
      next.version=current.version+1
    }
    const newDeadline=next.winner?0:(next.turn!==current.turn||!!next.pendingReaction!==!!current.pendingReaction?now+TURN_TTL:Number(snap.get('turnDeadlineMs')))
    tx.update(ref,{state:next,updatedAtMs:now,turnDeadlineMs:newDeadline,...(next.winner?{finishedAtMs:now}:{})})
    if(next.winner)writePvpHistory(tx,id,snap.get('firstUid'),snap.get('secondUid'),next.winner,next.round,now)
  })
  const snap=await ref.get()
  return projection(snap,uid)
})

/** Recent PvP match outcomes, visible only to the authenticated player. */
export const getPvpHistory=onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:6,enforceAppCheck:false},async request=>{
  const uid=uidOf(request.auth)
  const results=await db().collection(`pvpHistory/${uid}/matches`).orderBy('finishedAtMs','desc').limit(12).get()
  return {matches:results.docs.map(d=>({
    matchId:d.id,won:d.get('won')===true,rounds:Number(d.get('rounds')||0),
    finishedAtMs:Number(d.get('finishedAtMs')||0)
  }))}
})
