import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { getAuth } from 'firebase-admin/auth'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { canPublish, validateArtworkPath, validateCard } from './validation'
import { parsePracticeDeckSlot } from './practiceSettings'

initializeApp()
const db = getFirestore()
const region = 'us-central1'

async function requireOwner(auth: { uid:string; token: Record<string, unknown> } | undefined) {
  if (!auth || auth.token.fmOwner !== true) throw new HttpsError('permission-denied', 'Owner access required.')
  const owner = await db.doc('_system/owner').get()
  if (!owner.exists || owner.get('uid') !== auth.uid) throw new HttpsError('permission-denied', 'This account is not the Fare Mayhem owner.')
  return auth.uid
}
function validId(id: unknown): id is string {return typeof id==='string' && /^[A-Za-z0-9_-]{10,80}$/.test(id)}

export const saveOfficialCard = onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1, maxInstances: 3, enforceAppCheck: false}, async request => {
  await requireOwner(request.auth)
  let card
  try{card=validateCard(request.data?.card)}catch(e){throw new HttpsError('invalid-argument',e instanceof Error?e.message:'Invalid card')}
  const id: string = request.data?.id ? request.data.id : db.collection('cardDrafts').doc().id
  if(!validId(id)) throw new HttpsError('invalid-argument','Invalid card ID.')
  for(const type of ['original','cartoon','finished'] as const){
    const path=type==='original'?card.originalStoragePath:type==='cartoon'?card.cartoonStoragePath:card.finishedStoragePath
    if(path && !validateArtworkPath(id,path,type)) throw new HttpsError('invalid-argument','Artwork must belong to this card.')
  }
  const docRef=db.doc(`cardDrafts/${id}`)
  const previous=await docRef.get()
  // Artwork pointers can only be set from the appropriate owner-created Storage object.
  for(const type of ['original','cartoon','finished'] as const){
    const path=type==='original'?card.originalStoragePath:type==='cartoon'?card.cartoonStoragePath:card.finishedStoragePath
    if(path && path !== previous.get(type==='original'?'originalStoragePath':type==='cartoon'?'cartoonStoragePath':'finishedStoragePath')){
      const [exists]=await getStorage().bucket().file(path).exists()
      if(!exists) throw new HttpsError('failed-precondition','Artwork has not finished uploading.')
    }
  }
  await docRef.set({...card,status:previous.get('status')==='published'?'published':'draft', updatedAt:FieldValue.serverTimestamp(),createdAt:previous.get('createdAt')||FieldValue.serverTimestamp()},{merge:true})
  return {id}
})

export const publishOfficialCard = onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1, maxInstances: 3, enforceAppCheck: false}, async request => {
  await requireOwner(request.auth)
  const id=request.data?.id
  if(!validId(id))throw new HttpsError('invalid-argument','Invalid card ID.')
  const source=await db.doc(`cardDrafts/${id}`).get()
  if(!source.exists)throw new HttpsError('not-found','Save the draft first.')
  let card
  try{card=validateCard(source.data())}catch(e){throw new HttpsError('failed-precondition',e instanceof Error?e.message:'Invalid draft')}
  if(!canPublish(card))throw new HttpsError('failed-precondition','A published card needs a name, an ability, and artwork.')
  const batch=db.batch()
  batch.set(db.doc(`cards/${id}`),{...card,status:'published',publishedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()})
  batch.update(source.ref,{status:'published',updatedAt:FieldValue.serverTimestamp()})
  await batch.commit()
  return {published:true}
})

export const retireOfficialCard = onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1, maxInstances: 3, enforceAppCheck: false}, async request => {
  await requireOwner(request.auth)
  const id=request.data?.id
  if(!validId(id))throw new HttpsError('invalid-argument','Invalid card ID.')
  const source=await db.doc(`cardDrafts/${id}`).get()
  if(!source.exists)throw new HttpsError('not-found','Card not found.')
  const batch=db.batch()
  batch.set(db.doc(`cards/${id}`),{status:'retired',retiredAt:FieldValue.serverTimestamp()},{merge:true})
  batch.update(source.ref,{status:'retired',updatedAt:FieldValue.serverTimestamp()})
  await batch.commit()
  return {retired:true}
})

