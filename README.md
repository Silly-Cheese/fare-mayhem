# FARE MAYHEM — Phase 1

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
npm ci
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
