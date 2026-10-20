/** Server-owned Fare Mayhem rules. No Firebase imports: reproducible and independently testable. */
export type Side = 'player' | 'opponent'
export type Effect = 'none' | 'steal_fare_1' | 'deal_reputation_1' | 'heal_reputation_2' | 'heal_reputation_4' | 'deal_driver_3' | 'draw_2' | 'gain_fare_3'
export const EFFECTS: Effect[] = ['none','steal_fare_1','deal_reputation_1','heal_reputation_2','heal_reputation_4','deal_driver_3','draw_2','gain_fare_3']
export type BattleCard = { id:string; name:string; nickname:string; kind:'driver'|'action'; cost:number; attack:number; health:number; effect:Effect; imageUrl:string; rating:string; source:'training'|'official' }
export type BattleUnit = { id:string; cardId:string; hp:number; ready:boolean }
export type Fighter = { reputation:number; fare:number; maxFare:number; deck:string[]; hand:string[]; board:BattleUnit[]; fatigue:number }
export type BattleState = { player:Fighter; opponent:Fighter; cards:Record<string,BattleCard>; turn:Side; round:number; winner:Side|null; log:string[]; nextId:number; version:number }
export type Command = {type:'play';index:number}|{type:'attack';attackerId:string;targetId?:string}|{type:'end'}
export type View = {player:Fighter;opponent:Omit<Fighter,'hand'|'deck'> & {handCount:number;deckCount:number};cards:Record<string,BattleCard>;turn:Side;round:number;winner:Side|null;log:string[];version:number}
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
export function createBattle(published:BattleCard[],random:()=>number=Math.random,ownedCardIds?:string[]):BattleState{
  const cards=trainingCards();const deck=[...TRAINING_DECK]
  const eligible=published.filter(c=>c.source==='official'&&EFFECTS.includes(c.effect)&&c.cost>=0&&c.cost<=10).slice(0,ownedCardIds?200:8)
  eligible.forEach((card,i)=>{const id=`official_${card.id}`;cards[id]={...card,id};if(!ownedCardIds&&i<8)deck[i*3]=id})
  const playerDeck=ownedCardIds ? ownedCardIds.map(id=>`official_${id}`) : deck
  if(ownedCardIds&&(ownedCardIds.length!==25||playerDeck.some(id=>!cards[id])))throw Error('Invalid owned practice deck.')
  return{player:createFighter(playerDeck,random),opponent:createFighter(deck,random),cards,turn:'player',round:1,winner:null,log:[ownedCardIds?'Your collection deck is on the road.':'Dispatch is open. Twenty Reputation each. Make it count.'],nextId:1,version:1}
}
function clone(s:BattleState):BattleState{return structuredClone(s)}
function log(s:BattleState,text:string){s.log=[text,...s.log].slice(0,24)}
function checkWinner(s:BattleState){if(s.player.reputation<=0&&s.opponent.reputation<=0)s.winner='opponent';else if(s.player.reputation<=0)s.winner='opponent';else if(s.opponent.reputation<=0)s.winner='player'}
function draw(s:BattleState,side:Side,count=1){const p=s[side];for(let i=0;i<count;i++){if(p.deck.length){const id=p.deck.shift()!;if(p.hand.length<8)p.hand.push(id)}else{p.fatigue++;p.reputation-=p.fatigue;log(s,`${side==='player'?'You':'Dispatch AI'} lost ${p.fatigue} Reputation to fatigue.`)}}checkWinner(s)}
function effect(s:BattleState,side:Side,what:Effect){const p=s[side];const foe=s[side==='player'?'opponent':'player'];switch(what){case 'steal_fare_1':{const n=Math.min(1,foe.fare);foe.fare-=n;p.fare=Math.min(10,p.fare+n);break}case 'deal_reputation_1':foe.reputation-=1;break;case 'heal_reputation_2':p.reputation=Math.min(20,p.reputation+2);break;case 'heal_reputation_4':p.reputation=Math.min(20,p.reputation+4);break;case 'deal_driver_3':if(foe.board.length){foe.board[0].hp-=3;foe.board=foe.board.filter(u=>u.hp>0)}else foe.reputation-=2;break;case 'draw_2':draw(s,side,2);break;case 'gain_fare_3':p.fare=Math.min(10,p.fare+3);break;default:break}checkWinner(s)}
export function canPlay(s:BattleState,side:Side,index:number){const p=s[side];if(s.turn!==side||s.winner||!Number.isInteger(index)||index<0||index>=p.hand.length)return false;const c=s.cards[p.hand[index]];return!!c&&p.fare>=c.cost&&(c.kind==='action'||p.board.length<3)}
export function play(s:BattleState,side:Side,index:number):BattleState|null{if(!canPlay(s,side,index))return null;const next=clone(s),p=next[side],id=p.hand.splice(index,1)[0],c=next.cards[id];p.fare-=c.cost;if(c.kind==='driver')p.board.push({id:`unit-${next.nextId++}`,cardId:id,hp:c.health,ready:false});effect(next,side,c.effect);log(next,`${side==='player'?'You dispatched':'Dispatch AI played'} ${c.name}${c.nickname?` · ${c.nickname}`:''}.`);return next}
export function attack(s:BattleState,side:Side,attackerId:string,targetId?:string):BattleState|null{
  if(s.turn!==side||s.winner)return null
  const a=s[side].board.find(u=>u.id===attackerId),foe=s[side==='player'?'opponent':'player'];if(!a?.ready)return null
  if(foe.board.length&&!foe.board.find(u=>u.id===targetId))return null
  if(!foe.board.length&&targetId!==undefined)return null
  const next=clone(s),att=next[side].board.find(u=>u.id===attackerId)!,def=next[side==='player'?'opponent':'player'];att.ready=false
  const power=next.cards[att.cardId].attack
  if(def.board.length){const target=def.board.find(u=>u.id===targetId)!,counter=next.cards[target.cardId].attack;target.hp-=power;att.hp-=counter;def.board=def.board.filter(u=>u.hp>0);next[side].board=next[side].board.filter(u=>u.hp>0);log(next,`${next.cards[att.cardId].name} struck ${next.cards[target.cardId].name} for ${power}, taking ${counter} in return.`)}
  else {def.reputation-=power;log(next,`${next.cards[att.cardId].name} hit ${side==='player'?'opponent':'your'} Reputation for ${power}.`)}
  checkWinner(next);return next
}
export function endTurn(s:BattleState):BattleState{if(s.winner)return s;const next=clone(s),incoming:Side=next.turn==='player'?'opponent':'player';next.turn=incoming;if(incoming==='player')next.round++;const p=next[incoming];p.maxFare=Math.min(10,p.maxFare+(incoming==='player'?1:next.round===1?0:1));p.fare=p.maxFare;p.board.forEach(u=>{u.ready=true});draw(next,incoming);log(next,`${incoming==='player'?'Your':'Dispatch AI'} turn. Fare topped up.`);return next}
export function aiTurn(s:BattleState):BattleState{if(s.turn!=='opponent'||s.winner)return s;let next=s;for(let i=0;i<8;i++){const possible=next.opponent.hand.map((id,index)=>({id,index})).filter(x=>canPlay(next,'opponent',x.index));if(!possible.length)break;const choice=possible.find(x=>next.cards[x.id].kind==='driver')??possible[0];const outcome=play(next,'opponent',choice.index);if(!outcome)break;next=outcome;if(next.winner)return next}for(const u of [...next.opponent.board]){if(!u.ready)continue;const target=next.player.board[0];next=attack(next,'opponent',u.id,target?.id)??next;if(next.winner)return next}return endTurn(next)}
export function applyCommand(s:BattleState,command:Command):BattleState|null{
  if(s.turn!=='player'||s.winner)return null
  let next:BattleState|null=null
  if(command.type==='play')next=play(s,'player',command.index)
  else if(command.type==='attack')next=attack(s,'player',command.attackerId,command.targetId)
  else if(command.type==='end')next=aiTurn(endTurn(s))
  if(next)next.version=s.version+1
  return next
}
/** Opponent hand and deck order never leave the backend. */
export function publicView(s:BattleState):View{const {hand,deck,...opponent}=s.opponent;return{player:s.player,opponent:{...opponent,handCount:hand.length,deckCount:deck.length},cards:s.cards,turn:s.turn,round:s.round,winner:s.winner,log:s.log,version:s.version}}
export function officialBattleCard(id:string,card:Record<string,unknown>):BattleCard|null{
  if(card.status!=='published'||!['driver','action'].includes(String(card.kind)))return null
  const effectKey=card.effectKey??'none'
  if(!EFFECTS.includes(effectKey as Effect))return null
  const cost=Number(card.cost),attack=Number(card.attack),health=Number(card.health)
  if(!Number.isInteger(cost)||cost<0||cost>10||!Number.isInteger(attack)||attack<0||attack>30||!Number.isInteger(health)||health<1||health>30)return null
  const name=typeof card.name==='string'?card.name.slice(0,70):'Unknown driver'
  return {id,name,nickname:typeof card.nickname==='string'?card.nickname.slice(0,70):'',kind:card.kind as 'driver'|'action',cost,attack,health,effect:effectKey as Effect,imageUrl:typeof card.cartoonUrl==='string'&&card.cartoonUrl?card.cartoonUrl:typeof card.originalUrl==='string'?card.originalUrl:'',rating:card.rarity==='transcendent'?String(card.transcendentLabel||'???'):'★'.repeat(Math.max(1,Math.min(5,Number(card.stars)||1))),source:'official'}
}