/** Phase 3: every action is validated and applied in a Firestore transaction, never from client game state. */
import { randomInt } from 'node:crypto'
import { awardPracticeWin } from './collection'
import { createBattle, applyCommand, officialBattleCard, publicView, type BattleState, type Command } from './battle'
function requirePlayer(auth: {uid:string} | undefined): string {
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to save and resume secure practice matches.')
  return auth.uid
}
const secureRandom=()=>randomInt(0, 0x100000000)/0x100000000
function checkCommand(data: unknown): Command {
  if (!data || typeof data!=='object') throw new HttpsError('invalid-argument','Missing action.')
  const d=data as Record<string,unknown>
  if(d.type==='end') return {type:'end'}
  if((d.type==='choose_deck_card'||d.type==='remove_jackson')&&Number.isInteger(d.index)&&Number(d.index)>=0&&Number(d.index)<20)return {type:d.type,index:d.index as number}
  if(d.type==='choose_discard' && Number.isInteger(d.index) && Number(d.index)>=0 && Number(d.index)<20) return {type:'choose_discard',index:d.index as number}
  if(d.type==='choose_target'&&typeof d.unitId==='string'&&/^unit-\d{1,7}$/.test(d.unitId)&& (d.targetSide==='player'||d.targetSide==='opponent'))
    return {type:'choose_target',unitId:d.unitId,targetSide:d.targetSide}
  if(d.type==='react'&&typeof d.useNope==='boolean'&&(!d.useNope||(Number.isInteger(d.index)&&Number(d.index)>=0&&Number(d.index)<20)))
    return {type:'react',useNope:d.useNope,index:d.index as number | undefined}
  if(d.type==='play' && Number.isInteger(d.index) && Number(d.index)>=0 && Number(d.index)<20) return {type:'play',index:d.index as number}
  if(d.type==='attack' && typeof d.attackerId==='string' && /^unit-\d{1,7}$/.test(d.attackerId)
     && (d.targetId===undefined || (typeof d.targetId==='string' && /^unit-\d{1,7}$/.test(d.targetId))))
    return {type:'attack',attackerId:d.attackerId,targetId:d.targetId as string | undefined}
  throw new HttpsError('invalid-argument','Invalid battle action.')
}

