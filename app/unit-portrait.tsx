import type { Kind, Side } from "../lib/game-content";

// Standing figures for unit cards, drawn in the same style as the battlefield
// sprites. Colours come from CSS custom properties on `.unit-portrait` so each
// faction and theater reuses one drawing per troop type.
const MAIL=new Set(["principes","triarii","equites","hypaspists","companions","katana-samurai","mounted-samurai"]);
const v=(name:string)=>({fill:`var(--pt-${name})`});
const SKIN="#c8a07a",LEATHER="#4a3016",WOOD="#6b4a2a",IRON="#cfccc2";

function Legs(){
  return <><path d="M33 86 L30 110 L36 110 L38 87 Z M43 87 L46 110 L52 110 L48 86 Z" fill={SKIN}/><path d="M28 109 h9 v5 h-10 z M45 109 h9 v5 h-9 z" fill={LEATHER}/></>;
}
function Torso({mail}:{mail:boolean}){
  return mail?<>
    <path d="M24 82 L56 82 L56 89 L24 89 Z" style={v("tunic")}/>
    <path d="M28 52 L52 52 L56 84 L24 84 Z" style={v("mail")}/>
    <path d="M27 58 H53 M26.4 63 H53.6 M26 68 H54 M25.5 73 H54.5 M25 78 H55" stroke="#0004" strokeWidth=".8"/>
    <rect x="27" y="72" width="27" height="3" fill={LEATHER}/>
  </>:<>
    <path d="M28 52 L52 52 L56 89 L24 89 Z" style={v("tunic")}/>
    <rect x="34" y="56" width="12" height="11" style={v("helm")} stroke="#0005"/>
    <circle cx="40" cy="61.5" r="2.2" style={v("trim")}/>
    <rect x="27" y="72" width="27" height="3" fill={LEATHER}/>
  </>;
}
function Head({crest}:{crest:"plume"|"ridge"|"none"}){
  return <>
    <circle cx="40" cy="42" r="8" fill={SKIN}/>
    <circle cx="44.5" cy="41.5" r=".9" fill="#2b2015"/>
    <path d="M31 41 Q31 29 40 29 Q49 29 49 41 Z" style={v("helm")} stroke="#0005" strokeWidth=".8"/>
    <path d="M29.5 41 H50.5" stroke="#0005" strokeWidth="1.6"/>
    <rect x="44" y="40" width="4" height="9" rx="1" style={v("helm")}/>
    {crest==="plume"&&<path d="M38.5 27 L35 11 M40 27 L40 9 M41.5 27 L45 11" strokeWidth="2.2" strokeLinecap="round" style={{stroke:"var(--pt-crest)"}}/>}
    {crest==="ridge"&&<path d="M32 30 Q40 16 48 30" fill="none" strokeWidth="4" style={{stroke:"var(--pt-crest)"}}/>}
  </>;
}
function Scutum(){
  return <>
    <rect x="11" y="48" width="25" height="47" rx="6" style={{...v("shield"),stroke:"var(--pt-trim)"}} strokeWidth="1.5"/>
    <path d="M23.5 51 V92" style={{stroke:"var(--pt-trim)"}} strokeWidth="1"/>
    <ellipse cx="23.5" cy="71.5" rx="4" ry="5" style={v("helm")} stroke="#0005" strokeWidth=".8"/>
  </>;
}
function RoundShield({cx,cy,r}:{cx:number;cy:number;r:number}){
  return <>
    <circle cx={cx} cy={cy} r={r} style={{...v("shield"),stroke:"var(--pt-trim)"}} strokeWidth="1.5"/>
    <circle cx={cx} cy={cy} r={r*.7} fill="none" style={{stroke:"var(--pt-trim)"}} strokeWidth=".8"/>
    <circle cx={cx} cy={cy} r={r*.28} style={v("helm")}/>
  </>;
}

