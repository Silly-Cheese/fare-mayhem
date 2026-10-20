export type Rarity = 'standard' | 'transcendent'
export const battleEffectOptions = [
  {value:"none",category:"Basic",label:"No additional effect",help:"No additional effect. This card relies on its normal stats."},
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
] as const
export type BattleEffect = (typeof battleEffectOptions)[number]['value']
export const battleEffectCategories = ['Basic','Arrival','On attack','On defeat','Turn start'] as const
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
  return card.rarity === 'transcendent' ? card.transcendentLabel || '???' : '★'.repeat(card.stars) + '☆'.repeat(5 - card.stars)
}
