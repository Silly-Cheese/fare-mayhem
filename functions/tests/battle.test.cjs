const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createBattle,applyCommand,canPlay,play,endTurn,attack,aiTurn,publicView,officialBattleCard}=require('../lib/battle.js')
test('start 25 cards and hide AI hand and deck',()=>{const s=createBattle([],()=>0.3);assert.equal(s.player.hand.length+s.player.deck.length,25);assert.equal(s.opponent.hand.length+s.opponent.deck.length,25);const v=publicView(s);assert.equal(v.opponent.hand,undefined);assert.equal(v.opponent.deck,undefined);assert.equal(v.opponent.handCount,5)})
test('bad actions do not mutate the state',()=>{const s=createBattle([],()=>0.2);const serialized=JSON.stringify(s);assert.equal(applyCommand(s,{type:'play',index:999}),null);assert.equal(applyCommand(s,{type:'attack',attackerId:'forged'}),null);assert.equal(JSON.stringify(s),serialized)})
test('a driver cannot attack immediately, then can strike blockers only',()=>{const s=createBattle([],()=>0.2);s.player.hand=['goblin'];s.player.fare=1;let n=play(s,'player',0);assert.ok(n);assert.equal(attack(n,'player',n.player.board[0].id),null);n=endTurn(endTurn(n));n.opponent.board=[{id:'guard',cardId:'goblin',hp:2,ready:true}];assert.equal(attack(n,'player',n.player.board[0].id),null);assert.ok(attack(n,'player',n.player.board[0].id,'guard'))})
test('AI turn is bounded and returns to player or game over',()=>{const s=endTurn(createBattle([],()=>0.4));const result=aiTurn(s);assert.ok(result.turn==='player'||result.winner)})
test('official cards are playable with server-owned preset effects',()=>{const card=officialBattleCard('abcdef123456',{status:'published',kind:'driver',name:'Test',nickname:'T',cost:1,attack:5,health:3,rarity:'transcendent',transcendentLabel:'∞',effectKey:'heal_reputation_2'});assert.equal(card.rating,'∞');const s=createBattle([card],()=>0.4);assert.ok(Object.keys(s.cards).some(id=>id.startsWith('official_')));assert.equal(s.player.deck.length+s.player.hand.length,25)})
test('invalid effect metadata is rejected',()=>{assert.equal(officialBattleCard('test',{status:'published',kind:'driver',cost:1,attack:1,health:1,effectKey:'arbitrary_js'}),null)})
test('version increments only after legal player moves',()=>{const s=createBattle([],()=>0.3);s.player.hand=['surge'];s.player.fare=1;const n=applyCommand(s,{type:'play',index:0});assert.equal(n.version,s.version+1);assert.equal(n.player.fare,3);assert.equal(s.player.fare,1);assert.equal(applyCommand(s,{type:'play',index:999}),null)})
test('fatigue and victory condition',()=>{let s=createBattle([],()=>0.2);s.player.deck=[];s.player.reputation=1;s=endTurn(endTurn(s));assert.equal(s.winner,'opponent')})

test('Phase 4 official collection deck replaces only the player training cards',()=>{
  const official=Array.from({length:9},(_,i)=>officialBattleCard('officialcard'+i,{status:'published',kind:'driver',name:'Driver '+i,nickname:'',cost:2,attack:2,health:2,rarity:'standard',stars:2,effectKey:'none'}))
  const ids=official.flatMap((c,i)=>Array(i===8?1:3).fill(c.id))
  const match=createBattle(official,()=>0.42,ids)
  assert.equal(ids.length,25)
  assert.ok(match.player.hand.concat(match.player.deck).every(id=>id.startsWith('official_')))
  assert.equal(match.player.deck.length+match.player.hand.length,25)
  assert.ok(match.opponent.hand.concat(match.opponent.deck).every(id=>!id.startsWith('official_')))
  assert.throws(()=>createBattle(official,()=>0.42,[...ids.slice(0,24),'missingcard123']),/Invalid owned practice deck/)
})

test('computer opponent attacks human Reputation and returns the turn',()=>{
  const s=createBattle([],()=>0.3)
  s.turn='opponent'
  s.opponent.hand=[]
  s.opponent.fare=0
  s.opponent.board=[{id:'unit-28',cardId:'orb',hp:5,ready:true}]
  const previous=s.player.reputation
  const result=aiTurn(s)
  assert.equal(result.player.reputation,previous-2)
  assert.equal(result.turn,'player')
  assert.ok(result.log.some(x=>x.includes('hit your Reputation')))
  assert.equal(result.opponent.board[0].ready,false,'attacking driver is exhausted until its next turn')
  assert.equal(s.player.reputation,previous,'computer attack should not mutate source state')
})
test('computer opponent targets a legal blocker before attacking Reputation',()=>{
  const s=createBattle([],()=>0.3)
  s.turn='opponent'
  s.opponent.hand=[]
  s.opponent.fare=0
  s.opponent.board=[{id:'unit-30',cardId:'detour',hp:4,ready:true}]
  s.player.board=[{id:'unit-31',cardId:'goblin',hp:1,ready:true}]
  const result=aiTurn(s)
  assert.equal(result.player.reputation,20)
  assert.equal(result.player.board.length,0)
  assert.ok(result.log.some(x=>x.includes('struck Traffic Goblin')))
})
test('computer opponent cannot attack with a newly dispatched driver',()=>{
  const s=createBattle([],()=>0.3)
  s.turn='opponent'
  s.opponent.hand=['goblin']
  s.opponent.fare=3
  s.opponent.board=[]
  const result=aiTurn(s)
  assert.equal(result.player.reputation,20)
  assert.equal(result.opponent.board.length,1)
})

test('Phase 5 matches two private 25-card official decks without using demo cards',()=>{
  const original=Array.from({length:9},(_,i)=>officialBattleCard('realleased'+i,{
    status:'published',kind:'driver',name:'Original driver '+i,nickname:'',cost:1,
    attack:2,health:3,rarity:'standard',stars:2,effectKey:'none'
  }))
  const deck=original.flatMap((c,i)=>Array(i===8?1:3).fill(c.id))
  const battle=createBattle(original,()=>0.4,deck,deck)
  assert.equal(battle.mode,'pvp')
  assert.equal(battle.player.hand.length+battle.player.deck.length,25)
  assert.equal(battle.opponent.hand.length+battle.opponent.deck.length,25)
  assert.ok(battle.player.hand.concat(battle.player.deck).every(id=>id.startsWith('official_')))
  assert.ok(battle.opponent.hand.concat(battle.opponent.deck).every(id=>id.startsWith('official_')))
  const after=endTurn(battle)
  assert.equal(after.turn,'opponent')
  assert.ok(after.log[0].includes('Dispatcher 2'))
})
