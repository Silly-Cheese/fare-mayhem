import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, Check, ChevronDown, CloudUpload, ImagePlus, LoaderCircle, Plus, ShieldCheck, Sparkles, Trash2, Upload, X, Zap } from 'lucide-react'
import { generateCartoonArtwork, publishOfficialCard, retireOfficialCard, saveOfficialCard, subscribeDrafts, uploadOriginal } from './api'
import { initialCard, type EditableCard, type OfficialCard } from './types'
import { OfficialCardView } from './OfficialCardView'
import './studio.css'

function friendly(message: string) {
  if (message.includes('functions/not-found')) return 'The card service is not deployed yet. Deploy the Phase 2 Cloud Functions first.'
  if (message.includes('permission-denied')) return 'Only the verified Fare Mayhem owner can perform this action. Check your owner claim and setup.'
  if (message.includes('failed-precondition')) return message.split('] ').pop() || 'Complete the missing card details first.'
  return message.replace(/^Firebase: /, '')
}
const toEditable = (c: OfficialCard): EditableCard => ({ name:c.name, nickname:c.nickname, kind:c.kind, rarity:c.rarity, stars:c.stars, transcendentLabel:c.transcendentLabel, cost:c.cost, attack:c.attack, health:c.health, ability:c.ability, flavor:c.flavor, customerReview:c.customerReview, edition:c.edition, originalUrl:c.originalUrl, originalStoragePath:c.originalStoragePath, cartoonUrl:c.cartoonUrl, cartoonStoragePath:c.cartoonStoragePath })
function updateField<K extends keyof EditableCard>(card: EditableCard, key: K, value: EditableCard[K]) { return { ...card, [key]: value } }

