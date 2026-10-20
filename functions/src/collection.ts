import { randomInt } from 'node:crypto'
import { FieldValue, getFirestore, type Transaction } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type { BattleState } from './battle'

const db=()=>getFirestore()
const region='us-central1'
const goodId=(id:unknown):id is string=>typeof id==='string'&&/^[A-Za-z0-9_-]{10,80}$/.test(id)
const requirePlayer=(auth:{uid:string}|undefined)=>{if(!auth?.uid)throw new HttpsError('unauthenticated','Please sign in first.');return auth.uid}
export const getCollectionDashboard=onCall({region,invoker:'public',maxInstances:6,enforceAppCheck:false},async request=>{
  const uid=requirePlayer(request.auth)
  const [inventory,decks,cards]=await Promise.all([
    db().collection('playerCollections').doc(uid).collection('cards').limit(200).get(),
    db().collection('playerDecks').doc(uid).collection('slots').limit(3).get(),
    db().collection('cards').where('status','==','published').limit(150).get()
  ])
  return {
    inventory:inventory.docs.map(x=>({id:x.id,quantity:Number(x.get('quantity'))||0})),
    decks:decks.docs.map(x=>({slot:Number(x.get('slot')),name:String(x.get('name')||''),ids:x.get('ids')||[]})),
    cards:cards.docs.map(x=>({id:x.id,name:String(x.get('name')||''),nickname:String(x.get('nickname')||''),rarity:x.get('rarity'),stars:x.get('stars'),kind:x.get('kind'),imageUrl:x.get('cartoonUrl')||x.get('originalUrl')||''}))
  }
})
export const saveCollectionDeck=onCall({region,invoker:'public',maxInstances:4,enforceAppCheck:false},async request=>{
  const uid=requirePlayer(request.auth),slot=request.data?.slot,ids=request.data?.ids,name=request.data?.name
  if(!Number.isInteger(slot)||slot<1||slot>3)throw new HttpsError('invalid-argument','Choose deck slot 1, 2 or 3.')
  if(typeof name!=='string'||!name.trim()||name.length>40)throw new HttpsError('invalid-argument','Name your deck (40 characters maximum).')
  if(!Array.isArray(ids)||ids.length!==25||ids.some(x=>!goodId(x)))throw new HttpsError('invalid-argument','A deck must contain exactly 25 official cards.')
  const count=new Map<string,number>()
  for(const id of ids){count.set(id,(count.get(id)||0)+1);if(count.get(id)!>3)throw new HttpsError('invalid-argument','Maximum three copies of each card per deck.')}
  await db().runTransaction(async tx=>{
    for(const [id,n] of count){
      const [card,owned]=await Promise.all([
        tx.get(db().doc(`cards/${id}`)),tx.get(db().doc(`playerCollections/${uid}/cards/${id}`))
      ])
      if(!card.exists||card.get('status')!=='published'||!owned.exists||Number(owned.get('quantity')||0)<n)throw new HttpsError('failed-precondition','Your deck includes a card you do not currently own.')
    }
    tx.set(db().doc(`playerDecks/${uid}/slots/slot-${slot}`),{uid,slot,name:name.trim(),ids,updatedAt:FieldValue.serverTimestamp()})
  })
  return{saved:true}
})
/** A server-validated win may reward one published official card, once per 24 hours. */
export async function awardPracticeWin(tx:Transaction,uid:string,state:BattleState):Promise<string|undefined>{
  const gate=db().doc(`collectionRewardGates/${uid}`),previous=await tx.get(gate)
  if(Date.now()-Number(previous.get('awardedAtMs')||0)<86400000)return
  const available=Object.keys(state.cards).filter(id=>id.startsWith('official_')&&state.cards[id].source==='official').map(id=>id.slice('official_'.length))
  if(!available.length)return
  const id=available[randomInt(available.length)]
  const published=await tx.get(db().doc(`cards/${id}`))
  if(!published.exists||published.get('status')!=='published')return
  const inv=db().doc(`playerCollections/${uid}/cards/${id}`),owned=await tx.get(inv)
  const quantity=Number(owned.get('quantity')||0)
  if(quantity>=999)return
  tx.set(inv,{quantity:quantity+1,updatedAt:FieldValue.serverTimestamp()},{merge:true})
  tx.set(db().doc(`issuedCardRegistry/${id}`),{everIssued:true,lastIssuedAt:FieldValue.serverTimestamp()},{merge:true})
  tx.set(gate,{awardedAtMs:Date.now(),lastCardId:id},{merge:true})
  return id
}