export const startPracticeMatch = onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:5,timeoutSeconds:30,enforceAppCheck:false}, async request=>{
  const uid=requirePlayer(request.auth)
  if(request.data && (typeof request.data!=='object'||(request.data.restart!==undefined&&typeof request.data.restart!=='boolean')))
    throw new HttpsError('invalid-argument','Invalid practice settings.')
  let deckSlot: number | undefined
  try{deckSlot=parsePracticeDeckSlot(request.data?.deckSlot)}catch{throw new HttpsError('invalid-argument','Invalid collection deck slot.')}
  const restart=request.data?.restart===true
  const ref=db.doc(`practiceMatches/${uid}`)
  // Read and resolve an existing session before doing any additional published-card reads.
  const old=await ref.get()
  if(old.exists && !restart){return {match:publicView(old.get('state') as BattleState),resumed:true}}
  const tester=await db.doc(`betaTesters/${uid}`).get()
  const betaActive=tester.get('active')===true
  const snapshot=await db.collection('cards').where('status','==','published').limit(250).get()
  const eligible=snapshot.docs.filter(d=>d.get('releaseAudience')!=='beta'||(betaActive&&deckSlot!==undefined)).map(d=>officialBattleCard(d.id,d.data())).filter((c):c is NonNullable<typeof c>=>c!==null)
  let ownedIds:string[]|undefined
  if(deckSlot!==undefined){
    const selected=await db.doc(`playerDecks/${uid}/slots/slot-${deckSlot}`).get()
    const ids=selected.get('ids') as unknown
    if(!Array.isArray(ids)||ids.length!==25||ids.some(x=>typeof x!=='string'||!validId(x)))throw new HttpsError('failed-precondition','Select a saved, complete collection deck first.')
    const counts=new Map<string,number>()
    for(const id of ids){counts.set(id,(counts.get(id)||0)+1);if(counts.get(id)!>3)throw new HttpsError('failed-precondition','Deck has too many copies of one card.')}
    const ownedCards=await Promise.all([...counts.entries()].map(async([id,n])=>{
      const [item,source]=await Promise.all([db.doc(`playerCollections/${uid}/cards/${id}`).get(),db.doc(`cards/${id}`).get()])
      if(source.get('releaseAudience')==='beta'&&!betaActive)throw new HttpsError('permission-denied','Active beta status is required for a beta-only deck card.')
      if(source.get('effectKey')==='coach_messi_infinite_wlp_dominion'&&n!==1)throw new HttpsError('failed-precondition','Only one Coach Messi per deck.')
      if(source.get('effectKey')==='divine_judgment_resurrection'&&n!==1)throw new HttpsError('failed-precondition','Only one God per saved deck.')
      if(!source.exists||source.get('status')!=='published'||Number(item.get('quantity')||0)<n)throw new HttpsError('failed-precondition','This deck includes cards you no longer own or which have been retired.')
      const card=officialBattleCard(id,source.data()!)
      if(!card)throw new HttpsError('failed-precondition','A deck card has invalid battle data.')
      return card
    }))
    eligible.push(...ownedCards)
    ownedIds=ids
  }
  const candidate=createBattle(eligible,secureRandom,ownedIds)
  let active:BattleState=candidate
  let resumed=false
  await db.runTransaction(async tx=>{
    const existing=await tx.get(ref)
    const now=Date.now()
    if(existing.exists){
      const state=existing.get('state') as BattleState
      if(!restart){active=state;resumed=true;return}
      const lastStart=existing.get('startedAtMs') as number
      if(typeof lastStart==='number'&&now-lastStart<8000)throw new HttpsError('resource-exhausted','Wait a few seconds before restarting another match.')
    }
    tx.set(ref,{uid,state:candidate,matchId:db.collection('practiceHistory').doc().id,startedAtMs:now,updatedAtMs:now})
  })
  return {match:publicView(active),resumed}
})
export const getPracticeMatch = onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:5,enforceAppCheck:false}, async request=>{
  const uid=requirePlayer(request.auth)
  const snap=await db.doc(`practiceMatches/${uid}`).get()
  if(!snap.exists)throw new HttpsError('not-found','Start a practice match first.')
  return {match:publicView(snap.get('state') as BattleState)}
})
export const takePracticeAction = onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:8,timeoutSeconds:30,enforceAppCheck:false}, async request=>{
  const uid=requirePlayer(request.auth)
  const version=request.data?.version
  if(!Number.isInteger(version)||version<1)throw new HttpsError('invalid-argument','Missing or invalid match version.')
  const command=checkCommand(request.data?.action)
  const ref=db.doc(`practiceMatches/${uid}`)
  let result:BattleState|undefined
  let rewardId:string|undefined
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref)
    if(!snap.exists)throw new HttpsError('not-found','Your practice match no longer exists.')
    const state=snap.get('state') as BattleState
    if(state.version!==version)throw new HttpsError('aborted','Match changed. Reload it to continue.')
    if(state.winner)throw new HttpsError('failed-precondition','This match is already finished.')
    const next=applyCommand(state,command)
    if(!next)throw new HttpsError('failed-precondition','That move is not legal right now.')
    result=next
    if(next.winner==='player')rewardId=await awardPracticeWin(tx,uid,next)
    tx.update(ref,{state:next,updatedAtMs:Date.now()})
    if(next.winner){
      const historyId=snap.get('matchId') as string
      tx.set(db.doc(`practiceHistory/${uid}/matches/${historyId}`),{
        winner:next.winner,rounds:next.round,finishedAt:FieldValue.serverTimestamp(),mode:'secure-practice',
        // Snapshotted battle log, without the AI hand or deck order.
        log:next.log,playerUid:uid,rewardCardId:rewardId||null
      })
    }
  })
  return {match:publicView(result!)}
})

