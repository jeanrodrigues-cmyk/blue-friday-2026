import DashboardGlyph from "./DashboardGlyph";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {supabase} from "./lib/supabase";
import "./BrandsPanel.css";
import "./ReclameAquiPanel.css";
import { currentWeekIndex, defaultWeekIndex, todayBR, type AreaStatus } from "./campaign";


type Tri=boolean|null;
type Week={week_start:string;week_end:string;assigned:number|null;answered:number|null;evaluated:number|null;good_evaluations:number|null;evaluation_pct:number|null;good_pct:number|null;overdue_15_count:number|null;contact_d1_ok:Tri;first_action_d1_ok:Tri;reputation_stable:Tri;vfn_stable:Tri;solution_stable:Tri;reward_approved:boolean;gift_approved:boolean;source:string;notes:string|null};
type Member={week_start:string;member_key:"julio"|"larissa";assigned:number|null;answered:number|null;replies:number|null;evaluated:number|null;good_evaluations:number|null;resolved:number|null;vfn_positive:number|null;evaluation_pct:number|null;good_pct:number|null;solution_pct:number|null;reputation:number|null};
const weeks=[{start:"2026-11-01",end:"2026-11-08",label:"Semana 1 · 01 a 08/11"},{start:"2026-11-09",end:"2026-11-15",label:"Semana 2 · 09 a 15/11"},{start:"2026-11-16",end:"2026-11-22",label:"Semana 3 · 16 a 22/11"},{start:"2026-11-23",end:"2026-11-30",label:"Semana 4 · 23 a 30/11"}];
const names:{[key:string]:string}={julio:"Julio Assis",larissa:"Larissa"};
const firstWeekSnapshot:Week={week_start:"2026-11-01",week_end:"2026-11-08",assigned:68,answered:68,evaluated:35,good_evaluations:13,evaluation_pct:51.47,good_pct:37.14,overdue_15_count:0,contact_d1_ok:true,first_action_d1_ok:true,reputation_stable:true,vfn_stable:true,solution_stable:true,reward_approved:false,gift_approved:false,source:"HugMe · relatório 02–08/11/2026",notes:"Metas e travas confirmadas pelo responsável em 12/11/2026. Meta de avaliações boas (50%) não atingida. Os totais gerais e individuais divergem em algumas métricas."};
const firstWeekPeople:Member[]=[
{week_start:"2026-11-01",member_key:"julio",assigned:34,answered:37,replies:1,evaluated:18,good_evaluations:8,resolved:12,vfn_positive:9,evaluation_pct:48.65,good_pct:44.44,solution_pct:66.67,reputation:6.64},
{week_start:"2026-11-01",member_key:"larissa",assigned:34,answered:31,replies:13,evaluated:8,good_evaluations:3,resolved:6,vfn_positive:4,evaluation_pct:25.81,good_pct:37.5,solution_pct:75,reputation:null}
];

