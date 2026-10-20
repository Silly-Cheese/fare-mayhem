# Fare Mayhem — Phase 5 Windows deployment and verification

The website is deployed by GitHub Pages. **Firebase Firestore rules, Storage rules and Cloud Functions are never automatically deployed by that workflow.** All commands below run on your Windows computer in **PowerShell**.

## 1. Stop the obsolete OpenAI deployment

If your terminal asks you to enter `OPENAI_API_KEY`, press **Ctrl+C**. The Phase 5 source does not call any paid image API, and no API key should be necessary.

```powershell
cd "C:\Users\Owner\Documents\fare-mayhem"
git status --short
git pull --ff-only origin main
Get-ChildItem .\functions\src -Filter *.ts | Select-String -Pattern "OPENAI_API_KEY|generateCartoonArtwork"
```

The last command must print **no matches**. If you get matches, you are running an older local copy. Do not put a dummy token into Firebase.

If `git pull` says there are conflicting local edits, stop and back up or reconcile them instead of forcing a reset.

## 2. Install and test

```powershell
npm.cmd install
npm.cmd --prefix functions install
npm.cmd run test
npm.cmd run build
npm.cmd --prefix functions run test
```

Resolve test or TypeScript errors before deploying. The package warning about an older `firebase-functions` version is informational: do **not** casually upgrade dependencies during deployment because major upgrades can break the running backend.

## 3. Select the correct Firebase project

```powershell
firebase.cmd login
firebase.cmd use fare-mayhem
```

Check the selected project carefully. Keep `firebase.cmd` and `npm.cmd` suffixes in PowerShell if your local PowerShell execution policy blocks the `.ps1` wrappers.

## 4. Deploy Firestore + Storage rules, then all Functions

```powershell
firebase.cmd deploy --only "firestore:rules"
firebase.cmd deploy --only storage
firebase.cmd deploy --only functions
```

The **first** command updates Firestore permissions. The **second** enables owner-only original/cartoon artwork uploads. The third deploys Phase 3, Phase 4 and Phase 5 callables including `getCollectionDashboard`, `getPracticeMatch`, `takePracticeAction`, `joinPvpQueue`, `getPvpStatus`, `takePvpAction`, and `getPvpHistory`.

If Firebase lists the old `generateCartoonArtwork` function and asks whether to **delete** it because it is no longer in local source, approve deleting **that specifically named obsolete paid function**. Do not approve deleting unrelated live functions without checking. This is expected during migration and does not destroy any of your official cards.

The functions deployment may take several minutes. You are done only after the CLI reports **Deploy complete!**.

## 5. Verify the server

```powershell
firebase.cmd functions:list
firebase.cmd functions:log --only getPracticeMatch
firebase.cmd functions:log --only getCollectionDashboard
```

Verify the Functions are in `us-central1` and include both Secure Practice and collections.

A browser console saying *CORS preflight response missing Access-Control-Allow-Origin* is often a symptom of a missing Cloud Function, a failed deployment, or an endpoint-level access/IAM restriction. **It is not a reason to loosen Firestore rules or add "*" everywhere.** Inspect the Functions' deploy output and logs first.

If the function appears in the list and `functions:log` shows no request when the browser tries it, inspect **Google Cloud Run / Cloud Functions invoker permissions** and deployment error logs. If it logs an exception, fix that specific error instead. Do not make Firestore or player inventories publicly writable.

## 6. Test the features in this order

1. Sign out of Fare Mayhem and back in to refresh your owner claim, then open Card Studio. Save a private draft and upload manual cartoon artwork.
2. Open Secure Practice, start a new battle, dispatch a driver and finish a turn. The Dispatch AI should play actions and attack with **ready** drivers on later turns. A brand-new driver cannot attack on the same turn.
3. Open My Collection. It should load without an `internal` error. A collection may legitimately show zero cards until the owner publishes original cards and a player wins eligible practice matches.
4. Open Online PvP in two **different Firebase accounts**, each with a valid, saved 25-card **owned** deck. Join the queue from both accounts. Matchmaking has a five-minute queue expiry; turns have a four-minute deadline.
5. On both browsers confirm actions, turn changes, protected opponent hands, optional forfeits and recent match history. PvP is unranked and awards no cards yet.

If an error persists, capture the CLI deployment error and relevant Function logs **without pasting secrets**.

## Security and billing

- OpenAI cartoon generation has been removed, so OpenAI API billing is not required. **Revoke any exposed OpenAI API keys** in the OpenAI API dashboard and delete the unused Firebase Secret Manager secret after confirming nothing depends on it.
- Firebase Blaze usage (Cloud Functions, Cloud Firestore, Storage and related services) may still be billed. Configure Google Cloud budget alerts. Alerts are not hard usage caps.
- Authentication tokens, player inventory, deck ownership, opponent hands and match states must remain trusted/server-owned.
- Phase 5 is suitable for initial testing, **not yet a fully load-tested public launch**. App Check, production traffic throttling, monitored abuse controls and multi-account integration testing are still required before broad promotion.

