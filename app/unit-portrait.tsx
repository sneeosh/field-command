import type { Kind, Side } from "../lib/game-content";

// Standing figures for unit cards, drawn in the same style as the battlefield
// sprites. Colours come from CSS custom properties on `.unit-portrait` so each
// faction and theater reuses one drawing per troop type.
const MAIL=new Set(["principes","triarii","equites"]);
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

/* ---- Greece ---- */
function Greaves(){
  return <><path d="M33 86 L30 110 L36 110 L38 87 Z M43 87 L46 110 L52 110 L48 86 Z" fill={SKIN}/>
    <path d="M30.6 94 h6.6 v14 h-6.6 z M44.6 94 h6.6 v14 h-6.6 z" style={v("helm")} stroke="#0004" strokeWidth=".6"/>
    <path d="M28 109 h9 v5 h-10 z M45 109 h9 v5 h-9 z" fill={LEATHER}/></>;
}
function Linothorax(){
  return <>
    <path d="M25 84 L55 84 L55 91 L25 91 Z" style={v("tunic")}/>
    <path d="M26 78 L54 78 L55 88 L25 88 Z" style={v("linen")}/>
    <path d="M29 78 V88 M32.5 78 V88 M36 78 V88 M39.5 78 V88 M43 78 V88 M46.5 78 V88 M50 78 V88" stroke="#0003" strokeWidth=".8"/>
    <path d="M28 51 L52 51 L54 79 L26 79 Z" style={v("linen")}/>
    <path d="M27 66 H53" style={{stroke:"var(--pt-tunic)"}} strokeWidth="2"/>
    <path d="M30 51 L34 46 M50 51 L46 46" style={{stroke:"var(--pt-linen)"}} strokeWidth="4"/>
  </>;
}
function CorinthianHelm(){
  return <>
    <path d="M30 34 Q40 10 53 30 Q42 22 30 34 Z" style={v("crest")}/>
    <path d="M31 44 Q30 30 40 29 Q50 30 50 44 L49 52 L44.5 52 L44.5 45 L41.5 45 L41.5 52 L33 52 Z" style={v("helm")} stroke="#0005" strokeWidth=".8"/>
    <path d="M38.5 40.5 H48.5" stroke="#1a1209" strokeWidth="1.8"/>
  </>;
}
function Aspis({cx,cy,r}:{cx:number;cy:number;r:number}){
  const k=r/20;
  return <g transform={`translate(${cx} ${cy}) scale(${k})`}>
    <circle r="20" style={{...v("shield"),stroke:"var(--pt-trim)"}} strokeWidth="2.2"/>
    <circle r="16.5" fill="none" style={{stroke:"var(--pt-trim)"}} strokeWidth=".8"/>
    <path d="M0 -12 L2.6 -3.6 L11.4 -3.7 L4.2 1.4 L7 9.8 L0 4.6 L-7 9.8 L-4.2 1.4 L-11.4 -3.7 L-2.6 -3.6 Z" style={v("trim")}/>
  </g>;
}
function Hoplite({couched}:{couched:boolean}){
  return <>
    {couched?<><path d="M48 112 L74 12" stroke={WOOD} strokeWidth="1.8"/><path d="M72.4 16 L75.4 4 L76 16.6 Z" fill={IRON}/></>
      :<><path d="M61 116 L61 4" stroke={WOOD} strokeWidth="1.8"/><path d="M58.8 10 L61 -1 L63.2 10 Z" fill={IRON}/></>}
    <Greaves/><Linothorax/>
    <path d="M52 55 L61 60 L60 64 L50 60 Z" fill={SKIN}/>
    <CorinthianHelm/>
    <Aspis cx={23} cy={67} r={21}/>
  </>;
}
function Phalangite(){
  return <>
    <path d="M40 118 L80 -12" stroke={WOOD} strokeWidth="1.8"/>
    <Greaves/><Linothorax/>
    <path d="M50 56 L60 66 L57 69 L48 61 Z M30 58 L52 78 L50 81 L28 62 Z" fill={SKIN}/>
    <circle cx="40" cy="42" r="8" fill={SKIN}/><circle cx="44.5" cy="41.5" r=".9" fill="#2b2015"/>
    <path d="M31 42 Q30 28 40 28 Q50 26 55 34 L51 36 Q49 32 46 32 L48 40 L31 42 Z" style={v("helm")} stroke="#0005" strokeWidth=".8"/>
    <rect x="44" y="40" width="4" height="9" rx="1" style={v("helm")}/>
    <path d="M40 28 Q36 18 42 14" fill="none" strokeWidth="3" style={{stroke:"var(--pt-crest)"}}/>
    <g transform="translate(29 66) scale(.6)"><Aspis cx={0} cy={0} r={20}/></g>
  </>;
}
function Peltast(){
  return <>
    <path d="M52 112 L70 14 M55 112 L73 16" stroke={WOOD} strokeWidth="1.2"/>
    <path d="M68.8 18 L70.6 10 L71.6 18.4 Z M71.8 20 L73.6 12 L74.6 20.4 Z" fill={IRON}/>
    <path d="M34 82 L30 110 L36 110 L39 83 Z M42 83 L46 110 L52 110 L47 82 Z" fill={SKIN}/>
    <path d="M29.5 98 h7.5 v16 h-8.5 z M44.5 98 h7.5 v16 h-7.5 z" fill={LEATHER}/>
    <path d="M30 52 L50 52 L54 86 L26 86 Z" style={v("light")}/>
    <path d="M26 86 L54 86" stroke="#0004" strokeWidth="2"/>
    <path d="M50 55 L58 62 L56 66 L48 60 Z" fill={SKIN}/>
    <circle cx="40" cy="43" r="8" fill={SKIN}/><circle cx="44.5" cy="42.5" r=".9" fill="#2b2015"/>
    <path d="M31 45 Q30 28 40 27 Q50 27 50 38 L53 50 L47.5 50 L47 41 Q46 35 40 35 Q34 36 33.5 45 Z" style={v("hood")} stroke="#0006" strokeWidth=".8"/>
    <path d="M42 27.5 Q51 21 55 27" fill="none" strokeWidth="3.4" strokeLinecap="round" style={{stroke:"var(--pt-hood)"}}/>
    <path d="M7 54 Q14 61 22 56 Q30 61 37 54 Q35 77 22 91 Q9 77 7 54 Z" style={{...v("shield"),stroke:"var(--pt-trim)"}} strokeWidth="1.5"/>
    <circle cx="22" cy="70" r="3" style={v("trim")}/>
  </>;
}
function Horse(){
  return <>
    <path d="M33 66 Q18 74 22 98" fill="none" strokeWidth="5" strokeLinecap="round" style={{stroke:"var(--pt-horse)"}}/>
    <path d="M40 74 L34 112 M48 76 L46 112 M74 76 L78 112 M84 72 L92 110" strokeWidth="5" strokeLinecap="round" style={{stroke:"var(--pt-horse)"}}/>
    <ellipse cx="60" cy="66" rx="30" ry="14" style={v("horse")}/>
    <path d="M80 60 L92 32 L102 37 L94 70 Z M92 32 L109 41 L106 49 L96 46 Z M93 30 L94 24 L97 31 Z" style={v("horse")}/>
    <path d="M90 34 L80 58" stroke="#0007" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="102" cy="40" r="1" fill="#0d0a07"/>
  </>;
}
function Companion(){
  return <>
    <Horse/>
    <path d="M44 52 L76 52 L74 70 L48 70 Z" style={v("tunic")}/>
    <path d="M55 26 Q38 34 36 58 L50 56 Q50 40 57 31 Z" style={v("tunic")}/>
    <path d="M58 52 L56 80 L62 82 L64 54 Z" fill={SKIN}/>
    <path d="M54 52 h4 v6 h-4 z M60 52 h4 v6 h-4 z M66 52 h4 v6 h-4 z" style={v("linen")}/>
    <path d="M54 24 L68 24 L70 52 L52 52 Z" style={v("linen")}/>
    <path d="M53 38 H69.4" style={{stroke:"var(--pt-tunic)"}} strokeWidth="2"/>
    <path d="M68 28 L80 34 L78 38 L67 33 Z" fill={SKIN}/>
    <path d="M40 98 L104 2" stroke={WOOD} strokeWidth="1.6"/><path d="M102 7 L106 -1 L105.4 8 Z" fill={IRON}/>
    <circle cx="61" cy="17" r="6.5" fill={SKIN}/><circle cx="64.5" cy="17" r=".8" fill="#2b2015"/>
    <path d="M54 15 Q54 6 61 6 Q68 6 68 15 Z" style={v("helm")} stroke="#0005" strokeWidth=".8"/>
    <ellipse cx="61" cy="15.5" rx="10.5" ry="2.4" style={v("helm")} stroke="#0005" strokeWidth=".6"/>
  </>;
}

