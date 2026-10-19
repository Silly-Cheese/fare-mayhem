import { PracticeArena } from './game/PracticeArena'
import { useState, useEffect, useRef, type FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { CardStudio } from './studio/CardStudio'
import { PublishedCatalog } from './studio/PublishedCatalog'
import { CarFront, Swords, LibraryBig, BookOpen, ArrowRight, UserRound, X, ChevronRight, Sparkles, Zap, Heart, RotateCcw, LogOut, Menu, CircleHelp, Play, CheckCircle2, Download, ShieldCheck, Search, Volume2, Trophy, History, Flame, Info, LoaderCircle, Star, Lock } from 'lucide-react'
import { auth, loginEmail, loginGoogle, registerEmail, logout } from './firebase'
import { CARDS, type CardId } from './game/cards'
import { attack, endTurn, makeGame, playCard, playable, runOpponentTurn, type Game } from './game/engine'
import { GameCard } from './components/Card'
import { DriverArt } from './components/Art'

type Page = 'dispatch' | 'battle' | 'practice' | 'records' | 'rules' | 'studio'
type AuthMode = 'login' | 'register'
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const navItems = [{ id: 'dispatch', label: 'Dispatch', icon: CarFront }, { id: 'battle', label: 'Training Match', icon: Swords }, { id: 'practice', label: 'Secure Practice', icon: ShieldCheck }, { id: 'records', label: 'Driver Records', icon: LibraryBig }, { id: 'rules', label: 'How to Play', icon: BookOpen }, { id: 'studio', label: 'Card Studio', icon: ShieldCheck }] as const
const prettyError = (message: string) => {
  if (message.includes('auth/operation-not-allowed')) return 'That sign-in method is not enabled in Firebase yet. Enable it under Authentication → Sign-in method.'
  if (message.includes('auth/unauthorized-domain')) return 'This website domain needs to be added to Firebase Authentication authorized domains.'
  if (message.includes('auth/popup-closed-by-user')) return 'Sign-in was cancelled.'
  if (message.includes('auth/invalid-credential')) return 'Email or password is incorrect.'
  if (message.includes('auth/email-already-in-use')) return 'There is already an account with that email.'
  if (message.includes('auth/weak-password')) return 'Use a password of at least six characters.'
  return message.replace(/^Firebase: /, '')
}

function AuthDialog({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { if (mode === 'register') await registerEmail(name, email, password); else await loginEmail(email, password); onAuthenticated() }
    catch (err) { setError(prettyError(err instanceof Error ? err.message : 'Unable to sign in.')) }
    finally { setBusy(false) }
  }
  async function google() { setBusy(true); setError(''); try { await loginGoogle(); onAuthenticated() } catch (err) { setError(prettyError(err instanceof Error ? err.message : 'Google sign-in failed.')) } finally { setBusy(false) } }
  return <div className="dialog-cover" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-label="Player account">
      <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={19}/></button>
      <span className="eyebrow"><span className="eyebrow-dot"/> ACCOUNT ACCESS</span>
      <h2>{mode === 'login' ? 'Welcome back, driver.' : 'Get your driver ID.'}</h2>
      <p>Browse and play without an account. Sign in now to get your profile ready for future collection features.</p>
      <div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>Sign in</button><button className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('')}}>Create account</button></div>
      <form className="auth-form" onSubmit={submit}>
        {mode==='register' && <label>Display name<input required maxLength={32} value={name} onChange={e=>setName(e.target.value)} placeholder="Your driver name" /></label>}
        <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input required minLength={6} type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button disabled={busy} type="submit" className="button primary full">{busy?<LoaderCircle className="spin" size={18}/>:null}{mode==='login'?'Sign in':'Create account'} <ArrowRight size={18}/></button>
      </form>
      <div className="divider-or"><span>or</span></div>
      <button disabled={busy} className="button outline full" onClick={google}><span className="google-g">G</span> Continue with Google</button>
      <p className="auth-note"><Lock size={13}/> Account features use Firebase Authentication. Demo battles don't require a login.</p>
    </section>
  </div>
}

