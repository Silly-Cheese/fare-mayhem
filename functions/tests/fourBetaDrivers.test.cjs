const {test}=require('node:test')
const assert=require('node:assert/strict')
const {EFFECTS,createBattle,play,attack,endTurn,chooseDeckCard,removeJackson,canPlay,officialBattleCard}=require('../lib/battle.js')
const {validateCard}=require('../lib/validation.js')
const base={name:'Test',nickname:'Beta Test',releaseAudience:'beta',kind:'driver',rarity:'standard',stars:2,transcendentLabel:'???',cost:1,attack:1,health:2,ability:'Play.',flavor:'',customerReview:'',edition:'First Edition',effectKey:'none',originalUrl:'',originalStoragePath:'',cartoonUrl:'',cartoonStoragePath:'',finishedUrl:'',finishedStoragePath:''}
const details=[
 {name:'Jackson Connell',nickname:'The Doll Collector',stars:2,rarity:'standard',effectKey:'jackson_connell_hand_infiltration',cost:3,attack:0,health:0},
 {name:'Coach Messi',nickname:'The Infinite W.L.P. Legend',stars:0,rarity:'transcendent',transcendentLabel:'∞',effectKey:'coach_messi_infinite_wlp_dominion',cost:0,attack:99,health:999},
 {name:'Fighter Jet',nickname:'The Supersonic Ride',stars:4,rarity:'standard',effectKey:'fighter_jet_supersonic_strike',cost:4,attack:4,health:4},
 {name:'Bronson',nickname:'The ACT Prodigy',stars:0,rarity:'transcendent',transcendentLabel:'UNRATED',effectKey:'bronson_act_brainstorm',cost:1,attack:1,health:2}
]
const fresh=(effect,side='player')=>{
 const s=createBattle([],()=>0.31)
 const def=details.find(d=>d.effectKey===effect)
 s.cards.beta={...s.cards.orb,id:'beta',name:def.name,nickname:def.nickname,kind:'driver',cost:def.cost,attack:def.attack,health:def.health,effect}
 s[side].hand=['beta'];s[side].fare=10;s.turn=side
 return s
}
test('All four special effects are official and exactly classified as beta-only',()=>{
 for(const def of details){
  assert.ok(EFFECTS.includes(def.effectKey))
  const input={...base,...def}
  const safe=validateCard(input)
  assert.equal(safe.releaseAudience,'beta')
  assert.equal(safe.stars,def.stars)
  assert.equal(officialBattleCard('beta_card_00001',{...safe,status:'published'}).effect,def.effectKey)
  assert.throws(()=>validateCard({...input,releaseAudience:'public'}),/Beta Only/)
 }
})
test('Coach Messi is ∞ stars, never eleven stars, and his stats are locked',()=>{
 const input={...base,...details[1]}
 assert.equal(validateCard(input).transcendentLabel,'∞')
 assert.throws(()=>validateCard({...input,stars:11}),/Invalid stars/)
 assert.throws(()=>validateCard({...input,stars:10}),/Infinite rarity/)
 assert.throws(()=>validateCard({...input,attack:100}),/Invalid attack/)
 assert.throws(()=>validateCard({...input,health:998}),/Coach Messi requires/)
 assert.throws(()=>validateCard({...base,health:999}),/Invalid health/)
})
test('Jackson enters opponent hand rather than board and drains exactly 2 Reputation at each turn start',()=>{
 const s=fresh('jackson_connell_hand_infiltration')
 const n=play(s,'player',0)
 assert.equal(n.player.board.length,0)
 assert.equal(n.opponent.hand.length,6)
 const cursed=n.opponent.infiltrators[0]
 assert.equal(n.cards[cursed].name,'Jackson Connell')
 assert.equal(n.opponent.hand.at(-1),cursed)
 assert.equal(n.opponent.reputation,20)
 const started=endTurn(n)
 assert.equal(started.opponent.reputation,18)
 assert.equal(canPlay(started,'opponent',started.opponent.hand.indexOf(cursed)),false)
 assert.equal(removeJackson(started,'opponent',started.opponent.hand.indexOf(cursed)),null)
 const paid=structuredClone(started);paid.opponent.fare=14
 const freed=removeJackson(paid,'opponent',paid.opponent.hand.indexOf(cursed))
 assert.equal(freed.opponent.fare,0)
 assert.equal(freed.opponent.infiltrators.length,0)
 assert.equal(freed.opponent.hand.includes(cursed),false)
})
test('Ordinary discard effects and Third-Eye cannot remove Jackson',()=>{
 const s=fresh('jackson_connell_hand_infiltration')
 let n=play(s,'player',0)
 const curse=n.opponent.infiltrators[0]
 n.cards.chaos={...n.cards.surge,id:'chaos',kind:'action',cost:1,effect:'total_chaos_cycle_1_all'}
 n.player.hand=['chaos'];n.player.actionCardsPlayed=0;n.player.fare=4
 const moved=play(n,'player',0)
 assert.ok(moved.opponent.hand.includes(curse))
})
test('Coach Messi banishes opposing Divine Drivers without resurrection and draws ten',()=>{
 const s=fresh('coach_messi_infinite_wlp_dominion')
 s.player.reputation=4;s.player.fare=0;s.player.board=[{id:'unit-70',cardId:'orb',hp:1,ready:true}]
 s.cards.god={...s.cards.orb,id:'god',effect:'divine_judgment_resurrection',health:50}
 s.opponent.board=[{id:'unit-90',cardId:'god',hp:50,ready:true}]
 const before=s.player.deck.length
 const n=play(s,'player',0)
 assert.equal(n.opponent.board.length,0)
 assert.equal(n.player.reputation,20)
 assert.equal(n.player.board[0].hp,5)
 assert.equal(n.player.board[1].immune,true)
 assert.equal(n.player.board[1].hp,999)
 assert.equal(n.player.fare,20)
 assert.equal(n.player.deck.length,before-10)
 assert.equal(n.player.hand.length,10)
 const turn=endTurn(endTurn(n))
 assert.equal(turn.opponent.reputation,15)
})
test('Coach Messi ignores damage, opposing destruction and return-to-hand',()=>{
 const s=fresh('coach_messi_infinite_wlp_dominion')
 let n=play(s,'player',0)
 n.turn='opponent'
 n.opponent.board=[{id:'unit-400',cardId:'goblin',hp:2,ready:true}]
 n=attack(n,'opponent','unit-400',n.player.board[0].id)
 assert.equal(n.player.board[0].hp,999)
 n.turn='opponent';n.opponent.fare=4
 n.cards.god={...n.cards.orb,id:'god',cost:0,effect:'divine_judgment_resurrection',health:50}
 n.opponent.hand=['god']
 n=play(n,'opponent',0)
 assert.equal(n.player.board[0].hp,999)
})
test('Fighter Jet deals 2 damage and gains 1 Fare',()=>{
 const s=fresh('fighter_jet_supersonic_strike')
 s.player.fare=6
 s.opponent.board=[{id:'unit-900',cardId:'orb',hp:4,ready:true}]
 const n=play(s,'player',0)
 assert.equal(n.opponent.board[0].hp,2)
 assert.equal(n.player.fare,3)
})
test('Bronson chooses 1 of 3 cards and moves the rest to the bottom',()=>{
 const s=fresh('bronson_act_brainstorm')
 s.player.deck=['orb','miles','goblin','ticket']
 const n=play(s,'player',0)
 assert.equal(n.player.reputation,19)
 assert.equal(n.pendingChoice.kind,'bronson_choose')
 assert.deepEqual(n.pendingChoice.options,['orb','miles','goblin'])
 assert.equal(chooseDeckCard(n,'player',4),null)
 const done=chooseDeckCard(n,'player',1)
 assert.equal(done.pendingChoice,undefined)
 assert.deepEqual(done.player.hand,['miles'])
 assert.deepEqual(done.player.deck,['ticket','orb','goblin'])
})
