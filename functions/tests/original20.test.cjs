const {test}=require('node:test')
const assert=require('node:assert/strict')
const {EFFECTS,createBattle,play,attack,endTurn,chooseDiscard,publicView,officialBattleCard,canPlay}=require('../lib/battle.js')
const {validateCard}=require('../lib/validation.js')

const keys=[
'summon_beetle_1_1','invisible_first_hit_shield','death_deal_3_damage',
'third_eye_reveal_discard_1','dwarf_jar_fare_1_heal_2','diva_silence_next_clock',
'logan_drum_heal_1_rep_1','toddler_confuse_next_turn',
'jim_boring_reputation_1_and_untargetable','madhatter_chaos_draw_and_blast',
'sun_solar_flare_all_5','centipede_lifesteal_2','george_polite_rep_2_discount_1',
'trump_boast_fare_3_rep_minus_2','bob_awkward_stare_attack_minus_2',
'ja_candy_fare_1_heal_1','divine_judgment_resurrection',
'fish_boy_slipstream_shield_2','prof_khashed_precalc_confusion',
'beatrice_swarm_lifesteal_2'
]
const fresh=(key)=>{
  const s=createBattle([],()=>0.3)
  s.cards.original={...s.cards.orb,id:'original',name:'Original Character',cost:1,attack:2,health:5,effect:key}
  s.player.hand=['original'];s.player.fare=10
  return s
}
const enemy=(s,hp=4)=>{
  s.opponent.board=[{id:'unit-900',cardId:'goblin',hp,ready:true}]
}
test('all 20 uploaded effect keys are executable official-card identifiers',()=>{
  for(const key of keys){
    assert.ok(EFFECTS.includes(key),key)
    const src={status:'published',kind:'driver',name:'Uploaded',cost:2,attack:3,health:5,stars:1,rarity:'standard',effectKey:key}
    assert.equal(officialBattleCard('cardoriginal123',src)?.effect,key)
  }
})
test('Beetle Boy summons one 1/1 companion when there is space',()=>{
  const n=play(fresh('summon_beetle_1_1'),'player',0)
  assert.equal(n.player.board.length,2)
  const beetle=n.player.board[1]
  assert.equal(n.cards[beetle.cardId].attack,1)
  assert.equal(beetle.hp,1)
})
test('Invisible Man avoids the first incoming hit, but not the second',()=>{
  let n=play(fresh('invisible_first_hit_shield'),'player',0)
  n.turn='opponent';enemy(n)
  const first=attack(n,'opponent','unit-900','unit-1')
  assert.equal(first.player.board[0].hp,5)
  assert.equal(first.player.board[0].firstHitProtected,false)
  first.turn='opponent';first.opponent.board[0].ready=true
  const second=attack(first,'opponent','unit-900','unit-1')
  assert.equal(second.player.board[0].hp,4)
})
test('Death damages enemy driver and Third-Eye reveals only while choosing',()=>{
  const state=fresh('death_deal_3_damage');enemy(state,3)
  assert.equal(play(state,'player',0).opponent.board.length,0)
  const eye=fresh('third_eye_reveal_discard_1')
  eye.opponent.hand=['miles','goblin']
  const arrived=play(eye,'player',0)
  assert.equal(arrived.pendingChoice.kind,'third_eye_discard')
  assert.deepEqual(publicView(arrived).revealedOpponentHand,['miles','goblin'])
  assert.equal(canPlay(arrived,'player',0),false)
  assert.equal(chooseDiscard(arrived,'player',100),null)
  const result=chooseDiscard(arrived,'player',1)
  assert.deepEqual(result.opponent.hand,['miles'])
  assert.equal(result.pendingChoice,undefined)
  assert.equal(publicView(result).revealedOpponentHand,undefined)
})
test('Jim gains Reputation and cannot be targeted by opposing arrival abilities',()=>{
  const state=fresh('jim_boring_reputation_1_and_untargetable')
  state.player.reputation=17
  const n=play(state,'player',0)
  assert.equal(n.player.reputation,18)
  assert.equal(n.player.board[0].untargetable,true)
  n.turn='opponent'
  n.cards.blast={...n.cards.orb,id:'blast',cost:1,effect:'death_deal_3_damage'}
  n.opponent.hand=['blast'];n.opponent.fare=10
  const after=play(n,'opponent',0)
  assert.equal(after.player.board[0].hp,5)
})
test('Sun harms both sides other than itself',()=>{
  const state=fresh('sun_solar_flare_all_5')
  state.cards.original.health=10
  state.player.board=[{id:'unit-50',cardId:'miles',hp:4,ready:false}]
  enemy(state,4)
  const n=play(state,'player',0)
  assert.equal(n.player.board.length,1)
  assert.equal(n.player.board[0].cardId,'original')
  assert.equal(n.opponent.board.length,0)
})
test('God consumes board, heals friendly drivers, gains Fare and revives exactly once',()=>{
  const state=fresh('divine_judgment_resurrection')
  state.cards.original.cost=0;state.cards.original.attack=0;state.cards.original.health=50
  state.player.board=[{id:'unit-55',cardId:'orb',hp:1,ready:false}]
  enemy(state,4)
  const n=play(state,'player',0)
  assert.equal(n.opponent.board.length,0)
  assert.equal(n.player.board[0].hp,5)
  assert.equal(n.player.board[1].hp,50)
  assert.equal(n.player.fare,10)
  n.player.board[1].hp=1
  n.turn='opponent'
  enemy(n,4)
  const first=attack(n,'opponent','unit-900','unit-1')
  assert.ok(first.player.board.some(x=>x.cardId==='original'&&x.revived&&x.hp===50))
  first.turn='opponent';first.opponent.board[0].ready=true
  first.player.board.find(x=>x.cardId==='original').hp=1
  const second=attack(first,'opponent','unit-900','unit-1')
  assert.equal(second.player.board.some(x=>x.cardId==='original'),false)
})
test('Trump trades Reputation for Fare and Fish Boy gains Fare with shield',()=>{
  const state=fresh('trump_boast_fare_3_rep_minus_2')
  state.player.reputation=15
  state.player.fare=2
  const n=play(state,'player',0)
  assert.equal(n.player.reputation,13)
  assert.equal(n.player.fare,4)
  const fish=play(fresh('fish_boy_slipstream_shield_2'),'player',0)
  assert.equal(fish.player.board[0].shield,2)
  assert.equal(fish.player.fare,10)
})
test('George gets a next-driver discount; special star classes preserve their values',()=>{
  const state=fresh('george_polite_rep_2_discount_1')
  state.player.reputation=15;state.player.fare=10
  let n=play(state,'player',0)
  assert.equal(n.player.reputation,17)
  assert.equal(n.player.nextDriverDiscount,1)
  n.cards.next={...n.cards.orb,id:'next',cost:5,effect:'none'}
  n.player.hand=['next']
  assert.equal(play(n,'player',0).player.fare,5)
  const base={name:'God',nickname:'The Burning Bush',kind:'driver',rarity:'transcendent',stars:10,transcendentLabel:'★10',cost:0,attack:0,health:50,ability:'Revives.',flavor:'',customerReview:'',edition:'First Edition',effectKey:'divine_judgment_resurrection',originalUrl:'',originalStoragePath:'',cartoonUrl:'',cartoonStoragePath:'',finishedUrl:'',finishedStoragePath:''}
  assert.equal(validateCard(base).health,50)
  assert.equal(validateCard({...base,name:'The Sun',stars:0,transcendentLabel:'☀',health:10}).stars,0)
  assert.equal(validateCard({...base,name:'Trump',stars:6,transcendentLabel:'★6',health:6}).stars,6)
  assert.throws(()=>validateCard({...base,rarity:'standard',stars:6}),/1–5/)
})