/** Permanently delete an official draft and public registry entry. No player inventory exists in Phase 3. */
export const deleteOfficialCard = onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:2,timeoutSeconds:60,enforceAppCheck:false}, async request=>{
  await requireOwner(request.auth)
  const id=request.data?.id
  const confirmation=request.data?.confirmation
  if(!validId(id))throw new HttpsError('invalid-argument','Invalid card ID.')
  const source=db.doc(`cardDrafts/${id}`),published=db.doc(`cards/${id}`)
  await db.runTransaction(async tx=>{
    const issued=await tx.get(db.doc(`issuedCardRegistry/${id}`))
    if(issued.exists&&issued.get('everIssued')===true)throw new HttpsError('failed-precondition','This card has been awarded to a player. Unpublish it instead; owned cards must not be destroyed.')
    const draft=await tx.get(source)
    if(!draft.exists)throw new HttpsError('not-found','This card has already been deleted.')
    if(typeof confirmation!=='string'||confirmation!==draft.get('name'))throw new HttpsError('failed-precondition','Type the exact driver name to confirm permanent deletion.')
    tx.delete(source)
    tx.delete(published)
  })
  // Remove ALL prior original and generated art under this card ID (including superseded versions).
  let artworkRemoved=true
  try{await getStorage().bucket().deleteFiles({prefix:`card-art/${id}/`,force:true})}
  catch(error){artworkRemoved=false;console.error('Card deleted, but artwork cleanup needs attention',id,error)}
  return {deleted:true,artworkRemoved}
})

export { getCollectionDashboard, saveCollectionDeck } from './collection'

export { listTradeOffers, createTradeOffer, respondTradeOffer } from './trades'

export { joinPvpQueue, leavePvpQueue, getPvpStatus, takePvpAction, getPvpHistory } from './multiplayer'

export { getBetaStatus, listBetaTesters, setBetaTester, grantBetaWelcome, grantBetaCards, getVisibleCatalog } from './beta'

/**
 * Phase 5 — only the verified single owner can distribute published official cards.
 * Intended for limited test collections and planned promotional releases.
 * Clients have no direct writes to inventories or issuance records.
 */
export const grantOfficialCards = onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:3,enforceAppCheck:false},async request=>{
  const operatorUid=await requireOwner(request.auth)
  const email=request.data?.recipientEmail,cardId=request.data?.cardId,quantity=request.data?.quantity
  if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email.trim()))
    throw new HttpsError('invalid-argument','Enter the existing player’s email address.')
  if(!validId(cardId)||!Number.isInteger(quantity)||quantity<1||quantity>25)
    throw new HttpsError('invalid-argument','Choose a published card and 1–25 copies.')
  let recipientUid:string
  try{recipientUid=(await getAuth().getUserByEmail(email.trim())).uid}
  catch{throw new HttpsError('not-found','No Firebase account exists for that email. Ask the player to register first.')}
  const cardRef=db.doc(`cards/${cardId}`)
  const invRef=db.doc(`playerCollections/${recipientUid}/cards/${cardId}`)
  const auditRef=db.collection('inventoryGrantAudit').doc()
  await db.runTransaction(async tx=>{
    const [card,previous,beta]=await Promise.all([tx.get(cardRef),tx.get(invRef),tx.get(db.doc(`betaTesters/${recipientUid}`))])
    if(card.get('releaseAudience')==='beta'&&beta.get('active')!==true)throw new HttpsError('permission-denied','Beta-only card grants require an active beta tester.')
    if(!card.exists||card.get('status')!=='published')
      throw new HttpsError('failed-precondition','Only published official cards can be granted.')
    const current=Number(previous.get('quantity')||0)
    if(current+quantity>999)throw new HttpsError('failed-precondition','Inventory maximum of 999 copies reached.')
    tx.set(invRef,{quantity:current+quantity,updatedAt:FieldValue.serverTimestamp()},{merge:true})
    tx.set(db.doc(`issuedCardRegistry/${cardId}`),{everIssued:true,lastIssuedAt:FieldValue.serverTimestamp()},{merge:true})
    tx.create(auditRef,{operatorUid,recipientUid,cardId,quantity,
      action:'owner-grant',createdAt:FieldValue.serverTimestamp()})
  })
  return{granted:true,recipientUid,quantity}
})

