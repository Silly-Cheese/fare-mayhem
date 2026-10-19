import type { DriverKind } from '../game/cards'

export function DriverArt({ kind, className = '' }: { kind: DriverKind; className?: string }) {
  if (kind === 'orb') return <svg className={`driver-art ${className}`} viewBox="0 0 300 260" role="img" aria-label="Cartoon interpretation of Kris Kringle, The Orb, holding a donut">
    <ellipse cx="149" cy="238" rx="93" ry="11" fill="#1b1b1b" opacity=".17" />
    <path d="M90 164 46 198 28 182 M204 170 244 197 263 181" fill="none" stroke="#302b2a" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M86 116 43 84 24 93 M214 111 256 70" fill="none" stroke="#302b2a" strokeWidth="17" strokeLinecap="round" />
    <circle cx="259" cy="57" r="28" fill="#ffca79" stroke="#322e2a" strokeWidth="7"/><circle cx="259" cy="57" r="12" fill="#b97a44"/><g fill="#e486a1"><circle cx="248" cy="39" r="3"/><circle cx="272" cy="44" r="3"/><circle cx="268" cy="66" r="3"/></g>
    <ellipse cx="150" cy="150" rx="97" ry="79" fill="#fff2d4" stroke="#252323" strokeWidth="7" />
    <path d="M67 104Q151 91 232 109L241 127Q150 114 59 128Z" fill="#272d30"/>
    <path d="M56 145Q149 128 245 145L243 166Q148 154 56 167Z" fill="#272d30"/>
    <path d="M66 186Q146 175 230 188L214 207Q149 196 88 207Z" fill="#272d30"/>
    <path d="M131 81 120 64 147 58 173 64 165 82" fill="#ffb994" stroke="#322e2a" strokeWidth="5" />
    <circle cx="147" cy="55" r="37" fill="#ffbe91" stroke="#2b2b2b" strokeWidth="6"/>
    <path d="M111 46q0-37 37-38 40 0 39 40" fill="#c8483e" stroke="#2b2b2b" strokeWidth="5"/>
    <rect x="114" y="35" width="67" height="14" rx="7" fill="#fff9e6" stroke="#2b2b2b" strokeWidth="4"/>
    <circle cx="187" cy="16" r="12" fill="#fff5df" stroke="#2b2b2b" strokeWidth="4" />
    <circle cx="133" cy="57" r="4" fill="#292727"/><circle cx="161" cy="57" r="4" fill="#292727"/>
    <ellipse cx="147" cy="74" rx="11" ry="13" fill="#513631" stroke="#2b2b2b" strokeWidth="3"/>
    <circle cx="112" cy="66" r="9" fill="#fb9582" opacity=".7"/><circle cx="181" cy="66" r="9" fill="#fb9582" opacity=".7"/>
    <path d="M30 183q-22-18-26 6t27 13" fill="#ffbc93" stroke="#272727" strokeWidth="5"/>
    <path d="M262 181q17-15 29 8t-22 20" fill="#ffbc93" stroke="#272727" strokeWidth="5"/>
  </svg>
  if (kind === 'detour') return <svg className={`driver-art ${className}`} viewBox="0 0 300 260" role="img" aria-label="Cartoon training driver Detour Dave with cap and map">
    <ellipse cx="150" cy="239" rx="85" ry="11" opacity=".17"/>
    <path d="M74 219Q50 145 93 115L202 113Q250 149 223 223Z" fill="#dd6b4b" stroke="#2b292b" strokeWidth="8"/>
    <path d="m91 170-44 32m152-34 46 33" stroke="#29272a" strokeWidth="18" strokeLinecap="round"/>
    <path d="m100 214-12 21m109-21 14 21" stroke="#29272a" strokeWidth="20" strokeLinecap="round"/>
    <path d="M91 107Q92 29 152 25q61 4 60 82Z" fill="#ffc698" stroke="#302728" strokeWidth="7"/>
    <path d="M81 62Q94 3 170 11q38 7 52 52l-142 8Z" fill="#423c8b" stroke="#302728" strokeWidth="7"/>
    <path d="M103 68q99-29 153 0-58 31-152 15" fill="#5a55ac" stroke="#302728" strokeWidth="6"/>
    <circle cx="126" cy="104" r="6" fill="#222"/><circle cx="177" cy="104" r="6" fill="#222"/>
    <path d="M138 128q16 19 32-1" fill="none" stroke="#5a3931" strokeWidth="5" strokeLinecap="round"/>
    <path d="m41 174 36-41 29 17 27-19 43 20-29 39-32-14-39 25Z" fill="#faf0cd" stroke="#2b292b" strokeWidth="5"/>
    <path d="m77 136 10 55m16-41 13 25m18-39 12 53" stroke="#c9a36b" strokeWidth="3" fill="none"/>
  </svg>
  if (kind === 'miles') return <svg className={`driver-art ${className}`} viewBox="0 0 300 260" role="img" aria-label="Cartoon training driver Mildred Miles with glasses and handbag">
    <ellipse cx="150" cy="239" rx="83" ry="11" opacity=".17"/>
    <path d="M71 226Q65 148 105 116h92q48 43 30 110Z" fill="#7fb9ac" stroke="#2a3030" strokeWidth="8"/>
    <path d="m91 157-53 43m171-42 40 41" stroke="#293332" strokeWidth="16" strokeLinecap="round"/>
    <path d="M96 115q-38-73 19-94 63-36 102 28 15 40-16 75" fill="#c2b7cf" stroke="#283130" strokeWidth="7"/>
    <ellipse cx="151" cy="95" rx="59" ry="65" fill="#eeb994" stroke="#273131" strokeWidth="6"/>
    <path d="M93 67Q113 3 167 22q42-16 51 41-37-19-53-31-14 25-72 35" fill="#c9c2d5" stroke="#273131" strokeWidth="6"/>
    <circle cx="128" cy="100" r="23" fill="none" stroke="#343237" strokeWidth="6"/><circle cx="175" cy="100" r="23" fill="none" stroke="#343237" strokeWidth="6"/><path d="M150 100h4" stroke="#343237" strokeWidth="6"/>
    <circle cx="130" cy="102" r="4" fill="#242424"/><circle cx="175" cy="102" r="4" fill="#242424"/>
    <path d="M135 137q17 11 31-2" fill="none" stroke="#9d4e54" strokeWidth="5" strokeLinecap="round"/>
    <rect x="214" y="182" width="61" height="43" rx="6" fill="#b77a5e" stroke="#2d292b" strokeWidth="6"/><path d="M231 182q0-30 28 0" stroke="#2d292b" strokeWidth="6" fill="none"/>
  </svg>
  return <svg className={`driver-art ${className}`} viewBox="0 0 300 260" role="img" aria-label="Green cartoon training character Traffic Goblin wearing an oversized cap">
    <ellipse cx="150" cy="241" rx="87" ry="10" opacity=".17"/>
    <path d="m100 171-51 45m144-45 50 45" stroke="#27302a" strokeWidth="20" strokeLinecap="round"/>
    <path d="M79 226q-17-81 33-104h75q57 32 33 104" fill="#f1c34a" stroke="#27302a" strokeWidth="8"/>
    <path d="M99 126Q58 54 145 31q98-13 77 103Z" fill="#89bc6d" stroke="#27302a" strokeWidth="8"/>
    <path d="M99 75 53 56 91 117 M201 75l50-21-39 66" fill="#80ad69" stroke="#27302a" strokeWidth="7"/>
    <path d="M111 51q38-53 93 0" stroke="#e9a84e" strokeWidth="14" strokeLinecap="round"/>
    <circle cx="124" cy="116" r="20" fill="#fff9dc" stroke="#27302a" strokeWidth="5"/><circle cx="177" cy="116" r="20" fill="#fff9dc" stroke="#27302a" strokeWidth="5"/>
    <circle cx="133" cy="116" r="7" fill="#253525"/><circle cx="168" cy="116" r="7" fill="#253525"/>
    <path d="M128 162q26 26 48-2" stroke="#27302a" strokeWidth="6" fill="none" strokeLinecap="round"/><path d="m146 169 7 12 10-12" fill="#fff" stroke="#27302a" strokeWidth="2"/>
  </svg>
}
