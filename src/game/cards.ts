export type DriverKind = 'orb' | 'detour' | 'miles' | 'goblin'
export type CardId = 'orb' | 'detour' | 'miles' | 'goblin' | 'snack' | 'ticket' | 'pitstop' | 'surge'
export type CardDef = {
  id: CardId; name: string; nickname: string; type: 'driver' | 'action';
  rating: number; cost: number; attack?: number; health?: number; ability: string; flavor: string;
  kind?: DriverKind; source: 'original' | 'training'
}
export const CARDS: Record<CardId, CardDef> = {
  orb: { id: 'orb', name: 'Kris Kringle', nickname: 'The Orb', type: 'driver', rating: 2, cost: 3, attack: 2, health: 5, ability: 'On arrival: steal up to 1 Fare from the other driver.', flavor: '“He tried to eat my donut...” — Customer', kind: 'orb', source: 'original' },
  detour: { id: 'detour', name: 'Detour Dave', nickname: 'The Shortcut', type: 'driver', rating: 3, cost: 4, attack: 3, health: 4, ability: 'On arrival: deal 1 Reputation damage to the opponent.', flavor: 'Says he knows a faster route. Nobody has arrived yet.', kind: 'detour', source: 'training' },
  miles: { id: 'miles', name: 'Mildred Miles', nickname: 'Meter Queen', type: 'driver', rating: 2, cost: 2, attack: 1, health: 4, ability: 'On arrival: restore 2 Reputation.', flavor: 'Charges by the minute. Even at red lights.', kind: 'miles', source: 'training' },
  goblin: { id: 'goblin', name: 'Traffic Goblin', nickname: 'Rush Hour', type: 'driver', rating: 1, cost: 1, attack: 1, health: 2, ability: 'Cheap to dispatch. Surprisingly loud.', flavor: 'Has never used a turn signal.', kind: 'goblin', source: 'training' },
  snack: { id: 'snack', name: 'Snack Emergency', nickname: 'Action', type: 'action', rating: 1, cost: 2, ability: 'Restore 4 Reputation.', flavor: 'Nobody drives well on an empty stomach.', source: 'training' },
  ticket: { id: 'ticket', name: 'Parking Ticket', nickname: 'Action', type: 'action', rating: 2, cost: 2, ability: 'Deal 3 damage to an enemy driver (or 2 Reputation if none).', flavor: 'The city has questions.', source: 'training' },
  pitstop: { id: 'pitstop', name: 'Emergency Pit Stop', nickname: 'Action', type: 'action', rating: 2, cost: 1, ability: 'Draw 2 cards.', flavor: 'Two minutes. Allegedly.', source: 'training' },
  surge: { id: 'surge', name: 'Surge Pricing', nickname: 'Action', type: 'action', rating: 3, cost: 1, ability: 'Gain 3 Fare.', flavor: 'It is raining three blocks away.', source: 'training' }
}
export const DRIVER_IDS: DriverKind[] = ['orb', 'detour', 'miles', 'goblin']
export const DEMO_DECK: CardId[] = [
  ...Array(3).fill('orb'), ...Array(3).fill('detour'), ...Array(4).fill('miles'),
  ...Array(4).fill('goblin'), ...Array(3).fill('snack'), ...Array(3).fill('ticket'),
  ...Array(3).fill('pitstop'), ...Array(2).fill('surge')
] as CardId[]
