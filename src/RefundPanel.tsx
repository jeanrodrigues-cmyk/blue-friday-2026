import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import "./RefundPanel.css";
import { supabase } from "./lib/supabase";

type Row = { date:string; team:string; quantity:number; amount:number };
const KEY="bf2026_refund_pef_daily_v2";
const VERIFIED_SNAPSHOT:Row[]=[{"date":"2026-11-03","team":"Graduação + LLL PEF (ME não incluído)","quantity":35,"amount":7549.12},{"date":"2026-11-04","team":"Graduação + LLL PEF (ME não incluído)","quantity":27,"amount":5187.66},{"date":"2026-11-05","team":"Graduação + LLL PEF (ME não incluído)","quantity":29,"amount":5739.32},{"date":"2026-11-06","team":"Graduação + LLL PEF (ME não incluído)","quantity":38,"amount":9530.79},{"date":"2026-11-07","team":"Graduação + LLL PEF (ME não incluído)","quantity":0,"amount":0},{"date":"2026-11-08","team":"Graduação + LLL PEF (ME não incluído)","quantity":0,"amount":0}];

type BacklogDaily={date:string;openOver7:number;resolvedOver7:number};
type ConversionDaily={date:string;analyst:string;vouchers:number;cancelled:number;amount:number};
type WeeklyConversionRank={analyst:string;conversions:number;vouchers:number;cancelled:number;amount:number};
const VERIFIED_WEEK_ONE_CONVERSIONS:WeeklyConversionRank[]=[
 {analyst:"Naiara",conversions:12,vouchers:9,cancelled:3,amount:2238.41},
 {analyst:"Carla",conversions:10,vouchers:2,cancelled:8,amount:1112.38},
 {analyst:"Alice",conversions:8,vouchers:4,cancelled:4,amount:1418.91}
];
// Fonte: ranking de conversoes fornecido pela operacao, periodo 02 a 08/11/2026.
// Nao representa taxa de conversao nem comprova elegibilidade ao premio.
const HUB_CONVERSIONS_LAST_WEEK:ConversionDaily[]=[
{date:"2026-11-04",analyst:"Alice Faria",vouchers:2,cancelled:1,amount:758.41},
{date:"2026-11-04",analyst:"Carla Diléo",vouchers:1,cancelled:0,amount:39.92},
{date:"2026-11-05",analyst:"Alice Faria",vouchers:2,cancelled:2,amount:508.60},
{date:"2026-11-05",analyst:"Carla Diléo",vouchers:0,cancelled:4,amount:662.96},
{date:"2026-11-06",analyst:"Alice Faria",vouchers:0,cancelled:1,amount:151.90},
{date:"2026-11-06",analyst:"Carla Diléo",vouchers:1,cancelled:4,amount:409.50}
];
// Espelho reconciliado da tabela bf_refund_pef_daily no Supabase, 09-15/11.
// Fallback de leitura quando a sessao/RLS nao retorna as linhas. Nao duplica os dados ao conectar.
const WEEK_TWO_PEF_VERIFIED:Row[]=[
 {date:"2026-11-09",team:"Consolidado operacional",quantity:34,amount:7572.65},
 {date:"2026-11-10",team:"Consolidado operacional",quantity:63,amount:19174.15},
 {date:"2026-11-11",team:"Consolidado operacional",quantity:35,amount:8926.22},
 {date:"2026-11-12",team:"Consolidado operacional",quantity:39,amount:6465.40},
 {date:"2026-11-13",team:"Consolidado operacional",quantity:34,amount:6619.99},
 {date:"2026-11-14",team:"Consolidado operacional",quantity:0,amount:0},
 {date:"2026-11-15",team:"Consolidado operacional",quantity:1,amount:61}
];
const WEEK_ONE_DAILY:Row[]=[{date:"2026-11-04",team:"Graduação + LLL PEF",quantity:27,amount:5187.66},{date:"2026-11-05",team:"Graduação + LLL PEF",quantity:29,amount:5739.32},{date:"2026-11-06",team:"Graduação + LLL PEF",quantity:38,amount:9530.79},{date:"2026-11-07",team:"Graduação + LLL PEF",quantity:0,amount:0},{date:"2026-11-08",team:"Graduação + LLL PEF",quantity:0,amount:0}];
const weeks=[{name:"Semana 1",range:"04 a 08/11",start:4,end:8,cap:31689},{name:"Semana 2",range:"09 a 15/11",start:9,end:15,cap:48796},{name:"Semana 3",range:"16 a 22/11",start:16,end:22,cap:43633},{name:"Semana 4",range:"23 a 27/11",start:23,end:27,cap:45257}];
const daily=[["Segunda",8513],["Terça",8593],["Quarta",8990],["Quinta",10397],["Sexta",8763],["Sábado",2119],["Domingo",1420],["Feriado",3600]] as const;
// Fonte: BF2026_reembolso_02a08nov_por_produto.xlsx, Databricks, carga 13/11/2026.
// Fechamento financeiro PEF informado pela operação para a semana 1.
const VERIFIED_WEEK_ONE_FINANCIAL={revenue:0,refunds:0,refunded:45719.59,cap:53168,missingProduct:"Receita e quantidade de casos não informadas no fechamento"};
const VERIFIED_WEEK_ONE_BACKLOG={date:"2026-11-08",openOver7:43};
const VERIFIED_WEEK_TWO_BACKLOG:BacklogDaily[]=[
{date:"2026-11-09",openOver7:83,resolvedOver7:2},
{date:"2026-11-10",openOver7:73,resolvedOver7:12},
{date:"2026-11-11",openOver7:71,resolvedOver7:3},
{date:"2026-11-12",openOver7:70,resolvedOver7:3},
{date:"2026-11-13",openOver7:66,resolvedOver7:4},
{date:"2026-11-14",openOver7:67,resolvedOver7:0},
{date:"2026-11-15",openOver7:2,resolvedOver7:0}
];
// Fechamento operacional informado em 16/11: 2 casos acima de 7 dias em 15/11.
// Extracao historica Databricks apontava 68 com escopo distinto; nao apagar essa divergencia da auditoria.

