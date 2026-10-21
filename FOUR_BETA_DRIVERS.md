# Four Beta-Only Driver cards

The original four-card JSON describes Jackson Connell, Coach Messi, Fighter Jet and Bronson. **Coach Messi's rating is literally ∞ (Infinite rarity), not 11 stars.** The raw source's `stars: 11` + `specialRating: "infinity"` is an indicator of that unique classification; the approved canonical representation is `rarity: "transcendent"`, `transcendentLabel: "∞"`, and internal `stars: 0` because the storage schema requires a finite integer. **Never display zero stars for Coach Messi; always display ∞.** His combat stats are separately 99 Attack / 999 HP.

All four cards have `releaseAudience: "beta"`. Their image/artwork, and their exact printed ability wording, remain controlled by the owner. No placeholder art is minted by these updates.

| Card | Rating | Fare | ATK | HP | Effect key |
|---|---|---:|---:|---:|---|
| Jackson Connell · The Doll Collector | 2★ | 3 | 0 | 0 | `jackson_connell_hand_infiltration` |
| Coach Messi · The Infinite W.L.P. Legend | ∞ | 0 | 99 | 999 | `coach_messi_infinite_wlp_dominion` |
| Fighter Jet · The Supersonic Ride | 4★ | 4 | 4 | 4 | `fighter_jet_supersonic_strike` |
| Bronson · The ACT Prodigy | 0★ / UNRATED | 1 | 1 | 2 | `bronson_act_brainstorm` |

## Game behavior

**Jackson Connell:** Instead of entering the board, an independent cursed copy enters the enemy hand. Each copy drains 2 Reputation at the beginning of the enemy's turns. The victim cannot play or normally discard the cursed copy. The victim can spend exactly **14 Fare** during their own turn to purge one copy. This required supporting Fare balances up to 20 and allowing saved Fare to carry across turns rather than resetting it to the turn's maxFare. Each instance has a distinct server-generated hand ID.

**Coach Messi:** Entering the board immediately *banishes* the enemy's entire board without triggering defeat effects, including God's one-time resurrection. Coach fully heals existing allies, restores the actor to 20 Reputation, draws 10 cards (with an exceptional larger hand cap), and brings Fare to 20. Coach has 99 Attack, 999 HP, is immune to damage and ordinary board destruction and opponent return-to-hand targeting, and deals 5 direct Reputation damage at the start of each of their controller's turns even when standard ability suppression is active. The server independently enforces **one per deck** in collection decks, saved practice decks and PvP matchmaking.

**Fighter Jet:** On arrival, strikes the first eligible enemy Driver for 2 and gains 1 Fare. An immune opposing Coach cannot be damaged.

**Bronson:** On arrival, the controlling player loses 1 Reputation and privately chooses one of the top 3 deck cards to add to their hand; the remaining two go to the bottom of their deck in their original order. The computer player selects automatically. Players see a prompt in Secure Practice and PvP; opponents do not see the selected options.

## How to add

Upload the import-ready four-card JSON through **Card Studio → Bulk Import → CSV/JSON with artwork**, with the corresponding finished PNG files. The source fields `rarity: "infinite"` and `specialRating: "infinity"` are also normalized to the ∞ classification. Alternatively, choose **Upload finished cards (Option B)** and select images named after the four characters; presets set all four to Beta Only. Review and save drafts, upload full finished cards, then publish.

Assign players as Beta Testers and give them selected copies through **Card Studio → Beta Testers → Choose cards**. The Beta Only protections introduced earlier still apply. Nothing is auto-published or auto-granted.

## Deployment

The GitHub Pages frontend is deployed by GitHub Actions. Firebase Functions must be deployed after fetching the latest repository:

```powershell
cd "C:\Users\Owner\Documents\fare-mayhem"
git pull --ff-only origin main
npm.cmd --prefix functions run test
firebase.cmd use fare-mayhem
```

With existing regional CPU quota constraints, run these separately, and check for "Deploy complete!" each time:

```powershell
firebase.cmd deploy --only "functions:saveOfficialCard"
firebase.cmd deploy --only "functions:publishOfficialCard"
firebase.cmd deploy --only "functions:saveCollectionDeck"
firebase.cmd deploy --only "functions:startPracticeMatch"
firebase.cmd deploy --only "functions:takePracticeAction"
firebase.cmd deploy --only "functions:joinPvpQueue"
firebase.cmd deploy --only "functions:takePvpAction"
```

`getPracticeMatch` and `getPvpStatus` are read-only projections of stored match states and may be deployed too for consistency. No Storage or Firestore rule change is required for these four drivers beyond the existing Beta Only setup.

This patch adds unit tests for exceptional stats, ∞ rarity, 14-Fare Jackson payment, Coach's banishment and immunity, Fighter Jet and Bronson. Unit tests/build are not a substitute for live integration testing on two real beta accounts. Enable new cards only after all relevant Cloud Functions have deployed and the play flows are verified.
