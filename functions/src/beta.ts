import { randomInt } from 'node:crypto'
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

/**
 * Issue exactly five unique published standard cards once per tester.
 * This is an owner-triggered gift, not a player claim or an unrestricted admin grant.
 * The immutable claim and all inventory increments commit in the same transaction.
 */
export const grantBetaWelcome=onCall({...betaConfig,timeoutSeconds:60,maxInstances:2},async request=>{
  const operatorUid=await ownerUid(request.auth)
  const uid=request.data?.uid
  if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{10,128}$/.test(uid))
    throw new HttpsError('invalid-argument','Select an existing tester from the roster.')
  const eligible=await db.collection('cards').where('status','==','published').limit(250).get()
  const choices=eligible.docs.filter(c=>c.get('rarity')==='standard')
  if(choices.length<5)throw new HttpsError('failed-precondition','Publish at least five different standard cards before giving a beta welcome pack.')
  // Secure shuffle without depending on a user's browser or client-provided card IDs.
  for(let i=choices.length-1;i>0;i--){
    const j=randomInt(i+1)
    const temp=choices[i];choices[i]=choices[j];choices[j]=temp
  }
  const selected=choices.slice(0,5)
  const betaRef=db.doc(`betaTesters/${uid}`)
  const rewardRef=db.doc(`betaWelcomeGrants/${uid}`)
  const auditRef=db.collection('inventoryGrantAudit').doc()
  await db.runTransaction(async tx=>{
    const [beta,claimed,...snapshots]=await Promise.all([
      tx.get(betaRef),
      tx.get(rewardRef),
      ...selected.flatMap(c=>[
        tx.get(db.doc(`cards/${c.id}`)),
        tx.get(db.doc(`playerCollections/${uid}/cards/${c.id}`))
      ])
    ])
    if(!beta.exists||beta.get('active')!==true)
      throw new HttpsError('failed-precondition','Only an active tester can receive a welcome pack.')
    if(claimed.exists||beta.get('welcomeGranted')===true)
      throw new HttpsError('already-exists','This tester already received their one-time welcome pack.')
    for(let i=0;i<selected.length;i++){
      const published=snapshots[i*2],inventory=snapshots[i*2+1]
      if(!published.exists||published.get('status')!=='published'||published.get('rarity')!=='standard')
        throw new HttpsError('aborted','One of the selected cards was changed. Retry the gift.')
      if(Number(inventory.get('quantity')||0)>=999)
        throw new HttpsError('failed-precondition','One of the card inventory limits was reached.')
    }
    for(let i=0;i<selected.length;i++){
      const id=selected[i].id,inventory=snapshots[i*2+1]
      tx.set(db.doc(`playerCollections/${uid}/cards/${id}`),{
        quantity:Number(inventory.get('quantity')||0)+1,updatedAt:FieldValue.serverTimestamp()
      },{merge:true})
      tx.set(db.doc(`issuedCardRegistry/${id}`),{
        everIssued:true,lastIssuedAt:FieldValue.serverTimestamp()
      },{merge:true})
    }
    const cards=selected.map(c=>c.id)
    tx.create(rewardRef,{
      uid,cards,quantity:cards.length,operatorUid,claimedAtMs:Date.now(),createdAt:FieldValue.serverTimestamp()
    })
    tx.update(betaRef,{welcomeGranted:true,welcomeCardCount:cards.length,updatedAtMs:Date.now()})
    tx.create(auditRef,{
      action:'beta-welcome',operatorUid,recipientUid:uid,cards,quantity:cards.length,createdAt:FieldValue.serverTimestamp()
    })
  })
  return{granted:true,quantity:5,cardNames:selected.map(c=>String(c.get('name')||'Official card'))}
})
