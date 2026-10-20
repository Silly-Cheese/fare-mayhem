# Fare Mayhem — The Fifteen Official Action Cards

These 15 Action cards are based on the owner's uploaded JSON. Every **name, 1–3 star rating, Fare cost, ability string and effectKey** remains unchanged. The engine uses internal `attack: 0` and `health: 1` placeholders for Action-type data only; those are not combat stats printed on an Action card.

The owner's **Option B** finished-card images are displayed intact, not re-framed. An image's aspect ratio is a recommendation, not an upload requirement. Up to 50 full finished-card images can also be mass-imported as private drafts.

## Recognized Action effects

| Card | Fare cost | Server behavior |
|---|---:|---|
| Reputation Repair | 1 | Restore up to 2 Reputation (maximum 20) |
| Tip Boost | 1 | Gain 2 Fare (maximum 10) |
| Detour | 2 | Choose a board Driver; return it to its current controller's hand (if room) |
| Lucky Break | 2 | Choose a Driver; completely prevent its next damage instance |
| Backseat Boost | 2 | Choose a Driver; increase current and maximum HP by 2 while on board |
| Draw Up | 1 | Draw two cards (existing hand/fatigue rules apply) |
| Nope! | 1 | React when an opponent plays an Action; spend 1 Fare to cancel it before the effect resolves |
| Second Wind | 2 | Choose a Driver; restore 2 HP, up to its current boosted maximum |
| Switcheroo | 2 | Choose two board Drivers; swap their lane positions or controllers |
| Fare Boost | 2 | Gain 2 Fare (maximum 10) |
| Quick Arrival | 1 | The next Driver played this turn arrives ready to attack |
| Team Spirit | 2 | All friendly Drivers gain +1 current and maximum HP |
| Steal the Spotlight | 3 | Take 1 Fare from the opposing **player**, if available |
| Total Chaos | 4 | Each player discards their first hand card and then draws one |
| Extra Turn | 4 | Grant one additional Action-card play during the current turn |

## Important rule clarifications

- The existing battle system does not give an individual Driver a personal Fare wallet. **Steal the Spotlight** therefore targets the opponent's Fare balance. The displayed JSON text is not modified.
- Action cards are normally limited to **one per active turn**; **Extra Turn** grants one additional Action-card play. Driver cards do not count toward this Action limit.
- **Nope!** is a reaction-only card, not an Action you can play on your own turn. A valid defender sees a response choice and may decline. If the defender is the solo computer, the server makes the decision automatically. A countered Action still consumes its own cost, while Nope! costs 1 Fare.
- **Lucky Break** prevents one whole damage instance, not just one point.
- **Detour, Lucky Break, Backseat Boost and Second Wind** support explicit target choice. **Switcheroo** requires two chosen Drivers. This adds legitimate decisions rather than silently affecting the first card.
- **Total Chaos** uses the first card in each hand because the uploaded JSON does not specify how to choose what gets discarded; consider revisiting this rule if manual discard is desired.
- **Quick Arrival** applies to the next Driver played in the same turn. If none arrives before that turn ends, the bonus expires.
- No new OpenAI API dependency or paid illustration generation service is used. Firebase Blaze still has normal service usage costs.

## Importing

Go to **Card Studio → Bulk Import → CSV/JSON with artwork** to upload the 15-card JSON and the corresponding finished PNG/JPEG/WebP files. File base names matching card names are detected for full-card art even when no `finishedFile` field is present. Alternatively, go to **Upload finished cards**, choose up to 50 images and review the suggested metadata; these 15 Action filenames now have presets drawn from the JSON.

Both methods save **private drafts first**, with independent outcomes for each card. Review ability/stats and attach complete art before publishing.

## Backend deployment

The GitHub Pages workflow updates only the frontend. To activate the new Action effect logic in Firebase on Windows PowerShell:

```powershell
cd "C:\Users\Owner\Documents\fare-mayhem"
git pull --ff-only origin main
npm.cmd --prefix functions run test
firebase.cmd use fare-mayhem
firebase.cmd deploy --only "functions:takePracticeAction"
firebase.cmd deploy --only "functions:startPracticeMatch"
firebase.cmd deploy --only "functions:getPracticeMatch"
firebase.cmd deploy --only "functions:takePvpAction"
firebase.cmd deploy --only "functions:getPvpStatus"
firebase.cmd deploy --only "functions:joinPvpQueue"
firebase.cmd deploy --only "functions:saveOfficialCard"
firebase.cmd deploy --only "functions:publishOfficialCard"
```

Run **one deployment at a time** if the project is still close to its `us-central1` Cloud Run CPU quota. If a deployment fails, do not assume the whole backend is updated; stop and inspect the exact error.

New rules should be tested from a fresh Secure Practice match and two test PvP accounts before declaring live multiplayer validated.