/* ---- Japan ---- */
function Sashimono({x=30,y=6}:{x?:number;y?:number}){
  return <>
    <path d={`M${x} ${y} L${x} ${y+86}`} stroke={WOOD} strokeWidth="1.4"/>
    <rect x={x} y={y} width="14" height="26" style={{...v("shield"),stroke:"var(--pt-trim)"}} strokeWidth=".8"/>
    <circle cx={x+7} cy={y+13} r="4.5" fill="none" style={{stroke:"var(--pt-trim)"}} strokeWidth="1.5"/>
  </>;
}
function JpLegs(){
  return <>
    <path d="M33 86 L30 110 L37 110 L39 87 Z M43 87 L45 110 L52 110 L48 86 Z" fill="#3a3230"/>
    <path d="M30.6 96 h6.4 v12 h-6.4 z M44.8 96 h6.4 v12 h-6.4 z" style={v("lacquer")} stroke="#0006" strokeWidth=".5"/>
    <path d="M28 109 h9 v4 h-10 z M45 109 h9 v4 h-9 z" fill="#c9b48a"/>
  </>;
}
function Do({sode=true}:{sode?:boolean}){
  return <>
    <path d="M25 76 L55 76 L57 91 L23 91 Z" style={v("lacquer")}/>
    <path d="M31.5 76 V91 M40 76 V91 M48.5 76 V91" stroke="#0007" strokeWidth=".8"/>
    <path d="M24.4 82 H55.6 M23.8 87 H56.2" style={{stroke:"var(--pt-tunic)"}} strokeWidth="1.4"/>
    <path d="M28 50 L52 50 L53 77 L27 77 Z" style={v("lacquer")}/>
    <path d="M27.5 57 H52.5 M27.3 63 H52.7 M27.1 69 H52.9" style={{stroke:"var(--pt-tunic)"}} strokeWidth="1.6"/>
    {sode&&<><rect x="47" y="49" width="10" height="14" rx="1" style={v("lacquer")}/><path d="M47 53.5 H57 M47 58 H57" style={{stroke:"var(--pt-tunic)"}} strokeWidth="1.2"/></>}
  </>;
}
function Jingasa(){
  return <>
    <circle cx="40" cy="44" r="7.5" fill={SKIN}/><circle cx="44" cy="44" r=".9" fill="#2b2015"/>
    <path d="M25 40 L40 27 L55 40 Z" style={v("hat")} stroke="#0006" strokeWidth=".8"/>
    <circle cx="40" cy="35" r="2.3" style={v("trim")}/>
  </>;
}
function Kabuto(){
  return <>
    <circle cx="40" cy="43" r="7.5" fill={SKIN}/>
    <path d="M37 45 H48 L46.5 52 L39 52 Z" fill="#6b150f"/>
    <circle cx="44" cy="42" r=".9" fill="#2b2015"/>
    <path d="M29.5 38 L38 38 L36 51 L24.5 48.5 Z" style={v("lacquer")} stroke="#0006" strokeWidth=".6"/>
    <path d="M27 43.5 H37 M26 47 H36.4" style={{stroke:"var(--pt-tunic)"}} strokeWidth="1.2"/>
    <path d="M31 40 Q31 28 40 28 Q49 28 49 40 Z" style={v("lacquer")} stroke="#0006" strokeWidth=".8"/>
    <path d="M36 31 Q28 18 33 9 M44 31 Q52 18 47 9" fill="none" strokeWidth="2" strokeLinecap="round" style={{stroke:"var(--pt-trim)"}}/>
    <circle cx="40" cy="31" r="1.8" style={v("trim")}/>
  </>;
}
function Ashigaru({bow}:{bow:boolean}){
  return <>
    <Sashimono/>
    {bow?<><path d="M66 2 Q82 46 62 118" fill="none" stroke={WOOD} strokeWidth="2"/><path d="M66 2 L62 118" stroke="#e9dfc4" strokeWidth=".6"/>
      <rect x="49" y="52" width="6" height="20" style={v("lacquer")}/><path d="M50 52 L49 44 M52 52 L52 43 M54 52 L55 44" stroke="#e9dfc4" strokeWidth=".8"/></>
      :<><path d="M61 116 L61 4" stroke={WOOD} strokeWidth="1.8"/><path d="M59.4 13 L61 -2 L62.6 13 Z" fill={IRON}/></>}
    <JpLegs/><Do sode={false}/>
    <path d="M52 55 L61 60 L60 64 L50 60 Z" fill={SKIN}/>
    <Jingasa/>
  </>;
}
function Samurai(){
  return <>
    <Sashimono/>
    <JpLegs/><Do/>
    <path d="M52 58 L59 64 L57 67 L50 62 Z" fill={SKIN}/>
    <path d="M58 64 Q68 46 77 22" fill="none" stroke={IRON} strokeWidth="2.4" strokeLinecap="round"/>
    <path d="M54.5 67.5 L58 64" stroke="#1a1209" strokeWidth="2.4"/>
    <ellipse cx="58.6" cy="63.6" rx="2.6" ry="1.2" transform="rotate(-60 58.6 63.6)" fill="#1a1209"/>
    <Kabuto/>
  </>;
}
function Monk(){
  return <>
    <path d="M44 116 L68 12" stroke={WOOD} strokeWidth="1.8"/>
    <path d="M67.5 14 Q76 4 71 -6 L64.6 13 Z" fill={IRON}/>
    <path d="M33 86 L30 110 L37 110 L39 87 Z M43 87 L45 110 L52 110 L48 86 Z" fill="#ece4d2"/>
    <path d="M28 109 h9 v4 h-10 z M45 109 h9 v4 h-9 z" fill="#c9b48a"/>
    <path d="M27 50 L53 50 L58 94 L22 94 Z" style={v("robe")}/>
    <path d="M30 51 L52 86" style={{stroke:"var(--pt-tunic)"}} strokeWidth="4"/>
    <path d="M52 55 L62 58 L61 62 L51 60 Z" fill={SKIN}/>
    <path d="M29 48 Q28 28 40 27 Q52 28 51 48 L49 58 L31 58 Z" fill="#ece4d2" stroke="#0003" strokeWidth=".8"/>
    <path d="M37 38 H49 V45 H37 Z" fill={SKIN}/>
    <circle cx="44.5" cy="41" r=".9" fill="#2b2015"/>
  </>;
}
function MountedSamurai(){
  return <>
    <Horse/>
    <path d="M44 52 L76 52 L74 70 L48 70 Z" style={{...v("lacquer"),stroke:"var(--pt-tunic)"}} strokeWidth="1"/>
    <path d="M57 50 L55 -2" stroke={WOOD} strokeWidth="1.2"/>
    <rect x="42" y="-2" width="13" height="22" style={{...v("shield"),stroke:"var(--pt-trim)"}} strokeWidth=".8"/>
    <circle cx="48.5" cy="9" r="4" fill="none" style={{stroke:"var(--pt-trim)"}} strokeWidth="1.4"/>
    <path d="M58 52 L56 80 L62 82 L64 54 Z" fill="#3a3230"/>
    <path d="M54 24 L68 24 L70 52 L52 52 Z" style={v("lacquer")}/>
    <path d="M53 32 H69 M52.6 39 H69.4 M52.3 46 H69.7" style={{stroke:"var(--pt-tunic)"}} strokeWidth="1.4"/>
    <path d="M68 28 L80 34 L78 38 L67 33 Z" fill={SKIN}/>
    <path d="M40 98 L102 4" stroke={WOOD} strokeWidth="1.6"/><path d="M100.4 9 L104.5 1 L103.6 10.4 Z" fill={IRON}/>
    <circle cx="61" cy="17" r="6.2" fill={SKIN}/>
    <path d="M58 19 H67 L66 24 L59 24 Z" fill="#6b150f"/>
    <path d="M53 14 L59 14 L57.4 24 L49.5 22 Z" style={v("lacquer")}/>
    <path d="M54 16 Q54 6 61 6 Q68 6 68 16 Z" style={v("lacquer")} stroke="#0006" strokeWidth=".8"/>
    <path d="M58 8 Q52 0 55 -6 M64 8 Q70 0 67 -6" fill="none" strokeWidth="1.8" strokeLinecap="round" style={{stroke:"var(--pt-trim)"}}/>
  </>;
}

