# Fare Mayhem — curated Beta Tester cards and exclusive editions

The owner can decide **exactly which published cards every tester receives**, in what quantities, without random assignment. New cards can be marked **Beta Only** so normal players cannot access them as collectible releases.

## Assign testers and issue chosen cards

1. Open **Card Studio → Beta Testers** under the verified owner account.
2. Enter an existing registered player's email and select **Assign Beta Tester**.
3. Select **Choose cards** beside that tester's name.
4. Set quantities for any published card (public or beta-only). You may select up to 25 total copies in a grant.
5. Click **Send one-time welcome gift** for the first grant, or **Send additional beta drop** as new beta-only releases are introduced.
6. Review the exact card names and copy counts in the confirmation. Inventory changes are applied and audited by Cloud Functions.

A tester can have exactly one welcome gift, even if removed and restored. The owner can send **additional selected drops** afterward; each is separately audited. No grants happen automatically on assigning a beta account. The original 5-random-standard-cards approach has been replaced.

## Make new cards exclusive to active beta testers

1. In Card Studio choose **New card** (or use bulk CSV/JSON/image import).
2. Choose **Who can receive this card? → Beta Only**. JSON can also specify `"releaseAudience": "beta"` for bulk import. Image-only bulk import has an **Availability → Beta Only** selection on each row.
3. Upload its full finished design, save the draft and publish normally.
4. Choose exactly which active testers receive it through **Beta Testers → Choose cards**. You can also issue beta-only cards to active testers through owner **Player Card Grants**.

Older cards without `releaseAudience` are treated as **Public** by default, with no migration of existing documents required.

Beta-only release controls are enforced by server functions and Firestore:
- Unassigned/non-beta players cannot discover them through the official card catalog.
- Beta cards are excluded from random **Secure Practice** card rewards and cannot be traded by players, even between two testers.
- Only active beta testers can save decks with beta-only cards, start new practice matches using those cards, or enter PvP using those decks.
- Owner single-card and 25-card starter-deck grants refuse to issue beta-only cards to non-testers.
- When tester access is removed, previously issued copies stay owned, but they no longer appear as accessible collection cards or qualify for new matches until access is restored.
- Players cannot assign themselves to beta status, invent rewards or bypass inventory limits.

**Important:** These are account-level *game access restrictions*, not copy protection. A player could share a screenshot or a download URL for artwork already visible to them. The game does not provide DRM for illustrated cards.

## Firebase deployment after a GitHub update

The GitHub Pages frontend deploys automatically. Firebase backend changes **do not** deploy from the Pages workflow. Do not publish Beta Only cards until the listed backend rules and Functions have finished deployment.

In Windows PowerShell:

```powershell
cd "C:\Users\Owner\Documents\fare-mayhem"
git status --short
git pull --ff-only origin main
npm.cmd --prefix functions run test
firebase.cmd use fare-mayhem
```

Deploy the **authorized card catalog** first to restore official card discovery for the updated website:

```powershell
firebase.cmd deploy --only "functions:getVisibleCatalog"
```

Deploy the new/changed beta grants one at a time:

```powershell
firebase.cmd deploy --only "functions:grantBetaWelcome"
firebase.cmd deploy --only "functions:grantBetaCards"
```

Deploy the card release and collection checks:

```powershell
firebase.cmd deploy --only "functions:saveOfficialCard"
firebase.cmd deploy --only "functions:publishOfficialCard"
firebase.cmd deploy --only "functions:getCollectionDashboard"
firebase.cmd deploy --only "functions:saveCollectionDeck"
firebase.cmd deploy --only "functions:startPracticeMatch"
firebase.cmd deploy --only "functions:takePracticeAction"
firebase.cmd deploy --only "functions:joinPvpQueue"
firebase.cmd deploy --only "functions:createTradeOffer"
firebase.cmd deploy --only "functions:respondTradeOffer"
firebase.cmd deploy --only "functions:grantOfficialCards"
firebase.cmd deploy --only "functions:grantOfficialDeck"
```

Deploy the changed Firestore read rules:

```powershell
firebase.cmd deploy --only "firestore:rules"
firebase.cmd functions:list
```

If the earlier beta management functions weren't deployed, deploy those as well:

```powershell
firebase.cmd deploy --only "functions:getBetaStatus"
firebase.cmd deploy --only "functions:listBetaTesters"
firebase.cmd deploy --only "functions:setBetaTester"
```

Because the project previously encountered Cloud Run CPU quota errors, run each command separately and wait for **Deploy complete!**. Avoid attempting the entire Functions group while regional CPU remains constrained. Do not redeploy Storage rules for these features.

## Test

Assign a fresh registered account as beta, issue one selected public card and one selected beta-only card, verify both in My Collection. Verify that a normal account cannot see the beta card in the public catalog or receive it via grant/trade, and cannot save it in a deck. Try the second curated drop for the first tester, then deactivate them and verify new beta-only deck access is denied. Reactivate to confirm their owned beta cards remain.

The backend tests validate the release audience and legacy compatibility. **Live assignment, permission, and transaction tests must still be performed on the deployed Firebase project.**
