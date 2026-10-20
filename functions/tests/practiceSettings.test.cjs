const {test}=require('node:test')
const assert=require('node:assert/strict')
const {parsePracticeDeckSlot}=require('../lib/practiceSettings.js')

test('standard practice accepts absent or null collection deck selector',()=>{
  assert.equal(parsePracticeDeckSlot(undefined),undefined)
  assert.equal(parsePracticeDeckSlot(null),undefined)
})

test('valid saved collection slots 1–3 are retained',()=>{
  for (const slot of [1,2,3])assert.equal(parsePracticeDeckSlot(slot),slot)
})

test('invalid collection deck selectors are rejected',()=>{
  for (const value of [0,4,-1,1.5,'1','',false,true,{},[],NaN,Infinity]) {
    assert.throws(()=>parsePracticeDeckSlot(value),/Invalid collection deck slot/)
  }
})
