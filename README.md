# FARE MAYHEM — Phase 2

**Five stars. Zero guarantees.** An original, cartoon-styled rideshare-driver trading card game. Phase 1 is a *functional training game*, not a multiplayer or collectible-card economy.

## Shipped

- Playable **25-card deck** vs a computer opponent: three driver slots, growing Fare, attack/counterattack, arrival effects, healing, card draw, fatigue, Reputation victory, reset, and game log.
- Responsive dark-amber UI with animated/tilting cards, original illustrated driver interpretations, catalog browsing and inspections, search and card filters, rules, and a guest-first dispatch homepage.
- Original handwritten **The Orb** card preserved as an inspectable archival image, with its actual two-star rarity. Three new drivers and four actions are **explicitly training-only**, not official published characters.
- Optional Firebase email/password and Google Authentication UI. User profiles write to `/players/{uid}` only, with narrow security rules. The match state is *local to the browser* and awards no permanent rewards.
- Installable PWA and GitHub Pages deploy workflow.
- Unit tests for the game engine.

## Run locally

```bash
npm install
npm run test
npm run dev
```

For a production bundle: `npm run build` (outputs `dist/`). Vite's base path is `/fare-mayhem/` for GitHub Pages.

## Activate live hosting

1. GitHub repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main` (or manually run the *Build and deploy Fare Mayhem* workflow in Actions). Check workflow status before sharing a live link.
3. Your expected URL *after a successful deployment* is `https://silly-cheese.github.io/fare-mayhem/`.

## Activate Firebase Authentication

Firebase project: `fare-mayhem`.

1. Firebase Console → **Authentication → Get started → Sign-in method**. Enable **Email/Password** and optionally **Google** (configure Google support email).
2. Authentication → **Settings → Authorized domains**. Add `silly-cheese.github.io` (without `https://` and without `/fare-mayhem/`).
3. Firebase Console → **Firestore Database**. Create a database if not already created.
4. Paste `firestore.rules` into **Firestore → Rules** and **Publish**. The rule set allows only individual account profiles; all other collections are denied. For Phase 2, expand with explicit admin role authorization *before* enabling a card publisher.
5. If using Firebase Storage, publish `storage.rules` while there is no admin upload feature, so browser uploads are denied for now.
6. **Billing:** Firebase Blaze is pay-as-you-go. Configure a Google Cloud budget and alerts. Alerts are **not a hard cost limit**.

The Firebase `apiKey` embedded in `src/firebase.ts` is a **public Firebase web SDK configuration**, not a server credential. Never commit Google Cloud service-account keys, privileged API tokens, image-generation API secrets, or a Firebase Admin SDK private key. For defense-in-depth consider restricting the browser key to allowed origins/APIs when appropriate, and deploy App Check and abuse mitigations before enabling any costly APIs.

## Architecture / next phase

- Phase 1 battle = local, deterministic game logic in `src/game/engine.ts`. It is intentionally **not trusted for public ranked matches**.
- Phase 2: protected card authoring, image uploads, approved cartoon transformations, published catalog and admin claims. Illustration generation requires a separate image-generation API/service, not just Firebase Storage.
- Phase 3: shared game rules in a trusted Cloud Function / server, opponent validation, durable match state, anti-cheat, and replay tests.
- Phase 4+: persistent collections, validated decks, multiplayer, rewards, and trading, without allowing clients to mint cards.

This game is an independent parody-style game featuring fictional rideshare drivers and is not affiliated with Uber.


## Phase 2 — Single-owner Card Studio

Phase 2 adds a **single-owner** authoring studio. Only a Firebase user whose UID matches the protected `_system/owner` document **AND** whose verified Firebase ID token contains the custom claim `fmOwner: true` may read drafts, upload source art, create official cards, publish, unpublish, or request cartoon illustrations. This is enforced by Firestore and Storage Security Rules and authenticated Cloud Functions. **There is no first-login/first-user administrative takeover.** No second administrator role or invitation mechanism is implemented.

### Shipped in repository

