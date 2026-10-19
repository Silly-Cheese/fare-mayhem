import { describe, it, expect } from 'vitest'
import { CARDS, DEMO_DECK } from './cards'
import { makeGame, playCard, endTurn, attack, runOpponentTurn, type Game } from './engine'

describe('Fare Mayhem training engine', () => {
  it('constructs two complete 25-card decks with player turn', () => {
    const g = makeGame(() => 0.42)
    expect(DEMO_DECK).toHaveLength(25)
    expect(g.player.hand.length + g.player.deck.length).toBe(25)
    expect(g.opponent.hand.length + g.opponent.deck.length).toBe(25)
    expect(g.turn).toBe('player')
  })
  it('rejects illegal plays and too-expensive cards', () => {
    const g = makeGame(() => 0.42)
    g.player.hand = ['detour']; g.player.fare = 0
    expect(playCard(g, 'player', 0)).toBe(g)
    expect(playCard(g, 'opponent', 0)).toBe(g)
  })
  it('allows dispatch, blocks immediate attack, then allows attack after turn cycle', () => {
    const g = makeGame(() => 0.42)
    g.player.hand = ['goblin']; g.player.fare = 1
    const played = playCard(g, 'player', 0)
    expect(played.player.board).toHaveLength(1)
    expect(played.player.board[0].ready).toBe(false)
    expect(attack(played, 'player', played.player.board[0].id)).toBe(played)
    const refreshed = endTurn(endTurn(played))
    expect(refreshed.player.board[0].ready).toBe(true)
    const hit = attack(refreshed, 'player', refreshed.player.board[0].id)
    expect(hit.opponent.reputation).toBe(19)
  })
  it('resolves actions and win condition', () => {
    const g = makeGame(() => 0.4)
    g.player.hand = ['ticket']; g.player.fare = 5; g.opponent.reputation = 2
    const next = playCard(g, 'player', 0)
    expect(next.winner).toBe('player')
    expect(next.opponent.reputation).toBe(0)
  })
  it('enforces target selection, preventing attacks bypassing blockers', () => {
    const g = makeGame(() => 0.4)
    g.player.board = [{ id:'a', cardId:'orb', hp:5, ready:true }]
    g.opponent.board = [{ id:'b', cardId:'goblin', hp:2, ready:true }]
    expect(attack(g, 'player', 'a')).toBe(g)
    const hit = attack(g, 'player', 'a', 'b')
    expect(hit.opponent.board).toHaveLength(0)
    expect(hit.player.board[0].hp).toBe(4)
  })
  it('completes an AI turn without hanging', () => {
    const g: Game = makeGame(() => 0.4)
    const next = runOpponentTurn(endTurn(g))
    expect(next.turn === 'player' || next.winner !== null).toBe(true)
    expect(CARDS.orb.rating).toBe(2)
  })
})
