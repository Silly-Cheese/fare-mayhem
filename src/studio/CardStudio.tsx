import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, Check, ChevronDown, CloudUpload, ImagePlus, LoaderCircle, Plus, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { deleteOfficialCard, publishOfficialCard, retireOfficialCard, saveOfficialCard, subscribeDrafts, uploadArtwork } from './api'
import { battleEffectOptions, initialCard, type EditableCard, type OfficialCard } from './types'
import { OfficialCardView } from './OfficialCardView'
import { BulkImport } from './BulkImport'
import './studio.css'

function friendly(message: string) {
  if (message.includes('functions/not-found')) return 'The card service is not deployed yet. Deploy the Phase 2 Cloud Functions first.'
  if (message.includes('permission-denied')) return 'Only the verified Fare Mayhem owner can perform this action. Check your owner claim and setup.'
  if (message.includes('failed-precondition')) return message.split('] ').pop() || 'Complete the missing card details first.'
  return message.replace(/^Firebase: /, '')
}
const toEditable = (c: OfficialCard): EditableCard => ({ name:c.name, nickname:c.nickname, kind:c.kind, rarity:c.rarity, stars:c.stars, transcendentLabel:c.transcendentLabel, cost:c.cost, attack:c.attack, health:c.health, ability:c.ability, flavor:c.flavor, customerReview:c.customerReview, edition:c.edition, effectKey:c.effectKey||'none', originalUrl:c.originalUrl, originalStoragePath:c.originalStoragePath, cartoonUrl:c.cartoonUrl, cartoonStoragePath:c.cartoonStoragePath })
function updateField<K extends keyof EditableCard>(card: EditableCard, key: K, value: EditableCard[K]) { return { ...card, [key]: value } }

