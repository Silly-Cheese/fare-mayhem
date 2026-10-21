import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

const db=getFirestore()
const region='us-central1'
const betaConfig={region,invoker:'public' as const,cpu:'gcf_gen1' as const,concurrency:1,maxInstances:3,enforceAppCheck:false}

async function ownerUid(auth:{uid:string;token:Record<string,unknown>}|undefined){
  if(!auth||auth.token.fmOwner!==true)throw new HttpsError('permission-denied','Only the verified Fare Mayhem owner can manage beta testers.')
  const owner=await db.doc('_system/owner').get()
  if(!owner.exists||owner.get('uid')!==auth.uid)throw new HttpsError('permission-denied','Owner identity could not be verified.')
  return auth.uid
}
function playerUid(auth:{uid:string}|undefined){
  if(!auth?.uid)throw new HttpsError('unauthenticated','Sign in to see your beta status.')
  return auth.uid
}
function normalizeEmail(email:unknown){
  if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email.trim()))
    throw new HttpsError('invalid-argument','Enter a valid existing player email address.')
  return email.trim()
}

/** Private status: no player can award themselves tester privileges or cards. */
export const getBetaStatus=onCall({...betaConfig,maxInstances:6},async request=>{
  const uid=playerUid(request.auth)
  const status=await db.doc(`betaTesters/${uid}`).get()
  if(!status.exists)return{active:false,welcomeGranted:false,welcomeCardCount:0}
  return{
    active:status.get('active')===true,
    assignedAtMs:Number(status.get('assignedAtMs')||0),
    welcomeGranted:status.get('welcomeGranted')===true,
    welcomeCardCount:Number(status.get('welcomeCardCount')||0)
  }
})

/** Owner-only roster, capped to avoid unbounded administration queries. */
export const listBetaTesters=onCall(betaConfig,async request=>{
  await ownerUid(request.auth)
  const roster=await db.collection('betaTesters').orderBy('assignedAtMs','desc').limit(100).get()
  return{testers:roster.docs.map(s=>({
    uid:s.id,
    email:String(s.get('email')||''),
    displayName:String(s.get('displayName')||''),
    active:s.get('active')===true,
    assignedAtMs:Number(s.get('assignedAtMs')||0),
    welcomeGranted:s.get('welcomeGranted')===true,
    welcomeCardCount:Number(s.get('welcomeCardCount')||0)
  }))}
})

/** Explicitly assign or remove beta access using an already registered email. */
export const setBetaTester=onCall(betaConfig,async request=>{
  const operatorUid=await ownerUid(request.auth)
  const email=normalizeEmail(request.data?.recipientEmail)
  const active=request.data?.active
  if(typeof active!=='boolean')throw new HttpsError('invalid-argument','Specify whether beta access should be enabled.')
  let player
  try{player=await getAuth().getUserByEmail(email)}
  catch{throw new HttpsError('not-found','No Fare Mayhem account exists with this email. Ask the tester to register first.')}
  if(player.uid===operatorUid)throw new HttpsError('failed-precondition','The owner already has owner access and does not need a tester designation.')
  const ref=db.doc(`betaTesters/${player.uid}`)
  const now=Date.now()
  await db.runTransaction(async tx=>{
    const existing=await tx.get(ref)
    if(!active&&!existing.exists)throw new HttpsError('failed-precondition','This account has not been assigned as a tester.')
    tx.set(ref,{
      uid:player.uid,
      email:player.email||email,
      displayName:player.displayName||'Fare Mayhem player',
      active,
      assignedAtMs:Number(existing.get('assignedAtMs'))||now,
      updatedAtMs:now,
      updatedBy:operatorUid,
      welcomeGranted:existing.get('welcomeGranted')===true,
      welcomeCardCount:Number(existing.get('welcomeCardCount'))||0
    },{merge:true})
  })
  return{uid:player.uid,active}
})

/** One read-only catalog entry point prevents beta-only cards leaking to guests. */
export const getVisibleCatalog=onCall({...betaConfig,maxInstances:8},async request=>{
  let maySeeBeta=false
  const uid=request.auth?.uid
  if(uid){
    const [beta,owner]=await Promise.all([
      db.doc(`betaTesters/${uid}`).get(),
      request.auth?.token.fmOwner===true?db.doc('_system/owner').get():Promise.resolve(null)
    ])
    maySeeBeta=beta.get('active')===true||(owner?.get('uid')===uid)
  }
  const published=await db.collection('cards').where('status','==','published').limit(250).get()
  return{cards:published.docs.filter(x=>x.get('releaseAudience')!=='beta'||maySeeBeta).map(x=>({...x.data(),id:x.id}))}
})

