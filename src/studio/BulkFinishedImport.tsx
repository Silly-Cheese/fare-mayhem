import {useEffect,useMemo,useState,type ChangeEvent} from 'react'
import {CheckCircle2,FileImage,Images,LoaderCircle,Upload} from 'lucide-react'
import {battleEffectCategories,battleEffectOptions,initialCard,type EditableCard,type OfficialCard} from './types'
import {saveOfficialCard,uploadArtwork,validateFinishedCardImage} from './api'

type Item={key:string;file:File;card:EditableCard;valid:boolean;message:string}
const nameFromFile=(filename:string)=>filename.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().slice(0,70)
const changed=(item:Item,key:keyof EditableCard,value:unknown):Item=>({...item,card:{...item.card,[key]:value}})
/** Reviewed suggestions for cards whose printed effect is legible in the sample.
 * These are filename-based hints, NOT image/OCR extraction. The owner must verify.
 */
function suggestedFromFilename(name:string):Partial<EditableCard> {
  switch(name.toLowerCase()){
    case 'fish boy':return {nickname:'The Aquatic Oddball',stars:2,cost:3,attack:3,health:5,effectKey:'fish_boy_slipstream_shield_2',ability:'On arrival: gain 1 Fare. Prevent the next 2 damage dealt to Fish Boy.'}
    case 'jim':return {nickname:'The Middle-Class Bore',stars:1,cost:1,attack:1,health:3,effectKey:'jim_boring_reputation_1_and_untargetable',ability:'On arrival: gain 1 Reputation. Jim cannot be targeted by opposing abilities until your next turn.'}
    case 'george williamson':return {nickname:'The Uncanny Gentleman',stars:5,cost:3,attack:3,health:5,effectKey:'george_polite_rep_2_discount_1',ability:'On arrival: gain 2 Reputation. The next Driver you play costs 1 less Fare.'}
    default:return {}
  }
}
export function BulkFinishedImport({existing}:{existing:OfficialCard[]}){
  const [items,setItems]=useState<Item[]>([]),[running,setRunning]=useState(false)
  const [message,setMessage]=useState(''),[results,setResults]=useState<string[]>([])
  const [progress,setProgress]=useState(0)
  const [previews,setPreviews]=useState<Record<string,string>>({})
  useEffect(()=>{
    const next:Record<string,string>={}
    for(const item of items)next[item.key]=URL.createObjectURL(item.file)
    setPreviews(next)
    return()=>{Object.values(next).forEach(url=>URL.revokeObjectURL(url))}
  },[items.map(x=>x.key).join('|')])
  const invalid=items.filter(item=>!item.valid).length
  const duplicates=useMemo(()=>items.filter(item=>existing.some(d=>d.name.toLowerCase()===item.card.name.trim().toLowerCase()&&d.edition.toLowerCase()===item.card.edition.trim().toLowerCase())).length,[items,existing])
  async function choose(e:ChangeEvent<HTMLInputElement>){
    const selected=Array.from(e.target.files||[]);e.target.value=''
    setResults([]);setProgress(0)
    if(!selected.length)return
    if(selected.length>50){setItems([]);setMessage('Choose up to 50 complete cards per batch. No files were imported.');return}
    const names=new Set<string>()
    const rows:Item[]=[]
    for(let i=0;i<selected.length;i++){
      const file=selected[i],name=nameFromFile(file.name)
      const key=`${i}:${file.name}:${file.size}:${file.lastModified}`
      let valid=true,message=''
      try{await validateFinishedCardImage(file)}catch(err){valid=false;message=err instanceof Error?err.message:String(err)}
      if(names.has(file.name.toLowerCase())){valid=false;message='Duplicate filename; rename files uniquely and select the batch again.'}
      names.add(file.name.toLowerCase())
      rows.push({key,file,card:{...initialCard,name,...suggestedFromFilename(name)},valid,message})
    }
    setItems(rows)
    setMessage(`${rows.length} finished cards selected. ${rows.filter(x=>x.valid).length} accepted images. Review every card's name, rating, Fare and special ability. Nothing is published automatically.`)
  }
  function edit(index:number,key:keyof EditableCard,value:unknown){setItems(old=>old.map((item,i)=>i===index?changed(item,key,value):item))}
  async function run(){
    if(running||!items.length)return
    setRunning(true);setMessage('Uploading reviewed images as private drafts...');setResults([]);setProgress(0)
    const output:string[]=[]
    for(let i=0;i<items.length;i++){
      const {card,file,valid,message:problem}=items[i]
      try{
        if(!valid)throw Error(problem)
        if(!card.name.trim()||card.name.trim().length>70)throw Error('Enter a valid card name (1–70 characters).')
        if(!card.edition.trim())throw Error('Edition is required.')
        if(!['driver','action'].includes(card.kind))throw Error('Choose a valid type.')
        if(card.kind==='action'&&/^(attack_|defeat_|turn_)/.test(card.effectKey))throw Error('Choose a non-driver ability for an action card.')
        if(!Number.isInteger(card.cost)||card.cost<0||card.cost>10||!Number.isInteger(card.attack)||card.attack<0||card.attack>30||!Number.isInteger(card.health)||card.health<1||card.health>30)throw Error('Invalid cost, attack or health.')
        if(existing.some(d=>d.name.toLowerCase()===card.name.trim().toLowerCase()&&d.edition.toLowerCase()===card.edition.trim().toLowerCase()))throw Error('Already exists in Card Studio. Review it there; this image-only importer does not overwrite existing cards.')
        if(items.some((other,j)=>j<i&&other.card.name.trim().toLowerCase()===card.name.trim().toLowerCase()&&other.card.edition.trim().toLowerCase()===card.edition.trim().toLowerCase()))throw Error('Duplicate name and edition within this batch.')
        const id=await saveOfficialCard(card)
        const uploaded=await uploadArtwork(id,file,()=>{},'finished')
        await saveOfficialCard({...card,finishedUrl:uploaded.url,finishedStoragePath:uploaded.storagePath},id)
        output.push(`✓ ${card.name} — private draft created; verify the printed text matches the gameplay data before publishing.`)
      }catch(err){
        output.push(`✕ ${card.name||file.name}: ${err instanceof Error?err.message:String(err)}`)
      }
      setProgress(i+1);setResults([...output])
    }
    setRunning(false)
    setMessage('Bulk finished-card upload complete. Open each draft in Card Studio for review before publishing. Errors do not stop other cards.')
  }
  return <div className="finished-batch">
    <div className="finished-batch-intro"><Images size={23}/><div><h3>Option B · Mass import finished cards</h3><p>Select up to 50 complete images—no spreadsheet required. Death's 5:7 portrait is the recommended style, not a required size. Different card dimensions and proportions are accepted, and images are preserved exactly—including their borders, printed words and graphics.</p></div></div>
    <label className="studio-upload"><FileImage size={23}/><span>Select multiple complete cards</span><small>PNG · JPG · WebP · any dimensions · up to 8 MB each. Portrait recommended.</small><input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={running} onChange={e=>void choose(e)}/></label>
    <p className="studio-hint">Names initially come from filenames. Fish Boy, Jim, and George Williamson get editable draft suggestions based on the cards in the example screenshot—not automatic image recognition. Check every detail against each finished card, especially Attack (which is not printed in these examples). Other cards need your input. All imports remain private drafts.</p>
    {items.length>0&&<><div className="finished-batch-totals"><b>{items.length} cards selected</b><span>{invalid} invalid file(s)</span><span>{duplicates} already in the studio</span></div><div className="finished-batch-grid">{items.map((item,i)=><article className={item.valid?'finished-batch-row':'finished-batch-row invalid'} key={item.key}>
      <div className="finished-batch-image">{previews[item.key]?<img src={previews[item.key]} alt={`Full preview of ${item.file.name}`}/>:<FileImage size={29}/>}</div>
      <div className="finished-batch-fields"><b>{item.file.name}</b>{!item.valid&&<p className="studio-warning">{item.message}</p>}
        <label>Official name<input value={item.card.name} maxLength={70} disabled={running} onChange={e=>edit(i,'name',e.target.value)}/></label>
        <div className="finished-batch-controls"><label>Type<select disabled={running} value={item.card.kind} onChange={e=>{const kind=e.target.value as EditableCard['kind'];setItems(old=>old.map((v,index)=>index===i?{...v,card:{...v.card,kind,effectKey:kind==='action'&&/^(attack_|defeat_|turn_)/.test(v.card.effectKey)?'none':v.card.effectKey}}:v))}}><option value="driver">Driver</option><option value="action">Action</option></select></label>
          <label>Rating class<select disabled={running} value={item.card.rarity} onChange={e=>edit(i,'rarity',e.target.value)}><option value="standard">1–5 stars</option><option value="transcendent">Transcendent</option></select></label>
          {item.card.rarity==='transcendent'?<label>Designation<select disabled={running} value={item.card.transcendentLabel} onChange={e=>edit(i,'transcendentLabel',e.target.value)}><option value="???">???</option><option value="∞">∞</option><option value="UNRATED">UNRATED</option></select></label>:<label>Stars<select disabled={running} value={item.card.stars} onChange={e=>edit(i,'stars',Number(e.target.value))}>{[1,2,3,4,5].map(n=><option value={n} key={n}>{n} ★</option>)}</select></label>}
          <label>Fare<input type="number" min={0} max={10} disabled={running} value={item.card.cost} onChange={e=>edit(i,'cost',Number(e.target.value))}/></label>
          <label>Attack<input type="number" min={0} max={30} disabled={running} value={item.card.attack} onChange={e=>edit(i,'attack',Number(e.target.value))}/></label>
          <label>Health<input type="number" min={1} max={30} disabled={running} value={item.card.health} onChange={e=>edit(i,'health',Number(e.target.value))}/></label>
        </div>
        <label>Edition<input disabled={running} maxLength={60} value={item.card.edition} onChange={e=>edit(i,'edition',e.target.value)}/></label>
        <label>Playable ability<select disabled={running} value={item.card.effectKey} onChange={e=>{const key=e.target.value as EditableCard['effectKey'];edit(i,'effectKey',key)}}>{battleEffectCategories.map(category=><optgroup key={category} label={category}>{battleEffectOptions.filter(option=>option.category===category&&(item.card.kind==='driver'||!(/^(attack_|defeat_|turn_)/).test(option.value))).map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</optgroup>)}</select></label>
        <label>Printed ability text <textarea rows={2} disabled={running} maxLength={360} value={item.card.ability} placeholder="Enter the ability printed on this card (can be completed later in Card Studio)" onChange={e=>edit(i,'ability',e.target.value)}/></label>
      </div>
    </article>)}</div>
      <button className="button primary" type="button" disabled={running||!!invalid} onClick={()=>void run()}>{running?<LoaderCircle className="spin" size={17}/>:<Upload size={17}/>} {running?`Importing ${progress}/${items.length}`:`Import ${items.length} finished cards as drafts`}</button></>}
    {message&&<p className="studio-hint" role="status">{message}</p>}
    {results.length>0&&<div className="bulk-output">{results.map((result,i)=><p key={i}><CheckCircle2 size={14}/>{result}</p>)}</div>}
  </div>
}
