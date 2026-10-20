/** Server-owned Fare Mayhem rules. No Firebase imports: reproducible and independently testable. */
export type Side = 'player' | 'opponent'
export const EFFECTS = ["none","discount_self_cost_1","steal_fare_1","steal_fare_2","deal_reputation_1","deal_reputation_2","deal_reputation_3","heal_reputation_1","heal_reputation_2","heal_reputation_4","heal_reputation_6","deal_driver_2","deal_driver_3","deal_driver_5","draw_1","draw_2","draw_3","gain_fare_1","gain_fare_2","gain_fare_3","drain_fare_2","deal_all_enemies_1","heal_ally_2","buff_ally_attack_1","stun_enemy_1","discard_enemy_1","shield_self_2","attack_heal_reputation_1","attack_steal_fare_1","attack_draw_1","defeat_deal_reputation_2","defeat_heal_reputation_2","defeat_draw_1","turn_heal_reputation_1","turn_gain_fare_1","turn_buff_attack_1","summon_beetle_1_1","invisible_first_hit_shield","death_deal_3_damage","third_eye_reveal_discard_1","dwarf_jar_fare_1_heal_2","diva_silence_next_clock","logan_drum_heal_1_rep_1","toddler_confuse_next_turn","jim_boring_reputation_1_and_untargetable","madhatter_chaos_draw_and_blast","sun_solar_flare_all_5","centipede_lifesteal_2","george_polite_rep_2_discount_1","trump_boast_fare_3_rep_minus_2","bob_awkward_stare_attack_minus_2","ja_candy_fare_1_heal_1","divine_judgment_resurrection","fish_boy_slipstream_shield_2","prof_khashed_precalc_confusion","beatrice_swarm_lifesteal_2","reputation_repair_restore_2","tip_boost_gain_2_fare","detour_return_driver_to_hand","lucky_break_prevent_next_damage","backseat_boost_add_2_hp","draw_up_draw_2","nope_cancel_action","second_wind_heal_driver_2","switcheroo_swap_2_drivers","fare_boost_gain_2_fare","quick_arrival_instant_driver","team_spirit_all_drivers_hp_1","steal_spotlight_steal_1_fare","total_chaos_cycle_1_all","extra_turn_extra_action"] as const
export type Effect = (typeof EFFECTS)[number]
export type BattleCard = { id:string; name:string; nickname:string; kind:'driver'|'action'; cost:number; attack:number; health:number; effect:Effect; imageUrl:string; fullCard?:boolean; rating:string; source:'training'|'official' }
export type BattleUnit = { id:string; cardId:string; hp:number; ready:boolean; shield?:number; attackBonus?:number; stunnedTurns?:number; firstHitProtected?:boolean; revived?:boolean; untargetable?:boolean; abilityLockTurns?:number; attackDebuff?:number; attackDebuffTurns?:number }
export type Fighter = { reputation:number; fare:number; maxFare:number; deck:string[]; hand:string[]; board:BattleUnit[]; fatigue:number; nextDriverDiscount?:number; cancelNextClock?:number; disableNextTurn?:number; abilitiesDisabled?:boolean }
export type BattleState = { player:Fighter; opponent:Fighter; cards:Record<string,BattleCard>; turn:Side; round:number; winner:Side|null; log:string[]; nextId:number; version:number; mode?:'practice'|'pvp'; pendingChoice?:{side:Side;kind:'third_eye_discard'} }
export type Command = {type:'play';index:number}|{type:'attack';attackerId:string;targetId?:string}|{type:'end'}|{type:'choose_discard';index:number}
export type View = {player:Fighter;opponent:Omit<Fighter,'hand'|'deck'> & {handCount:number;deckCount:number};cards:Record<string,BattleCard>;turn:Side;round:number;winner:Side|null;log:string[];version:number;pendingChoice?:{side:Side;kind:'third_eye_discard'};revealedOpponentHand?:string[]}
const SC:Record<string,BattleCard>={
  orb: {id:'orb',name:'Kris Kringle',nickname:'The Orb',kind:'driver',cost:3,attack:2,health:5,effect:'steal_fare_1',imageUrl:'',rating:'★★☆☆☆',source:'training'},
  detour:{id:'detour',name:'Detour Dave',nickname:'The Shortcut',kind:'driver',cost:4,attack:3,health:4,effect:'deal_reputation_1',imageUrl:'',rating:'★★★☆☆',source:'training'},
  miles:{id:'miles',name:'Mildred Miles',nickname:'Meter Queen',kind:'driver',cost:2,attack:1,health:4,effect:'heal_reputation_2',imageUrl:'',rating:'★★☆☆☆',source:'training'},
  goblin:{id:'goblin',name:'Traffic Goblin',nickname:'Rush Hour',kind:'driver',cost:1,attack:1,health:2,effect:'none',imageUrl:'',rating:'★☆☆☆☆',source:'training'},
  snack:{id:'snack',name:'Snack Emergency',nickname:'Action',kind:'action',cost:2,attack:0,health:1,effect:'heal_reputation_4',imageUrl:'',rating:'★☆☆☆☆',source:'training'},
  ticket:{id:'ticket',name:'Parking Ticket',nickname:'Action',kind:'action',cost:2,attack:0,health:1,effect:'deal_driver_3',imageUrl:'',rating:'★★☆☆☆',source:'training'},
  pitstop:{id:'pitstop',name:'Emergency Pit Stop',nickname:'Action',kind:'action',cost:1,attack:0,health:1,effect:'draw_2',imageUrl:'',rating:'★★☆☆☆',source:'training'},
  surge:{id:'surge',name:'Surge Pricing',nickname:'Action',kind:'action',cost:1,attack:0,health:1,effect:'gain_fare_3',imageUrl:'',rating:'★★★☆☆',source:'training'}
}
const TRAINING_DECK=[...Array(3).fill('orb'),...Array(3).fill('detour'),...Array(4).fill('miles'),...Array(4).fill('goblin'),...Array(3).fill('snack'),...Array(3).fill('ticket'),...Array(3).fill('pitstop'),...Array(2).fill('surge')] as string[]
export const trainingCards = () => ({...SC})
function shuffle<T>(input:T[],random:()=>number):T[]{const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[a[i],a[j]]=[a[j],a[i]]}return a}
function createFighter(deck:string[],random:()=>number):Fighter{const cards=shuffle(deck,random);return{reputation:20,fare:1,maxFare:1,deck:cards.slice(5),hand:cards.slice(0,5),board:[],fatigue:0}}
export function createBattle(published:BattleCard[],random:()=>number=Math.random,ownedCardIds?:string[],opponentOwnedIds?:string[]):BattleState{
  const cards=trainingCards();const deck=[...TRAINING_DECK]
  const eligible=published.filter(c=>c.source==='official'&&EFFECTS.includes(c.effect)&&c.cost>=0&&c.cost<=10).slice(0,ownedCardIds||opponentOwnedIds?200:8)
  eligible.forEach((card,i)=>{const id=`official_${card.id}`;cards[id]={...card,id};if(!ownedCardIds&&i<8)deck[i*3]=id})
  const playerDeck=ownedCardIds ? ownedCardIds.map(id=>`official_${id}`) : deck
  const opposingDeck=opponentOwnedIds ? opponentOwnedIds.map(id=>`official_${id}`) : deck
  if(ownedCardIds&&(ownedCardIds.length!==25||playerDeck.some(id=>!cards[id])))throw Error('Invalid owned practice deck.')
  if(opponentOwnedIds&&(opponentOwnedIds.length!==25||opposingDeck.some(id=>!cards[id])))throw Error('Invalid opposing collection deck.')
  return{player:createFighter(playerDeck,random),opponent:createFighter(opposingDeck,random),cards,turn:'player',round:1,winner:null,log:[opponentOwnedIds?'Two players matched. Twenty Reputation each.':'Dispatch is open. Twenty Reputation each. Make it count.'],nextId:1,version:1,mode:opponentOwnedIds?'pvp':'practice'}
}
function clone(s:BattleState):BattleState{return structuredClone(s)}
function fighterLabel(s:BattleState,side:Side){return s.mode==='pvp'?(side==='player'?'Dispatcher 1':'Dispatcher 2'):(side==='player'?'You':'Dispatch AI')}
function log(s:BattleState,text:string){s.log=[text,...s.log].slice(0,24)}
function checkWinner(s:BattleState){if(s.player.reputation<=0&&s.opponent.reputation<=0)s.winner='opponent';else if(s.player.reputation<=0)s.winner='opponent';else if(s.opponent.reputation<=0)s.winner='player'}
function draw(s:BattleState,side:Side,count=1){const p=s[side];for(let i=0;i<count;i++){if(p.deck.length){const id=p.deck.shift()!;if(p.hand.length<8)p.hand.push(id)}else{p.fatigue++;p.reputation-=p.fatigue;log(s,`${fighterLabel(s,side)} lost ${p.fatigue} Reputation to fatigue.`)}}checkWinner(s)}
function damageUnit(unit:BattleUnit,damage:number) {
  if(damage>0&&unit.firstHitProtected){unit.firstHitProtected=false;return}
  if(damage<=0)return
  const absorbed=Math.min(unit.shield||0,damage)
  unit.shield=(unit.shield||0)-absorbed
  unit.hp-=Math.max(0,damage-absorbed)
}
function defeatedUnits(s:BattleState,side:Side) {
  const board=s[side].board
  const defeated=board.filter(u=>u.hp<=0)
  const revived=defeated.filter(u=>s.cards[u.cardId]?.effect==='divine_judgment_resurrection'&&!u.revived)
  for(const unit of revived){unit.hp=s.cards[unit.cardId].health;unit.revived=true;unit.ready=false;log(s,'God returns at full HP for the first and only time.')}
  s[side].board=board.filter(u=>u.hp>0||revived.includes(u))
  for(const unit of defeated.filter(u=>!revived.includes(u))){
    const key=s.cards[unit.cardId]?.effect
    const fighter=s[side],rival=s[side==='player'?'opponent':'player']
    if(key==='defeat_deal_reputation_2')rival.reputation-=2
    else if(key==='defeat_heal_reputation_2')fighter.reputation=Math.min(20,fighter.reputation+2)
    else if(key==='defeat_draw_1')draw(s,side,1)
    if(key?.startsWith('defeat_'))log(s,`${s.cards[unit.cardId].name} triggered a defeat effect.`)
  }
  checkWinner(s)
}
function effect(s:BattleState,side:Side,what:Effect,kind:'driver'|'action'='driver') {
  const p=s[side],foe=s[side==='player'?'opponent':'player']
  const enemySide:Side=side==='player'?'opponent':'player'
  const justPlayed=p.board.at(-1)
  const enemy=()=>foe.board.find(u=>!u.untargetable)
  if(p.abilitiesDisabled && kind==='driver' && what!=='none' && what!=='discount_self_cost_1')return
  switch(what){
    case 'steal_fare_1':case 'steal_fare_2':{
      const n=Math.min(Number(what.slice(-1)),foe.fare,10-p.fare);foe.fare-=n;p.fare+=n;break
    }
    case 'deal_reputation_1':case 'deal_reputation_2':case 'deal_reputation_3':
      foe.reputation-=Number(what.slice(-1));break
    case 'heal_reputation_1':case 'heal_reputation_2':case 'heal_reputation_4':case 'heal_reputation_6':
      p.reputation=Math.min(20,p.reputation+Number(what.slice(-1)));break
    case 'deal_driver_2':case 'deal_driver_3':case 'deal_driver_5':
      if(foe.board.length){const target=foe.board.find(u=>!u.untargetable);if(target){damageUnit(target,Number(what.slice(-1)));defeatedUnits(s,enemySide)}}
      else foe.reputation-=2
      break
    case 'draw_1':case 'draw_2':case 'draw_3':
      draw(s,side,Number(what.slice(-1)));break
    case 'gain_fare_1':case 'gain_fare_2':case 'gain_fare_3':
      p.fare=Math.min(10,p.fare+Number(what.slice(-1)));break
    case 'drain_fare_2':foe.fare=Math.max(0,foe.fare-2);break
    case 'deal_all_enemies_1':
      foe.board.forEach(u=>damageUnit(u,1));defeatedUnits(s,side==='player'?'opponent':'player');break
    case 'heal_ally_2':{
      const target=p.board.filter(u=>u.hp<s.cards[u.cardId].health).sort((a,b)=>a.hp-b.hp)[0]
      if(target)target.hp=Math.min(s.cards[target.cardId].health,target.hp+2)
      break
    }
    case 'buff_ally_attack_1':{
      const target=p.board[0];if(target)target.attackBonus=Math.min(5,(target.attackBonus||0)+1)
      break
    }
    case 'shield_self_2':{
      const target=p.board.at(-1);if(target)target.shield=Math.min(10,(target.shield||0)+2)
      break
    }
    case 'stun_enemy_1':{
      const target=foe.board[0];if(target){target.ready=false;target.stunnedTurns=Math.max(1,target.stunnedTurns||0)}
      break
    }
    case 'discard_enemy_1':if(foe.hand.length){const discarded=foe.hand.shift()!;log(s,`${fighterLabel(s,side)} forced a discard of ${s.cards[discarded]?.name||'a card'}.`)}break

    case 'summon_beetle_1_1':
      if(p.board.length<3){s.cards.beetle_token={id:'beetle_token',name:'Beetle',nickname:'Beetle Boy companion',kind:'driver',cost:0,attack:1,health:1,effect:'none',imageUrl:'',rating:'',source:'training'};p.board.push({id:`unit-${s.nextId++}`,cardId:'beetle_token',hp:1,ready:false})}
      break
    case 'invisible_first_hit_shield':if(justPlayed)justPlayed.firstHitProtected=true;break
    case 'death_deal_3_damage':{
      const target=enemy();if(target){damageUnit(target,3);defeatedUnits(s,enemySide)}break
    }
    case 'third_eye_reveal_discard_1':
      if(foe.hand.length)s.pendingChoice={side,kind:'third_eye_discard'}
      break
    case 'dwarf_jar_fare_1_heal_2':
      p.fare=Math.min(10,p.fare+1);if(justPlayed)justPlayed.hp=Math.min(s.cards[justPlayed.cardId].health,justPlayed.hp+2);break
    case 'diva_silence_next_clock':foe.cancelNextClock=1;break
    case 'logan_drum_heal_1_rep_1':
      p.reputation=Math.min(20,p.reputation+1);if(justPlayed)justPlayed.hp=Math.min(s.cards[justPlayed.cardId].health,justPlayed.hp+1);break
    case 'toddler_confuse_next_turn':foe.disableNextTurn=1;break
    case 'jim_boring_reputation_1_and_untargetable':
      p.reputation=Math.min(20,p.reputation+1);if(justPlayed)justPlayed.untargetable=true;break
    case 'madhatter_chaos_draw_and_blast':{
      draw(s,side,1);draw(s,enemySide,1)
      const candidates=foe.board.filter(u=>!u.untargetable)
      if(candidates.length){const victim=candidates[Math.floor(Math.random()*candidates.length)];damageUnit(victim,2);defeatedUnits(s,enemySide)}
      break
    }
    case 'sun_solar_flare_all_5':
      for(const unit of [...p.board,...foe.board])if(unit!==justPlayed)damageUnit(unit,5)
      defeatedUnits(s,side);defeatedUnits(s,enemySide);break
    case 'centipede_lifesteal_2':case 'beatrice_swarm_lifesteal_2':{
      const target=enemy()
      if(target){damageUnit(target,2);defeatedUnits(s,enemySide);if(justPlayed)justPlayed.hp=Math.min(s.cards[justPlayed.cardId].health,justPlayed.hp+2)}
      break
    }
    case 'george_polite_rep_2_discount_1':
      p.reputation=Math.min(20,p.reputation+2);p.nextDriverDiscount=(p.nextDriverDiscount||0)+1;break
    case 'trump_boast_fare_3_rep_minus_2':
      p.fare=Math.min(10,p.fare+3);p.reputation-=2;break
    case 'bob_awkward_stare_attack_minus_2':{
      const target=enemy();if(target){target.attackDebuff=2;target.attackDebuffTurns=1}
      break
    }
    case 'ja_candy_fare_1_heal_1':{
      p.fare=Math.min(10,p.fare+1)
      const target=p.board.find(u=>u.hp<s.cards[u.cardId].health)
      if(target)target.hp=Math.min(s.cards[target.cardId].health,target.hp+1)
      break
    }
    case 'divine_judgment_resurrection':
      for(const target of foe.board)target.hp=0
      defeatedUnits(s,enemySide)
      for(const unit of p.board)unit.hp=s.cards[unit.cardId].health
      draw(s,side,5);p.fare=10;break
    case 'fish_boy_slipstream_shield_2':
      p.fare=Math.min(10,p.fare+1);if(justPlayed)justPlayed.shield=Math.min(10,(justPlayed.shield||0)+2);break
    case 'prof_khashed_precalc_confusion':
      foe.fare=Math.max(0,foe.fare-1);if(enemy())enemy()!.abilityLockTurns=1;break
    default:break // Non-arrival abilities are handled by their event hooks.
  }
  checkWinner(s)
}
function afterAttack(s:BattleState,side:Side,unit:BattleUnit){
  const key=s.cards[unit.cardId]?.effect
  const p=s[side],foe=s[side==='player'?'opponent':'player']
  if(p.abilitiesDisabled||(unit.abilityLockTurns||0)>0)return
  if(key==='attack_heal_reputation_1')p.reputation=Math.min(20,p.reputation+1)
  else if(key==='attack_steal_fare_1'){const n=Math.min(1,foe.fare,10-p.fare);foe.fare-=n;p.fare+=n}
  else if(key==='attack_draw_1')draw(s,side,1)
  if(key?.startsWith('attack_'))log(s,`${s.cards[unit.cardId].name} activated an attack effect.`)
  checkWinner(s)
}
function startTurnEffects(s:BattleState,side:Side){
  const fighter=s[side]
  for(const unit of [...fighter.board]){
    const key=s.cards[unit.cardId]?.effect
    if(fighter.abilitiesDisabled||(unit.abilityLockTurns||0)>0)continue
    if((fighter.cancelNextClock||0)>0&&key?.startsWith('turn_')){fighter.cancelNextClock=0;continue}
    if(key==='turn_heal_reputation_1')s[side].reputation=Math.min(20,s[side].reputation+1)
    else if(key==='turn_gain_fare_1')s[side].fare=Math.min(10,s[side].fare+1)
    else if(key==='turn_buff_attack_1')unit.attackBonus=Math.min(5,(unit.attackBonus||0)+1)
  }
}
/** Printed cost stays on the card; discounted cost is calculated only while it is played. */
export function effectiveFareCost(card:Pick<BattleCard,'cost'|'effect'>):number {
  return Math.max(0,card.cost-(card.effect==='discount_self_cost_1'?1:0))
}
export function canPlay(s:BattleState,side:Side,index:number){const p=s[side];if(s.turn!==side||s.winner||!Number.isInteger(index)||index<0||index>=p.hand.length)return false;const c=s.cards[p.hand[index]];return!!c&&p.fare>=Math.max(0,effectiveFareCost(c)-(c.kind==='driver'?(p.nextDriverDiscount||0):0))&&(c.kind==='action'||p.board.length<3)}
export function play(s:BattleState,side:Side,index:number):BattleState|null{if(s.pendingChoice||!canPlay(s,side,index))return null;const next=clone(s),p=next[side],id=p.hand.splice(index,1)[0],c=next.cards[id];p.fare-=Math.max(0,effectiveFareCost(c)-(c.kind==='driver'?(p.nextDriverDiscount||0):0));if(c.kind==='driver'){p.nextDriverDiscount=0;p.board.push({id:`unit-${next.nextId++}`,cardId:id,hp:c.health,ready:false})}effect(next,side,c.effect,c.kind);log(next,`${fighterLabel(next,side)} played ${c.name}${c.nickname?` · ${c.nickname}`:''}.`);return next}
export function chooseDiscard(s:BattleState,side:Side,index:number):BattleState|null{
  if(!s.pendingChoice||s.pendingChoice.side!==side||s.turn!==side||!Number.isInteger(index))return null
  const foe=side==='player'?'opponent':'player'
  if(index<0||index>=s[foe].hand.length)return null
  const next=clone(s),removed=next[foe].hand.splice(index,1)[0]
  delete next.pendingChoice
  log(next,`${fighterLabel(next,side)} used Third-Eye and discarded ${next.cards[removed]?.name||'a card'}.`)
  return next
}
export function attack(s:BattleState,side:Side,attackerId:string,targetId?:string):BattleState|null{
  if(s.turn!==side||s.winner||s.pendingChoice)return null
  const source=s[side].board.find(u=>u.id===attackerId)
  const foe=s[side==='player'?'opponent':'player']
  if(!source?.ready)return null
  if(foe.board.length&&!foe.board.find(u=>u.id===targetId))return null
  if(!foe.board.length&&targetId!==undefined)return null
  const next=clone(s),att=next[side].board.find(u=>u.id===attackerId)!
  const enemySide:Side=side==='player'?'opponent':'player'
  const defender=next[enemySide]
  att.ready=false
  const power=Math.max(0,next.cards[att.cardId].attack+(att.attackBonus||0)-(att.attackDebuff||0))
  if(defender.board.length){
    const target=defender.board.find(u=>u.id===targetId)!
    const counter=Math.max(0,next.cards[target.cardId].attack+(target.attackBonus||0)-(target.attackDebuff||0))
    const targetName=next.cards[target.cardId].name
    damageUnit(target,power);damageUnit(att,counter)
    log(next,`${next.cards[att.cardId].name} struck ${targetName} for ${power}, taking ${counter} in return.`)
    defeatedUnits(next,enemySide)
    defeatedUnits(next,side)
  }else {
    defender.reputation-=power
    log(next,`${next.cards[att.cardId].name} hit ${next.mode==='pvp'?fighterLabel(next,enemySide):(side==='player'?'opponent':'your')} Reputation for ${power}.`)
  }
  afterAttack(next,side,att)
  checkWinner(next)
  return next
}
export function endTurn(s:BattleState):BattleState{if(s.winner||s.pendingChoice)return s;const next=clone(s),outgoing:Side=next.turn,incoming:Side=outgoing==='player'?'opponent':'player';
  next[outgoing].abilitiesDisabled=false
  for(const unit of next[outgoing].board){unit.abilityLockTurns=0;if((unit.attackDebuffTurns||0)>0){unit.attackDebuffTurns=(unit.attackDebuffTurns||0)-1;if(!unit.attackDebuffTurns)unit.attackDebuff=0}}
  next.turn=incoming;
  next[incoming].abilitiesDisabled=!!next[incoming].disableNextTurn
  next[incoming].disableNextTurn=0
  for(const unit of next[incoming].board){if(unit.untargetable)unit.untargetable=false}if(incoming==='player')next.round++;const p=next[incoming];p.maxFare=Math.min(10,p.maxFare+(incoming==='player'?1:next.round===1?0:1));p.fare=p.maxFare;p.board.forEach(u=>{if((u.stunnedTurns||0)>0){u.ready=false;u.stunnedTurns=(u.stunnedTurns||0)-1}else u.ready=true});startTurnEffects(next,incoming);draw(next,incoming);log(next,`${fighterLabel(next,incoming)} turn. Fare topped up.`);return next}