// HugMe, capturas de 16/11/2026 com filtro 09-16/11; linha semanal 09/11.
// Indicadores nao presentes nos prints permanecem nulos, sem aprovar premio.
const secondWeekSnapshot:Week={week_start:"2026-11-09",week_end:"2026-11-15",assigned:61,answered:60,evaluated:36,good_evaluations:16,evaluation_pct:60,good_pct:44.44,overdue_15_count:null,contact_d1_ok:null,first_action_d1_ok:null,reputation_stable:null,vfn_stable:null,solution_stable:null,reward_approved:false,gift_approved:false,source:"HugMe · relatório 09–16/11/2026",notes:"Captura semanal de 16/11. Meta de 50% de avaliações boas não atingida. Julio: QB 29 respostas e 4 avaliações boas; ME acrescentou 16 respostas e 3 avaliações boas. Consolidado geral do print é apenas QB. Percentuais combinados do Julio pendentes por falta do total de avaliações ME; travas pendentes de conferência."};
const secondWeekPeople:Member[]=[
 {week_start:"2026-11-09",member_key:"julio",assigned:32,answered:45,replies:4,evaluated:9,good_evaluations:7,resolved:6,vfn_positive:3,evaluation_pct:null,good_pct:null,solution_pct:66.67,reputation:5.89},
 {week_start:"2026-11-09",member_key:"larissa",assigned:29,answered:31,replies:6,evaluated:15,good_evaluations:7,resolved:13,vfn_positive:4,evaluation_pct:48.39,good_pct:46.67,solution_pct:86.67,reputation:6.81}
];
// Semana 3 (16-22/11): consolidado do Power BI "Reclame Aqui HugMe - Quero Bolsa" (captura de 23/11) e o mesmo Power BI
// filtrado por Guia (captura de 25/11) para QB por colaborador. Planilha de ME e Quero Pago (respostas de 16 a 19/11):
// Julio 7 respostas e 2 avaliações boas ("10 - VNF"); Larissa 6 respostas e 1 avaliação boa ("10 - VFN").
const thirdWeekSnapshot:Week={week_start:"2026-11-16",week_end:"2026-11-22",assigned:53,answered:37,evaluated:38,good_evaluations:18,evaluation_pct:102.7,good_pct:47.37,overdue_15_count:null,contact_d1_ok:null,first_action_d1_ok:null,reputation_stable:null,vfn_stable:null,solution_stable:null,reward_approved:false,gift_approved:false,source:"HugMe · Power BI Quero Bolsa 16–22/11/2026",notes:"Captura de 23/11. Meta de 50% de avaliações boas não atingida (47,37%). Consolidado geral é apenas QB. Por colaborador (Power BI filtrado por Guia + planilha de ME e Quero Pago): Julio QB 15 respostas e 8 avaliações boas (72,73% de boas em QB), ME/QP +7 respostas e +2 boas; Larissa QB 22 respostas e 9 boas (50,00% em QB), ME/QP +6 respostas e +1 boa. Totais individuais não fecham com o consolidado. Percentuais combinados pendentes por falta do total de avaliações ME/QP; travas pendentes de conferência."};
const thirdWeekPeople:Member[]=[
 {week_start:"2026-11-16",member_key:"julio",assigned:28,answered:22,replies:0,evaluated:11,good_evaluations:10,resolved:10,vfn_positive:6,evaluation_pct:null,good_pct:null,solution_pct:90.91,reputation:7.21},
 {week_start:"2026-11-16",member_key:"larissa",assigned:25,answered:28,replies:4,evaluated:18,good_evaluations:10,resolved:14,vfn_positive:7,evaluation_pct:null,good_pct:null,solution_pct:77.78,reputation:6.62}
];
const fmt=(n:number|null|undefined,suffix="")=>n==null?"Pendente":n.toLocaleString("pt-BR",{maximumFractionDigits:2})+suffix;
const checks:[keyof Week,string][]=[["overdue_15_count","Zero reclamações acima de 15 dias"],["contact_d1_ok","Contato com estudante no D1"],["first_action_d1_ok","Primeira tratativa no D1"],["reputation_stable","Reputação sem queda"],["vfn_stable","VFN sem queda"],["solution_stable","Índice de solução sem queda"]];
const numericFields:[keyof Week,string][]=[["assigned","Reclamações atribuídas"],["answered","Respondidas"],["evaluated","Avaliadas"],["good_evaluations","Avaliações boas"],["evaluation_pct","% avaliadas"],["good_pct","% boas"],["overdue_15_count","Acima de 15 dias"]];
const memberFields:[keyof Member,string][]=[["assigned","Atribuídas"],["answered","Respondidas"],["replies","Réplicas"],["evaluated","Avaliadas"],["good_evaluations","Boas"],["resolved","Resolvidas"],["vfn_positive","VFN positivo"],["evaluation_pct","% avaliadas"],["good_pct","% boas"],["solution_pct","% solução"],["reputation","Reputação"]];
function triLabel(v:Tri){return v==null?"Pendente":v?"Cumprida":"Não cumprida";}
function gate(w:Week|undefined){if(!w)return "Pendente";const all=[w.overdue_15_count==null?null:w.overdue_15_count===0,w.contact_d1_ok,w.first_action_d1_ok,w.reputation_stable,w.vfn_stable,w.solution_stable];return all.some(x=>x===false)?"Não cumprida":all.some(x=>x===null)?"Pendente":"Cumprida";}
function eligible(w:Week|undefined){return !!w&&w.evaluation_pct!=null&&w.good_pct!=null&&w.evaluation_pct>=40&&w.good_pct>=50&&gate(w)==="Cumprida";}
const GOAL_EVAL=40,GOAL_GOOD=50;
const pts=(n:number)=>n.toLocaleString("pt-BR",{maximumFractionDigits:1})+(Math.abs(n)===1?" ponto":" pontos");
type WeekState="ended"|"current"|"future";
function weekState(w:{start:string;end:string},today=todayBR()):WeekState{return today>w.end?"ended":today>=w.start?"current":"future";}
// Uma única regra para montar a semana: cards, metas, comparativo e visão geral leem daqui.
function resolveWeek(start:string,db?:Week):Week|undefined{
 if(start==="2026-11-01")return {...firstWeekSnapshot,...db,overdue_15_count:0,contact_d1_ok:true,first_action_d1_ok:true,reputation_stable:true,vfn_stable:true,solution_stable:true};
 if(start==="2026-11-09")return {...secondWeekSnapshot,...db};
 if(start==="2026-11-16")return {...thirdWeekSnapshot,...db};
 return db;
}
function hasData(w:Week|undefined){return !!w&&[w.assigned,w.answered,w.evaluation_pct,w.good_pct].some(v=>v!=null);}
function goalsMet(w:Week|undefined){const list=[w?.evaluation_pct==null?null:w.evaluation_pct>=GOAL_EVAL,w?.good_pct==null?null:w.good_pct>=GOAL_GOOD];return {met:list.filter(x=>x===true).length,failed:list.some(x=>x===false),known:list.filter(x=>x!==null).length};}
function goalsLabel(w:Week|undefined){const g=goalsMet(w);return g.known===0?"Metas a apurar":g.met+" de 2 metas cumpridas";}
function gateLabel(w:Week|undefined){const g=gate(w);return g==="Cumprida"?"Travas cumpridas":g==="Não cumprida"?"Trava não cumprida":"Travas a conferir";}
function prizeLabel(w:Week|undefined,state:WeekState){if(w?.reward_approved)return "Liberado";if(state==="future")return "—";if(eligible(w))return "Aguardando homologação";if(goalsMet(w).failed||gate(w)==="Não cumprida")return state==="ended"?"Não liberado":"Meta em risco";return state==="ended"?"Aguardando fechamento":"Em andamento";}
function giftLabel(w:Week|undefined,state:WeekState){if(w?.gift_approved)return "Homologado";if(state==="future")return "—";return state==="ended"?"Aguardando homologação":"Em andamento";}
function toneOf(label:string){return /^(Cumprida|Liberado|Homologado|Travas cumpridas|2 de 2)/.test(label)?"ok":/^(Não|Trava não)/.test(label)?"bad":label==="—"?"none":"wait";}
function positions<T>(list:T[],value:(x:T)=>number){return list.map(x=>{const v=value(x);const pos=list.filter(y=>value(y)>v).length+1;return {item:x,pos,tie:list.filter(y=>value(y)===v).length>1};});}
function GoalBar({value,goal,state}:{value:number|null|undefined;goal:number;state:WeekState}){
 if(value==null)return null;const hit=value>=goal;const tone=hit?"good":state==="ended"?"bad":"wait";
 return <div className={"ra-goalbar tone-"+tone}><div className="ra-goalbar-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={"Meta de "+goal+"%"}><span style={{width:Math.min(100,value)+"%"}}/><i style={{left:goal+"%"}} title={"Meta: "+goal+"%"}/></div><small>{hit?pts(value-goal)+" acima da meta":"Faltam "+pts(goal-value)+" para "+goal+"%"}</small></div>;
}
/** Situação da semana para o card do Reclame Aqui na visão geral. */
export function raWeekStatus(wi:number,today:string):AreaStatus{
 const w=weeks[wi];const r=resolveWeek(w.start);const state=weekState(w,today);
 if(!hasData(r))return {tone:state==="ended"?"wait":"none",label:state==="ended"?"Aguardando fechamento":"Em andamento",value:"Dados do HugMe após o fechamento"};
 const g=goalsMet(r);const value="Avaliações boas: "+fmt(r!.good_pct,"%")+" (meta "+GOAL_GOOD+"%)";
 if(g.failed)return {tone:state==="ended"?"bad":"wait",label:state==="ended"?"Meta não cumprida":"Meta em risco",value};
 if(eligible(r))return {tone:"good",label:"Meta cumprida",value};
 return {tone:"wait",label:"Em apuração",value};
}
export default function ReclameAquiPanel({admin=false}:{admin?:boolean}){
 const [selected,setSelected]=useState(()=>weeks[defaultWeekIndex()].start),[weeksData,setWeeksData]=useState<Week[]>([]),[members,setMembers]=useState<Member[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[saving,setSaving]=useState(false);
 const [form,setForm]=useState<Record<string,string>>({}),[memberForm,setMemberForm]=useState<Record<string,string>>({}),[editorOpen,setEditorOpen]=useState(false);
 const week=weeks.find(w=>w.start===selected)!;
 const storedWeek=weeksData.find(w=>w.week_start===selected);
 const current=resolveWeek(selected,storedWeek);
 const state=weekState(week);
 const weekIndex=weeks.findIndex(w=>w.start===selected);
 const previous=weekIndex>0?resolveWeek(weeks[weekIndex-1].start,weeksData.find(x=>x.week_start===weeks[weekIndex-1].start)):undefined;
 const showWeek=hasData(current);
 const people=members.filter(p=>p.week_start===selected).length?members.filter(p=>p.week_start===selected):selected==="2026-11-01"?firstWeekPeople:selected==="2026-11-09"?secondWeekPeople:selected==="2026-11-16"?thirdWeekPeople:[];
 const load=useCallback(async()=>{
  if(!supabase){setError("Supabase não configurado.");setLoading(false);return;}
  setLoading(true);const [w,p]=await Promise.all([supabase.from("bf_ra_weekly").select("*").order("week_start"),supabase.from("bf_ra_weekly_people").select("*").order("week_start")]);
  if(w.error||p.error)setError("Não foi possível carregar Reclame Aqui. Confira se a migration SQL foi aplicada e se seu usuário tem permissão. "+(w.error?.message||p.error?.message||""));
  else{setWeeksData(w.data as Week[]);setMembers(p.data as Member[]);setError("");}
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{setForm({});setMemberForm({});setNotice("");},[selected]);
 const ranking=useMemo(()=>people.map(p=>({...p,publicResponses:p.answered==null||p.replies==null?null:p.answered+p.replies})),[people]);
 const goodRank=positions([...ranking].filter(p=>p.good_evaluations!=null).sort((a,b)=>(b.good_evaluations??0)-(a.good_evaluations??0)),p=>p.good_evaluations??0);
 const replyRank=positions([...ranking].filter(p=>p.publicResponses!=null).sort((a,b)=>(b.publicResponses??0)-(a.publicResponses??0)),p=>p.publicResponses??0);
 const sum=(key:keyof Member)=>people.every(p=>typeof p[key]==="number")?people.reduce((a,p)=>a+Number(p[key]),0):null;
 const mismatches=(current?[["Avaliadas",current.evaluated,sum("evaluated")],["Avaliações boas",current.good_evaluations,sum("good_evaluations")]]:[]).filter(([,total,individual])=>total!=null&&individual!=null&&people.length===2&&total!==individual) as [string,number,number][];
 const overAnswered=people.filter(p=>p.answered!=null&&p.assigned!=null&&p.answered>p.assigned).map(p=>p.member_key);
 const change=(key:string,value:string,person=false)=>person?setMemberForm(p=>({...p,[key]:value})):setForm(p=>({...p,[key]:value}));
 const toNum=(raw:string,key:string)=>{const n=Number(raw.replace(",","."));if(!Number.isFinite(n)||n<0||((key==="evaluation_pct"||key==="good_pct"||key==="solution_pct")&&n>100)||(!key.includes("pct")&&key!=="reputation"&&!Number.isInteger(n)))throw new Error("Valor inválido para "+key);return n;};
 async function saveWeek(e:FormEvent){e.preventDefault();if(!admin||!supabase)return;setSaving(true);setNotice("");setError("");
  try{const payload:Record<string,unknown>={week_start:week.start,week_end:week.end};
   for(const [key] of numericFields){if(form[key]!==undefined&&form[key]!=="")payload[key]=toNum(form[key],key);}
   for(const [key] of checks.slice(1)){if(form[key]==="true")payload[key]=true;else if(form[key]==="false")payload[key]=false;}
   if(form.source?.trim())payload.source=form.source.trim();
   if(form.notes!==undefined)payload.notes=form.notes.trim()||null;
   if(Object.keys(payload).length===2)throw new Error("Preencha ao menos um campo para atualizar.");
   const {error:err}=await supabase.from("bf_ra_weekly").upsert(payload,{onConflict:"week_start"});if(err)throw err;
   setNotice("Fechamento semanal salvo.");setForm({});await load();
  }catch(err){setError(err instanceof Error?err.message:String(err));}finally{setSaving(false);}
 }
 async function saveMember(e:FormEvent){e.preventDefault();if(!admin||!supabase)return;setSaving(true);setError("");setNotice("");
  try{const member=memberForm.member_key;if(member!=="julio"&&member!=="larissa")throw new Error("Selecione um colaborador.");
   const payload:Record<string,unknown>={week_start:week.start,member_key:member};
   for(const [key] of memberFields){if(memberForm[key]!==undefined&&memberForm[key]!=="")payload[key]=toNum(memberForm[key],key);}
   if(Object.keys(payload).length===2)throw new Error("Preencha ao menos um indicador.");
   if(!storedWeek){const {error:weekError}=await supabase.from("bf_ra_weekly").upsert({week_start:week.start,week_end:week.end},{onConflict:"week_start"});if(weekError)throw weekError;}
   const {error:err}=await supabase.from("bf_ra_weekly_people").upsert(payload,{onConflict:"week_start,member_key"});if(err)throw err;
   setNotice("Resultado individual salvo.");setMemberForm({});await load();
  }catch(err){setError(err instanceof Error?err.message:String(err));}finally{setSaving(false);}
 }
 const delta=(now:number|null|undefined,before:number|null|undefined)=>now==null||before==null?null:now-before;
 const kpis:{label:string;value:string;icon:"message"|"check"|"users"|"award";goal?:number;raw?:number|null;diff?:number|null}[]=[
  {label:"Reclamações atribuídas",value:fmt(current?.assigned),icon:"message"},
  {label:"Respondidas",value:fmt(current?.answered),icon:"check"},
  {label:"Taxa de avaliações",value:fmt(current?.evaluation_pct,"%"),icon:"users",goal:GOAL_EVAL,raw:current?.evaluation_pct,diff:delta(current?.evaluation_pct,previous?.evaluation_pct)},
  {label:"Avaliações boas",value:fmt(current?.good_pct,"%"),icon:"award",goal:GOAL_GOOD,raw:current?.good_pct,diff:delta(current?.good_pct,previous?.good_pct)}];
 const goalCols:[keyof Member,string,number|null][]=[["evaluation_pct","% avaliadas",GOAL_EVAL],["good_pct","% boas",GOAL_GOOD],["reputation","Reputação",null]];
 const otherCols=memberFields.filter(([k])=>!goalCols.some(([g])=>g===k));
 const metasLabel=goalsLabel(current),travasLabel=gateLabel(current);
 return <div className="brands ra-dashboard">
  <header className="brands-head ra-header"><div><span className="brands-kicker">BLUE FRIDAY 2026 / RELACIONAMENTO</span><h1>Reclame Aqui</h1><p className="brands-sub">Avaliações, reputação e ranking · Julio e Larissa</p></div><div className="brands-tools"><label htmlFor="ra-week">Semana</label><select id="ra-week" className="brands-select" value={selected} onChange={e=>setSelected(e.target.value)}>{weeks.map(w=><option key={w.start} value={w.start}>{w.label}</option>)}</select><button className="brands-button ra-quiet" type="button" onClick={()=>void load()} disabled={loading}>{loading?"Carregando...":"Atualizar"}</button>{admin&&<button className="brands-button ra-quiet" type="button" onClick={()=>setEditorOpen(v=>!v)}>{editorOpen?"Fechar edição":"Registrar resultados"}</button>}</div></header>
  {notice&&<p className="brands-pill ok" role="status">{notice}</p>}
  {!showWeek?<div className="ra-empty-week" role="status"><strong>{state==="future"?week.label+" ainda não começou":state==="current"?week.label+" em andamento":week.label+": aguardando fechamento"}</strong><p>Os indicadores aparecem depois do fechamento semanal no HugMe. Metas da semana: {GOAL_EVAL}% de avaliações e {GOAL_GOOD}% de avaliações boas.</p></div>:<>
  <div className="ra-section-label"><span>VISÃO DA SEMANA</span><span>Fonte: {current?.source||"HugMe"}</span></div>
  <div className="brands-grid">{kpis.map(k=><div className="brands-card ra-kpi" key={k.label}><span className="bf-kpi-title"><span className="bf-kpi-glyph"><DashboardGlyph name={k.icon} size={25}/></span><span className="brands-card-label">{k.label}</span></span><strong className="brands-value">{k.value}</strong>{k.goal!=null?<><p className="brands-caption">Meta: {k.goal}% ou mais{k.diff!=null&&<span className={"ra-diff "+(k.diff>=0?"up":"down")}>{k.diff>=0?"↑":"↓"} {pts(Math.abs(k.diff))} vs. semana anterior</span>}</p><GoalBar value={k.raw} goal={k.goal} state={state}/></>:<p className="brands-caption">Total geral da semana</p>}</div>)}</div>
  <div className="brands-sections ra-main-sections"><section className="brands-panel"><div className="ra-panel-heading"><div><span className="ra-eyebrow">CONDIÇÕES DA CAMPANHA</span><h2>Metas e travas</h2></div><div className="ra-status-pair"><span className={"brands-pill "+toneOf(metasLabel)}>{metasLabel}</span><span className={"brands-pill "+toneOf(travasLabel)}>{travasLabel}</span></div></div>
   <h3 className="ra-subhead">Metas</h3>{[["Avaliações ≥ 40%",current?.evaluation_pct==null?"Pendente":current.evaluation_pct>=GOAL_EVAL?"Cumprida":"Não cumprida"],["Avaliações boas ≥ 50%",current?.good_pct==null?"Pendente":current.good_pct>=GOAL_GOOD?"Cumprida":"Não cumprida"]].map(([label,status])=><div className="brands-line" key={label}><span>{label}</span><span className={"brands-pill "+toneOf(status)}>{status}</span></div>)}
   <h3 className="ra-subhead">Travas</h3>{checks.map(([key,label])=>{const status=key==="overdue_15_count"?current?.overdue_15_count==null?"Pendente":current.overdue_15_count===0?"Cumprida":"Não cumprida":triLabel(current?.[key] as Tri??null);return <div className="brands-line" key={label}><span>{label}</span><span className={"brands-pill "+toneOf(status)}>{status}</span></div>;})}
   <p className="brands-note">Prêmio de R$ 60: <b>{prizeLabel(current,state)}</b>. O prêmio só é liberado com as duas metas e todas as travas cumpridas e depois da homologação.</p></section>
  <section className="brands-panel"><div className="ra-panel-heading"><div><span className="ra-eyebrow">DESTAQUES DA SEMANA</span><h2>Rankings semanais</h2></div><span className="ra-trophy"><DashboardGlyph name="award" size={20}/></span></div>
   <h3 className="ra-subhead">Avaliações boas · R$ 60</h3><p className="brands-note ra-rule">Ordem pela quantidade de avaliações boas. O percentual mostra a distância de cada um até a meta de {GOAL_GOOD}%.</p>
   {goodRank.length?goodRank.map(({item:p,pos,tie})=><div className="brands-line ra-rank" key={p.member_key}><span><b className={"ra-position"+(pos===1?" is-first":"")}>{pos}º</b>{names[p.member_key]}{tie&&<em className="ra-tie">empate</em>}</span><span className="ra-rank-values"><strong>{fmt(p.good_evaluations)} <small>boas</small></strong>{p.good_pct!=null?<span className={"ra-pct "+(p.good_pct>=GOAL_GOOD?"ok":"bad")}>{fmt(p.good_pct,"%")}</span>:<span className="ra-pct none">% a apurar</span>}</span></div>):<p className="brands-note">Aguardando dados individuais.</p>}
   <h3 className="ra-subhead" style={{marginTop:18}}>Respostas públicas · brinde</h3>{replyRank.length?replyRank.map(({item:p,pos,tie})=><div className="brands-line ra-rank" key={p.member_key}><span><b className={"ra-position"+(pos===1?" is-first":"")}>{pos}º</b>{names[p.member_key]}{tie&&<em className="ra-tie">empate</em>}</span><strong>{fmt(p.publicResponses)} <small>respostas</small></strong></div>):<p className="brands-note">Aguardando dados individuais.</p>}
   <p className="brands-note">Respostas públicas = respostas primárias + réplicas. Brinde: {giftLabel(current,state)}.</p></section></div></>}
  <section className="brands-panel ra-data-panel" style={{marginBottom:16}}><div className="ra-panel-heading"><div><span className="ra-eyebrow">EVOLUÇÃO DA CAMPANHA</span><h2>Comparativo entre semanas</h2></div></div><div className="ra-table-wrap"><table className="ra-table"><thead><tr>{["Semana","% avaliações","% boas","Metas","Travas","R$ 60","Brinde"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{weeks.map(w=>{const r=resolveWeek(w.start,weeksData.find(x=>x.week_start===w.start));const st=weekState(w);const data=hasData(r);const cells=[data?goalsLabel(r):st==="future"?"—":"Em andamento",data?gateLabel(r):st==="future"?"—":"Em andamento",prizeLabel(r,st),giftLabel(r,st)];return <tr key={w.start} className={w.start===selected?"is-selected":""}><td>{w.label}</td><td>{data?<span className={"ra-pct "+((r?.evaluation_pct??0)>=GOAL_EVAL?"ok":"bad")}>{fmt(r?.evaluation_pct,"%")}</span>:"—"}</td><td>{data?<span className={"ra-pct "+((r?.good_pct??0)>=GOAL_GOOD?"ok":"bad")}>{fmt(r?.good_pct,"%")}</span>:"—"}</td>{cells.map((c,i)=><td key={i}>{c==="—"?<span className="ra-dash">—</span>:<span className={"brands-pill "+toneOf(c)}>{c}</span>}</td>)}</tr>})}</tbody></table></div></section>
  {people.length>0&&<section className="brands-panel ra-data-panel" style={{marginBottom:16}}><div className="ra-panel-heading"><div><span className="ra-eyebrow">DETALHAMENTO</span><h2>Resultados por colaborador</h2></div></div><div className="ra-table-wrap"><table className="ra-table ra-people"><thead><tr><th>Colaborador</th>{goalCols.map(([,l,g])=><th key={l} className="is-goal">{l}{g!=null&&<small>meta {g}%</small>}</th>)}{otherCols.map(([,l])=><th key={l} className="is-secondary">{l}</th>)}</tr></thead><tbody>{people.map(p=><tr key={p.member_key}><td>{names[p.member_key]}</td>{goalCols.map(([key,,g])=>{const v=p[key] as number|null;return <td key={key} className="is-goal">{v==null?<span className="ra-pct none">A apurar</span>:g==null?fmt(v):<span className={"ra-pct "+(v>=g?"ok":"bad")}>{fmt(v,"%")}</span>}</td>})}{otherCols.map(([key])=><td key={key} className="is-secondary">{fmt(p[key] as number|null,key.includes("pct")?"%":"")}{key==="answered"&&overAnswered.includes(p.member_key)&&<sup title="Respondidas acima de atribuídas">*</sup>}</td>)}</tr>)}</tbody></table></div>
   {mismatches.length>0&&<div className="brands-alert ra-mismatch"><strong>Os totais gerais e a soma individual não batem.</strong> {mismatches.map(([n,t,i])=>n+": "+t+" no geral, "+i+" somando as pessoas").join("; ")}. As metas acima usam o total geral do HugMe; o ranking e esta tabela usam os números individuais. Confira os filtros do HugMe antes da homologação.</div>}
   {overAnswered.length>0&&<p className="brands-note">* Respondidas acima de atribuídas. Pode ser resposta a caso de outra fila ou do ME; confirme no HugMe.</p>}
   <p className="brands-note">Fonte: {current?.source||"HugMe"}. {current?.notes||""}</p></section>}
  {admin&&editorOpen&&<div className="brands-sections ra-editor"><form className="brands-panel" onSubmit={e=>void saveWeek(e)}><h2>Atualizar fechamento semanal</h2><p className="brands-note">Campos vazios preservam o valor anterior. Use somente dados confirmados no HugMe.</p><div className="brands-people" style={{marginTop:14}}>{numericFields.map(([key,label])=><label key={key} style={{fontSize:12}}>{label}<input className="brands-select" style={{display:"block",width:"100%"}} type="number" min="0" step={key.includes("pct")?"0.01":"1"} placeholder={fmt(current?.[key] as number|null)} value={form[key]??""} onChange={e=>change(key,e.target.value)}/></label>)}{checks.slice(1).map(([key,label])=><label key={key} style={{fontSize:12}}>{label}<select className="brands-select" style={{display:"block",width:"100%"}} value={form[key]??""} onChange={e=>change(key,e.target.value)}><option value="">Manter atual ({triLabel(current?.[key] as Tri??null)})</option><option value="true">Cumprida</option><option value="false">Não cumprida</option></select></label>)}</div><label style={{display:"block",marginTop:12,fontSize:12}}>Fonte<input className="brands-select" style={{display:"block",width:"100%"}} value={form.source??""} placeholder={current?.source||"HugMe"} onChange={e=>change("source",e.target.value)}/></label><label style={{display:"block",marginTop:12,fontSize:12}}>Observações<textarea className="brands-select" style={{display:"block",width:"100%"}} value={form.notes??""} placeholder={current?.notes||"Observações da semana"} onChange={e=>change("notes",e.target.value)}/></label><button className="brands-button" style={{marginTop:14}} disabled={saving} type="submit">{saving?"Salvando...":"Salvar semana"}</button></form>
  <form className="brands-panel" onSubmit={e=>void saveMember(e)}><h2>Atualizar colaborador</h2><label style={{fontSize:12}}>Colaborador<select className="brands-select" style={{display:"block",width:"100%"}} value={memberForm.member_key??""} onChange={e=>{setMemberForm({member_key:e.target.value});}} required><option value="">Selecione</option><option value="julio">Julio Assis</option><option value="larissa">Larissa</option></select></label><div className="brands-people" style={{marginTop:14}}>{memberFields.map(([key,label])=><label key={key} style={{fontSize:12}}>{label}<input className="brands-select" style={{display:"block",width:"100%"}} type="number" min="0" step={key.includes("pct")||key==="reputation"?"0.01":"1"} value={memberForm[key]??""} placeholder={fmt(people.find(p=>p.member_key===memberForm.member_key)?.[key] as number|null)} onChange={e=>change(key,e.target.value,true)}/></label>)}</div><button className="brands-button" style={{marginTop:14}} disabled={saving} type="submit">{saving?"Salvando...":"Salvar colaborador"}</button></form></div>}
 </div>;
}

