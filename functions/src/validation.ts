import { EFFECTS, ACTION_ONLY_EFFECTS, type Effect } from './battle'
export type ReleaseAudience = 'public' | 'beta'
export type Rarity = 'standard' | 'transcendent'
export type SafeCard = {releaseAudience:ReleaseAudience;name:string;nickname:string;kind:'driver'|'action';rarity:Rarity;stars:number;transcendentLabel:string;cost:number;attack:number;health:number;ability:string;flavor:string;customerReview:string;edition:string;effectKey:Effect;originalUrl:string;originalStoragePath:string;cartoonUrl:string;cartoonStoragePath:string;finishedUrl:string;finishedStoragePath:string}
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
  const audience=v.releaseAudience??'public'
  if(audience!=='public'&&audience!=='beta')throw Error('Choose a valid card release audience.')
  const kind = v.kind
  const rarity = v.rarity
  if (kind !== 'driver' && kind !== 'action') throw Error('Invalid card type.')
  if (rarity !== 'standard' && rarity !== 'transcendent') throw Error('Invalid rarity.')
  const stars = numberField(v,'stars',0,10)
  if(rarity==='standard' && (stars<1||stars>5)) throw Error('Standard cards must have 1–5 stars.')
  const transcendentLabel = field(v,'transcendentLabel',12)
  const effectKey:Effect = v.effectKey === undefined ? 'none' : (v.effectKey as Effect)
  if (!EFFECTS.includes(effectKey)) throw Error('Invalid playable battle effect.')
  if (kind === 'action' && (effectKey.startsWith('attack_') || effectKey.startsWith('defeat_') || effectKey.startsWith('turn_'))) throw Error('This ability trigger requires a driver card.')
  if (kind === 'driver' && ACTION_ONLY_EFFECTS.includes(effectKey)) throw Error('That special ability requires an action card.')
  if (!['???','∞','UNRATED','☀','★6','★10'].includes(transcendentLabel)) throw Error('Invalid special rating.')
  const jackson=effectKey==='jackson_connell_hand_infiltration'
  const coach=effectKey==='coach_messi_infinite_wlp_dominion'
  const fighterJet=effectKey==='fighter_jet_supersonic_strike'
  const bronson=effectKey==='bronson_act_brainstorm'
  const name=field(v,'name',70,true)
  if(jackson&&(name!=='Jackson Connell'||kind!=='driver'||stars!==2||rarity!=='standard'))throw Error('Jackson Connell requires his original name and 2-star rarity.')
  if(coach&&(name!=='Coach Messi'||kind!=='driver'||rarity!=='transcendent'||stars!==0||transcendentLabel!=='∞'))throw Error('Coach Messi must have ∞ Infinite rarity, not 11 numeric stars.')
  if(fighterJet&&(name!=='Fighter Jet'||kind!=='driver'||rarity!=='standard'||stars!==4))throw Error('Fighter Jet needs his official 4-star rarity.')
  if(bronson&&(name!=='Bronson'||kind!=='driver'||rarity!=='transcendent'||stars!==0||transcendentLabel!=='UNRATED'))throw Error('Bronson must have a 0-star UNRATED classification.')
  if((jackson||coach||fighterJet||bronson)&&audience!=='beta')throw Error('The four new drivers are reserved for Beta Only release.')
  const cost=numberField(v,'cost',0,10)
  const attack=numberField(v,'attack',0,coach?99:30)
  const health=numberField(v,'health',jackson?0:1,coach?999:50)
  if(jackson&&(cost!==3||attack!==0||health!==0))throw Error('Jackson Connell requires 3 Fare, 0 Attack, and 0 HP.')
  if(coach&&(cost!==0||attack!==99||health!==999))throw Error('Coach Messi requires 0 Fare, 99 Attack, and 999 HP.')
  if(fighterJet&&(cost!==4||attack!==4||health!==4))throw Error('Fighter Jet requires 4 Fare, 4 Attack, and 4 HP.')
  if(bronson&&(cost!==1||attack!==1||health!==2))throw Error('Bronson requires 1 Fare, 1 Attack, and 2 HP.')
  return {
    releaseAudience:audience,name,nickname:field(v,'nickname',70),kind,rarity,stars,transcendentLabel,
    cost,attack,health,
    ability:field(v,'ability',450),flavor:field(v,'flavor',600),customerReview:field(v,'customerReview',350),
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