function Swordsman({mail,round}:{mail:boolean;round:boolean}){
  return <>
    {!mail&&<><path d="M58 116 L64 10" stroke={WOOD} strokeWidth="1.6"/><path d="M63.6 8 L64.8 1 L66 8 Z" fill={IRON}/></>}
    <Legs/><Torso mail={mail}/>
    <path d="M52 55 L60 64 L58 67 L50 60 Z" fill={SKIN}/>
    {mail&&<path d="M58 64 L74 48" stroke={IRON} strokeWidth="2.2" strokeLinecap="round"/>}
    <Head crest={mail?"ridge":"plume"}/>
    {round?<RoundShield cx={24} cy={70} r={15}/>:<Scutum/>}
  </>;
}
function Spearman({round}:{round:boolean}){
  return <>
    <path d="M61 116 L61 4" stroke={WOOD} strokeWidth="1.8"/><path d="M58.8 10 L61 -1 L63.2 10 Z" fill={IRON}/>
    <Legs/><Torso mail/>
    <path d="M52 55 L61 60 L60 64 L50 60 Z" fill={SKIN}/>
    <Head crest="plume"/>
    {round?<RoundShield cx={24} cy={70} r={16}/>:<Scutum/>}
  </>;
}
function Skirmisher(){
  return <>
    <path d="M52 112 L70 14 M55 112 L73 16 M58 112 L76 18" stroke={WOOD} strokeWidth="1.2"/>
    <path d="M34 82 L30 110 L36 110 L39 83 Z M42 83 L46 110 L52 110 L47 82 Z" fill={SKIN}/>
    <path d="M29 109 h8 v5 h-9 z M45 109 h8 v5 h-8 z" fill={LEATHER}/>
    <path d="M30 52 L50 52 L54 85 L26 85 Z" style={v("light")}/>
    <rect x="29" y="70" width="23" height="3" fill={LEATHER}/>
    <path d="M50 55 L58 62 L56 66 L48 60 Z" fill={SKIN}/>
    <circle cx="40" cy="43" r="8" fill={SKIN}/>
    <circle cx="44.5" cy="42.5" r=".9" fill="#2b2015"/>
    <path d="M30 44 Q29 28 40 27 Q51 27 51 38 L55 44 L48 42 Q47 34 40 34 Q33 35 33 44 L31 62 L26 60 Z" style={v("hood")} stroke="#0006" strokeWidth=".8"/>
    <path d="M36 28 L35 22 L39 27 Z M44 28 L46 22 L47 29 Z" style={v("hood")}/>
    <RoundShield cx={22} cy={68} r={14}/>
  </>;
}
function Horseman(){
  return <>
    <path d="M33 66 Q18 74 22 98" fill="none" strokeWidth="5" strokeLinecap="round" style={{stroke:"var(--pt-horse)"}}/>
    <path d="M40 74 L34 112 M48 76 L46 112 M74 76 L78 112 M84 72 L92 110" strokeWidth="5" strokeLinecap="round" style={{stroke:"var(--pt-horse)"}}/>
    <ellipse cx="60" cy="66" rx="30" ry="14" style={v("horse")}/>
    <path d="M80 60 L92 32 L102 37 L94 70 Z M92 32 L109 41 L106 49 L96 46 Z M93 30 L94 24 L97 31 Z" style={v("horse")}/>
    <path d="M90 34 L80 58" stroke="#0007" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="102" cy="40" r="1" fill="#0d0a07"/>
    <path d="M46 52 L76 52 L74 70 L48 70 Z" style={{...v("tunic"),stroke:"var(--pt-trim)"}} strokeWidth="1"/>
    <path d="M58 52 L56 80 L62 82 L64 54 Z" fill={SKIN}/>
    <path d="M54 24 L68 24 L70 54 L52 54 Z" style={v("mail")}/>
    <path d="M53 32 H69 M52.6 38 H69.4 M52.3 44 H69.7 M52 50 H70" stroke="#0004" strokeWidth=".8"/>
    <path d="M40 98 L102 4" stroke={WOOD} strokeWidth="1.6"/><path d="M100 9 L104.5 1 L103.4 10 Z" fill={IRON}/>
    <circle cx="61" cy="17" r="6.5" fill={SKIN}/>
    <path d="M54 17 Q54 7 61 7 Q68 7 68 17 L71 19 L52 19 Z" style={v("helm")} stroke="#0005" strokeWidth=".8"/>
    <path d="M56 8 Q61 0 68 6" fill="none" strokeWidth="3" style={{stroke:"var(--pt-crest)"}}/>
    <RoundShield cx={50} cy={42} r={11}/>
  </>;
}

export function UnitPortrait({kind,unitKey,side="rome"}:{kind:Kind;unitKey:string;side?:Side}){
  const cav=kind==="Cavalry";
  // Cropped to head and shoulders so the figure reads at card size.
  const box=cav?"28 0 88 114":"6 4 68 88";
  return <span className={`unit-portrait ${side} ${kind.toLowerCase()}`} aria-hidden="true">
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" focusable="false">
      {kind==="Cavalry"?<Horseman/>:kind==="Archers"?<Skirmisher/>:kind==="Spears"?<Spearman round={side!=="rome"}/>:<Swordsman mail={MAIL.has(unitKey)} round={false}/>}
    </svg>
  </span>;
}
