import { EFFECTS, type Effect } from './battle'
export type Rarity = 'standard' | 'transcendent'
export type SafeCard = {name:string;nickname:string;kind:'driver'|'action';rarity:Rarity;stars:number;transcendentLabel:string;cost:number;attack:number;health:number;ability:string;flavor:string;customerReview:string;edition:string;effectKey:Effect;originalUrl:string;originalStoragePath:string;cartoonUrl:string;cartoonStoragePath:string;finishedUrl:string;finishedStoragePath:string}
function field(input: Record<string, unknown>, key: string, limit: number, required = false) {
  const value = input[key]
  if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw Error(`Invalid ${key}.`)
  return value.trim()
}
function numberField(input: Record<string, unknown>, key: string, min: number, max: number) {
  const value = input[key]
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw Error(`Invalid ${key}.`)
  return value as number
}
export function validateCard(data: unknown): SafeCard {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid card.')
  const v = data as Record<string, unknown>
  const kind = v.kind
  const rarity = v.rarity
  if (kind !== 'driver' && kind !== 'action') throw Error('Invalid card type.')
  if (rarity !== 'standard' && rarity !== 'transcendent') throw Error('Invalid rarity.')
  const stars = numberField(v,'stars',1,5)
  const transcendentLabel = field(v,'transcendentLabel',12)
  const effectKey:Effect = v.effectKey === undefined ? 'none' : (v.effectKey as Effect)
  if (!EFFECTS.includes(effectKey)) throw Error('Invalid playable battle effect.')
  if (kind === 'action' && (effectKey.startsWith('attack_') || effectKey.startsWith('defeat_') || effectKey.startsWith('turn_'))) throw Error('This ability trigger requires a driver card.')
  if (!['???','∞','UNRATED'].includes(transcendentLabel)) throw Error('Invalid special rating.')
  return {
    name: field(v,'name',70,true),nickname:field(v,'nickname',70),kind,rarity,stars,transcendentLabel,
    cost:numberField(v,'cost',0,10),attack:numberField(v,'attack',0,30),health:numberField(v,'health',1,30),
    ability:field(v,'ability',360),flavor:field(v,'flavor',600),customerReview:field(v,'customerReview',350),
    edition:field(v,'edition',60,true),effectKey,originalUrl:field(v,'originalUrl',2000),originalStoragePath:field(v,'originalStoragePath',300),
    cartoonUrl:field(v,'cartoonUrl',2000),cartoonStoragePath:field(v,'cartoonStoragePath',300),
    finishedUrl:field({...v,finishedUrl:v.finishedUrl??''},'finishedUrl',2000),
    finishedStoragePath:field({...v,finishedStoragePath:v.finishedStoragePath??''},'finishedStoragePath',300)
  }
}
export function validateArtworkPath(id: string, path: string, type: 'original'|'cartoon'|'finished') {
  return /^[A-Za-z0-9_-]{10,80}$/.test(id) && path.startsWith(`card-art/${id}/${type}/`) && !path.includes('..') && path.length <= 300
}
export function canPublish(card: SafeCard) {
  return !!card.name && !!card.ability && !!card.edition && !!(card.finishedUrl || card.cartoonUrl || card.originalUrl)
}