/**
 * Dispatch AI takes a full, server-authoritative turn.
 * It attacks with ready units, spends Fare, attacks with any remaining ready units,
 * then passes control back to the human. Newly dispatched units cannot attack early.
 */
export function aiTurn(s:BattleState):BattleState{
  if(s.turn!=='opponent'||s.winner)return s
  let next=s
  function attackReady(){
    for(const original of [...next.opponent.board]){
      const unit=next.opponent.board.find(x=>x.id===original.id)
      if(!unit?.ready||next.winner)continue
      // Pick a driver we can remove first; otherwise strike the weakest blocker.
      const blockers=[...next.player.board].sort((a,b)=>{
        const aKill=a.hp<=next.cards[unit.cardId].attack?0:1
        const bKill=b.hp<=next.cards[unit.cardId].attack?0:1
        return aKill-bKill||a.hp-b.hp
      })
      const target=blockers[0]
      const outcome=attack(next,'opponent',unit.id,target?.id)
      if(outcome)next=outcome
    }
  }
  attackReady()
  if(next.winner)return next
  for(let i=0;i<12;i++){
    const possible=next.opponent.hand.map((id,index)=>({id,index,card:next.cards[id]}))
      .filter(({index})=>canPlay(next,'opponent',index))
    if(!possible.length)break
    // Prefer a useful driver while lanes are open, then effective actions.
    const choice=possible
      .map(p=>({ ...p, priority:
        p.card.kind==='driver'?100+p.card.attack*4+p.card.health
        :p.card.effect==='deal_driver_3'&&next.player.board.length?80
        :p.card.effect==='deal_reputation_1'?70
        :p.card.effect==='draw_2'?60
        :p.card.effect==='gain_fare_3'?50
        :p.card.effect.startsWith('heal_')&&next.opponent.reputation>=20?0:30
      }))
      .sort((a,b)=>b.priority-a.priority)[0]
    if(!choice)break
    const played=play(next,'opponent',choice.index)
    if(!played)break
    next=played
    if(next.pendingChoice){next=chooseDiscard(next,'opponent',0)??next}
    if(next.winner)return next
  }
  attackReady()
  if(next.winner)return next
  return endTurn(next)
}
export function applyCommand(s:BattleState,command:Command):BattleState|null{
  if(s.turn!=='player'||s.winner)return null
  let next:BattleState|null=null
  if(command.type==='choose_discard')next=chooseDiscard(s,'player',command.index)
  else if(command.type==='play')next=play(s,'player',command.index)
  else if(command.type==='attack')next=attack(s,'player',command.attackerId,command.targetId)
  else if(command.type==='end'&&!s.pendingChoice)next=aiTurn(endTurn(s))
  if(next)next.version=s.version+1
  return next
}
/** Opponent hand and deck order never leave the backend. */
export function publicView(s:BattleState):View{const {hand,deck,...opponent}=s.opponent;return{player:s.player,opponent:{...opponent,handCount:hand.length,deckCount:deck.length},cards:s.cards,turn:s.turn,round:s.round,winner:s.winner,log:s.log,version:s.version,pendingChoice:s.pendingChoice?.side==='player'?s.pendingChoice:undefined,revealedOpponentHand:s.pendingChoice?.side==='player'?[...hand]:undefined}}
export function officialBattleCard(id:string,card:Record<string,unknown>):BattleCard|null{
  if(card.status!=='published'||!['driver','action'].includes(String(card.kind)))return null
  const effectKey=card.effectKey??'none'
  if(!EFFECTS.includes(effectKey as Effect))return null
  const cost=Number(card.cost),attack=Number(card.attack),health=Number(card.health)
  if(!Number.isInteger(cost)||cost<0||cost>10||!Number.isInteger(attack)||attack<0||attack>30||!Number.isInteger(health)||health<1||health>50)return null
  const name=typeof card.name==='string'?card.name.slice(0,70):'Unknown driver'
  return {id,name,nickname:typeof card.nickname==='string'?card.nickname.slice(0,70):'',kind:card.kind as 'driver'|'action',cost,attack,health,effect:effectKey as Effect,imageUrl:typeof card.finishedUrl==='string'&&card.finishedUrl?card.finishedUrl:typeof card.cartoonUrl==='string'&&card.cartoonUrl?card.cartoonUrl:typeof card.originalUrl==='string'?card.originalUrl:'',fullCard:typeof card.finishedUrl==='string'&&!!card.finishedUrl,rating:card.rarity==='transcendent'?String(card.transcendentLabel||'???'):'★'.repeat(Math.max(1,Math.min(5,Number(card.stars)||1))),source:'official'}
}
