const {test}=require('node:test')
const assert=require('node:assert/strict')
const {validateCard,validateArtworkPath,canPublish}=require('../lib/validation.js')
const sample={name:'Kris Kringle',nickname:'The Orb',kind:'driver',rarity:'standard',stars:2,transcendentLabel:'???',cost:3,attack:2,health:5,ability:'Steal 1 Fare.',flavor:'Hungry.',customerReview:'Tried to eat my donut.',edition:'First Edition',originalUrl:'',originalStoragePath:'',cartoonUrl:'',cartoonStoragePath:''}
test('accepts 1–5 star drivers',()=>assert.equal(validateCard(sample).stars,2))
test('transcendent rare classification preserved',()=>assert.equal(validateCard({...sample,rarity:'transcendent',transcendentLabel:'∞'}).transcendentLabel,'∞'))
test('rejects impossible ratings',()=>assert.throws(()=>validateCard({...sample,stars:6})))
test('requires art and ability to publish',()=>{assert.equal(canPublish(sample),false);assert.equal(canPublish({...sample,originalUrl:'https://images.example/art.webp'}),true)})
test('artwork paths bound to specific card',()=>{assert.equal(validateArtworkPath('examplecard123','card-art/examplecard123/original/x.png','original'),true);assert.equal(validateArtworkPath('examplecard123','card-art/anothercard123/original/x.png','original'),false)})
