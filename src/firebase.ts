import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, EmailAuthProvider, linkWithCredential, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { getFirestore, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

// Keep Firebase's hosted authDomain for Google sign-in helper redirects.
// Add fare-mayhem.com under Firebase Authentication > Settings > Authorized domains.
// GitHub Pages itself does not host Firebase's /__/auth/ endpoints.
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
export const storage = getStorage(app)
export const functions = getFunctions(app, 'us-central1')

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
/**
 * Adds email/password as a SECOND sign-in method on the CURRENT Firebase user.
 * This does not register, sign in as another user, migrate Firestore records, or
 * change the UID to which the fmOwner custom claim and _system/owner refer.
 */
export async function linkPasswordToCurrentUser(password: string) {
  const user = auth.currentUser
  if (!user) throw Error('Sign in with Google before adding password sign-in.')
  if (!user.email || !user.emailVerified) throw Error('Your existing account must have a verified email address before linking a password.')
  if (user.providerData.some(provider => provider.providerId === 'password')) throw Error('Email/password is already enabled on this account.')
  if (password.length < 12) throw Error('Use a password of at least 12 characters.')
  const originalUid = user.uid
  const credential = EmailAuthProvider.credential(user.email, password)
  const result = await linkWithCredential(user, credential)
  if (result.user.uid !== originalUid) throw Error('The account identity could not be verified. Do not sign out; contact support.')
  return result.user
}

export async function logout() { await signOut(auth) }
