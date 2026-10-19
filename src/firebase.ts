import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { getFirestore, doc, serverTimestamp, setDoc } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyBgQU6mzSqZi-QD9-c-etav4zg2LiR3heY',
  authDomain: 'fare-mayhem.firebaseapp.com',
  projectId: 'fare-mayhem',
  storageBucket: 'fare-mayhem.firebasestorage.app',
  messagingSenderId: '711250838539',
  appId: '1:711250838539:web:0639ed213dcd2d5d46730e'
})

export const auth = getAuth(app)
export const db = getFirestore(app)

async function upsertPlayer(user: { uid: string; displayName: string | null; email: string | null }) {
  await setDoc(doc(db, 'players', user.uid), {
    displayName: user.displayName || 'New driver',
    email: user.email || null,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function loginGoogle() {
  const res = await signInWithPopup(auth, new GoogleAuthProvider())
  try { await upsertPlayer(res.user) } catch (error) { console.warn('Profile sync unavailable:', error) }
  return res.user
}
export async function loginEmail(email: string, password: string) {
  const res = await signInWithEmailAndPassword(auth, email, password)
  try { await upsertPlayer(res.user) } catch (error) { console.warn('Profile sync unavailable:', error) }
  return res.user
}
export async function registerEmail(name: string, email: string, password: string) {
  const res = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(res.user, { displayName: name.trim() })
  try { await upsertPlayer({ ...res.user, displayName: name.trim() }) } catch (error) { console.warn('Profile sync unavailable:', error) }
  return res.user
}
export async function logout() { await signOut(auth) }
