import { randomUUID } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { canPublish, validateArtworkPath, validateCard } from './validation'

initializeApp()
const db = getFirestore()
const region = 'us-central1'
const apiKey = defineSecret('OPENAI_API_KEY')

async function requireOwner(auth: { uid:string; token: Record<string, unknown> } | undefined) {
  if (!auth || auth.token.fmOwner !== true) throw new HttpsError('permission-denied', 'Owner access required.')
  const owner = await db.doc('_system/owner').get()
  if (!owner.exists || owner.get('uid') !== auth.uid) throw new HttpsError('permission-denied', 'This account is not the Fare Mayhem owner.')
  return auth.uid
}
function validId(id: unknown): id is string {return typeof id==='string' && /^[A-Za-z0-9_-]{10,80}$/.test(id)}

export const saveOfficialCard = onCall({region, maxInstances: 3, enforceAppCheck: false}, async request => {
  await requireOwner(request.auth)
  let card
  try{card=validateCard(request.data?.card)}catch(e){throw new HttpsError('invalid-argument',e instanceof Error?e.message:'Invalid card')}
  const id: string = request.data?.id ? request.data.id : db.collection('cardDrafts').doc().id
  if(!validId(id)) throw new HttpsError('invalid-argument','Invalid card ID.')
  for(const type of ['original','cartoon'] as const){
    const path=type==='original'?card.originalStoragePath:card.cartoonStoragePath
    if(path && !validateArtworkPath(id,path,type)) throw new HttpsError('invalid-argument','Artwork must belong to this card.')
  }
  const docRef=db.doc(`cardDrafts/${id}`)
  const previous=await docRef.get()
  // Artwork pointers can only be set from the appropriate owner-created Storage object.
  for(const type of ['original','cartoon'] as const){
    const path=type==='original'?card.originalStoragePath:card.cartoonStoragePath
    if(path && path !== previous.get(type==='original'?'originalStoragePath':'cartoonStoragePath')){
      const [exists]=await getStorage().bucket().file(path).exists()
      if(!exists) throw new HttpsError('failed-precondition','Artwork has not finished uploading.')
    }
  }
  await docRef.set({...card,status:previous.get('status')==='published'?'published':'draft', updatedAt:FieldValue.serverTimestamp(),createdAt:previous.get('createdAt')||FieldValue.serverTimestamp()},{merge:true})
  return {id}
})

export const publishOfficialCard = onCall({region, maxInstances: 3, enforceAppCheck: false}, async request => {
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

export const retireOfficialCard = onCall({region, maxInstances: 3, enforceAppCheck: false}, async request => {
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

// Optional paid service. Deploy after: firebase functions:secrets:set OPENAI_API_KEY
export const generateCartoonArtwork = onCall({region,timeoutSeconds:180,memory:'1GiB',maxInstances:1,secrets:[apiKey],enforceAppCheck:false}, async request => {
  await requireOwner(request.auth)
  const id=request.data?.id
  if(!validId(id))throw new HttpsError('invalid-argument','Invalid card ID.')
  const document=await db.doc(`cardDrafts/${id}`).get()
  if(!document.exists)throw new HttpsError('not-found','Save the card first.')
  const originalPath=document.get('originalStoragePath')
  if(typeof originalPath!=='string'||!validateArtworkPath(id,originalPath,'original'))throw new HttpsError('failed-precondition','Upload the original drawing first.')
  if(!apiKey.value())throw new HttpsError('failed-precondition','Artwork generation is not configured yet.')
  const bucket=getStorage().bucket()
  const [info]=await bucket.file(originalPath).getMetadata()
  const mime=info.contentType || 'image/png'
  if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new HttpsError('failed-precondition','Unsupported artwork type.')
  if(Number(info.size)>8*1024*1024)throw new HttpsError('failed-precondition','Artwork is too large.')
  const [bytes]=await bucket.file(originalPath).download()
  const form=new FormData()
  form.append('model','gpt-image-1')
  form.append('size','1024x1024')
  form.append('quality','medium')
  form.append('prompt',`Create a standalone, polished, original CLASSIC 2D CARTOON illustration for the fictional trading card game Fare Mayhem. The uploaded photograph is the source of truth for the CHARACTERS in the sketch. Preserve the subject's distinctive silhouette, proportions, facial features, pose, bizarre humor and details. Clean bold black outlines, flat expressive color, gentle cel-shading, carefully controlled highlights, charming hand-drawn look. The character should look recognizable as the same original design and NOT be redesigned into a generic mascot. Isolate the character on a simple clean contrasting background. No trading card frame, words, typography, labels, star ratings, watermarks, real-world corporate logos, or extra characters. This is a digital drawing adaptation, not a motion animation.`)
  form.append('image',new Blob([new Uint8Array(bytes)],{type:mime}),`original.${mime.split('/')[1]}`)
  let response: Response
  try {response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${apiKey.value()}`},body:form,signal:AbortSignal.timeout(155000)})}
  catch {throw new HttpsError('unavailable','The illustration service could not be reached. Please retry.')}
  if(!response.ok){
    const description=(await response.text()).slice(0,350)
    console.error('Illustration generation failed',response.status,description)
    throw new HttpsError('failed-precondition',`Image service returned status ${response.status}; check API access and billing.`)
  }
  const payload=await response.json() as {data?:Array<{b64_json?:string}>}
  const encoded=payload.data?.[0]?.b64_json
  if(!encoded)throw new HttpsError('internal','The image service did not return an illustration.')
  const binary=Buffer.from(encoded,'base64')
  if(binary.length>15*1024*1024)throw new HttpsError('internal','Generated artwork is too large.')
  const path=`card-art/${id}/cartoon/${randomUUID()}.png`
  const token=randomUUID()
  await bucket.file(path).save(binary,{resumable:false,metadata:{contentType:'image/png',cacheControl:'public,max-age=3600',metadata:{firebaseStorageDownloadTokens:token}}})
  const url=`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
  await document.ref.update({cartoonUrl:url,cartoonStoragePath:path,updatedAt:FieldValue.serverTimestamp()})
  return {url,storagePath:path}
})
