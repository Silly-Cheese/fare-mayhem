// One-time setup. REQUIRES ADC/service-account credentials with Firebase Auth and Firestore privileges.
// Example: FARE_OWNER_UID=your-firebase-auth-uid node scripts/set-owner.mjs
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
const uid = process.env.FARE_OWNER_UID
if (!uid || !/^[A-Za-z0-9_-]{10,128}$/.test(uid)) throw Error('Provide your exact Firebase Auth UID via FARE_OWNER_UID.')
initializeApp({ credential: applicationDefault(), projectId: 'fare-mayhem' })
const auth=getAuth(), db=getFirestore(), ref=db.doc('_system/owner')
const incoming=await auth.getUser(uid)
console.log('About to set Fare Mayhem owner:', incoming.uid, incoming.email ?? '(no email)')
const previous=await ref.get()
const previousUid=previous.get('uid')
if (previousUid && previousUid!==uid && process.env.FARE_ALLOW_OWNER_TRANSFER!=='yes') throw Error('Existing owner found. To transfer deliberately, set FARE_ALLOW_OWNER_TRANSFER=yes; do not create a second owner.')
if (previousUid && previousUid !== uid) {
  const former=await auth.getUser(previousUid)
  const oldClaims={...(former.customClaims||{})};delete oldClaims.fmOwner
  await auth.setCustomUserClaims(previousUid,oldClaims)
  await auth.revokeRefreshTokens(previousUid)
}
const newClaims={...(incoming.customClaims||{}),fmOwner:true}
await auth.setCustomUserClaims(uid,newClaims)
await ref.set({uid,updatedAt:FieldValue.serverTimestamp()})
await auth.revokeRefreshTokens(uid)
console.log('Owner set. Sign out and back in to refresh authentication claims. Never commit service-account keys.')
