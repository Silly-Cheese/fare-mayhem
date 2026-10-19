export type Rarity = 'standard' | 'transcendent'
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
  ability: '', flavor: '', customerReview: '', edition: 'First Edition',
  originalUrl: '', originalStoragePath: '', cartoonUrl: '', cartoonStoragePath: ''
}
export function ratingLabel(card: Pick<OfficialCard, 'rarity' | 'stars' | 'transcendentLabel'>) {
  return card.rarity === 'transcendent' ? card.transcendentLabel || '???' : '★'.repeat(card.stars) + '☆'.repeat(5 - card.stars)
}
