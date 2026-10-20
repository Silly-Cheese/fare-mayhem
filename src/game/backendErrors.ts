/** Translate Firebase callable failures into actionable, non-secret client messages.
 * A failed browser CORS preflight often means the endpoint is missing,
 * inaccessible, or failing at the platform layer—not a Firestore rules issue.
 */
export function backendError(error:unknown,feature:string):string {
  const raw=error instanceof Error?error.message:String(error)
  const structured=error&&typeof error==='object'&&'code' in error ? String((error as {code:unknown}).code):''
  const code=(structured+' '+raw).toLowerCase()
  console.error('Fare Mayhem backend request failed', {feature,code:structured||'unclassified',error})
  if(code.includes('functions/unauthenticated')||code.includes('unauthenticated'))return 'Your login session expired. Sign out, then sign back in.'
  if(code.includes('functions/not-found')||code.includes('404'))return feature+' is not deployed in us-central1 yet. Deploy the latest Cloud Functions from your updated local project.'
  if(code.includes('functions/unavailable')||code.includes('failed to fetch')||code.includes('network-request-failed'))return 'Cannot reach the Fare Mayhem server. Check your connection and whether the latest Cloud Functions are deployed. A CORS preflight failure usually means the endpoint or its access settings need repair.'
  if(code.includes('functions/internal')||code.includes('internal'))return feature+' encountered a server-side error. Open Firebase Console → Functions → Logs or run firebase.cmd functions:log to find the cause. Do not change Firestore rules to allow public writes.'
  if(code.includes('functions/permission-denied'))return 'The server refused permission. Check that you are signed in to the right Firebase account.'
  if(code.includes('functions/failed-precondition'))return raw.replace(/^Firebase:\s*/,'')
  if(code.includes('functions/resource-exhausted'))return 'You are making requests too quickly. Please wait before trying again.'
  return raw.replace(/^Firebase:\s*/,'')
}
