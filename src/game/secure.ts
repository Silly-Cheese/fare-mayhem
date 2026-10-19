import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
export type Driver = {id:string;name:string;nickname:string;kind:'driver'|'action';cost:number;attack:number;health:number;effect:string;imageUrl:string;rating:string;source:'training'|'official'}
export type Unit = {id:string;cardId:string;hp:number;ready:boolean}
export type Fighter = {reputation:number;fare:number;maxFare:number;deck:string[];hand:string[];board:Unit[];fatigue:number}
export type SecureMatch = {player:Fighter;opponent:Omit<Fighter,'hand'|'deck'> & {handCount:number;deckCount:number};cards:Record<string,Driver>;turn:'player'|'opponent';round:number;winner:'player'|'opponent'|null;log:string[];version:number}
export type SecureCommand = {type:'play';index:number}|{type:'attack';attackerId:string;targetId?:string}|{type:'end'}
const start=httpsCallable<{restart?:boolean},{match:SecureMatch;resumed:boolean}>(functions,'startPracticeMatch')
const load=httpsCallable<Record<string,never>,{match:SecureMatch}>(functions,'getPracticeMatch')
const act=httpsCallable<{version:number;action:SecureCommand},{match:SecureMatch}>(functions,'takePracticeAction')
export const beginPractice=async(restart=false)=>(await start({restart})).data
export const loadPractice=async()=>(await load({})).data.match
export const practiceMove=async(version:number,action:SecureCommand)=>(await act({version,action})).data.match
