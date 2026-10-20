export type Rarity = 'standard' | 'transcendent'
export const battleEffectOptions = [
  {value:"none",category:"Basic",label:"No additional effect",help:"No additional effect. This card relies on its normal stats."},
  {value:"discount_self_cost_1",category:"Discount",label:"Costs 1 less Fare to play (Jim)",help:"This card costs 1 less Fare to play, to a minimum of zero. The printed cost does not change."},
  {value:"steal_fare_1",category:"Arrival",label:"Steal 1 Fare",help:"On arrival: steal up to 1 Fare from the rival."},
  {value:"steal_fare_2",category:"Arrival",label:"Steal 2 Fare",help:"On arrival: steal up to 2 Fare from the rival."},
  {value:"deal_reputation_1",category:"Arrival",label:"Deal 1 Reputation damage",help:"On arrival: deal 1 damage to enemy Reputation."},
  {value:"deal_reputation_2",category:"Arrival",label:"Deal 2 Reputation damage",help:"On arrival: deal 2 damage to enemy Reputation."},
  {value:"deal_reputation_3",category:"Arrival",label:"Deal 3 Reputation damage",help:"On arrival: deal 3 damage to enemy Reputation."},
  {value:"heal_reputation_1",category:"Arrival",label:"Restore 1 Reputation",help:"On arrival: restore 1 of your Reputation, up to 20."},
  {value:"heal_reputation_2",category:"Arrival",label:"Restore 2 Reputation",help:"On arrival: restore 2 of your Reputation, up to 20."},
  {value:"heal_reputation_4",category:"Arrival",label:"Restore 4 Reputation",help:"On arrival: restore 4 of your Reputation, up to 20."},
  {value:"heal_reputation_6",category:"Arrival",label:"Restore 6 Reputation",help:"On arrival: restore 6 of your Reputation, up to 20."},
  {value:"deal_driver_2",category:"Arrival",label:"Hit enemy driver for 2",help:"On arrival: deal 2 to the first enemy driver, or 2 Reputation if none."},
  {value:"deal_driver_3",category:"Arrival",label:"Parking Ticket — hit for 3",help:"On arrival: deal 3 to the first enemy driver, or 2 Reputation if none."},
  {value:"deal_driver_5",category:"Arrival",label:"Hit enemy driver for 5",help:"On arrival: deal 5 to the first enemy driver, or 2 Reputation if none."},
  {value:"draw_1",category:"Arrival",label:"Draw 1 card",help:"On arrival: draw 1 card (8-card hand cap; deck fatigue applies)."},
  {value:"draw_2",category:"Arrival",label:"Draw 2 cards",help:"On arrival: draw 2 cards (8-card hand cap; deck fatigue applies)."},
  {value:"draw_3",category:"Arrival",label:"Draw 3 cards",help:"On arrival: draw 3 cards (8-card hand cap; deck fatigue applies)."},
  {value:"gain_fare_1",category:"Arrival",label:"Gain 1 Fare",help:"On arrival: gain 1 Fare, maximum 10."},
  {value:"gain_fare_2",category:"Arrival",label:"Gain 2 Fare",help:"On arrival: gain 2 Fare, maximum 10."},
  {value:"gain_fare_3",category:"Arrival",label:"Gain 3 Fare",help:"On arrival: gain 3 Fare, maximum 10."},
  {value:"drain_fare_2",category:"Arrival",label:"Drain 2 enemy Fare",help:"On arrival: the rival loses up to 2 Fare."},
  {value:"deal_all_enemies_1",category:"Arrival",label:"Damage all enemy drivers",help:"On arrival: deal 1 damage to each enemy driver."},
  {value:"heal_ally_2",category:"Arrival",label:"Repair a friendly driver",help:"On arrival: restore up to 2 health to the most damaged friendly driver."},
  {value:"buff_ally_attack_1",category:"Arrival",label:"Boost friendly Attack",help:"On arrival: your first friendly driver gains +1 Attack (up to +5 bonus)."},
  {value:"stun_enemy_1",category:"Arrival",label:"Stun an enemy driver",help:"On arrival: first enemy driver cannot attack on its next turn."},
  {value:"discard_enemy_1",category:"Arrival",label:"Force one discard",help:"On arrival: rival discards the first card in their hand."},
  {value:"shield_self_2",category:"Arrival",label:"Grant 2 Shield",help:"On arrival: your most recently dispatched driver gets 2 damage-blocking Shield."},
  {value:"attack_heal_reputation_1",category:"On attack",label:"Heal when attacking",help:"Each time this driver attacks: restore 1 Reputation, max 20."},
  {value:"attack_steal_fare_1",category:"On attack",label:"Steal Fare when attacking",help:"Each time this driver attacks: steal up to 1 Fare from the rival."},
  {value:"attack_draw_1",category:"On attack",label:"Draw when attacking",help:"Each time this driver attacks: draw 1 card. Fatigue applies."},
  {value:"defeat_deal_reputation_2",category:"On defeat",label:"Revenge damage",help:"When this driver is defeated: deal 2 damage to the rival's Reputation."},
  {value:"defeat_heal_reputation_2",category:"On defeat",label:"Last-minute healing",help:"When this driver is defeated: restore 2 of your Reputation."},
  {value:"defeat_draw_1",category:"On defeat",label:"Final dispatch",help:"When this driver is defeated: draw 1 card. Fatigue applies."},
  {value:"turn_heal_reputation_1",category:"Turn start",label:"Heal each turn",help:"At the beginning of your turn while this driver survives: restore 1 Reputation."},
  {value:"turn_gain_fare_1",category:"Turn start",label:"Collect a Fare each turn",help:"At the beginning of your turn while this driver survives: gain 1 Fare."},
  {value:"turn_buff_attack_1",category:"Turn start",label:"Grow in Attack each turn",help:"At the beginning of your turn while this driver survives: gain +1 Attack (max +5 bonus)."},
  {value:"summon_beetle_1_1",category:"Original characters",label:"Beetle Boy · summon a Beetle",help:"On arrival: summon a 1 Attack / 1 HP Beetle into an empty friendly lane."},
  {value:"invisible_first_hit_shield",category:"Original characters",label:"Invisible Man · evade first damage",help:"Prevent the first damage this Driver would take, then lose the protection."},
  {value:"death_deal_3_damage",category:"Original characters",label:"Death · 3 damage",help:"On arrival: deal 3 damage to an opposing Driver (first eligible target)."},
  {value:"third_eye_reveal_discard_1",category:"Original characters",label:"Third-Eye · hand disruption",help:"On arrival: reveal the opponent's hand and discard one card (targeting interface required for player choice)."},
  {value:"dwarf_jar_fare_1_heal_2",category:"Original characters",label:"The Dwarf · jar bonus",help:"On arrival: gain 1 Fare and restore 2 HP to this Driver."},
  {value:"diva_silence_next_clock",category:"Original characters",label:"The Diva · cancel next Clock ability",help:"On arrival: prevent the opposing side's next turn-start Driver effect."},
  {value:"logan_drum_heal_1_rep_1",category:"Original characters",label:"Logan Francis · drumbeat",help:"On arrival: restore 1 HP to this Driver and 1 Reputation."},
  {value:"toddler_confuse_next_turn",category:"Original characters",label:"Toddler · disable abilities next turn",help:"On arrival: prevent opposing Driver abilities during its next turn."},
  {value:"jim_boring_reputation_1_and_untargetable",category:"Original characters",label:"Jim · Reputation and protection",help:"On arrival: gain 1 Reputation. Opposing abilities cannot target Jim until your next turn."},
  {value:"madhatter_chaos_draw_and_blast",category:"Original characters",label:"Mad Hatter · chaotic draw",help:"On arrival: both players draw 1 card, then deal 2 damage to a random opposing Driver."},
  {value:"sun_solar_flare_all_5",category:"Original characters",label:"The Sun · solar flare",help:"On arrival: deal 5 damage to every other Driver on the board."},
  {value:"centipede_lifesteal_2",category:"Original characters",label:"Human Centipede · drain HP",help:"On arrival: deal 2 damage to an opposing Driver and restore 2 HP to this Driver."},
  {value:"george_polite_rep_2_discount_1",category:"Original characters",label:"George Williamson · polite discount",help:"On arrival: gain 2 Reputation. Your next Driver costs 1 less Fare."},
  {value:"trump_boast_fare_3_rep_minus_2",category:"Original characters",label:"Trump · boast",help:"On arrival: gain 3 Fare and lose 2 Reputation."},
  {value:"bob_awkward_stare_attack_minus_2",category:"Original characters",label:"Bob · awkward stare",help:"On arrival: an opposing Driver gets −2 Attack through its next turn."},
  {value:"ja_candy_fare_1_heal_1",category:"Original characters",label:"Ja · candy jar",help:"On arrival: gain 1 Fare and restore 1 HP to a friendly Driver."},
  {value:"divine_judgment_resurrection",category:"Original characters",label:"God · divine judgment",help:"On arrival: destroy opposing Drivers, fully heal friendlies, draw 5, gain 10 Fare; revive once at full HP. Limit one per deck."},
  {value:"fish_boy_slipstream_shield_2",category:"Original characters",label:"Fish Boy · slipstream",help:"On arrival: gain 1 Fare and shield this Driver from the next 2 damage."},
  {value:"prof_khashed_precalc_confusion",category:"Original characters",label:"Prof. Khashed · precalc confusion",help:"On arrival: opponent loses 1 Fare; suppress the active opposing Driver's next ability."},
  {value:"beatrice_swarm_lifesteal_2",category:"Original characters",label:"Beatrice · swarm",help:"On arrival: deal 2 damage to an opposing Driver and restore 2 HP to Beatrice."},
] as const
export type BattleEffect = (typeof battleEffectOptions)[number]['value']
export const battleEffectCategories = ['Basic','Discount','Arrival','On attack','On defeat','Turn start','Original characters'] as const
export type CardKind = 'driver' | 'action'
export type CardStatus = 'draft' | 'published' | 'retired'
export type OfficialCard = {
  id: string
  name: string
  nickname: string
  kind: CardKind
  rarity: Rarity
  stars: number
  transcendentLabel: string
  cost: number
  attack: number
  health: number
  ability: string
  flavor: string
  customerReview: string
  edition: string
  effectKey: BattleEffect
  originalUrl: string
  originalStoragePath: string
  cartoonUrl: string
  cartoonStoragePath: string
  finishedUrl: string
  finishedStoragePath: string
  status: CardStatus
  updatedAt?: unknown
  publishedAt?: unknown
}
export type EditableCard = Omit<OfficialCard, 'id' | 'status' | 'updatedAt' | 'publishedAt'>
export const initialCard: EditableCard = {
  name: '', nickname: '', kind: 'driver', rarity: 'standard', stars: 1,
  transcendentLabel: '???', cost: 2, attack: 2, health: 3,
  ability: '', flavor: '', customerReview: '', edition: 'First Edition', effectKey: 'none',
  originalUrl: '', originalStoragePath: '', cartoonUrl: '', cartoonStoragePath: '', finishedUrl: '', finishedStoragePath: ''
}
export function ratingLabel(card: Pick<OfficialCard, 'rarity' | 'stars' | 'transcendentLabel'>) {
  return card.rarity === 'transcendent' ? card.transcendentLabel || '???' : '★'.repeat(Math.max(0,Math.min(5,card.stars))) + '☆'.repeat(Math.max(0,5-card.stars))
}