/** One-owner batch grant: distribute exactly one validated 25-card starter deck. */
export const grantOfficialDeck = onCall({region,invoker:'public',cpu:'gcf_gen1',concurrency:1,maxInstances:2,timeoutSeconds:60,enforceAppCheck:false},async request=>{
  const operatorUid=await requireOwner(request.auth)
  const email=request.data?.recipientEmail
  if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email.trim()))
    throw new HttpsError('invalid-argument','Enter an existing player account email.')
  const entries=request.data?.cards
  if(!Array.isArray(entries)||entries.length<9||entries.length>25)
    throw new HttpsError('invalid-argument','Choose at least nine different official cards for a 25-card deck.')
  let total=0
  const seen=new Set<string>()
  const chosen:{id:string;qty:number}[]=[]
  for(const input of entries){
    if(!input||!validId(input.id)||!Number.isInteger(input.qty)||input.qty<1||input.qty>3||seen.has(input.id))
      throw new HttpsError('invalid-argument','Each selected card must be unique and have one to three copies.')
    chosen.push({id:input.id,qty:input.qty})
    seen.add(input.id);total+=input.qty
  }
  if(total!==25)throw new HttpsError('invalid-argument','A starter deck grant must contain exactly 25 card copies.')
  let recipientUid:string
  try{recipientUid=(await getAuth().getUserByEmail(email.trim())).uid}
  catch{throw new HttpsError('not-found','Player account does not exist; register it first.')}
  const auditRef=db.collection('inventoryGrantAudit').doc()
  await db.runTransaction(async tx=>{
    // All reads precede any writes, as required by Firestore transactions.
    const recipientBeta=await tx.get(db.doc(`betaTesters/${recipientUid}`))
    const snapshots=await Promise.all(chosen.map(async c=>{
      const [card,owned]=await Promise.all([
        tx.get(db.doc(`cards/${c.id}`)),tx.get(db.doc(`playerCollections/${recipientUid}/cards/${c.id}`))
      ])
      return{...c,card,owned}
    }))
    for(const item of snapshots){
      if(item.card.get('releaseAudience')==='beta'&&recipientBeta.get('active')!==true)throw new HttpsError('permission-denied','Beta-only cards can only be granted to active beta testers.')
      if(!item.card.exists||item.card.get('status')!=='published')
        throw new HttpsError('failed-precondition','The selected deck contains an unpublished card.')
      if(Number(item.owned.get('quantity')||0)+item.qty>999)
        throw new HttpsError('failed-precondition','The recipient reached the inventory limit.')
    }
    for(const item of snapshots){
      const ref=db.doc(`playerCollections/${recipientUid}/cards/${item.id}`)
      tx.set(ref,{quantity:Number(item.owned.get('quantity')||0)+item.qty,updatedAt:FieldValue.serverTimestamp()},{merge:true})
      tx.set(db.doc(`issuedCardRegistry/${item.id}`),{everIssued:true,lastIssuedAt:FieldValue.serverTimestamp()},{merge:true})
    }
    tx.create(auditRef,{operatorUid,recipientUid,cards:chosen,action:'owner-starter-deck-grant',createdAt:FieldValue.serverTimestamp()})
  })
  return{granted:true,quantity:25,uniqueCards:chosen.length}
})