function InspectDialog({ id, onClose }: { id: CardId; onClose: () => void }) {
  const [original, setOriginal] = useState(false)
  const card = CARDS[id]
  useEffect(() => { setOriginal(false) }, [id])
  return <div className="dialog-cover" onMouseDown={event => { if(event.target===event.currentTarget) onClose() }}>
    <section className="dialog inspect-dialog" role="dialog" aria-modal="true" aria-label={`${card.name} card details`}>
      <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={19}/></button>
      <div className="inspect-art">
        {original ? <img className="original-art" src={`${import.meta.env.BASE_URL}art/the-orb-original.webp`} alt="Original handwritten illustration of Kris Kringle The Orb" /> : <GameCard id={id} />}
      </div>
      <div className="inspect-details">
        <span className="eyebrow"><span className="eyebrow-dot"/>{card.source === 'original' ? 'ORIGINAL DRIVER · DEMO BUILD' : 'TRAINING ROSTER · DEMO ONLY'}</span>
        <h2>{card.name}</h2><h3>{card.nickname}</h3>
        <div className="inspect-badges"><span><Zap size={15}/> {card.cost} Fare</span><span><Star size={15}/> {card.rating} / 5 rating</span>{card.type==='driver'&&<span><Heart size={15}/> {card.health} HP</span>}</div>
        <div className="inspect-block"><strong>ON THE CLOCK</strong><p>{card.ability}</p></div>
        <div className="inspect-block"><strong>DRIVER FILE</strong><p className="flavor">{card.flavor}</p></div>
        {id==='orb' && <button className="button outline" onClick={()=>setOriginal(v=>!v)}><RotateCcw size={17}/>{original?'See the cartoon interpretation':'See the original drawing'}</button>}
        {card.source==='training' && <p className="subtle small">This is a test character for Phase 1 combat. Only administrator-approved cards will enter the official collection.</p>}
        <button className="text-button" onClick={onClose}>Back to the game <ArrowRight size={16}/></button>
      </div>
    </section>
  </div>
}

function Dispatch({ go, inspect, user }: { go: (page: Page) => void; inspect: (id:CardId)=>void; user:User|null }) {
  return <div className="page-content page-enter">
    <div className="dispatch-head"><span className="eyebrow"><span className="eyebrow-dot"/> THE DISPATCH BOARD <span className="version">EARLY ACCESS · PHASE 04</span></span><h1>Every ride<br/><em>is a gamble.</em></h1><p>Collect questionable drivers. Outplay the competition. Try to make it home with five stars.</p>
      <div className="hero-actions"><button className="button primary large" onClick={()=>go('battle')}><Swords size={19}/> Play a training match <ArrowRight size={18}/></button><button className="button outline large" onClick={()=>go('records')}>Meet the drivers <ChevronRight size={18}/></button></div>
      <div className="hero-foot"><span><CheckCircle2 size={15}/> No sign-in required</span><span><Zap size={15}/> Free training battle</span><span><Heart size={15}/> Real game rules</span></div>
    </div>
    <div className="hero-visual" aria-hidden="true"><div className="visual-halo"/><span className="visual-stamp">NOW DISPATCHING</span><div className="hero-card-shadow"><div className="hero-portrait"><DriverArt kind="orb"/></div><div className="hero-card-caption"><div><b>KRIS KRINGLE</b><span>"THE ORB"</span></div><span className="hero-stars">★★☆☆☆</span></div></div><div className="floating-note note-left">"I LOVE FOOD!!!"</div><div className="floating-note note-right">DRIVER<br/>ALERT!</div></div>
    <section className="section-row quick-start"><div className="section-heading"><span className="eyebrow">YOUR NEXT STOP</span><h2>Make a bad decision.</h2><p>You've got options. Not necessarily good ones.</p></div><div className="action-grid">
      <button className="action-tile" onClick={()=>go('battle')}><span className="tile-icon"><Swords size={24}/></span><span><strong>Training arena</strong><small>Learn the ropes against the computer.</small></span><ArrowRight size={19}/></button>
      {user&&<button className="action-tile" onClick={()=>go('practice')}><span className="tile-icon"><ShieldCheck size={24}/></span><span><strong>Secure practice</strong><small>Save your battles with server-checked moves.</small></span><ArrowRight size={19}/></button>}
      <button className="action-tile" onClick={()=>go('records')}><span className="tile-icon"><LibraryBig size={24}/></span><span><strong>Driver records</strong><small>Meet the people behind the wheel.</small></span><ArrowRight size={19}/></button>
      <button className="action-tile" onClick={()=>go('rules')}><span className="tile-icon"><BookOpen size={24}/></span><span><strong>Read the rules</strong><small>Figure out how this mess works.</small></span><ArrowRight size={19}/></button>
    </div></section>
    <section className="featured-section"><div className="section-title"><div><span className="eyebrow">FROM THE ORIGINAL INDEX CARDS</span><h2>First on the road.</h2></div><button className="text-button" onClick={()=>go('records')}>See the original cards <ArrowRight size={17}/></button></div>
      <div className="feature-driver"><div className="feature-card"><GameCard id="orb" onClick={()=>inspect('orb')}/></div><div className="feature-copy"><div className="mini-status"><span className="signal-dot"/> ORIGINAL CARD · 2-STAR RARITY</div><h3>Kris Kringle</h3><h4>"The Orb"</h4><p>Chronically hungry. Questionably qualified. Known to attempt to eat his passengers' food. Welcome to the fleet.</p><blockquote>“He tried to eat my donut...” <span>— Actual customer review from the original card</span></blockquote><button className="button outline" onClick={()=>inspect('orb')}>Inspect driver <ArrowRight size={17}/></button></div></div>
    </section>
    <section className="status-strip"><div><Sparkles size={22}/><span><b>Just getting started</b><small>1 card adapted from your original drawings. Additional characters in this demo are training-only.</small></span></div><div><ShieldCheck size={22}/><span><b>No pretend player data</b><small>{user ? `Signed in as ${user.displayName || user.email}.` : 'You can play now. Accounts are optional in Phase 1.'}</small></span></div></section>
  </div>
}