- Responsive owner-only Card Studio integrated in the game, with editable driver names, nicknames, editions, type, 1–5 stars or transcendent classes (`???`, `∞`, `UNRATED`), Fare cost, combat statistics, ability text, stories, and customer reviews.
- Save/load drafts, on-device original artwork upload with progress (PNG/JPEG/WebP up to 8 MiB), 3D preview, publish/unpublish confirmations, and public live catalog of **published** cards. Training match remains separate in Phase 2; published cards are **not yet playable** until Phase 3 combat integration.
- Trusted callable Cloud Functions: `saveOfficialCard`, `publishOfficialCard`, `retireOfficialCard`, and optional paid `generateCartoonArtwork`. Generation sends **the original uploaded artwork** to the OpenAI Images edit API using `gpt-image-1` and saves the generated result in Firebase Storage. Requires a separate OpenAI API key with image generation access; Firebase Blaze billing does NOT include API image-generation charges.
- Owner bootstrap script, strict Firestore/Storage rules, deploy config, and card-validation unit tests. **Repository publication does not deploy functions or rules to Firebase automatically.**

### Activate in your own Firebase project (one-time, manual)

1. Sign in to your own Fare Mayhem Firebase Auth account (enable the desired sign-in provider in Firebase Console) and copy **your exact UID** from Firebase Console → Authentication → Users. Never paste your service account private key into GitHub.
2. Ensure Firebase CLI and Application Default Credentials are configured on your secure workstation or Google Cloud Shell, with privileges to modify Firestore and Firebase Auth:

   ```bash
   npm install -g firebase-tools
   firebase login
   gcloud auth application-default login
   cd functions && npm install
   FARE_OWNER_UID='YOUR_EXACT_UID' node scripts/set-owner.mjs
   cd ..
   ```

   The script checks the existing owner, refuses a silent owner transfer, grants the `fmOwner` custom claim, writes `_system/owner`, and revokes old owner tokens. An intentional transfer requires `FARE_ALLOW_OWNER_TRANSFER=yes`. The original owner should sign out and in afterward to get a fresh token. Keep the Admin SDK script off untrusted browsers. `firebase login` and `gcloud` credentials must be for the same project.
3. Create a Firestore database and default Cloud Storage bucket in `fare-mayhem` if not already enabled. Upload access depends on Firestore access from Firebase Storage Security Rules; when deploying Storage rules for the first time, approve Firebase's requested cross-service permission so Storage can look up `_system/owner`.
4. Deploy rules and **three core functions** (image-generation key is not required for these):

   ```bash
   firebase use fare-mayhem
   firebase deploy --only firestore:rules,storage
   firebase deploy --only functions:saveOfficialCard,functions:publishOfficialCard,functions:retireOfficialCard
   ```

5. To enable the **optional paid** Classic Cartoon transformation, set your own OpenAI key securely and deploy just the artwork function:

   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   firebase deploy --only functions:generateCartoonArtwork
   ```

   Generations require explicit owner confirmation in the UI. The images are not automatically published. API usage may incur additional charges. Never put the API secret in frontend JS or GitHub secrets unless a deployment pipeline needs it.
6. Turn on Firebase App Check, request throttling/monitoring, and billing alerts before broad public use. Blaze's billing alerts are not hard caps. The Cloud Function architecture includes `maxInstances` limits, but the owner-controlled image provider remains independently billable. Once configured, reload the website and sign in again to see **Card Studio** on the left navigation and in the header.
7. For the existing GitHub Pages site: Settings → Pages → Source: **GitHub Actions**. Workflow now builds and tests the frontend AND the Cloud Functions TypeScript code, then deploys the static frontend. It **does not automatically deploy Firebase services**, because doing so requires privileged credentials.

### Important release boundary

Published official cards show up in **Driver Records** as public collectibles, but they're not added to the Phase 1 demo deck or player inventories. This avoids presenting unimplemented effects as playable and maintains the distinction between real official cards and test characters. Phase 3 adds the trusted battle engine and card effect interpretation.
