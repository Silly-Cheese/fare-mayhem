# FARE MAYHEM — Phase 5

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

---

## Phase 3 — Secure Practice, card editing, and permanent deletion

**Phase 3 adds a server-authoritative solo battle mode, NOT online PvP.** Visitors can still play the Phase 1 browser-only training match without signing in. A signed-in player can use **Secure Practice**, which saves the current match in Firestore and sends each action through a callable Cloud Function. Phase 5 will introduce actual player-vs-player matchmaking. No rewards, ownership, or ranked ratings are granted for practice.

### Game mechanics shipped

- Five-card opening hands, twenty Reputation each, Fare refresh, three driver slots, 25-card decks, eight-card hand limit, arrival effects, counterattacks, fatigue, and victory/defeat detection.
- Computer-opponent turn takes place on the server, not in the browser; server-side randomness shuffles the deck. Invalid actions, forged target IDs, out-of-turn actions, stale versions, and impossible plays are rejected.
- Private opponent hand and deck order are **never returned** through the callable results. Direct Firestore reads/writes to the live battle document are denied. One active practice document per signed-in player.
- A current match can be resumed; completed results are saved to a private per-player practice history (recent six results appear in Secure Practice). Restarting a match is rate-limited to avoid repeated backend calls.
- Up to eight **published official cards** join the 25-card training deck during a new Secure Practice match; those cards are temporarily available as a test roster and **do not represent player ownership**. The server snapshots their combat data for the entire match, preventing mid-match edits or deletions from silently changing gameplay.
- Official cards use explicitly selected **server-approved effect presets**. Text descriptions are not interpreted as executable gameplay. Cards created before Phase 3 default to `none` until the owner chooses a valid effect.

### One-owner editing and deletion

- The Card Studio now lets the single verified owner **edit any draft, published card, or unpublished card**, update stats/art and gameplay effects, and save the changes as staged edits.
- To update an already published card, press **Update live card**. Saving alone does not change the public card until that action is confirmed.
- **Unpublish** takes a card out of the public registry without deleting its draft or artwork.
- **Delete permanently** requires typing the exact name of the card. The callable deletes the public registry record and private draft in a transaction and attempts to clean up every uploaded and generated image for that card in Storage. If Storage cleanup fails, the caller is informed and orphaned artwork may require manual cleanup. Deletion is irreversible; never treat it as a simple unpublish.
- No client receives privilege based on its own UI. All edit/delete operations check the existing verified owner claim and the protected `_system/owner` record.

### Enable Phase 3 in your Firebase project

GitHub Pages deploys only the **static site**. Server functions and Firebase rules do **not** deploy by pushing to GitHub. From a trusted machine with the Firebase CLI authenticated to your project (and after completing Phase 2 owner bootstrap), run:

```bash
npm install
cd functions && npm install && npm run test && cd ..
npm run test && npm run build
firebase use fare-mayhem
firebase deploy --only firestore:rules,storage
firebase deploy --only functions:saveOfficialCard,functions:publishOfficialCard,functions:retireOfficialCard,functions:deleteOfficialCard,functions:startPracticeMatch,functions:getPracticeMatch,functions:takePracticeAction
```

The optional paid cartoon-generation function is separate. To enable it, configure `OPENAI_API_KEY` through Firebase Functions secrets before deploying `generateCartoonArtwork` (see Phase 2 instructions). Do not paste your key into the site, repository, or Firebase web SDK config.

### Security and launch precautions

- Firestore practice state is intentionally **backend-only**. Don't grant browser `write` access to `practiceMatches` or `practiceHistory`.
- Before open registration or heavy public traffic, turn on App Check with supported providers, enable rate-limiting/monitoring, test Firebase rules with the Emulator Suite, and configure billing alerts. App Check is currently intentionally not enforced so local and GitHub Pages integration can be tested; it is not a substitute for backend authorization.
- There is no full owner dashboard to manage historical inventory because player collections are Phase 4. Permanent deletion currently has no collection dependencies, but later phases will need a retention policy for released cards once they can be owned/traded.
- Cloud Functions deploy is a **manual privileged action**. No Firebase service account credential is in this repository.

---

