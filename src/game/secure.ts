import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
export type Driver = {id:string;name:string;nickname:string;kind:'driver'|'action';cost:number;attack:number;health:number;effect:string;imageUrl:string;fullCard?:boolean;rating:string;source:'training'|'official'}
export type Unit = {id:string;cardId:string;hp:number;ready:boolean}
export type Fighter = {reputation:number;fare:number;maxFare:number;deck:string[];hand:string[];board:Unit[];fatigue:number;actionCardsPlayed?:number;actionAllowance?:number;quickArrivalCharges?:number}
export type SecureMatch = {player:Fighter;opponent:Omit<Fighter,'hand'|'deck'> & {handCount:number;deckCount:number};cards:Record<string,Driver>;turn:'player'|'opponent';round:number;winner:'player'|'opponent'|null;log:string[];version:number;pendingChoice?:{side:'player'|'opponent';kind:'third_eye_discard'|'action_target';effect?:string;first?:{side:'player'|'opponent';unitId:string}};pendingReaction?:{actor:'player'|'opponent';responder:'player'|'opponent';cardId:string;effect:string};revealedOpponentHand?:string[]}
export type SecureCommand = {type:'choose_target';unitId:string;targetSide:'player'|'opponent'}|{type:'react';useNope:boolean;index?:number}|{type:'choose_discard';index:number}|{type:'play';index:number}|{type:'attack';attackerId:string;targetId?:string}|{type:'end'}
const start=httpsCallable<{restart?:boolean;deckSlot?:number},{match:SecureMatch;resumed:boolean}>(functions,'startPracticeMatch')
const load=httpsCallable<Record<string,never>,{match:SecureMatch}>(functions,'getPracticeMatch')
const act=httpsCallable<{version:number;action:SecureCommand},{match:SecureMatch}>(functions,'takePracticeAction')
export const beginPractice=async(restart=false,deckSlot?:number)=>(await start({restart,deckSlot})).data
export const loadPractice=async()=>(await load({})).data.match
export const practiceMove=async(version:number,action:SecureCommand)=>(await act({version,action})).data.match