const LOOK:Record<string,()=>React.JSX.Element>={
  pezhetairoi:()=><Phalangite/>,hypaspists:()=><Hoplite couched/>,hoplites:()=><Hoplite couched={false}/>,
  peltasts:()=><Peltast/>,companions:()=><Companion/>,
  "yari-ashigaru":()=><Ashigaru bow={false}/>,"yumi-ashigaru":()=><Ashigaru bow/>,"katana-samurai":()=><Samurai/>,
  "warrior-monks":()=><Monk/>,"mounted-samurai":()=><MountedSamurai/>,
};

export function UnitPortrait({kind,unitKey,side="rome"}:{kind:Kind;unitKey:string;side?:Side}){
  const cav=kind==="Cavalry";
  // Cropped to head and shoulders so the figure reads at card size.
  const box=cav?"28 0 88 114":"6 4 68 88";
  return <span className={`unit-portrait ${side} ${kind.toLowerCase()}`} aria-hidden="true">
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" focusable="false">
      {LOOK[unitKey]?LOOK[unitKey]():kind==="Cavalry"?<Horseman/>:kind==="Archers"?<Skirmisher/>:kind==="Spears"?<Spearman round={side!=="rome"}/>:<Swordsman mail={MAIL.has(unitKey)} round={false}/>}
    </svg>
  </span>;
}