## Phase 4 — Owner import, authentic collections, personal decks and card trading

**No extra OpenAI image-generation billing is required.** The core Functions no longer reference `OPENAI_API_KEY`; the optional paid illustration Cloud Function has been removed from source. Card Studio supports uploading an original drawing **and a separate completed cartoon illustration** directly from the owner's device. Use artwork generated in ChatGPT, a drawing program or elsewhere and save it locally before uploading. Published cards use the cartoon illustration when supplied or the original otherwise.

**Only Orb (Kris Kringle) remains in the public-facing sample Driver Records area.** Seven invented test cards were removed from the visible record registry; they are still used internally by the isolated 25-card training battle so that the tutorial continues working. They are NOT official collectible inventory. Orb is initially archival artwork built into the frontend, not a minted Firebase player collectible; the owner needs to create or import a corresponding official Firestore card to make it collectible.

### Owner-only Bulk Import

Card Studio → **Bulk Import** accepts up to 50 cards in a single CSV or JSON file. Required: `name`, `ability`. Optional: `nickname,kind,rarity,stars,transcendentLabel,cost,attack,health,flavor,customerReview,edition,effectKey,originalFile,cartoonFile`. JSON may be an array or `{"cards":[...]}`. Missing optional fields receive the same safe defaults as a new single card.

Example CSV:

```csv
name,nickname,kind,rarity,stars,cost,attack,health,ability,effectKey,edition,originalFile,cartoonFile
Kris Kringle,The Orb,driver,standard,2,3,2,5,On arrival steal up to 1 Fare,steal_fare_1,Original,orb-original.png,orb-cartoon.png
```

Choose the card list, then choose all relevant image files. **Filenames must match** `originalFile` and `cartoonFile`. Preview before importing; import as private drafts first unless you intentionally check immediate publication. The importer checks current drafts for identical case-insensitive `name + edition` and updates those instead of automatically creating duplicates. Each row reports success/failure separately. When an upload fails after creating a draft, review it in Card Studio before retrying.

### Phase 4 player collections

- Signed-in players have a **My Collection** area. Browser code cannot write inventory: it can only query trusted callable Functions. A listed official card is not automatically owned by a player.
- A **server-validated Secure Practice victory** awards at most **one randomly selected published official card every 24 hours per account**, if a published card was among the server-side match cards. The reward is recorded atomically with the match result, using an independent reward gate to stop duplicate awards. Guest training battles award nothing.
- The owner can import and publish cards, but cannot mint arbitrary collectibles through the browser. Cards previously awarded to players are flagged in `issuedCardRegistry` and cannot be permanently deleted; unpublish them instead.
- Players can save three deck slots, each requiring exactly **25 currently published official cards** with no more than **three copies per card**, and no more than the player actually owns. The server revalidates both ownership and publication when starting Secure Practice with an owned deck.
- The optional owned deck is used for the **player's side** of secure practice; the computer still uses the controlled training deck. No ranked PvP yet.
- The **Trading** tab lets a player address another registered player using their sign-in email. An offer has 1–5 distinct cards on each side (1–3 copies per item), lasts seven days, and requires explicit acceptance by its recipient. Each transfer occurs atomically in a Firestore transaction with fresh balance and release-status checks. Pending offers do not escrow inventory; an offer can fail if a participant spends the relevant copies before acceptance.
- No real-world payments, real-money pack purchase, or cash-valued trading are included. Online head-to-head PvP has since been added in Phase 5; see below.

### Deploy after fetching these commits

The repository's GitHub Pages workflow builds and tests the static site; **it does not deploy Firebase backends**. From the local project folder on your own Windows machine:

```powershell
cd "C:\Users\Owner\Documents\fare-mayhem"
git pull origin main
npm.cmd install
npm.cmd --prefix functions install
npm.cmd run test
npm.cmd run build
npm.cmd --prefix functions run test
firebase.cmd use fare-mayhem
firebase.cmd deploy --only storage
firebase.cmd deploy --only functions
```

If `git pull` is unavailable, download and extract the latest repository source into your local project directory without deleting your locally stored Firebase credentials. Never commit Firebase service-account keys or API secrets. Since the Cloud Functions no longer use the image-generation key, **do not create or purchase `OPENAI_API_KEY`**.