function Records({ inspect }: { inspect: (id:CardId)=>void }) {
  return <div className="page-content records-page page-enter"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-dot"/> THE FLEET REGISTRY</span><h1>Driver Records<span className="punctuation">.</span></h1><p>The original characters of Fare Mayhem. No filler drivers.</p></div>
    <PublishedCatalog/>
    <section className="featured-section"><div className="section-title"><div><span className="eyebrow">THE ORIGINAL HANDWRITTEN CARD</span><h2>Kris Kringle — The Orb</h2><p>The original Orb stays visible while the rest of your real characters are imported and published.</p></div></div><div className="record-grid"><div className="record-item"><GameCard id="orb" onClick={()=>inspect('orb')}/><button className="record-detail" onClick={()=>inspect('orb')}>Inspect Orb <ArrowRight size={16}/></button></div></div></section>
  </div>
}

function Rules({ go }: { go:(p:Page)=>void }) {
  return <div className="page-content rules-page page-enter"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-dot"/> DRIVER HANDBOOK</span><h1>Rules of the road<span className="punctuation">.</span></h1><p>You don't need a license. You do need a plan.</p></div>
    <div className="rules-layout"><div className="rules-main">
      <section className="rule-section"><span className="rule-number">01 / THE OBJECTIVE</span><h2>Destroy their reputation.</h2><p>Both players begin with <b>20 Reputation</b>. Dispatch drivers, play action cards, and attack. Bring the opponent's Reputation to zero to win the match.</p></section>
      <section className="rule-section"><span className="rule-number">02 / YOUR RESOURCES</span><h2>Everything costs Fare.</h2><p>Every card costs Fare Tokens <Zap size={16} className="inline-icon"/>. Your maximum Fare increases each round, up to 10. Unspent Fare doesn't carry over to your next turn. Some cards help you earn extra Fare immediately.</p></section>
      <section className="rule-section"><span className="rule-number">03 / PLAY YOUR HAND</span><h2>Three drivers. Maximum chaos.</h2><p>Draw one card at the start of your turns. You can have <b>three drivers</b> on the road at once. Newly played drivers wait until your next turn before attacking. Action cards take effect immediately.</p></section>
      <section className="rule-section"><span className="rule-number">04 / ATTACK</span><h2>Drivers before Reputation.</h2><p>Choose one of your ready drivers to attack. If the opponent has drivers on the road, you must hit a driver first. Both drivers deal their attack damage simultaneously. Without blockers, you can strike their Reputation directly.</p></section>
      <section className="rule-section"><span className="rule-number">05 / CARD RATINGS</span><h2>Stars are for rarity.</h2><p>Driver Ratings go from one to five stars. They're about collectibility, <b>not automatic power</b>. Some future cards will transcend the normal rating system. Phase 1 uses fixed training cards; collection and pack systems will come later.</p></section>
      <section className="rule-section"><span className="rule-number">06 / RUNNING OUT</span><h2>Don't run out of cards.</h2><p>There are 25 cards in each training deck. If you need to draw but your deck is empty, you lose Reputation; the amount of damage increases with each failed draw.</p></section>
      <button className="button primary large" onClick={()=>go('battle')}><Play size={18}/> Got it. Let's drive. <ArrowRight size={18}/></button>
    </div><aside className="rules-side"><div className="sidebar-note"><span className="eyebrow">KEEP THIS IN MIND</span><h3>Stars don't win fights. Drivers do.</h3><p>Even a one-star original card can be useful when you need a cheap blocker.</p><DriverArt kind="orb"/></div><div className="sidebar-note secondary"><CircleHelp size={23}/><h3>Practice, no pressure.</h3><p>Training matches are local to your browser. They don't change a player record or award collectible cards.</p></div></aside></div>
  </div>
}