type Selected={id:string;qty:number}
function selectedCards(value:unknown):Selected[]{
  if(!Array.isArray(value)||!value.length||value.length>25)throw new HttpsError('invalid-argument','Choose 1–25 different cards.')
  const seen=new Set<string>()
  let total=0
  const items=value.map((entry:unknown)=>{
    if(!entry||typeof entry!=='object')throw new HttpsError('invalid-argument','Invalid selected card.')
    const item=entry as Record<string,unknown>
    if(typeof item.id!=='string'||!/^[A-Za-z0-9_-]{10,80}$/.test(item.id)||!Number.isInteger(item.qty)||Number(item.qty)<1||Number(item.qty)>25||seen.has(item.id))
      throw new HttpsError('invalid-argument','Choose unique cards, with 1–25 copies each.')
    seen.add(item.id);total+=Number(item.qty)
    return{id:item.id,qty:Number(item.qty)}
  })
  if(total>25)throw new HttpsError('invalid-argument','Issue no more than 25 card copies in one grant.')
  return items
}
async function grantSelectedCards(operatorUid:string,uid:string,items:Selected[],once:boolean){
  const betaRef=db.doc(`betaTesters/${uid}`)
  const rewardRef=db.doc(`betaWelcomeGrants/${uid}`)
  const auditRef=db.collection('inventoryGrantAudit').doc()
  const cardNames:string[]=[]
  await db.runTransaction(async tx=>{
    // All reads happen before any writes. A one-time welcome is atomically idempotent.
    const [beta,claimed,...docs]=await Promise.all([
      tx.get(betaRef),
      ...(once?[tx.get(rewardRef)]:[Promise.resolve(null)]),
      ...items.flatMap(item=>[
        tx.get(db.doc(`cards/${item.id}`)),
        tx.get(db.doc(`playerCollections/${uid}/cards/${item.id}`))
      ])
    ])
    if(!beta.exists||beta.get('active')!==true)throw new HttpsError('failed-precondition','This account is not an active beta tester.')
    if(once&&(claimed?.exists||beta.get('welcomeGranted')===true))
      throw new HttpsError('already-exists','This tester already received a one-time welcome grant.')
    for(let i=0;i<items.length;i++){
      const card=docs[i*2],owned=docs[i*2+1]
      if(!card.exists||card.get('status')!=='published')
        throw new HttpsError('failed-precondition','Only published cards can be issued.')
      if(Number(owned.get('quantity')||0)+items[i].qty>999)
        throw new HttpsError('failed-precondition','This player has reached a card inventory limit.')
      cardNames.push(String(card.get('name')||'Official card'))
    }
    for(let i=0;i<items.length;i++){
      const item=items[i],owned=docs[i*2+1]
      tx.set(db.doc(`playerCollections/${uid}/cards/${item.id}`),{
        quantity:Number(owned.get('quantity')||0)+item.qty,updatedAt:FieldValue.serverTimestamp()
      },{merge:true})
      tx.set(db.doc(`issuedCardRegistry/${item.id}`),{
        everIssued:true,lastIssuedAt:FieldValue.serverTimestamp()
      },{merge:true})
    }
    const quantity=items.reduce((sum,item)=>sum+item.qty,0)
    if(once){
      tx.create(rewardRef,{uid,cards:items,quantity,operatorUid,createdAt:FieldValue.serverTimestamp()})
      tx.update(betaRef,{welcomeGranted:true,welcomeCardCount:quantity,updatedAtMs:Date.now()})
    }
    tx.create(auditRef,{action:once?'beta-welcome':'beta-exclusive-drop',operatorUid,recipientUid:uid,
      cards:items,quantity,createdAt:FieldValue.serverTimestamp()})
  })
  return{granted:true,quantity:items.reduce((sum,item)=>sum+item.qty,0),cardNames}
}

/** Curated first reward, once per account. Cards may include beta-only releases. */
export const grantBetaWelcome=onCall({...betaConfig,timeoutSeconds:60,maxInstances:2},async request=>{
  const operatorUid=await ownerUid(request.auth)
  const uid=request.data?.uid
  if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{10,128}$/.test(uid))
    throw new HttpsError('invalid-argument','Select a tester from the roster.')
  return grantSelectedCards(operatorUid,uid,selectedCards(request.data?.cards),true)
})

/** Owner-controlled additional drops as new beta-only cards are published. */
export const grantBetaCards=onCall({...betaConfig,timeoutSeconds:60,maxInstances:2},async request=>{
  const operatorUid=await ownerUid(request.auth)
  const uid=request.data?.uid
  if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{10,128}$/.test(uid))
    throw new HttpsError('invalid-argument','Select an existing beta tester.')
  return grantSelectedCards(operatorUid,uid,selectedCards(request.data?.cards),false)
})
