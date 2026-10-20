import { randomUUID } from 'node:crypto'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
const db=getFirestore(),region='us-central1'
type Part={id:string;qty:number}
const good=(id:unknown):id is string=>typeof id==='string'&&/^[A-Za-z0-9_-]{10,80}$/.test(id)
function player(auth:{uid:string}|undefined){if(!auth?.uid)throw new HttpsError('unauthenticated','Sign in to trade.');return auth.uid}
function parts(input:unknown):Part[]{
  if(!Array.isArray(input)||input.length<1||input.length>5)throw new HttpsError('invalid-argument','Trade 1–5 different cards per side.')
  const seen=new Set<string>()
  return input.map(part=>{
    if(!part||typeof part!=='object'||!good(part.id)||!Number.isInteger(part.qty)||part.qty<1||part.qty>3||seen.has(part.id))throw new HttpsError('invalid-argument','Choose unique cards in quantities 1–3.')
    seen.add(part.id);return{id:part.id,qty:part.qty}
  })
}
export const listTradeOffers=onCall({region,maxInstances:5,enforceAppCheck:false},async request=>{
  const uid=player(request.auth)
  const [sent,received]=await Promise.all([
    db.collection('cardTrades').where('senderUid','==',uid).limit(20).get(),
    db.collection('cardTrades').where('recipientUid','==',uid).limit(20).get()
  ])
  return{trades:[...sent.docs,...received.docs].map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>Number(b.createdAtMs)-Number(a.createdAtMs))}
})
export const createTradeOffer=onCall({region,maxInstances:4,enforceAppCheck:false},async request=>{
  const senderUid=player(request.auth),email=request.data?.email
  if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email.trim()))throw new HttpsError('invalid-argument','Enter another registered player’s email.')
  const offered=parts(request.data?.offered),requested=parts(request.data?.requested)
  let recipientUid:string
  try{recipientUid=(await getAuth().getUserByEmail(email.trim())).uid}
  catch{throw new HttpsError('not-found','That player has not registered in Fare Mayhem.')}
  if(senderUid===recipientUid)throw new HttpsError('invalid-argument','You cannot trade with yourself.')
  const id=randomUUID()
  await db.runTransaction(async tx=>{
    const all=new Set([...offered,...requested].map(x=>x.id))
    for(const cardId of all){const card=await tx.get(db.doc(`cards/${cardId}`));if(!card.exists||card.get('status')!=='published')throw new HttpsError('failed-precondition','Trades require published official cards.')}
    for(const c of offered){const owned=await tx.get(db.doc(`playerCollections/${senderUid}/cards/${c.id}`));if(Number(owned.get('quantity')||0)<c.qty)throw new HttpsError('failed-precondition','Not enough copies of your offered cards.')}
    const now=Date.now()
    tx.create(db.doc(`cardTrades/${id}`),{senderUid,recipientUid,offered,requested,status:'pending',createdAtMs:now,expiresAtMs:now+7*86400000})
  })
  return{id}
})
export const respondTradeOffer=onCall({region,maxInstances:6,enforceAppCheck:false},async request=>{
  const uid=player(request.auth),id=request.data?.id,action=request.data?.action
  if(!good(id)||!['accept','decline','cancel'].includes(action))throw new HttpsError('invalid-argument','Invalid trade response.')
  await db.runTransaction(async tx=>{
    const ref=db.doc(`cardTrades/${id}`),snap=await tx.get(ref)
    if(!snap.exists)throw new HttpsError('not-found','Trade not found.')
    const trade=snap.data()!
    if(trade.status!=='pending')throw new HttpsError('failed-precondition','The trade has already been handled.')
    if(action==='cancel'){if(uid!==trade.senderUid)throw new HttpsError('permission-denied','Only the sender can cancel.');tx.update(ref,{status:'cancelled',closedAtMs:Date.now()});return}
    if(uid!==trade.recipientUid)throw new HttpsError('permission-denied','Only the addressed player can respond.')
    if(action==='decline'){tx.update(ref,{status:'declined',closedAtMs:Date.now()});return}
    if(Date.now()>Number(trade.expiresAtMs))throw new HttpsError('deadline-exceeded','Trade offer has expired.')
    const offered=parts(trade.offered),requested=parts(trade.requested)
    const all=new Set([...offered,...requested].map(x=>x.id))
    for(const cardId of all){const card=await tx.get(db.doc(`cards/${cardId}`));if(!card.exists||card.get('status')!=='published')throw new HttpsError('failed-precondition','One of these cards is no longer available.')}
    const delta=new Map<string,number>()
    const change=(user:string,id:string,quantity:number)=>{const key=`${user}/${id}`;delta.set(key,(delta.get(key)||0)+quantity)}
    for(const c of offered){change(trade.senderUid,c.id,-c.qty);change(trade.recipientUid,c.id,c.qty)}
    for(const c of requested){change(trade.recipientUid,c.id,-c.qty);change(trade.senderUid,c.id,c.qty)}
    const changes:{ref:ReturnType<typeof db.doc>;quantity:number}[]=[]
    for(const [key,adjust] of delta){
      const slash=key.indexOf('/'),user=key.slice(0,slash),cardId=key.slice(slash+1)
      const ref=db.doc(`playerCollections/${user}/cards/${cardId}`),owned=await tx.get(ref)
      const newQty=Number(owned.get('quantity')||0)+adjust
      if(newQty<0||newQty>999)throw new HttpsError('failed-precondition','One player no longer has enough cards, or has reached the inventory limit.')
      changes.push({ref,quantity:newQty})
    }
    for(const c of changes)tx.set(c.ref,{quantity:c.quantity,updatedAt:FieldValue.serverTimestamp()},{merge:true})
    tx.update(ref,{status:'accepted',closedAtMs:Date.now()})
  })
  return{success:true}
})