const VERIFIED_WEEK_ONE_PROCESSING=[{analyst:"Alice",completed:143}];
// Semana 2: Power BI QB (09-13/11) e contagens ME fornecidas pela operacao.
const WEEK_TWO_PROCESSING=[
 {analyst:"Carla Diléo",qb:215,me:45,tmr:3.40,general:92.56,tenDays:92.56,eightDays:91.16},
 {analyst:"Alice Faria",qb:179,me:25,tmr:3.61,general:94.41,tenDays:94.97,eightDays:93.30}
] as const;
const WEEK_TWO_PROCESSING_TOTAL=WEEK_TWO_PROCESSING.reduce((sum,row)=>sum+row.qb+row.me,0);
// Conversoes da Semana 2 (09 a 15/11): Naiara confirmada pela operacao em 16/11.
const WEEK_TWO_CONVERSIONS_CONFIRMED:WeeklyConversionRank[]=[
 {analyst:"Alice",conversions:10,vouchers:7,cancelled:3,amount:2120.83},
 {analyst:"Carla",conversions:6,vouchers:3,cancelled:3,amount:864.20},
 {analyst:"Naiara",conversions:16,vouchers:14,cancelled:2,amount:3885.69}
];
// Solicitacoes abertas no Databricks (data de abertura, nao data de processamento), 09 a 15/11.
const WEEK_TWO_OPENED=[{day:"09/11",count:96},{day:"10/11",count:91},{day:"11/11",count:65},{day:"12/11",count:78},{day:"13/11",count:47},{day:"14/11",count:19},{day:"15/11",count:14}] as const;
const WEEK_TWO_OPENED_TOTAL=WEEK_TWO_OPENED.reduce((sum,d)=>sum+d.count,0);
const WEEK_TWO_CONVERSION_RATE=WEEK_TWO_CONVERSIONS_CONFIRMED.reduce((sum,r)=>sum+r.conversions,0)/WEEK_TWO_OPENED_TOTAL*100;
const OFFICIAL_CAMPAIGN_CAP=169374;
const money=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
const number=(n:number)=>new Intl.NumberFormat("pt-BR").format(n);
const pct=(n:number)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1,minimumFractionDigits:1}).format(n)+"%";
function csvFields(line:string,delimiter:string){const fields:string[]=[];let part="",quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){part+='"';i++;}else quoted=!quoted;}else if(ch===delimiter&&!quoted){fields.push(part.trim());part="";}else part+=ch;}if(quoted)throw Error("Aspas não fechadas no CSV.");fields.push(part.trim());return fields;}
function numeric(raw:string){let v=raw.replace(/R\$|\s/g,"");if(v.includes(",")&&v.includes("."))v=v.lastIndexOf(",")>v.lastIndexOf(".")?v.replace(/\./g,"").replace(",","."):v.replace(/,/g,"");else if(v.includes(","))v=v.replace(",",".");const n=Number(v);if(!v||!Number.isFinite(n)||n<0)throw Error("Número inválido: "+raw);return n;}
function readCsv(raw:string):Row[]{const lines=raw.replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean);if(lines.length<2)throw Error("O arquivo precisa conter cabeçalho e dados.");const delimiter=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?";":",";const headers=csvFields(lines[0],delimiter).map(x=>x.toLowerCase().replace(/^"|"$/g,"").trim());const index=(key:string)=>{const i=headers.indexOf(key);if(i<0)throw Error("Coluna obrigatória ausente: "+key);return i;};const di=index("date"),ti=index("team"),qi=index("quantidade"),ai=index("valor_reembolsado");const result=new Map<string,Row>();for(const [i,line] of lines.slice(1).entries()){const cols=csvFields(line,delimiter);let date=cols[di]?.trim()||"";if(/^\d{2}\/\d{2}\/\d{4}$/.test(date)){const [d,m,y]=date.split("/");date=y+"-"+m+"-"+d;}date=date.slice(0,10);if(!/^2026-11-\d{2}$/.test(date)||Number(date.slice(8))<1||Number(date.slice(8))>30)throw Error("Linha "+(i+2)+": data fora de novembro de 2026.");const rawTeam=(cols[ti]||"").trim();const team=!rawTeam||rawTeam.toLowerCase()==="null"?"Sem equipe":rawTeam;const quantity=numeric(cols[qi]||"");const amount=numeric(cols[ai]||"");if(!Number.isSafeInteger(quantity))throw Error("Linha "+(i+2)+": quantidade deve ser inteira.");const key=date+"|"+team.toLowerCase();if(result.has(key))throw Error("Data e equipe duplicadas na linha "+(i+2)+".");result.set(key,{date,team,quantity,amount});}return [...result.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.team.localeCompare(b.team));}
function stored():Row[]{try{const parsed=JSON.parse(localStorage.getItem(KEY)||JSON.stringify(VERIFIED_SNAPSHOT));return Array.isArray(parsed)?parsed.filter((r:Row)=>r&&/^2026-11-\d{2}$/.test(r.date)&&typeof r.amount==="number"&&typeof r.quantity==="number"&&typeof r.team==="string"):[];}catch{return [];}}
function RefundIcon({name,size=20}:{name:"wallet"|"target"|"calendar"|"chart"|"upload"|"refresh"|"filter"|"shield";size?:number}){const p:Record<string,React.ReactNode>={wallet:<><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 10h18M16 15h2"/></>,target:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/></>,calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,chart:<><path d="M3 20h18M6 17v-5m6 5V7m6 10V4"/></>,upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4"/></>,refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 14-2M19 15a8 8 0 0 1-14 2"/></>,filter:<><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="9" cy="7" r="2" fill="white"/><circle cx="15" cy="12" r="2" fill="white"/></>,shield:<><path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z"/><path d="m8 12 3 3 5-6"/></>};return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>;}
export default function RefundPanel(){
 const [rows,setRows]=useState<Row[]>(stored);
 const [backlogRows,setBacklogRows]=useState<BacklogDaily[]>([]);
 const [backlogState,setBacklogState]=useState<"loading"|"ready"|"unavailable">("loading");
 const [conversionRows,setConversionRows]=useState<ConversionDaily[]>(HUB_CONVERSIONS_LAST_WEEK);
 const [conversionSource,setConversionSource]=useState<"snapshot"|"shared">("snapshot");
 const [fileName,setFileName]=useState("");
 const [error,setError]=useState("");
 const [week,setWeek]=useState(0);
 const [managementTeam,setManagementTeam]=useState("Todas as equipes");
 const [teamFilter,setTeamFilter]=useState("Todas as equipes");
 const [holidayDates,setHolidayDates]=useState<string[]>(["2026-11-20"]);
 const [showImport,setShowImport]=useState(false);
 const [syncStatus,setSyncStatus]=useState<"loading"|"shared"|"local"|"saving">("loading");
 const [canImport,setCanImport]=useState(false);
 useEffect(()=>{let live=true;async function load(){if(!supabase){if(live)setSyncStatus("local");return;}const {data:{user}}=await supabase.auth.getUser();if(!live)return;if(!user){setSyncStatus("local");return;}const profile=await supabase.from("bf_profiles").select("role,active").eq("user_id",user.id).maybeSingle();if(live)setCanImport(profile.data?.active===true&&profile.data?.role==="admin");const result=await supabase.from("bf_refund_pef_daily").select("reference_date,team,refund_count,refunded_amount").order("reference_date");if(!live)return;if(result.error){setSyncStatus("local");return;}const mapped:Row[]=(result.data||[]).map((r:any)=>({date:String(r.reference_date),team:String(r.team),quantity:Number(r.refund_count),amount:Number(r.refunded_amount)}));if(mapped.length){setRows(mapped);setSyncStatus("shared");}else{setSyncStatus("local");}}void load();return()=>{live=false;};},[]);
 useEffect(()=>{if(!supabase)return;let live=true;void supabase.from("bf_refund_conversions_daily").select("reference_date,analyst_name,vouchers,cancellations,associated_amount").gte("reference_date","2026-11-02").lte("reference_date","2026-11-08").then(({data,error})=>{if(!live||error||!data?.length)return;setConversionRows(data.map((r:any)=>({date:String(r.reference_date),analyst:String(r.analyst_name),vouchers:Number(r.vouchers),cancelled:Number(r.cancellations),amount:Number(r.associated_amount)})));setConversionSource("shared");});return()=>{live=false;};},[]);
 useEffect(()=>{if(!supabase){setBacklogState("unavailable");return;}let live=true;void supabase.from("bf_refund_backlog_daily").select("reference_date,open_over_7_days,resolved_over_7_days").gte("reference_date","2026-11-01").lte("reference_date","2026-11-30").order("reference_date").then(({data,error})=>{if(!live)return;if(error||!data?.length){setBacklogState("unavailable");return;}setBacklogRows(data.map((r:any)=>({date:String(r.reference_date),openOver7:Number(r.open_over_7_days),resolvedOver7:Number(r.resolved_over_7_days||0)})));setBacklogState("ready");});return()=>{live=false;};},[]);
 const conversionTotals=useMemo(()=>conversionRows.reduce((a,r)=>({total:a.total+r.vouchers+r.cancelled,vouchers:a.vouchers+r.vouchers,cancelled:a.cancelled+r.cancelled,amount:a.amount+r.amount}),{total:0,vouchers:0,cancelled:0,amount:0}),[conversionRows]);
 const weekTwoConversionsTotal=WEEK_TWO_CONVERSIONS_CONFIRMED.reduce((acc,r)=>({total:acc.total+r.conversions,vouchers:acc.vouchers+r.vouchers,cancelled:acc.cancelled+r.cancelled,amount:acc.amount+r.amount}),{total:0,vouchers:0,cancelled:0,amount:0});
 const displayRows=useMemo(()=>{
  const base=[...rows.filter(r=>r.date<"2026-11-04"||r.date>"2026-11-08"),...WEEK_ONE_DAILY];
  // Dados reais da base tem prioridade. Usar o espelho somente em dias ausentes.
  const covered=new Set(base.map(r=>r.date));
  return [...base,...WEEK_TWO_PEF_VERIFIED.filter(r=>!covered.has(r.date))];
 },[rows]);
 const totals=useMemo(()=>{const amount=displayRows.reduce((s,r)=>s+r.amount,0);const quantity=displayRows.reduce((s,r)=>s+r.quantity,0);const byWeek=weeks.map(w=>displayRows.filter(r=>Number(r.date.slice(8))>=w.start&&Number(r.date.slice(8))<=w.end).reduce((s,r)=>s+r.amount,0));const days=[...new Set(displayRows.map(r=>r.date))].sort();const teams=[...new Set(displayRows.map(r=>r.team))].map(team=>({team,amount:displayRows.filter(r=>r.team===team).reduce((s,r)=>s+r.amount,0)})).sort((a,b)=>b.amount-a.amount);return {amount,quantity,byWeek,days,teams};},[displayRows]);
 const current=weeks[week],used=totals.byWeek[week],monthCap=OFFICIAL_CAMPAIGN_CAP,monthRatio=totals.amount/monthCap*100,weekRatio=used/current.cap*100;
 const backlogWeek=(week===1?VERIFIED_WEEK_TWO_BACKLOG:backlogRows).filter(r=>Number(r.date.slice(8))>=current.start&&Number(r.date.slice(8))<=current.end);
 const backlogLatest=backlogWeek.length?backlogWeek[backlogWeek.length-1]:week===0?{date:VERIFIED_WEEK_ONE_BACKLOG.date,openOver7:VERIFIED_WEEK_ONE_BACKLOG.openOver7,resolvedOver7:0}:null;
 const backlogResolved=backlogWeek.reduce((sum,r)=>sum+r.resolvedOver7,0);
 const weekRows=displayRows.filter(r=>Number(r.date.slice(8))>=current.start&&Number(r.date.slice(8))<=current.end);
 const chart=Array.from({length:current.end-current.start+1},(_,i)=>{const date="2026-11-"+String(current.start+i).padStart(2,"0");const matches=weekRows.filter(r=>r.date===date&&(teamFilter==="Todas as equipes"||r.team===teamFilter));return {date,amount:matches.reduce((sum,r)=>sum+r.amount,0),hasData:matches.length>0};});
 const weekCoverage=new Set(weekRows.map(r=>r.date)).size;
 const dailyAudit=Array.from({length:current.end-current.start+1},(_,i)=>{const date="2026-11-"+String(current.start+i).padStart(2,"0");const day=new Date(date+"T12:00:00Z").getUTCDay();const isHoliday=holidayDates.includes(date);const reference=isHoliday?4225:([1420,8513,8593,8990,10397,8763,2119][day]);const entries=weekRows.filter(r=>r.date===date);const value=entries.reduce((n,r)=>n+r.amount,0);const count=entries.reduce((n,r)=>n+r.quantity,0);return {date,reference,value,count,hasData:entries.length>0,isHoliday};});
 const dailyAuditTotal=dailyAudit.reduce((a,d)=>a+d.value,0);
 const priorWeek=week>0?totals.byWeek[week-1]:null;
 const lastDate=totals.days.length?totals.days[totals.days.length-1]:null;
 const teamOptions=["Todas as equipes",...totals.teams.map(t=>t.team)];
 const managementRows=weekRows.filter(r=>managementTeam==="Todas as equipes"||r.team===managementTeam);
 const managementAmount=managementRows.reduce((sum,r)=>sum+r.amount,0);
 const managementCount=managementRows.reduce((sum,r)=>sum+r.quantity,0);
 const isCompleteWeek=weekCoverage===current.end-current.start+1;
 const financialReadiness=isCompleteWeek&&syncStatus==="shared"?"Aguardando homologação financeira":"Dados incompletos";
 const weekTwoFinancial=week===1&&isCompleteWeek&&syncStatus==="shared";
 const weekTwoOverCap=weekTwoFinancial&&used>current.cap;
 const weekTwoBacklogFailed=week===1&&backlogLatest!==null&&backlogLatest.openOver7>0;
 const weekTwoPrizeBlocked=weekTwoOverCap||weekTwoBacklogFailed;
 function exportExecutive(){const lines=[["Indicador","Valor"],["Campanha","Blue Friday 2026"],["Semana",current.name+" ("+current.range+")"],["Equipe",managementTeam],["Fonte",syncStatus==="shared"?"Supabase":"Base local ou inicial"],["Reembolsos registrados",String(managementCount)],["Valor PEF registrado",managementAmount.toFixed(2)],["Teto semanal geral",String(current.cap)],["Cobertura da semana",weekCoverage+"/"+(current.end-current.start+1)],["Conversões",week===1?"32 confirmadas (Alice, Carla e Naiara)":String(conversionTotals.total)],["Solicitações abertas",week===1?String(WEEK_TWO_OPENED_TOTAL):"Não apurado"],["Taxa de conversão",week===1?"7,80%; meta 4%; confirmada pela operação":"Não apurada"],["Backlog acima de 7 dias","Sem integração"],["Elegibilidade",weekTwoPrizeBlocked?"Premiação em dinheiro não liberada por travas": "Não homologada"]];const csv="\uFEFF"+lines.map(line=>line.map(v=>'"'+v.replace(/"/g,'""')+'"').join(";")).join("\r\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="blue-friday-reembolso-"+current.name.toLowerCase().replace(" ","-")+".csv";a.click();URL.revokeObjectURL(url);}
 const chartMax=Math.max(...chart.map(x=>x.amount),1);
 async function onFile(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setError("");try{if(file.size>2_000_000)throw Error("CSV muito grande (máximo 2 MB).");const parsed=readCsv(await file.text());if(syncStatus==="shared"&&!canImport)throw Error("Somente administradores podem atualizar a base compartilhada.");if(syncStatus==="shared"&&canImport&&supabase){const existingKeys=new Set(rows.map(r=>r.date+"|"+r.team.toLowerCase()));const incomingKeys=new Set(parsed.map(r=>r.date+"|"+r.team.toLowerCase()));const missing=[...existingKeys].filter(key=>!incomingKeys.has(key));if(missing.length)throw Error("Importação bloqueada: o arquivo não contém "+missing.length+" combinação(ões) de data/equipe já existentes. Para evitar totais inconsistentes, importe a base completa. Exemplo ausente: "+missing[0]);setSyncStatus("saving");const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error("Sessão expirada.");const payload=parsed.map(r=>({reference_date:r.date,team:r.team,refund_count:r.quantity,refunded_amount:r.amount,updated_by:user.id,updated_at:new Date().toISOString()}));const result=await supabase.from("bf_refund_pef_daily").upsert(payload,{onConflict:"reference_date,team"});if(result.error)throw Error("Falha ao salvar no Supabase: "+result.error.message);setSyncStatus("shared");}else{localStorage.setItem(KEY,JSON.stringify(parsed));setSyncStatus("local");}setRows(parsed);setFileName(file.name);setShowImport(false);}catch(err){setError(err instanceof Error?err.message:"Não foi possível ler o CSV.");if(syncStatus==="saving")setSyncStatus("shared");}e.target.value="";}
 function clear(){if(!window.confirm("Restaurar a referência operacional de 150 reembolsos de 03 a 09/11?"))return;localStorage.removeItem(KEY);setRows(VERIFIED_SNAPSHOT);setFileName("");}
 const coverage=weekRows.length>0;
 const recordedDays=totals.days.length;
 const monthCoverage=recordedDays+"/30 dias com registros";
 const weeklyCoverage=weeks.map(w=>({name:w.name,days:new Set(displayRows.filter(r=>Number(r.date.slice(8))>=w.start&&Number(r.date.slice(8))<=w.end).map(r=>r.date)).size,total:w.end-w.start+1}));
 const ui={root:{maxWidth:1280,margin:"0 auto",padding:"28px 24px 64px",color:"#f4f7ff",fontFamily:"inherit"},header:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:24,flexWrap:"wrap",padding:"28px 32px",border:"1px solid #385987",borderRadius:20,background:"linear-gradient(110deg,#1b3765,#15284d)",marginBottom:20},grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:20},card:{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:12,padding:23,minHeight:200,borderRadius:18,background:"#172747",border:"1px solid #37537d"},panel:{background:"#142443",border:"1px solid #344f79",borderRadius:18,padding:"24px 26px",marginBottom:18},sectionHead:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:18},rule:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,flexWrap:"wrap",padding:"15px 0",borderTop:"1px solid #334a70",fontSize:14},winners:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14},winner:{display:"flex",alignItems:"center",gap:16,padding:20,background:"#20375b",border:"1px solid #3a5780",borderRadius:14},rank:{display:"grid",gridTemplateColumns:"50px 1fr auto",alignItems:"center",gap:14,padding:"15px 0",borderTop:"1px solid #334a70"},muted:{fontSize:12,color:"#b9cbea"},title:{fontSize:19,color:"#fff",fontWeight:800,margin:0},badge:{padding:"7px 11px",borderRadius:99,fontSize:12,fontWeight:800}} as const;
 return <div style={ui.root}>
 <header style={ui.header}><div><div style={{fontSize:11,fontWeight:800,letterSpacing:2,color:"#9ac9ff"}}>BLUE FRIDAY 2026 · RELACIONAMENTO</div><h1 style={{fontSize:34,color:"#fff",margin:"10px 0",lineHeight:1.15}}>Reembolso</h1><p style={{color:"#c4d3ed",fontSize:14,margin:0}}>Fechamento financeiro, metas e destaques do time.</p></div><label style={{display:"flex",flexDirection:"column",gap:8,fontSize:12,color:"#c6d7f4"}}>Período<select style={{background:"#10244a",color:"#fff",border:"1px solid #5274a8",padding:"12px 14px",borderRadius:10,minWidth:210}} aria-label="Selecionar semana" value={week} onChange={e=>setWeek(Number(e.target.value))}>{weeks.map((w,i)=><option key={w.name} value={i}>{w.name} · {w.range}</option>)}</select></label></header>
 <div style={ui.grid}>
 {([{label:"Reembolsado PEF",value:week===0?money(VERIFIED_WEEK_ONE_FINANCIAL.refunded):coverage?money(used):"Sem dados",detail:week===0?"Fechamento da semana 1":coverage?"Dados importados":"Aguardando apuração",color:"#6cc8ff",symbol:"wallet"},{label:"Teto semanal",value:money(week===0?VERIFIED_WEEK_ONE_FINANCIAL.cap:current.cap),detail:week===0?"86% utilizado · dentro do teto":weekTwoFinancial?pct(weekRatio)+" utilizado · "+(weekTwoOverCap?"acima em "+money(used-current.cap):"dentro do teto"):coverage?pct(weekRatio)+" utilizado":"Limite da semana",color:"#59dfc6",symbol:"target"},{label:"Backlog acima de 7 dias",value:week===0?"43 casos":backlogLatest?number(backlogLatest.openOver7)+" casos":"Sem dados",detail:week===0?"Meta não cumprida":weekTwoBacklogFailed?"Meta não atingida no fechamento":backlogLatest?"Verificar no fechamento":"Meta: zero casos",color:"#ff9da9",symbol:"calendar"},{label:"Prêmio em dinheiro",value:week===0?"R$ 0":weekTwoPrizeBlocked?"R$ 0":"Pendente",detail:week===0?"Não liberado pela trava":weekTwoPrizeBlocked?"Não liberado: travas não cumpridas":"Sujeito ao fechamento",color:"#c5afff",symbol:"shield"}] as const).map((item)=><article key={item.label} style={{...ui.card,borderTop:"3px solid "+item.color}}><span style={{display:"grid",placeItems:"center",width:44,height:44,borderRadius:12,background:"#25416d",color:item.color}}><RefundIcon name={item.symbol}/></span><span style={{fontSize:13,color:"#c6d5ef",fontWeight:650}}>{item.label}</span><strong style={{fontSize:29,lineHeight:1.2,color:"#fff"}}>{item.value}</strong><span style={ui.muted}>{item.detail}</span></article>)}
 </div>
 <section style={ui.panel} aria-label="Reembolsos realizados por dia">
  <div style={{...ui.sectionHead,flexWrap:"wrap"}}>
   <div><h2 style={ui.title}>Reembolsos realizados por dia</h2><p style={{...ui.muted,margin:"7px 0 0"}}>Quantidade de reembolsos PEF e valor reembolsado em cada data da {current.name.toLowerCase()}.</p></div>
   <span style={{...ui.badge,background:"#24477a",color:"#dcecff"}}>{current.range}</span>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:16}}>
   <div style={{padding:16,border:"1px solid #385987",borderRadius:13,background:"#10244a"}}><span style={ui.muted}>Reembolsos no período</span><strong style={{display:"block",fontSize:26,color:"#fff",marginTop:6}}>{dailyAudit.some(d=>d.hasData)?number(dailyAudit.reduce((sum,d)=>sum+d.count,0)):"Sem dados"}</strong></div>
   <div style={{padding:16,border:"1px solid #385987",borderRadius:13,background:"#10244a"}}><span style={ui.muted}>Valor reembolsado no período</span><strong style={{display:"block",fontSize:24,color:"#fff",marginTop:6}}>{dailyAudit.some(d=>d.hasData)?money(dailyAuditTotal):"Sem dados"}</strong></div>
   <div style={{padding:16,border:"1px solid #385987",borderRadius:13,background:"#10244a"}}><span style={ui.muted}>Dias com registros</span><strong style={{display:"block",fontSize:26,color:"#fff",marginTop:6}}>{dailyAudit.filter(d=>d.hasData).length} / {dailyAudit.length}</strong></div>
  </div>
  <div style={{overflowX:"auto",border:"1px solid #344f79",borderRadius:13}}>
   <table style={{width:"100%",borderCollapse:"collapse",minWidth:480,textAlign:"left",fontSize:13}}>
    <thead><tr style={{background:"#203a65",color:"#d5e7ff"}}><th scope="col" style={{padding:"13px 15px"}}>Data</th><th scope="col" style={{padding:"13px 15px",textAlign:"right"}}>Reembolsos realizados</th><th scope="col" style={{padding:"13px 15px",textAlign:"right"}}>Valor reembolsado</th></tr></thead>
    <tbody>{dailyAudit.map((day,i)=><tr key={day.date} style={{borderTop:"1px solid #304b76",background:i%2===0?"#13284d":"#172d52"}}><td style={{padding:"12px 15px",color:"#e9f2ff",fontWeight:650}}>{day.date.slice(8,10)}/11/2026</td><td style={{padding:"12px 15px",textAlign:"right",color:day.hasData?"#fff":"#a9bad5"}}>{day.hasData?number(day.count):"Sem dados"}</td><td style={{padding:"12px 15px",textAlign:"right",color:day.hasData?"#fff":"#a9bad5"}}>{day.hasData?money(day.value):"Sem dados"}</td></tr>)}</tbody>
    <tfoot><tr style={{borderTop:"1px solid #5778a8",background:"#1d3865",fontWeight:800,color:"#fff"}}><td style={{padding:"13px 15px"}}>Total registrado</td><td style={{padding:"13px 15px",textAlign:"right"}}>{number(dailyAudit.reduce((sum,d)=>sum+d.count,0))}</td><td style={{padding:"13px 15px",textAlign:"right"}}>{money(dailyAuditTotal)}</td></tr></tfoot>
   </table>
  </div>
  <p style={{...ui.muted,margin:"12px 0 0"}}>Fonte: registros diários PEF disponíveis no painel. Dias sem registros não são considerados zero. O total diário pode diferir do fechamento financeiro homologado.</p>
 </section>

 <div className="bf-refund-insights">
  <section className="bf-refund-insight-panel">
   <header className="bf-refund-insight-heading"><div className="bf-refund-insight-title"><span className="bf-refund-insight-heading-icon bf-refund-icon-blue"><RefundIcon name="target" size={21}/></span><div><h2>Resultado das metas</h2><p>Acompanhamento dos critérios de premiação</p></div></div><span className="bf-refund-period">{current.name}</span></header>
   <div className="bf-refund-goal-grid">{([{name:"Reembolso dentro do teto",description:"Controle financeiro da semana",status:week===0?"Cumprida":weekTwoFinancial?(weekTwoOverCap?"Não atingida":"Cumprida"):"A apurar",tone:week===0?"success":weekTwoFinancial?(weekTwoOverCap?"danger":"success"):"pending",icon:"wallet"},{name:"Backlog zerado no fechamento",description:"Casos acima de sete dias",status:week===0?"Não cumprida":weekTwoBacklogFailed?"Não atingida":"A apurar",tone:week===0||weekTwoBacklogFailed?"danger":"pending",icon:"calendar"},{name:"Conversão mínima de 4%",description:week===1?"32 conversões / 410 solicitações abertas":"Taxa ainda não homologada",status:week===1?"Atingida · 7,80%":"Sem taxa apurada",tone:week===1?"success":"pending",icon:"chart"}] as const).map(item=><div className="bf-refund-goal" key={item.name}><span className="bf-refund-goal-icon"><RefundIcon name={item.icon}/></span><div className="bf-refund-goal-content"><strong>{item.name}</strong><small>{item.description}</small></div><span className={`bf-refund-goal-status bf-refund-status-${item.tone}`}>{item.status}</span></div>)}</div>
  </section>
  <section className="bf-refund-insight-panel">
   <header className="bf-refund-insight-heading"><div className="bf-refund-insight-title"><span className="bf-refund-insight-heading-icon bf-refund-icon-purple"><RefundIcon name="shield" size={21}/></span><div><h2>Destaques do time</h2><p>Reconhecimentos e resultados individuais</p></div></div><span className="bf-refund-period">{current.name}</span></header>
   {week===0?<div className="bf-refund-highlights"><article className="bf-refund-highlight bf-refund-highlight-gold"><div className="bf-refund-highlight-symbol" aria-hidden="true">🏆</div><div><span className="bf-refund-highlight-eyebrow">MAIOR PROCESSAMENTO</span><h3>Alice</h3><p><strong>143</strong> processamentos</p><small>Vencedora do brinde · entrega não confirmada</small></div></article><article className="bf-refund-highlight bf-refund-highlight-purple"><div className="bf-refund-highlight-symbol"><RefundIcon name="chart" size={26}/></div><div><span className="bf-refund-highlight-eyebrow">LIDERANÇA EM CONVERSÕES</span><h3>Naiara</h3><p><strong>12</strong> conversões</p><small>Sem prêmio em dinheiro liberado</small></div></article></div>:<div className="bf-refund-highlights"><article className="bf-refund-highlight bf-refund-highlight-gold"><div className="bf-refund-highlight-symbol" aria-hidden="true">🏆</div><div><span className="bf-refund-highlight-eyebrow">MAIOR PROCESSAMENTO</span><h3>Carla</h3><p><strong>260</strong> processamentos</p><small>QB + ME · brinde sujeito à confirmação da operação</small></div></article><article className="bf-refund-highlight bf-refund-highlight-purple"><div className="bf-refund-highlight-symbol"><RefundIcon name="chart" size={26}/></div><div><span className="bf-refund-highlight-eyebrow">CONVERSÕES CONFIRMADAS</span><h3>Naiara</h3><p><strong>16</strong> conversões</p><small>Naiara confirmada com 16 conversões · dinheiro não liberado</small></div></article></div>}
  </section>
  <section className="bf-refund-insight-panel">
   <header className="bf-refund-insight-heading"><div className="bf-refund-insight-title"><span className="bf-refund-insight-heading-icon bf-refund-icon-teal"><RefundIcon name="chart" size={21}/></span><div><h2>Ranking de conversões</h2><p>Comparativo de conversões por analista</p></div></div><span className="bf-refund-period">{current.name}</span></header>
   {week===0?<div className="bf-refund-ranking">{VERIFIED_WEEK_ONE_CONVERSIONS.map((item,i)=><div className="bf-refund-ranking-row" key={item.analyst}><span className={`bf-refund-rank-position bf-refund-rank-${i+1}`}>{i+1}º</span><div className="bf-refund-ranking-person"><strong>{item.analyst}</strong><div className="bf-refund-ranking-track"><span style={{width:(item.conversions/VERIFIED_WEEK_ONE_CONVERSIONS[0].conversions*100)+"%"}}/></div></div><div className="bf-refund-ranking-number"><strong>{item.conversions}</strong><small>conversões</small></div></div>)}</div>:<div className="bf-refund-ranking">{[...WEEK_TWO_CONVERSIONS_CONFIRMED].sort((a,b)=>b.conversions-a.conversions).map((item,i)=><div className="bf-refund-ranking-row" key={item.analyst}><span className={`bf-refund-rank-position bf-refund-rank-${i+1}`}>{i+1}º</span><div className="bf-refund-ranking-person"><strong>{item.analyst}</strong><div className="bf-refund-ranking-track"><span style={{width:(item.conversions/16*100)+"%"}}/></div></div><div className="bf-refund-ranking-number"><strong>{item.conversions}</strong><small>confirmadas</small></div></div>)}</div>}
  </section>
 </div>
 {week===1&&<section className="bf-refund-insight-panel bf-refund-week2-opened" aria-label="Aberturas e taxa de conversão da Semana 2">
 <div className="bf-refund-processing-head"><div><h2>Aberturas e taxa de conversão</h2><p>09 a 15/11 · Base de solicitações abertas do Databricks</p></div><span className="bf-refund-processing-tag">Meta: 4%</span></div>
 <div className="bf-refund-opened-kpis"><article><span>Solicitações abertas</span><strong>{number(WEEK_TWO_OPENED_TOTAL)}</strong><small>Denominador da taxa</small></article><article><span>Conversões confirmadas</span><strong>{weekTwoConversionsTotal.total}</strong><small>Alice, Carla e Naiara</small></article><article><span>Taxa de conversão</span><strong>{WEEK_TWO_CONVERSION_RATE.toFixed(2).replace(".",",")}%</strong><small>Meta de 4% atingida</small></article><article><span>Meta de conversão</span><strong>4,00%</strong><small>Meta atingida</small></article></div>
 <div className="bf-refund-opened-bars">{WEEK_TWO_OPENED.map(d=><div className="bf-refund-opened-day" key={d.day}><strong>{d.count}</strong><div className="bf-refund-opened-track"><div style={{height:(d.count/96*100)+"%"}}/></div><small>{d.day}</small></div>)}</div>
 <p className="bf-refund-processing-note">Fórmula: conversões ÷ solicitações abertas × 100. Os 464 processamentos não são usados como denominador. A operação confirmou 16 conversões da Naiara na Semana 2. A taxa geral é 32 / 410 = 7,80%. A premiação em dinheiro continua bloqueada por outras travas.</p>
 </section>}
 {week===1&&<section className="bf-refund-insight-panel bf-refund-week2-conversions" aria-label="Conversões da Semana 2">
   <div className="bf-refund-processing-head"><div><h2>Conversões · Semana 2</h2><p>Alice, Carla e Naiara · 09 a 15/11 · dados confirmados pela operação</p></div><span className="bf-refund-processing-tag">Fonte: Hub de Operações</span></div>
   <div className="bf-refund-conversion-stats"><div><span>Conversões na Semana 2</span><strong>{weekTwoConversionsTotal.total}</strong></div><div><span>Vouchers</span><strong>{weekTwoConversionsTotal.vouchers}</strong></div><div><span>Cancelamentos convertidos</span><strong>{weekTwoConversionsTotal.cancelled}</strong></div><div><span>Valor associado</span><strong>{money(weekTwoConversionsTotal.amount)}</strong></div></div>
   <div className="bf-refund-processing-table-wrap"><table className="bf-refund-processing-table"><thead><tr><th>Analista</th><th>Conversões</th><th>Vouchers</th><th>Cancelamentos</th><th>Valor associado</th><th>Período</th></tr></thead><tbody>{WEEK_TWO_CONVERSIONS_CONFIRMED.map(r=><tr key={r.analyst}><th scope="row">{r.analyst}</th><td>{r.conversions}</td><td>{r.vouchers}</td><td>{r.cancelled}</td><td>{money(r.amount)}</td><td>09 a 15/11</td></tr>)}<tr className="bf-refund-processing-sum"><th scope="row">Total da semana</th><td>{weekTwoConversionsTotal.total}</td><td>{weekTwoConversionsTotal.vouchers}</td><td>{weekTwoConversionsTotal.cancelled}</td><td>{money(weekTwoConversionsTotal.amount)}</td><td>09 a 15/11</td></tr></tbody></table></div>
   <p className="bf-refund-processing-note">* A operação confirmou que as 16 conversões da Naiara pertencem à Semana 2. Os valores associados não são pagamentos de reembolso. A premiação em dinheiro permanece bloqueada pelo teto e pelo backlog.</p>
  </section>}
 {week===1&&<section className="bf-refund-insight-panel bf-refund-processing-week2" aria-label="Processamentos da Semana 2">
   <div className="bf-refund-processing-head"><div><h2>Reembolsos processados · Semana 2</h2><p>09 a 13/11/2026 · QB: Power BI · ME: contagens informadas pela operação</p></div><span className="bf-refund-processing-tag">Dados informados</span></div>
   <div className="bf-refund-processing-total"><span>Total processado (QB + ME)</span><strong>{number(WEEK_TWO_PROCESSING_TOTAL)}</strong><small>QB: 394 · ME: 70 · Alice e Carla</small></div>
   <div className="bf-refund-processing-table-wrap"><table className="bf-refund-processing-table"><thead><tr><th>Analista</th><th>Quero Bolsa</th><th>Melhor Escola</th><th>Total processado</th><th>TMR média (QB)</th><th>TMR geral (QB)</th><th>TMR 10 dias (QB)</th><th>TMR 8 dias (QB)</th></tr></thead><tbody>{WEEK_TWO_PROCESSING.map(row=><tr key={row.analyst}><th scope="row">{row.analyst}</th><td>{number(row.qb)}</td><td>{number(row.me)}</td><td><strong>{number(row.qb+row.me)}</strong></td><td>{row.tmr.toFixed(2).replace(".",",")}</td><td>{pct(row.general)}</td><td>{pct(row.tenDays)}</td><td>{pct(row.eightDays)}</td></tr>)}<tr className="bf-refund-processing-sum"><th scope="row">Total</th><td>394</td><td>70</td><td><strong>464</strong></td><td colSpan={4}>TMR individual, não somável</td></tr></tbody></table></div>
   <p className="bf-refund-processing-note">Processados não equivalem a pagamentos ou aprovações. TMR disponível apenas para QB. Naiara não incluída por falta de dados. Estes valores não foram lançados na base financeira PEF.</p>
  </section>}
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",margin:"20px 0"}}><span style={ui.muted}>Fechamento da semana selecionada. Confira a cobertura e a origem dos registros diários.</span><button type="button" className="refund-btn refund-btn-quiet" onClick={()=>setShowImport(v=>!v)}>{showImport?"Fechar importação":"Importar dados CSV"}</button></div>
 {showImport&&<section className="refund-import refund-panel"><div><h2>Atualizar reembolsos PEF</h2><p>Importe o CSV validado com as colunas <code>date, team, quantidade, valor_reembolsado</code>.</p><p>Confirme período e valores reconciliados antes de importar. Sem a tabela compartilhada, os dados ficam locais.</p></div><label className="refund-upload">Selecionar CSV<input type="file" accept=".csv,text/csv" onChange={onFile}/></label></section>}
 {error&&<div className="refund-error" role="alert">{error}</div>}
 </div>;
}
