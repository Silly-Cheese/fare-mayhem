import { useEffect, useState, type ChangeEvent } from 'react'
import { CheckCircle2, FileUp, ImagePlus, Upload, X } from 'lucide-react'
import { battleEffectOptions, initialCard, type EditableCard, type OfficialCard } from './types'
import { publishOfficialCard, saveOfficialCard, subscribeDrafts, uploadArtwork } from './api'

type Entry={card:EditableCard;originalFile:string;cartoonFile:string}
const clean=(v:unknown)=>v===null||v===undefined?'':String(v).trim()
const numberOr=(v:unknown,n:number)=>v===null||v===undefined||v===''?n:Number(v)
function decodeCSV(text:string):Record<string,string>[]{
  const lines:string[][]=[];let row:string[]=[],value='',quoted=false
  for(let i=0;i<text.length;i++){
    const c=text[i]
    if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}
    else if(c===','&&!quoted){row.push(value);value=''}
    else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))lines.push(row);row=[];value=''}
    else value+=c
  }
  if(quoted)throw Error('Unclosed quoted CSV field')
  row.push(value);if(row.some(v=>v.trim()))lines.push(row)
  if(lines.length<2)throw Error('CSV needs a header and at least one card.')
  const headers=lines[0].map(v=>v.replace(/^\uFEFF/,'').trim())
  return lines.slice(1).map(fields=>Object.fromEntries(headers.map((h,i)=>[h,fields[i]||''])))
}
export function parseCards(text:string,name:string):Entry[]{
  let raw:unknown
  if(name.toLowerCase().endsWith('.json')){try{raw=JSON.parse(text)}catch{throw Error('Invalid JSON card file.')}}
  else if(name.toLowerCase().endsWith('.csv'))raw=decodeCSV(text)
  else throw Error('Choose a CSV or JSON file.')
  const values=Array.isArray(raw)?raw:raw&&typeof raw==='object'&&Array.isArray((raw as {cards?:unknown}).cards)?(raw as {cards:unknown[]}).cards:null
  if(!values?.length||values.length>50)throw Error('Import 1–50 cards per batch.')
  const seen=new Set<string>()
  return values.map((entry,i)=>{
    if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error(`Row ${i+1}: expected a card record.`)
    const r=entry as Record<string,unknown>
    const card:EditableCard={
      ...initialCard,name:clean(r.name),nickname:clean(r.nickname),
      kind:clean(r.kind||'driver') as EditableCard['kind'],
      rarity:clean(r.rarity||'standard') as EditableCard['rarity'],
      stars:numberOr(r.stars,1),transcendentLabel:clean(r.transcendentLabel||'???'),
      cost:numberOr(r.cost,2),attack:numberOr(r.attack,2),health:numberOr(r.health,3),
      ability:clean(r.ability),flavor:clean(r.flavor),customerReview:clean(r.customerReview),
      edition:clean(r.edition||'First Edition'),
      effectKey:clean(r.effectKey||'none') as EditableCard['effectKey']
    }
    if(!card.name||card.name.length>70||!card.ability||card.ability.length>360||card.edition.length>60||!['driver','action'].includes(card.kind)||!['standard','transcendent'].includes(card.rarity)||!Number.isInteger(card.stars)||card.stars<1||card.stars>5||!Number.isInteger(card.cost)||card.cost<0||card.cost>10||!Number.isInteger(card.attack)||card.attack<0||card.attack>30||!Number.isInteger(card.health)||card.health<1||card.health>30||!['???','∞','UNRATED'].includes(card.transcendentLabel)||!battleEffectOptions.some(x=>x.value===card.effectKey))throw Error(`Row ${i+1}: invalid card details. Check names, stats and effectKey.`)
    const key=`${card.name.toLowerCase()}::${card.edition.toLowerCase()}`
    if(seen.has(key))throw Error(`Duplicate name/edition in row ${i+1}`)
    seen.add(key)
    return {card,originalFile:clean(r.originalFile),cartoonFile:clean(r.cartoonFile)}
  })
}
export function BulkImport({onClose}:{onClose:()=>void}){
  const [rows,setRows]=useState<Entry[]>([])
  const [files,setFiles]=useState<File[]>([])
  const [existing,setExisting]=useState<OfficialCard[]>([])
  const [publish,setPublish]=useState(false),[running,setRunning]=useState(false)
  const [status,setStatus]=useState(''),[results,setResults]=useState<string[]>([])
  useEffect(()=>subscribeDrafts(setExisting,e=>setStatus('Could not load drafts: '+e.message)),[])
  const find=(filename:string)=>files.find(f=>f.name.toLowerCase()===filename.replace(/^.*[\\/]/,'').toLowerCase())
  async function choose(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value='';if(!file)return
    try{const parsed=parseCards(await file.text(),file.name);setRows(parsed);setStatus(`${parsed.length} cards loaded. Review before importing.`);setResults([])}
    catch(e){setRows([]);setStatus(e instanceof Error?e.message:String(e))}
  }
  async function run(){
    if(!rows.length||running)return
    if(publish&&!window.confirm('Publish every valid imported card immediately?'))return
    setRunning(true);const output:string[]=[]
    try{
      for(let i=0;i<rows.length;i++){
        const row=rows[i],prior=existing.find(c=>c.name.toLowerCase()===row.card.name.toLowerCase()&&c.edition.toLowerCase()===row.card.edition.toLowerCase())
        setStatus(`Processing ${i+1} of ${rows.length}: ${row.card.name}`)
        try{
          if((row.originalFile&&!find(row.originalFile))||(row.cartoonFile&&!find(row.cartoonFile)))throw Error('Matching artwork file missing. Check the selected image filenames.')
          const merged:EditableCard=prior?{...row.card,originalUrl:prior.originalUrl,originalStoragePath:prior.originalStoragePath,cartoonUrl:prior.cartoonUrl,cartoonStoragePath:prior.cartoonStoragePath}:row.card
          const id=await saveOfficialCard(merged,prior?.id)
          for(const type of ['original','cartoon'] as const){
            const filename=type==='original'?row.originalFile:row.cartoonFile
            if(!filename)continue
            const image=find(filename)!
            const result=await uploadArtwork(id,image,()=>{},type)
            if(type==='original'){merged.originalUrl=result.url;merged.originalStoragePath=result.storagePath}
            else{merged.cartoonUrl=result.url;merged.cartoonStoragePath=result.storagePath}
          }
          await saveOfficialCard(merged,id)
          if(publish)await publishOfficialCard(id)
          output.push(`✓ ${row.card.name}: ${publish?'published':'draft saved'}`)
        }catch(e){output.push(`✕ ${row.card.name}: ${e instanceof Error?e.message:String(e)}`)}
        setResults([...output])
      }
      setStatus('Import complete. Review each result; correct any failed rows before retrying.')
    }finally{setRunning(false)}
  }
  return <section className="bulk-import"><div className="bulk-import-head"><div><span className="eyebrow">OWNER IMPORT TOOL</span><h2>Import your original collection</h2><p>Import up to 50 cards per batch. Match local artwork filenames, review the table, and publish only when ready. No paid AI generation.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close importer"><X size={19}/></button></div>
    <div className="bulk-inputs"><label className="studio-upload"><FileUp size={23}/><span>Choose a CSV or JSON card list</span><small>Up to 50 records per batch</small><input type="file" accept=".csv,.json" onChange={choose} disabled={running}/></label><label className="studio-upload"><ImagePlus size={23}/><span>Attach original & cartoon image files</span><small>PNG/JPG/WebP · filenames must match card rows</small><input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e=>{setFiles(Array.from(e.target.files||[]));e.target.value=''}} disabled={running}/></label></div>
    <p className="studio-hint">Columns: name, nickname, kind, rarity, stars, transcendentLabel, cost, attack, health, ability, flavor, customerReview, edition, effectKey, originalFile, cartoonFile. Optional artwork can be added later in Card Studio.</p>
    {files.length>0&&<p>{files.length} artwork file(s) attached.</p>}
    {rows.length>0&&<><div className="bulk-scroll"><table><thead><tr><th>Card</th><th>Rating</th><th>Fare</th><th>Artwork files</th><th>Operation</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{r.card.name}<small>{r.card.edition}</small></td><td>{r.card.rarity==='standard'?'★'.repeat(r.card.stars):r.card.transcendentLabel}</td><td>{r.card.cost}</td><td>{[r.originalFile,r.cartoonFile].filter(Boolean).map(x=><span key={x} className={find(x)?'import-ok':'import-fail'}>{find(x)?'✓':'!'} {x}</span>)}{!r.originalFile&&!r.cartoonFile&&'Add later'}</td><td>{existing.some(c=>c.name.toLowerCase()===r.card.name.toLowerCase()&&c.edition.toLowerCase()===r.card.edition.toLowerCase())?'Update':'Create'}</td></tr>)}</tbody></table></div>
      <label className="bulk-publish"><input type="checkbox" checked={publish} disabled={running} onChange={e=>setPublish(e.target.checked)}/> Publish valid imported cards immediately (unchecked = save drafts)</label>
      <button type="button" className="button primary" disabled={running} onClick={()=>void run()}><Upload size={16}/> {running?'Importing…':`Import ${rows.length} card(s)`}</button></>}
    {status&&<p className="studio-hint" role="status">{status}</p>}
    {results.length>0&&<div className="bulk-output">{results.map((text,i)=><p key={i}><CheckCircle2 size={14}/> {text}</p>)}</div>}
    <details className="bulk-example"><summary>Example JSON format</summary><pre>{JSON.stringify([{name:'Your Driver',nickname:'The Original',kind:'driver',stars:2,cost:2,attack:2,health:3,ability:'On arrival: restore 2 Reputation.',effectKey:'heal_reputation_2',originalFile:'driver.jpg',cartoonFile:'driver-cartoon.png'}],null,2)}</pre></details>
  </section>
}
