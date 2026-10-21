# Fare Mayhem — Beta Tester Program

Fare Mayhem's **verified single owner** can assign existing player accounts as Beta Testers from **Card Studio → Beta Testers**.

## How it works

1. The prospective tester first registers or signs in to a normal Fare Mayhem account (Google or email/password).
2. The owner opens Card Studio → **Beta Testers**, enters the player's existing Firebase Authentication email and selects **Assign Beta Tester**.
3. The account now has private, server-verified beta status. In **My Collection**, the player sees **VERIFIED BETA TESTER** plus their reward status.
4. Once at least **five different standard official cards** have been published, the owner selects **Send 5 free cards** for that person and confirms.
5. A trusted Cloud Function picks five distinct published standard cards, checks inventory limits and grants them atomically. The cards immediately belong to the player's existing collection; the player may need to click **Refresh**.
6. The owner can remove beta status or restore it from the roster. **Earned cards remain owned** even after beta status ends.

## Welcome gift rules

- **One reward per registered player UID, ever**, including deactivated and reactivated beta testers.
- Five **different** already-published **standard** cards, one copy each. Exceptional 6/10-star, Sun, Divine and transcendent cards are not included in the random pack.
- The reward is not created or claimed by browser code; only the verified owner may trigger it.
- A single Firestore transaction checks the beta assignment, immutable reward-claim document, each card's published status, and inventory capacity before updating all five owned-card quantities.
- The transaction also writes an issuance audit and marks each card as issued, which prevents permanent deletion of owned official cards.
- If there are fewer than five standard published cards, assign testers first and distribute packs later.
- Additional discretionary cards can be awarded via the existing **Card Studio → Player Card Grants** system.
- Welcome packs are not a complete 25-card deck. To enable immediate full-deck PvP, the owner may use the existing audited 25-card starter-deck grant feature.

## Security and data model

The server checks Firebase Auth's `fmOwner` custom claim **and** the matching `_system/owner` UID before reading the owner roster or writing any beta flags or cards. Assigning testers **does not give them owner controls**. Roles are stored at `betaTesters/{uid}`, one-time rewards at `betaWelcomeGrants/{uid}`, and entries in `inventoryGrantAudit`. Firestore client rules remain deny-by-default for these paths. `getBetaStatus` only returns the signed-in player's own status.

## Deploy to Firebase on Windows

The static website deploys automatically through GitHub Pages, but Cloud Functions must be deployed manually.

```powershell
cd "C:\Users\Owner\Documents\fare-mayhem"
git status --short
git pull --ff-only origin main
npm.cmd --prefix functions run test
firebase.cmd use fare-mayhem
firebase.cmd deploy --only "functions:getBetaStatus"
firebase.cmd deploy --only "functions:listBetaTesters"
firebase.cmd deploy --only "functions:setBetaTester"
firebase.cmd deploy --only "functions:grantBetaWelcome"
firebase.cmd functions:list
```

Because the Firebase project previously encountered `us-central1` Cloud Run CPU quota limits, **run these commands one at a time** and wait for each to complete. The Functions use `cpu: 'gcf_gen1'`, `concurrency: 1`, and small `maxInstances` values. Do not repeatedly retry quota failures; wait for resources to release and check the Cloud Console.

No new Firestore rules, Storage rules, OpenAI API, email service, or domain DNS changes are required for this feature.

## Validation checklist

- A registered player's email can be assigned.
- An unknown email is rejected, not silently created.
- A non-owner account cannot list testers, assign beta roles, or trigger gifts.
- The beta player sees their tester badge and can refresh My Collection after issuance.
- Cards cannot be awarded twice if the owner clicks again or removes/restores the player's beta access.
- Only five distinct published standard cards are issued, not drafts or transcendent cards.
- Disabled beta players keep their earned cards but no longer see active tester status.
