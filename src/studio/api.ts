import { httpsCallable } from 'firebase/functions'
import { collection, onSnapshot, query, where, type DocumentData } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { db, functions, storage } from '../firebase'
import type { EditableCard, OfficialCard } from './types'

const callSave = httpsCallable<{ id?: string; card: EditableCard }, { id: string }>(functions, 'saveOfficialCard')
const callPublish = httpsCallable<{ id: string }, { published: true }>(functions, 'publishOfficialCard')
const callRetire = httpsCallable<{ id: string }, { retired: true }>(functions, 'retireOfficialCard')
const callDelete = httpsCallable<{ id: string; confirmation: string }, { deleted: boolean; artworkRemoved: boolean }>(functions, 'deleteOfficialCard')
export const saveOfficialCard = async (card: EditableCard, id?: string) => (await callSave({ id, card })).data.id
export const publishOfficialCard = async (id: string) => (await callPublish({ id })).data
export const retireOfficialCard = async (id: string) => (await callRetire({ id })).data
export const deleteOfficialCard = async (id: string, confirmation: string) => (await callDelete({id,confirmation})).data

function normalizeCard(id: string, data: DocumentData): OfficialCard {
  return { ...data, id } as OfficialCard
}
export function subscribeDrafts(onCards: (cards: OfficialCard[]) => void, onError: (error: Error) => void) {
  return onSnapshot(collection(db, 'cardDrafts'), snapshot => {
    onCards(snapshot.docs.map(d => normalizeCard(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name)))
  }, onError)
}
export function subscribePublished(onCards: (cards: OfficialCard[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'cards'), where('status', '==', 'published')), snapshot => {
    onCards(snapshot.docs.map(d => normalizeCard(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name)))
  }, onError)
}
export async function uploadArtwork(id: string, file: File, onProgress: (pct: number) => void, kind: 'original' | 'cartoon' | 'finished' = 'original') {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('Upload a PNG, JPG, or WebP image.')
  if (file.size > 8 * 1024 * 1024) throw Error('Artwork must be 8 MB or smaller.')
  if (kind === 'finished') await validateFinishedCardImage(file)
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').slice(0, 60)
  const path = `card-art/${id}/${kind}/${crypto.randomUUID()}-${safeName}`
  const fileRef = ref(storage, path)
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type, cacheControl: 'private, max-age=60' })
    task.on('state_changed', snapshot => onProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve)
  })
  return { url: await getDownloadURL(fileRef), storagePath: path }
}

export const uploadOriginal = (id:string,file:File,progress:(n:number)=>void)=>uploadArtwork(id,file,progress,'original')

/** Match the owner's complete Death card: 5:7 at 1060 × 1484 (with some resolution tolerance). */
export async function validateFinishedCardImage(file: File) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw Error('Finished cards must be PNG, JPEG or WebP.')
  if (file.size > 8 * 1024 * 1024) throw Error('Finished cards must be at most 8 MB.')
  const url=URL.createObjectURL(file)
  try {
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const im=new Image()
      im.onload=()=>resolve(im)
      im.onerror=()=>reject(Error('Could not decode the finished card.'))
      im.src=url
    })
    const ratio=image.naturalWidth/image.naturalHeight
    if (image.naturalWidth<700||image.naturalHeight<980||Math.abs(ratio-5/7)>0.024)
      throw Error('Use a finished 5:7 portrait card like Death (1060 × 1484), minimum 700 × 980.')
    return {width:image.naturalWidth,height:image.naturalHeight}
  } finally {URL.revokeObjectURL(url)}
}