function Battle({ inspect }: { inspect: (id:CardId)=>void }) {
  const [game,setGame] = useState<Game>(()=>makeGame())
  const [selected,setSelected] = useState<number|null>(null), [attacker,setAttacker] = useState<string|null>(null)
  const [thinking,setThinking] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(()=>()=>window.clearTimeout(timer.current),[])
  function reset() { window.clearTimeout(timer.current);setThinking(false);setGame(makeGame());setSelected(null);setAttacker(null) }
  function play() { if(selected===null||!playable(game,'player',selected))return;setGame(g=>playCard(g,'player',selected));setSelected(null) }
  function selectUnit(id:string) { if(game.turn!=='player'||game.winner||thinking)return; const unit=game.player.board.find(u=>u.id===id);if(unit?.ready)setAttacker(a=>a===id?null:id) }
  function hit(target?:string) { if(!attacker||thinking)return;const next=attack(game,'player',attacker,target);if(next!==game){setGame(next);setAttacker(null)} }
  function finishTurn() { if(thinking||game.turn!=='player'||game.winner)return;setSelected(null);setAttacker(null);setThinking(true);setGame(g=>endTurn(g));timer.current=window.setTimeout(()=>{setGame(g=>runOpponentTurn(g));setThinking(false)},720) }
  const canPlay=selected!==null&&playable(game,'player',selected)
  return <div className="page-content battle-page page-enter"><div className="battle-heading"><div><span className="eyebrow"><span className="eyebrow-dot"/> TRAINING DISPATCH · VS COMPUTER</span><h1>Training Arena<span className="punctuation">.</span></h1><p>A real battle. Questionable drivers. No stakes.</p></div><button className="button outline restart" onClick={reset}><RotateCcw size={17}/> Restart match</button></div>
    <div className="battle-grid"><div className="battle-main">
      <div className="battleground"><div className="board-line opponent-zone"><div className="combatant-tag"><span className="combatant-avatar enemy"><CarFront size={20}/></span><span><b>Dispatch Bot</b><small>Computer opponent</small></span><strong className="rep"><Heart size={16} fill="currentColor"/> {game.opponent.reputation} / 20</strong></div><div className="resource-line"><span><Zap size={14}/> {game.opponent.fare} / {game.opponent.maxFare} Fare</span><span>{game.opponent.hand.length} cards in hand</span></div><div className="board-slots">{[0,1,2].map(i=>{const unit=game.opponent.board[i];return <div key={i} className={`board-slot ${unit?'occupied':''} ${attacker&&unit?'targetable':''}`}>
        {unit?<button className="board-unit" onClick={()=>attacker?hit(unit.id):inspect(unit.cardId)} aria-label={`${CARDS[unit.cardId].name}, ${unit.hp} health${attacker?', attack this driver':''}`}><span className="unit-art"><DriverArt kind={CARDS[unit.cardId].kind!}/></span><b>{CARDS[unit.cardId].name}</b><span className="unit-stats"><span><Zap size={12}/>{CARDS[unit.cardId].attack}</span><span><Heart size={12}/>{unit.hp}</span></span></button>:<span className="empty-slot">EMPTY PARKING</span>}
      </div>})}</div></div>
      <div className="board-center"><div className="road-line"/><div className="center-mark"><span>ROUND {game.round}</span><CarFront size={25}/><span>{thinking?'THE BOT IS DRIVING':game.turn==='player'?'YOUR TURN':'BOT TURN'}</span></div><div className="road-line"/></div>
      <div className="board-line player-zone"><div className="board-slots">{[0,1,2].map(i=>{const unit=game.player.board[i];return <div key={i} className={`board-slot ${unit?'occupied':''} ${unit?.ready?'unit-ready':''} ${attacker===unit?.id?'unit-selected':''}`}>
        {unit?<button className="board-unit" onClick={()=>selectUnit(unit.id)} aria-label={`${CARDS[unit.cardId].name}, ${unit.hp} health, ${unit.ready?'ready to attack':'not ready'}`}><span className="unit-art"><DriverArt kind={CARDS[unit.cardId].kind!}/></span><b>{CARDS[unit.cardId].name}</b><span className="unit-stats"><span><Zap size={12}/>{CARDS[unit.cardId].attack}</span><span><Heart size={12}/>{unit.hp}</span></span><span className={`ready-indicator ${unit.ready?'yes':''}`}>{unit.ready?'READY':'WAITING'}</span></button>:<span className="empty-slot">EMPTY PARKING</span>}
        </div>})}</div><div className="combatant-tag"><span className="combatant-avatar"><UserRound size={21}/></span><span><b>You</b><small>The brave dispatcher</small></span><strong className="rep"><Heart size={16} fill="currentColor"/>{game.player.reputation} / 20</strong></div><div className="resource-line"><span><Zap size={14}/> {game.player.fare} / {game.player.maxFare} Fare</span><span>{game.player.deck.length} cards in deck</span></div></div>
      </div>
      <div className="hand-area"><div className="hand-head"><div><b>YOUR HAND</b><small>{game.player.hand.length} cards · click a card to select it</small></div><div className="current-fare"><Zap size={18}/><b>{game.player.fare}</b><span>FARE</span></div></div>
        <div className="hand-scroll">{game.player.hand.length?game.player.hand.map((id,i)=><div className="hand-card" key={`${i}-${id}`}><GameCard id={id} compact selected={selected===i} onClick={()=>{setSelected(j=>j===i?null:i);setAttacker(null)}}/></div>):<div className="empty-hand">No cards in hand. You'll draw at the start of your next turn.</div>}</div>
        <div className="battle-actions"><div className="battle-hint">{attacker ? (game.opponent.board.length?'Select an opposing driver to attack.':'The road is clear. Hit Reputation directly.') : selected!==null ? `${CARDS[game.player.hand[selected]].name} · ${CARDS[game.player.hand[selected]].ability}` : 'Play a card, select a ready driver to attack, or end your turn.'}</div><div className="battle-buttons">{attacker&&game.opponent.board.length===0&&<button className="button red" onClick={()=>hit()}><Swords size={17}/> Hit Reputation</button>}{selected!==null&&<button className="button primary" disabled={!canPlay||thinking||!!game.winner} onClick={play}><Zap size={16}/> Play card</button>}<button className="button outline" onClick={finishTurn} disabled={thinking||game.turn!=='player'||!!game.winner}>{thinking?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>} {thinking?'Opponent thinking...':'End turn'}</button></div></div>
      </div>
    </div><aside className="battle-sidebar"><div className="battle-tip"><span className="eyebrow">DISPATCH RADIO</span><div className="tip-icon"><Volume2 size={24}/></div><h3>Dispatch, come in.</h3><p>{attacker?'Your driver is ready. Choose a target on the enemy side.':game.player.board.some(u=>u.ready)?'You have a ready driver. Tap it to start an attack.':'Play your drivers now. They can attack on your next turn.'}</p></div><div className="battle-log"><div className="log-title"><History size={16}/> MATCH FEED</div>{game.log.map((entry,i)=><div className="log-entry" key={i}><span className="log-dot"/>{entry}</div>)}</div><div className="demo-note"><Info size={17}/> These cards are for the Phase 1 training match. No packs, matchmaking, or permanent rewards yet.</div></aside></div>
    {game.winner && <div className="dialog-cover"><div className="dialog result-dialog" role="dialog" aria-modal="true" aria-label="Match result"><div className={`result-emblem ${game.winner==='player'?'won':'lost'}`}>{game.winner==='player'?<Trophy size={36}/>:<Flame size={36}/>}</div><span className="eyebrow">MATCH COMPLETE</span><h2>{game.winner==='player'?'You made it home.':'Five stars for effort.'}</h2><p>{game.winner==='player'?'The other dispatcher has lost all Reputation. Somehow, your drivers pulled it off.':'Your Reputation hit zero. Even the best drivers take a wrong turn.'}</p><button className="button primary full" onClick={reset}><RotateCcw size={17}/> Run it back</button></div></div>}
  </div>
}

export default function App() {
  const [page,setPage]=useState<Page>('dispatch')
  const [inspect,setInspect]=useState<CardId|null>(null)
  const [authOpen,setAuthOpen]=useState(false)
  const [user,setUser]=useState<User|null>(null)
  const [isOwner,setIsOwner]=useState(false)
  const [menuOpen,setMenuOpen]=useState(false)
  const [installPrompt,setInstallPrompt]=useState<InstallEvent|null>(null)
  const [installHelp,setInstallHelp]=useState(false)
  useEffect(() => { let alive=true
    const unsubscribe=onAuthStateChanged(auth, u => {
      setUser(u);setIsOwner(false)
      if(!u)return
      void (async()=>{
        try {
          const token=await getIdTokenResult(u)
          if(token.claims.fmOwner !== true)return
          const config=await getDoc(doc(db,'_system','owner'))
          if(alive && config.exists() && config.data().uid===u.uid)setIsOwner(true)
        }catch(e){console.warn('Owner verification unavailable:',e)}
      })()
    })
    return ()=>{alive=false;unsubscribe()}
  },[])
  useEffect(()=>{const listener=(e:Event)=>{e.preventDefault();setInstallPrompt(e as InstallEvent)};window.addEventListener('beforeinstallprompt',listener);return()=>window.removeEventListener('beforeinstallprompt',listener)},[])
  useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==='Escape'){setInspect(null);setAuthOpen(false);setMenuOpen(false);setInstallHelp(false)}};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[])
  function go(p:Page) {if(p==='studio'&&!isOwner)return;setPage(p);setMenuOpen(false);window.scrollTo({top:0,behavior:'smooth'})}
  function install() { if(installPrompt){installPrompt.prompt();void installPrompt.userChoice.then(()=>setInstallPrompt(null))}else setInstallHelp(true) }
  return <div className="app-shell"><aside className={`main-sidebar ${menuOpen?'expanded':''}`}><div className="brand" onClick={()=>go('dispatch')} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')go('dispatch')}}><span className="brand-icon"><CarFront size={26} strokeWidth={2.7}/></span><span><b>FARE<span>MAYHEM</span></b><small>FIVE STARS. ZERO GUARANTEES.</small></span></div>
    <div className="sidebar-label">DISPATCH TERMINAL</div><nav className="primary-nav" aria-label="Main menu">{navItems.filter(item=>(item.id!=='studio'||isOwner)&&(item.id!=='practice'||!!user)).map(item=><button key={item.id} onClick={()=>go(item.id)} aria-current={page===item.id?'page':undefined} className={page===item.id?'current':''}><item.icon size={20}/><span>{item.label}</span>{page===item.id&&<ChevronRight size={16} className="nav-chevron"/>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-sticker"><span className="sticker-eyebrow">PUBLIC SERVICE NOTICE</span><span>Our drivers are<br/><b>not okay.</b></span><CarFront size={33}/></div><button className="profile-button" onClick={()=>user?void logout():setAuthOpen(true)}><span className="profile-icon"><UserRound size={19}/></span><span><b>{user?(user.displayName||'Driver'):'Guest driver'}</b><small>{user?'Sign out':'Sign in or register'}</small></span>{user?<LogOut size={16}/>:<ArrowRight size={16}/>}</button></div>
  </aside>
  <div className="app-main"><header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMenuOpen(v=>!v)} aria-label={menuOpen?'Close menu':'Open menu'}>{menuOpen?<X size={22}/>:<Menu size={22}/>}</button><div className="topbar-breadcrumb"><span>FARE MAYHEM</span><ChevronRight size={15}/><b>{navItems.find(n=>n.id===page)?.label}</b></div><div className="topbar-right"><span className="online-pill"><span/> PHASE 04</span>{isOwner&&<button className="button outline owner-top-button" onClick={()=>go('studio')}><ShieldCheck size={16}/> Card Studio</button>}<button className="icon-button install-button" onClick={install} title="Install Fare Mayhem" aria-label="Install Fare Mayhem"><Download size={20}/></button><button className="account-pill" onClick={()=>user?void logout():setAuthOpen(true)}><UserRound size={17}/><span>{user?user.displayName||'Account':'Sign in'}</span>{user?<LogOut size={14}/>:<ArrowRight size={15}/>}</button></div></header>
    <main>{page==='studio'&&isOwner?<CardStudio/>:page==='dispatch'?<Dispatch go={go} inspect={setInspect} user={user}/>:page==='battle'?<Battle inspect={setInspect}/>:page==='practice'?<PracticeArena user={user} onRequireSignIn={()=>setAuthOpen(true)}/>:page==='records'?<Records inspect={setInspect}/>:<Rules go={go}/>}</main>
    <footer className="footer"><span>© {new Date().getFullYear()} FARE MAYHEM</span><span>Terrible drivers. Excellent battles.</span><span>PHASE 04 · VERIFIED PRACTICE</span></footer>
  </div><nav className="mobile-bottom-nav" aria-label="Mobile navigation">{navItems.filter(item=>item.id!=='studio'&&item.id!=='practice').map(item=><button key={item.id} className={page===item.id?'active':''} onClick={()=>go(item.id)} aria-label={item.label}><item.icon size={21}/><span>{item.id==='dispatch'?'Home':item.id==='battle'?'Battle':item.id==='records'?'Cards':'Rules'}</span></button>)}</nav>
  {menuOpen&&<button className="sidebar-scrim" onClick={()=>setMenuOpen(false)} aria-label="Close navigation"/>}
  {inspect&&<InspectDialog key={inspect} id={inspect} onClose={()=>setInspect(null)}/>}
  {authOpen&&<AuthDialog onClose={()=>setAuthOpen(false)} onAuthenticated={()=>setAuthOpen(false)}/>}
  {installHelp&&<div className="dialog-cover" onMouseDown={e=>{if(e.target===e.currentTarget)setInstallHelp(false)}}><section className="dialog install-dialog" role="dialog" aria-modal="true" aria-label="Install Fare Mayhem"><button className="icon-button dialog-close" onClick={()=>setInstallHelp(false)}><X/></button><Download size={34}/><h2>Take the chaos with you.</h2><p>To install, use your browser's menu and choose <b>Install app</b> or <b>Add to Home Screen</b>. On iPhone, open this page in Safari, tap Share, then Add to Home Screen.</p><button className="button primary" onClick={()=>setInstallHelp(false)}>Got it <CheckCircle2 size={17}/></button></section></div>}
  </div>
}
