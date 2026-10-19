import { CARDS, DEMO_DECK, type CardId } from './cards'

export type Side = 'player' | 'opponent'
export type Unit = { id: string; cardId: CardId; hp: number; ready: boolean }
export type Combatant = { reputation: number; fare: number; maxFare: number; deck: CardId[]; hand: CardId[]; board: Unit[]; fatigue: number }
export type Game = { player: Combatant; opponent: Combatant; turn: Side; round: number; winner: Side | null; log: string[]; nextId: number }

const shuffle = <T,>(items: T[], random: () => number): T[] => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]] }
  return copy
}
const combatant = (random: () => number): Combatant => {
  const deck = shuffle(DEMO_DECK, random)
  return { reputation: 20, fare: 1, maxFare: 1, deck: deck.slice(5), hand: deck.slice(0, 5), board: [], fatigue: 0 }
}
export const makeGame = (random: () => number = Math.random): Game => ({ player: combatant(random), opponent: combatant(random), turn: 'player', round: 1, winner: null, log: ['Dispatch opened. Your move first.'], nextId: 1 })
const copyGame = (g: Game): Game => structuredClone(g)
const message = (g: Game, value: string) => { g.log = [value, ...g.log].slice(0, 12) }
const finish = (g: Game) => { if (g.player.reputation <= 0) g.winner = 'opponent'; else if (g.opponent.reputation <= 0) g.winner = 'player' }
const draw = (g: Game, side: Side, amount = 1) => {
  const p = g[side]
  for (let i = 0; i < amount; i++) {
    if (p.deck.length) { const id = p.deck.shift()!; if (p.hand.length < 8) p.hand.push(id) }
    else { p.fatigue += 1; p.reputation -= p.fatigue; message(g, `${side === 'player' ? 'You' : 'The opponent'} ran out of cards and lost ${p.fatigue} Reputation.`) }
  }
  finish(g)
}
export const playable = (g: Game, side: Side, index: number) => {
  const p = g[side], id = p.hand[index]
  if (g.winner || g.turn !== side || !id) return false
  const card = CARDS[id]
  return card.cost <= p.fare && (card.type === 'action' || p.board.length < 3)
}
export function playCard(g: Game, side: Side, index: number): Game {
  if (!playable(g, side, index)) return g
  const next = copyGame(g)
  const p = next[side], enemy = next[side === 'player' ? 'opponent' : 'player']
  const id = p.hand.splice(index, 1)[0], card = CARDS[id]
  p.fare -= card.cost
  if (card.type === 'driver') {
    p.board.push({ id: `unit-${next.nextId++}`, cardId: id, hp: card.health!, ready: false })
    if (id === 'orb') { const taken = Math.min(1, enemy.fare); p.fare += taken; enemy.fare -= taken }
    if (id === 'detour') enemy.reputation -= 1
    if (id === 'miles') p.reputation = Math.min(20, p.reputation + 2)
  } else if (id === 'snack') p.reputation = Math.min(20, p.reputation + 4)
  else if (id === 'ticket') {
    const target = enemy.board[0]
    if (target) { target.hp -= 3; enemy.board = enemy.board.filter(u => u.hp > 0) }
    else enemy.reputation -= 2
  } else if (id === 'pitstop') draw(next, side, 2)
  else if (id === 'surge') p.fare = Math.min(10, p.fare + 3)
  message(next, `${side === 'player' ? 'You played' : 'Opponent played'} ${card.name}${card.nickname !== 'Action' ? ` · ${card.nickname}` : ''}.`)
  finish(next)
  return next
}
export function attack(g: Game, side: Side, attackerId: string, targetId?: string): Game {
  if (g.winner || g.turn !== side) return g
  const p = g[side], enemy = g[side === 'player' ? 'opponent' : 'player']
  const unit = p.board.find(u => u.id === attackerId)
  if (!unit?.ready || (enemy.board.length > 0 && !enemy.board.some(u => u.id === targetId))) return g
  const next = copyGame(g)
  const me = next[side].board.find(u => u.id === attackerId)!
  const them = next[side === 'player' ? 'opponent' : 'player']
  me.ready = false
  const strength = CARDS[me.cardId].attack!
  if (them.board.length) {
    const victim = them.board.find(u => u.id === targetId)!
    const returnDamage = CARDS[victim.cardId].attack!
    victim.hp -= strength; me.hp -= returnDamage
    next[side].board = next[side].board.filter(u => u.hp > 0)
    them.board = them.board.filter(u => u.hp > 0)
    message(next, `${CARDS[me.cardId].name} hit ${CARDS[victim.cardId].name} for ${strength}. Took ${returnDamage} in return.`)
  } else {
    them.reputation -= strength
    message(next, `${CARDS[me.cardId].name} dealt ${strength} damage to ${side === 'player' ? 'the opponent' : 'you'}!`)
  }
  finish(next)
  return next
}
export function endTurn(g: Game): Game {
  if (g.winner) return g
  const next = copyGame(g)
  const incoming: Side = g.turn === 'player' ? 'opponent' : 'player'
  next.turn = incoming
  if (incoming === 'player') next.round += 1
  const p = next[incoming]
  p.maxFare = Math.min(10, p.maxFare + (incoming === 'player' ? 1 : next.round === 1 ? 0 : 1))
  p.fare = p.maxFare
  p.board.forEach(u => { u.ready = true })
  draw(next, incoming)
  message(next, `${incoming === 'player' ? 'Your' : 'Opponent\'s'} turn. Fare refreshed.`)
  return next
}
export function runOpponentTurn(g: Game): Game {
  if (g.turn !== 'opponent' || g.winner) return g
  let next = g
  // Deterministic, bounded AI: prefer deploying units; otherwise play helpful actions.
  for (let i = 0; i < 6; i++) {
    const available = next.opponent.hand.map((id, index) => ({ id, index })).filter(x => playable(next, 'opponent', x.index))
    if (!available.length) break
    const choice = available.find(x => CARDS[x.id].type === 'driver') ?? available.find(x => x.id === 'surge') ?? available[0]
    const after = playCard(next, 'opponent', choice.index)
    if (after === next) break
    next = after
    if (next.winner) return next
  }
  for (const unit of [...next.opponent.board]) {
    if (!unit.ready) continue
    const target = next.player.board[0]
    next = attack(next, 'opponent', unit.id, target?.id)
    if (next.winner) return next
  }
  return endTurn(next)
}