Collection and trade data is server-only by default under `playerCollections`, `playerDecks`, `cardTrades`, `collectionRewardGates` and `issuedCardRegistry`. No additional client Firestore write grants should be added. Existing Firestore rules may remain in place; **deploy the updated Storage rules** before using manual cartoon uploads.

### Before allowing a large public audience

Enable Firebase App Check and abuse monitoring; Cloud Functions are currently configured with `enforceAppCheck:false` for rollout/testing. Set cloud budget alerts, verify Auth provider settings, enforce adequate account rate limits, and test inventory/trading transactions with Firestore Emulator and multiple test users. A one-win-per-day reward cap does not prevent a person from opening multiple accounts. Firebase Blaze is usage-based and can generate charges even though the OpenAI illustration API has been removed.


---

## Phase 5 — online PvP, owner grants and deployment overhaul

**Phase 5 is implemented in source and on GitHub Pages, but the live backend still requires an explicit manual Firebase Functions deployment.**

- **Unranked online PvP:** verified signed-in players can match using a server-owned queue. Both players must have a saved 25-card deck containing only published official cards they actually own. Clients cannot invent card ownership or alter opponent turns.
- **Private opponent hands:** Cloud Functions send each player their own hand/deck plus the rival's public board, reputation, counts and match log. The rival's hand and deck order are not returned.
- **Server-authoritative gameplay:** turn order, Fare, effects, driver combat, fatigue, forfeits, timed turns, and winning are verified on Cloud Functions with optimistic revision checks. A four-minute turn deadline and five-minute matchmaking queue expiry apply. Matches are unranked and don't mint rewards.
- **History:** completed matches have a private recent history showing victories, defeats and rounds. The history is written by trusted backend transactions. You cannot change results in the browser.
- **Owner-only card issuance:** Card Studio → **Player Card Grants** can distribute published official cards by registered Firebase email, with an administrator confirmation and audit trail. The owner can also issue a balanced 25-card test collection across nine or more real published cards, no more than three copies of any one card. This avoids weeks of daily grinding before testing PvP with a second account. There is still only **one system owner**.
- **Practice AI:** the server's computer opponent prioritizes attacks with ready drivers, chooses blockers strategically, plays valid drivers/actions, and returns the turn. Regression tests verify it can damage human Reputation and defeat blockers. A just-played driver must wait before attacking.
- **Mobile usability:** five-item mobile navigation no longer wraps to a second row; mobile headers and battle card scrolling are adjusted.
- **Error handling:** failed Firebase callable requests now give actionable feedback rather than only `internal`. CORS failures during preflight commonly indicate an inaccessible or undeployed Function, not a permission problem in Firestore rules.
- **No paid OpenAI dependency:** manual original and cartoon artwork uploads replace the old optional generation service. The obsolete `generateCartoonArtwork` callable may remain deployed from earlier versions until intentionally removed.
- **Critical deployment repair:** `firebase.json` now runs `functions` TypeScript compilation automatically before a Functions deployment. This prevents the old compiled `functions/lib` from erroneously prompting for an OpenAI key.

### Deploy Phase 5 correctly on Windows

Follow **[PHASE5_DEPLOY_WINDOWS.md](./PHASE5_DEPLOY_WINDOWS.md)** for the complete step-by-step PowerShell procedure, Cloud Functions diagnostics and testing checklist.

```powershell
cd "C:\Users\Owner\Documents\fare-mayhem"
git pull --ff-only origin main
npm.cmd --prefix functions install
npm.cmd --prefix functions run test
firebase.cmd use fare-mayhem
firebase.cmd deploy --only "firestore:rules"
firebase.cmd deploy --only storage
firebase.cmd deploy --only functions
firebase.cmd functions:list
```

Cloud Functions still cost Google Cloud/Firebase Blaze usage. Do not weaken rules or make inventory publicly writable to "fix" a callable CORS error. Verify Functions are deployed and inspect their logs instead. Before inviting a large public audience, perform manual multi-account integration tests and enable App Check, monitoring, rate limits and suitable billing alerts.
