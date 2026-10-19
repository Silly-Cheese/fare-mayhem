export type Rarity = 'standard' | 'transcendent'
export type BattleEffect = 'none' | 'steal_fare_1' | 'deal_reputation_1' | 'heal_reputation_2' | 'heal_reputation_4' | 'deal_driver_3' | 'draw_2' | 'gain_fare_3'
export const battleEffectOptions: {value:BattleEffect; label:string; help:string}[] = [
  {value:'none',label:'No additional effect',help:'Stats alone; no special effect on arrival.'},
  {value:'steal_fare_1',label:'Steal 1 Fare',help:'Take up to one Fare from the rival when played.'},
  {value:'deal_reputation_1',label:'Deal 1 Reputation',help:'Deal 1 damage directly to the rival when played.'},
  {value:'heal_reputation_2',label:'Recover 2 Reputation',help:'Restore 2 Reputation on arrival.'},
  {value:'heal_reputation_4',label:'Recover 4 Reputation',help:'Restore 4 Reputation when played.'},
  {value:'deal_driver_3',label:'Parking Ticket',help:'Deal 3 to the first enemy driver, or 2 to Reputation if empty.'},
  {value:'draw_2',label:'Draw 2 cards',help:'Draw two cards, subject to hand limit and fatigue.'},
  {value:'gain_fare_3',label:'Gain 3 Fare',help:'Gain 3 Fare, maximum 10.'},
]
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
  status: CardStatus
  updatedAt?: unknown
  publishedAt?: unknown
}
export type EditableCard = Omit<OfficialCard, 'id' | 'status' | 'updatedAt' | 'publishedAt'>
export const initialCard: EditableCard = {
  name: '', nickname: '', kind: 'driver', rarity: 'standard', stars: 1,
  transcendentLabel: '???', cost: 2, attack: 2, health: 3,
  ability: '', flavor: '', customerReview: '', edition: 'First Edition', effectKey: 'none',
  originalUrl: '', originalStoragePath: '', cartoonUrl: '', cartoonStoragePath: ''
}
export function ratingLabel(card: Pick<OfficialCard, 'rarity' | 'stars' | 'transcendentLabel'>) {
  return card.rarity === 'transcendent' ? card.transcendentLabel || '???' : '★'.repeat(card.stars) + '☆'.repeat(5 - card.stars)
}
