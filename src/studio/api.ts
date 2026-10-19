import { httpsCallable } from 'firebase/functions'
import { collection, onSnapshot, query, where, type DocumentData } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { db, functions, storage } from '../firebase'
import type { EditableCard, OfficialCard } from './types'

const callSave = httpsCallable<{ id?: string; card: EditableCard }, { id: string }>(functions, 'saveOfficialCard')
const callPublish = httpsCallable<{ id: string }, { published: true }>(functions, 'publishOfficialCard')
const callRetire = httpsCallable<{ id: string }, { retired: true }>(functions, 'retireOfficialCard')
const callDelete = httpsCallable<{ id: string; confirmation: string }, { deleted: boolean; artworkRemoved: boolean }>(functions, 'deleteOfficialCard')
const callGenerate = httpsCallable<{ id: string }, { url: string; storagePath: string }>(functions, 'generateCartoonArtwork', { timeout: 180000 })
export const saveOfficialCard = async (card: EditableCard, id?: string) => (await callSave({ id, card })).data.id
export const publishOfficialCard = async (id: string) => (await callPublish({ id })).data
export const retireOfficialCard = async (id: string) => (await callRetire({ id })).data
export const deleteOfficialCard = async (id: string, confirmation: string) => (await callDelete({id,confirmation})).data
export const generateCartoonArtwork = async (id: string) => (await callGenerate({ id })).data

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
export async function uploadOriginal(id: string, file: File, onProgress: (pct: number) => void) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('Upload a PNG, JPG, or WebP image.')
  if (file.size > 8 * 1024 * 1024) throw Error('Artwork must be 8 MB or smaller.')
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').slice(0, 60)
  const path = `card-art/${id}/original/${crypto.randomUUID()}-${safeName}`
  const fileRef = ref(storage, path)
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type, cacheControl: 'private, max-age=60' })
    task.on('state_changed', snapshot => onProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve)
  })
  return { url: await getDownloadURL(fileRef), storagePath: path }
}