export function CardStudio() {
  const [drafts, setDrafts] = useState<OfficialCard[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [card, setCard] = useState<EditableCard>(initialCard)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<'generate' | 'publish' | 'retire' | null>(null)
  const [tab, setTab] = useState<'details' | 'artwork'>('details')
  useEffect(() => subscribeDrafts(setDrafts, e => setError(friendly(e.message))), [])
  const current = drafts.find(c => c.id === selectedId)
  function change<K extends keyof EditableCard>(key: K, value: EditableCard[K]) { setCard(c=>updateField(c,key,value)); setNotice('') }
  function select(id: string) {const found=drafts.find(c=>c.id===id); if(!found)return;setSelectedId(id);setCard(toEditable(found));setError('');setNotice('');setProgress(null)}
  function createNew(){setSelectedId(null);setCard({ ...initialCard });setError('');setNotice('');setTab('details');setProgress(null)}
  async function action(label: string, op: () => Promise<void>) {setBusy(label);setError('');setNotice('');try{await op()}catch(e){setError(friendly(e instanceof Error?e.message:String(e)))}finally{setBusy('')}}
  async function save(e?:FormEvent) {e?.preventDefault();await action('save',async()=>{const id=await saveOfficialCard(card,selectedId||undefined);setSelectedId(id);setNotice('Draft saved. Changes are not public until you publish.');})}
  async function upload(e:ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0];e.target.value='';if(!file)return
    await action('upload',async()=>{
      let id=selectedId
      if(!id){id=await saveOfficialCard(card);setSelectedId(id)}
      const result=await uploadOriginal(id,file,setProgress)
      const next={ ...card, originalUrl:result.url, originalStoragePath:result.storagePath }
      await saveOfficialCard(next,id)
      setCard(next);setNotice('Original illustration uploaded and attached to the draft.')
    });setProgress(null)
  }
  async function runConfirmed() {
    const kind=confirm;setConfirm(null)
    if(!kind||!selectedId)return
    if(kind==='generate') await action('generate',async()=>{
      await saveOfficialCard(card,selectedId)
      const res=await generateCartoonArtwork(selectedId)
      setCard(c=>({...c,cartoonUrl:res.url,cartoonStoragePath:res.storagePath}))
      setNotice('Cartoon illustration generated. Review it before publishing.')
      setTab('artwork')
    })
    if(kind==='publish') await action('publish',async()=>{await saveOfficialCard(card,selectedId);await publishOfficialCard(selectedId);setNotice('Card published to the public Driver Records.')})
    if(kind==='retire') await action('retire',async()=>{await retireOfficialCard(selectedId);setNotice('Card removed from the public catalog; the draft is preserved.')})
  }
  const preview={ ...card, id:selectedId||'preview',status:'draft' as const }
  return <div className="page-content studio-page page-enter">
    <div className="studio-head"><div><span className="eyebrow"><ShieldCheck size={15}/> OWNER ACCESS · PRIVATE</span><h1>Card Studio<span className="punctuation">.</span></h1><p>Your drivers. Your rules. Nothing goes public until you say so.</p></div><button className="button primary" type="button" onClick={createNew}><Plus size={17}/> New card</button></div>
    <div className="studio-layout">
      <aside className="studio-roster"><div className="studio-roster-top"><span>YOUR WORKBENCH</span><b>{drafts.length} cards</b></div><button className={`studio-roster-item ${!selectedId?'active':''}`} onClick={createNew}><Plus size={18}/><span>Untitled new card<small>Start from scratch</small></span></button>
        {drafts.map(d=><button key={d.id} className={`studio-roster-item ${selectedId===d.id?'active':''}`} onClick={()=>select(d.id)}><span className="studio-roster-thumb">{d.cartoonUrl||d.originalUrl?<img src={d.cartoonUrl||d.originalUrl} alt=""/>:<ImagePlus size={17}/>}</span><span>{d.name}<small>{d.status==='published'?'● Public':'○ Draft'} · {d.edition}</small></span></button>)}
        {!drafts.length&&<p className="studio-roster-empty">Your official roster begins here. Create a driver to get started.</p>}
      </aside>
      <div className="studio-editor">
        <div className="studio-tabs"><button className={tab==='details'?'active':''} onClick={()=>setTab('details')}>Driver details</button><button className={tab==='artwork'?'active':''} onClick={()=>setTab('artwork')}>Original & cartoon art</button></div>
        <form onSubmit={save} className="studio-form">
          {tab==='details'?<>
            <div className="studio-form-section"><h3>Who got behind the wheel?</h3><div className="studio-fields two"><label>Driver name<input required maxLength={70} value={card.name} onChange={e=>change('name',e.target.value)} placeholder="Kris Kringle" /></label><label>Nickname<input maxLength={70} value={card.nickname} onChange={e=>change('nickname',e.target.value)} placeholder="The Orb" /></label></div>
              <div className="studio-fields two"><label>Card type<select value={card.kind} onChange={e=>change('kind',e.target.value as EditableCard['kind'])}><option value="driver">Driver</option><option value="action">Action</option></select></label><label>Edition<input maxLength={60} value={card.edition} onChange={e=>change('edition',e.target.value)} placeholder="First Edition" /></label></div>
            </div>
            <div className="studio-form-section"><h3>Driver Rating</h3><p className="studio-hint">Stars mean rarity, not guaranteed strength. Some cards don't fit the scale.</p><div className="studio-fields two"><label>Classification<select value={card.rarity} onChange={e=>change('rarity',e.target.value as EditableCard['rarity'])}><option value="standard">1–5 stars</option><option value="transcendent">Transcendent</option></select></label>{card.rarity==='standard'?<label>Stars<select value={card.stars} onChange={e=>change('stars',Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{'★'.repeat(n)} · {n} {n===1?'star':'stars'}</option>)}</select></label>:<label>Rating designation<select value={card.transcendentLabel} onChange={e=>change('transcendentLabel',e.target.value)}><option value="???">??? · Unknown</option><option value="∞">∞ · Infinite</option><option value="UNRATED">UNRATED</option></select></label>}</div></div>
            <div className="studio-form-section"><h3>Battle statistics</h3><div className="studio-fields three"><label>Fare cost<input type="number" min={0} max={10} value={card.cost} onChange={e=>change('cost',Number(e.target.value))}/></label><label>Attack<input type="number" min={0} max={30} disabled={card.kind==='action'} value={card.attack} onChange={e=>change('attack',Number(e.target.value))}/></label><label>Health<input type="number" min={1} max={30} disabled={card.kind==='action'} value={card.health} onChange={e=>change('health',Number(e.target.value))}/></label></div><p className="studio-hint">Abilities are recorded here; Phase 3 will connect released cards to server-controlled combat rules.</p></div>
            <div className="studio-form-section"><h3>Driver file</h3><label>Special ability<textarea required maxLength={360} rows={3} value={card.ability} onChange={e=>change('ability',e.target.value)} placeholder="On arrival: steal 1 Fare from the opponent." /></label><label>Backstory<textarea maxLength={600} rows={3} value={card.flavor} onChange={e=>change('flavor',e.target.value)} placeholder="Chronically hungry. Frequently late." /></label><label>Customer review<textarea maxLength={350} rows={2} value={card.customerReview} onChange={e=>change('customerReview',e.target.value)} placeholder="He tried to eat my donut..." /></label></div>
          </>:<>
            <div className="studio-form-section"><h3>The original drawing</h3><p className="studio-hint">Upload your actual handwritten character. Only the owner can upload or edit artwork. Accepted: PNG, JPEG, WebP up to 8 MB.</p><label className="studio-upload"><CloudUpload size={26}/><span>{busy==='upload'?'Uploading…':'Choose original artwork'}</span><small>From your device</small><input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={upload}/></label>{progress!==null&&<progress max={100} value={progress} className="studio-progress"/>}{card.originalUrl&&<div className="studio-art-preview"><img src={card.originalUrl} alt="Uploaded original drawing"/><span>Original illustration saved</span></div>}</div>
            <div className="studio-form-section"><h3>Classic Cartoon edition</h3><p className="studio-hint">Turn the hand-drawn character into a polished cartoon. Generation uses an external image API and may incur charges. Always review the result before release.</p>{card.cartoonUrl&&<div className="studio-art-preview"><img src={card.cartoonUrl} alt="Generated classic cartoon illustration"/><span>Digital illustration</span></div>}<button type="button" className="button outline" disabled={!!busy || !selectedId || !card.originalStoragePath} onClick={()=>setConfirm('generate')}><Sparkles size={17}/> {card.cartoonUrl?'Regenerate cartoon':'Generate cartoon illustration'}</button>{!selectedId&&<p className="studio-hint">Save the draft before generating artwork.</p>}</div>
          </>}
          {error&&<p role="alert" className="studio-warning">{error}</p>}{notice&&<p role="status" className="studio-success"><Check size={16}/> {notice}</p>}
          <div className="studio-footer"><button className="button primary" type="submit" disabled={!!busy || !card.name.trim()}>{busy==='save'?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>} {selectedId?'Save draft':'Create draft'}</button>{selectedId&&<button type="button" className="button outline" disabled={!!busy || !card.name.trim() || !card.ability.trim() || !(card.cartoonUrl||card.originalUrl)} onClick={()=>setConfirm('publish')}><Upload size={16}/> Publish card</button>}{selectedId&&current?.status==='published'&&<button className="button subtle-danger" type="button" disabled={!!busy} onClick={()=>setConfirm('retire')}><Trash2 size={16}/> Unpublish</button>}</div>
        </form>
      </div>
      <aside className="studio-preview"><div className="studio-preview-label"><span>LIVE PREVIEW</span><ChevronDown size={15}/></div><OfficialCardView card={preview}/><p>Preview only. Your changes remain private until you press Publish.</p>{current?.status==='published'&&<span className="studio-published-marker">● CURRENTLY PUBLIC</span>}</aside>
    </div>
    {confirm&&<div className="dialog-cover" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirm(null)}}><section className="dialog studio-confirm" role="alertdialog" aria-modal="true" aria-label="Confirm card action"><button className="icon-button dialog-close" onClick={()=>setConfirm(null)} aria-label="Cancel"><X size={18}/></button><span className="eyebrow">OWNER CONFIRMATION</span><h2>{confirm==='generate'?'Generate cartoon artwork?':confirm==='publish'?'Send this driver onto the road?':'Remove this card from the public registry?'}</h2><p>{confirm==='generate'?'This calls a paid image-generation API and may generate provider and Firebase charges. Your original drawing is preserved.':confirm==='publish'?'The current draft will be published immediately, and all visitors will be able to view it.':'The card will stop appearing publicly. The private draft and images are preserved.'}</p><div className="studio-footer"><button className="button outline" onClick={()=>setConfirm(null)}><ArrowLeft size={16}/> Cancel</button><button className="button primary" onClick={()=>void runConfirmed()}><Check size={16}/> {confirm==='generate'?'Generate':'Confirm'}</button></div></section></div>}
  </div>
}
