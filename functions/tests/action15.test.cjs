const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createBattle,play,attack,canPlay,chooseTarget,respondToAction,applyCommand}=require('../lib/battle.js')
const ids=[
'reputation_repair_restore_2','tip_boost_gain_2_fare','detour_return_driver_to_hand',
'lucky_break_prevent_next_damage','backseat_boost_add_2_hp','draw_up_draw_2',
'nope_cancel_action','second_wind_heal_driver_2','switcheroo_swap_2_drivers',
'fare_boost_gain_2_fare','quick_arrival_instant_driver','team_spirit_all_drivers_hp_1',
'steal_spotlight_steal_1_fare','total_chaos_cycle_1_all','extra_turn_extra_action'
]
const {EFFECTS,officialBattleCard}=require('../lib/battle.js')
function card(s,key,cost=1){
  s.cards.testAction={...s.cards.surge,id:'testAction',name:key,kind:'action',cost,effect:key}
  s.player.hand=['testAction'];s.player.fare=6
  return s
}
function fighterBoard(s){
  s.player.board=[{id:'unit-201',cardId:'orb',hp:2,ready:true},{id:'unit-202',cardId:'goblin',hp:2,ready:true}]
  s.opponent.board=[{id:'unit-301',cardId:'miles',hp:2,ready:true}]
  return s
}
test('all 15 uploaded JSON action ability IDs are valid playable effect keys',()=>{
  for(const key of ids){
    assert.ok(EFFECTS.includes(key),key)
    const obj=officialBattleCard('actioncard1234',{status:'published',kind:'action',name:'Action',rarity:'standard',stars:2,cost:2,attack:0,health:1,effectKey:key})
    assert.equal(obj.effect,key)
  }
})
test('reputation repair and both Fare boost action cards work independently',()=>{
  let s=card(createBattle([],()=>0.2),'reputation_repair_restore_2')
  s.player.reputation=16
  assert.equal(play(s,'player',0).player.reputation,18)
  for(const key of ['tip_boost_gain_2_fare','fare_boost_gain_2_fare']){
    const state=card(createBattle([],()=>0.2),key);state.player.fare=4
    assert.equal(play(state,'player',0).player.fare,5)
  }
})
test('Detour returns a targeted Driver to the controller hand',()=>{
  const state=fighterBoard(card(createBattle([],()=>0.2),'detour_return_driver_to_hand'))
  const pending=play(state,'player',0)
  assert.equal(pending.pendingChoice.kind,'action_target')
  assert.equal(chooseTarget(pending,'player','opponent','unit-404'),null)
  const returned=chooseTarget(pending,'player','opponent','unit-301')
  assert.equal(returned.opponent.board.length,0)
  assert.ok(returned.opponent.hand.includes('miles'))
})
test('Lucky Break blocks the next entire damage instance',()=>{
  const state=fighterBoard(card(createBattle([],()=>0.2),'lucky_break_prevent_next_damage'))
  let next=chooseTarget(play(state,'player',0),'player','player','unit-201')
  assert.equal(next.player.board[0].firstHitProtected,true)
  next.turn='opponent'
  const attacked=attack(next,'opponent','unit-301','unit-201')
  assert.equal(attacked.player.board[0].hp,2)
  assert.equal(attacked.player.board[0].firstHitProtected,false)
})
test('Backseat Boost and Second Wind select their target correctly',()=>{
  let state=fighterBoard(card(createBattle([],()=>0.2),'backseat_boost_add_2_hp'))
  let next=chooseTarget(play(state,'player',0),'player','player','unit-201')
  assert.equal(next.player.board[0].hp,4)
  assert.equal(next.player.board[0].hpBoost,2)
  state=fighterBoard(card(createBattle([],()=>0.2),'second_wind_heal_driver_2'))
  next=chooseTarget(play(state,'player',0),'player','player','unit-201')
  assert.equal(next.player.board[0].hp,4)
})
test('Draw Up draws two cards, bounded by standard hand rules',()=>{
  const state=card(createBattle([],()=>0.2),'draw_up_draw_2')
  const before=state.player.deck.length
  const next=play(state,'player',0)
  assert.equal(next.player.deck.length,before-2)
  assert.equal(next.player.hand.length,2)
})
test('Nope is only reactive; defender can counter or allow the Action',()=>{
  const state=card(createBattle([],()=>0.2),'draw_up_draw_2')
  state.mode='pvp'
  state.cards.counter={...state.cards.surge,id:'counter',kind:'action',cost:1,effect:'nope_cancel_action'}
  state.opponent.hand=['counter']
  state.opponent.fare=1
  const pending=play(state,'player',0)
  assert.equal(pending.pendingReaction.responder,'opponent')
  assert.equal(pending.player.hand.length,0)
  assert.equal(pending.player.deck.length,state.player.deck.length)
  assert.equal(canPlay(pending,'opponent',0),false)
  const blocked=respondToAction(pending,'opponent',true,0)
  assert.equal(blocked.pendingReaction,undefined)
  assert.equal(blocked.opponent.fare,0)
  assert.equal(blocked.player.deck.length,state.player.deck.length)
  assert.equal(blocked.opponent.hand.length,0)
  const allowed=respondToAction(pending,'opponent',false)
  assert.equal(allowed.pendingReaction,undefined)
  assert.equal(allowed.player.deck.length,state.player.deck.length-2)
})
test('Switcheroo selects two Drivers and swaps board control',()=>{
  const state=fighterBoard(card(createBattle([],()=>0.2),'switcheroo_swap_2_drivers'))
  const first=chooseTarget(play(state,'player',0),'player','player','unit-201')
  assert.equal(first.pendingChoice.first.unitId,'unit-201')
  const next=chooseTarget(first,'player','opponent','unit-301')
  assert.equal(next.pendingChoice,undefined)
  assert.equal(next.player.board[0].cardId,'miles')
  assert.equal(next.opponent.board[0].cardId,'orb')
})
test('Quick Arrival makes the next dispatched Driver immediately ready',()=>{
  const state=card(createBattle([],()=>0.2),'quick_arrival_instant_driver')
  let next=play(state,'player',0)
  next.player.hand=['goblin']
  const deployed=play(next,'player',0)
  assert.equal(deployed.player.board[0].ready,true)
  assert.equal(deployed.player.quickArrivalCharges,0)
})
test('Team Spirit increases all friendly Drivers max HP and current HP',()=>{
  const state=fighterBoard(card(createBattle([],()=>0.2),'team_spirit_all_drivers_hp_1'))
  const next=play(state,'player',0)
  assert.deepEqual(next.player.board.map(u=>u.hp),[3,3])
  assert.deepEqual(next.player.board.map(u=>u.hpBoost),[1,1])
  assert.equal(next.opponent.board[0].hp,2)
})
test('Steal the Spotlight moves one Fare from opponent to player',()=>{
  const state=card(createBattle([],()=>0.2),'steal_spotlight_steal_1_fare')
  state.opponent.fare=3
  const next=play(state,'player',0)
  assert.equal(next.player.fare,6)
  assert.equal(next.opponent.fare,2)
})
test('Total Chaos discards one card then draws one for each player',()=>{
  const state=card(createBattle([],()=>0.2),'total_chaos_cycle_1_all')
  state.opponent.hand=['orb','goblin']
  const pBefore=state.player.deck.length,oBefore=state.opponent.deck.length
  const next=play(state,'player',0)
  assert.equal(next.opponent.hand.length,2)
  assert.equal(next.player.hand.length,1)
  assert.equal(next.player.deck.length,pBefore-1)
  assert.equal(next.opponent.deck.length,oBefore-1)
})
test('Extra Turn grants exactly one additional Action play this turn',()=>{
  const state=card(createBattle([],()=>0.2),'extra_turn_extra_action',4)
  const extra=play(state,'player',0)
  assert.equal(extra.player.actionCardsPlayed,1)
  assert.equal(extra.player.actionAllowance,2)
  extra.cards.followup={...extra.cards.surge,id:'followup',kind:'action',cost:1,effect:'tip_boost_gain_2_fare'}
  extra.player.hand=['followup']
  assert.equal(canPlay(extra,'player',0),true)
  const played=play(extra,'player',0)
  assert.equal(played.player.actionCardsPlayed,2)
  played.player.hand=['followup']
  assert.equal(canPlay(played,'player',0),false)
})