export function CardStudio() {
  const [drafts, setDrafts] = useState<OfficialCard[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [card, setCard] = useState<EditableCard>(initialCard)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [confirm, setConfirm] = useState<'publish' | 'retire' | 'delete' | null>(null)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [tab, setTab] = useState<'details' | 'artwork'>('details')
  useEffect(() => subscribeDrafts(setDrafts, e => setError(friendly(e.message))), [])
  const current = drafts.find(c => c.id === selectedId)
  function change<K extends keyof EditableCard>(key: K, value: EditableCard[K]) { setCard(c=>updateField(c,key,value)); setNotice('') }
  function select(id: string) {const found=drafts.find(c=>c.id===id); if(!found)return;setSelectedId(id);setCard(toEditable(found));setError('');setNotice('');setProgress(null);setTab('details')}
  function createNew(){setSelectedId(null);setCard({ ...initialCard });setError('');setNotice('');setTab('details');setProgress(null)}
  async function action(label: string, op: () => Promise<void>) {setBusy(label);setError('');setNotice('');try{await op()}catch(e){setError(friendly(e instanceof Error?e.message:String(e)))}finally{setBusy('')}}
  async function save(e?:FormEvent) {e?.preventDefault();await action('save',async()=>{const id=await saveOfficialCard(card,selectedId||undefined);setSelectedId(id);setNotice('Changes saved. For a live card, press Update live card to publish your edits.');})}
  async function upload(e:ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0];e.target.value='';if(!file)return
    await action('upload',async()=>{
      let id=selectedId
      if(!id){id=await saveOfficialCard(card);setSelectedId(id)}
      const result=await uploadArtwork(id,file,setProgress,'original')
      const next={ ...card, originalUrl:result.url, originalStoragePath:result.storagePath }
      await saveOfficialCard(next,id)
      setCard(next);setNotice('Original illustration uploaded and attached to the draft.')
    });setProgress(null)
  }
  async function runConfirmed() {
    const kind=confirm;setConfirm(null)
    if(!kind||!selectedId)return
    if(kind==='publish') await action('publish',async()=>{await saveOfficialCard(card,selectedId);await publishOfficialCard(selectedId);setNotice('Card published to the public Driver Records.')})
    if(kind==='retire') await action('retire',async()=>{await retireOfficialCard(selectedId);setNotice('Card removed from the public catalog; the draft is preserved.')})
    if(kind==='delete') await action('delete',async()=>{const outcome=await deleteOfficialCard(selectedId,deleteTyped);createNew();setDeleteTyped('');setNotice(outcome.artworkRemoved?'Card and all associated artwork permanently deleted.':'Card deleted. Artwork cleanup needs administrator attention; inspect Firebase Storage.');})
  }
  const preview={ ...card, id:selectedId||'preview',status:'draft' as const }
  return <div className="page-content studio-page page-enter">
    <div className="studio-head"><div><span className="eyebrow"><ShieldCheck size={15}/> OWNER ACCESS · PRIVATE</span><h1>Card Studio<span className="punctuation">.</span></h1><p>Your drivers. Your rules. Nothing goes public until you say so.</p></div><div className="studio-head-actions"><button className="button outline" type="button" onClick={()=>setShowImport(v=>!v)}><Upload size={16}/> {showImport?'Close Import':'Bulk Import'}</button><button className="button primary" type="button" onClick={createNew}><Plus size={17}/> New card</button></div></div>
    {showImport&&<BulkImport onClose={()=>setShowImport(false)}/>}
    <div className="studio-layout">
      <aside className="studio-roster"><div className="studio-roster-top"><span>YOUR WORKBENCH</span><b>{drafts.length} cards</b></div><button className={`studio-roster-item ${!selectedId?'active':''}`} onClick={createNew}><Plus size={18}/><span>Untitled new card<small>Start from scratch</small></span></button>
        {drafts.map(d=><button key={d.id} className={`studio-roster-item ${selectedId===d.id?'active':''}`} onClick={()=>select(d.id)}><span className="studio-roster-thumb">{d.cartoonUrl||d.originalUrl?<img src={d.cartoonUrl||d.originalUrl} alt=""/>:<ImagePlus size={17}/>}</span><span>{d.name}<small>{d.status==='published'?'● Public':d.status==='retired'?'◌ Unpublished':'○ Draft'} · {d.edition}</small></span></button>)}
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
            <div className="studio-form-section"><h3>Battle statistics</h3><div className="studio-fields three"><label>Fare cost<input type="number" min={0} max={10} value={card.cost} onChange={e=>change('cost',Number(e.target.value))}/></label><label>Attack<input type="number" min={0} max={30} disabled={card.kind==='action'} value={card.attack} onChange={e=>change('attack',Number(e.target.value))}/></label><label>Health<input type="number" min={1} max={30} disabled={card.kind==='action'} value={card.health} onChange={e=>change('health',Number(e.target.value))}/></label></div><p className="studio-hint">Stats and effects are validated by the game server. The written ability is flavor text; select an actual combat effect below.</p><label>Gameplay effect<select value={card.effectKey||'none'} onChange={e=>change('effectKey',e.target.value as EditableCard['effectKey'])}>{battleEffectOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label><p className="studio-hint">{battleEffectOptions.find(o=>o.value===(card.effectKey||'none'))?.help} Only these predefined effects can execute during battles.</p></div>
            <div className="studio-form-section"><h3>Driver file</h3><label>Special ability<textarea required maxLength={360} rows={3} value={card.ability} onChange={e=>change('ability',e.target.value)} placeholder="On arrival: steal 1 Fare from the opponent." /></label><label>Backstory<textarea maxLength={600} rows={3} value={card.flavor} onChange={e=>change('flavor',e.target.value)} placeholder="Chronically hungry. Frequently late." /></label><label>Customer review<textarea maxLength={350} rows={2} value={card.customerReview} onChange={e=>change('customerReview',e.target.value)} placeholder="He tried to eat my donut..." /></label></div>
          </>:<>
            <div className="studio-form-section"><h3>The original drawing</h3><p className="studio-hint">Upload your actual handwritten character. Only the owner can upload or edit artwork. Accepted: PNG, JPEG, WebP up to 8 MB.</p><label className="studio-upload"><CloudUpload size={26}/><span>{busy==='upload'?'Uploading…':'Choose original artwork'}</span><small>From your device</small><input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={upload}/></label>{progress!==null&&<progress max={100} value={progress} className="studio-progress"/>}{card.originalUrl&&<div className="studio-art-preview"><img src={card.originalUrl} alt="Uploaded original drawing"/><span>Original illustration saved</span></div>}</div>
            <div className="studio-form-section"><h3>Classic Cartoon edition</h3><p className="studio-hint">Upload a cartoon illustration made here in ChatGPT or elsewhere. This does not need an OpenAI API key.</p><label className="studio-upload"><CloudUpload size={23}/><span>{busy==='cartoon'?'Uploading…':'Choose cartoon artwork'}</span><small>PNG, JPG or WebP · 8 MB limit</small><input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;await action('cartoon',async()=>{let id=selectedId;if(!id){id=await saveOfficialCard(card);setSelectedId(id)}const art=await uploadArtwork(id,file,setProgress,'cartoon');const next={...card,cartoonUrl:art.url,cartoonStoragePath:art.storagePath};await saveOfficialCard(next,id);setCard(next);setNotice('Cartoon artwork uploaded. Review before publishing.')});setProgress(null)}}/></label>{card.cartoonUrl&&<div className="studio-art-preview"><img src={card.cartoonUrl} alt="Your uploaded cartoon illustration"/><span>Cartoon illustration</span></div>}</div>
          </>}
          {error&&<p role="alert" className="studio-warning">{error}</p>}{notice&&<p role="status" className="studio-success"><Check size={16}/> {notice}</p>}
          <div className="studio-footer"><button className="button primary" type="submit" disabled={!!busy || !card.name.trim()}>{busy==='save'?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>} {selectedId?'Save changes':'Create draft'}</button>{selectedId&&<button type="button" className="button outline" disabled={!!busy || !card.name.trim() || !card.ability.trim() || !(card.cartoonUrl||card.originalUrl)} onClick={()=>setConfirm('publish')}><Upload size={16}/> {current?.status==='published'?'Update live card':'Publish card'}</button>}{selectedId&&current?.status==='published'&&<button className="button subtle-danger" type="button" disabled={!!busy} onClick={()=>setConfirm('retire')}>Unpublish</button>}{selectedId&&<button className="button subtle-danger" type="button" disabled={!!busy} onClick={()=>{setDeleteTyped('');setConfirm('delete')}}><Trash2 size={16}/> Delete permanently</button>}</div>
        </form>
      </div>
      <aside className="studio-preview"><div className="studio-preview-label"><span>LIVE PREVIEW</span><ChevronDown size={15}/></div><OfficialCardView card={preview}/><p>Preview only. Edits to published cards are staged until you choose Update live card. Current practice matches keep their original card snapshots.</p>{current?.status==='published'&&<span className="studio-published-marker">● CURRENTLY PUBLIC</span>}</aside>
    </div>
    {confirm&&<div className="dialog-cover" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirm(null)}}><section className="dialog studio-confirm" role="alertdialog" aria-modal="true" aria-label="Confirm card action"><button className="icon-button dialog-close" onClick={()=>setConfirm(null)} aria-label="Cancel"><X size={18}/></button><span className="eyebrow">OWNER CONFIRMATION</span><h2>{confirm==='publish'?'Publish the latest version?':confirm==='delete'?'Delete this card permanently?':'Remove this card from the public registry?'}</h2><p>{confirm==='publish'?'Your saved changes will replace the currently published card. Existing battle sessions keep their own snapshots.':confirm==='delete'?'This cannot be undone. The original drawing, cartoon versions, saved draft, and public card entry will be removed. Existing battle logs retain historical card names.':'The card will stop appearing publicly. The private draft and images are preserved.'}</p>{confirm==='delete'&&<label className="studio-delete-label">Type <strong>{current?.name}</strong> exactly to confirm<input value={deleteTyped} onChange={e=>setDeleteTyped(e.target.value)} autoComplete="off" aria-label="Confirm card name for deletion" /></label>}<div className="studio-footer"><button className="button outline" onClick={()=>setConfirm(null)}><ArrowLeft size={16}/> Cancel</button><button disabled={confirm==='delete' && deleteTyped!==current?.name} className={confirm==='delete'?'button subtle-danger':'button primary'} onClick={()=>void runConfirmed()}><Check size={16}/> {confirm==='delete'?'Delete forever':'Confirm'}</button></div></section></div>}
  </div>
}
