import DashboardGlyph from "./DashboardGlyph";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "./lib/supabase";
import "./BrandsPanel.css";
import { CAMPAIGN_WEEKS, currentWeekIndex, defaultWeekIndex, todayBR, weekPhase } from "./campaign";

type Daily={reference_date:string;quero_pago_unialphaville:number;quero_pago_uniasp:number;pef_unialphaville:number;pef_uniasp:number};
type Cash={reference_date:string;required:boolean;closed_at_18h:boolean|null;confirmed_at:string|null;notes:string|null};
type Invoice={document_key:string;reference_date:string;amount:number;classification:string};
const source="https://docs.google.com/spreadsheets/d/18EhvKH4oBOlZQOH-BHsbP7_kFVCkP3N92pe2gKqp364/edit";
const money=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dateBR=(s:string)=>s.slice(8,10)+"/"+s.slice(5,7);
const weeks=[{start:"2026-11-01",end:"2026-11-08",goal:52095},{start:"2026-11-09",end:"2026-11-15",goal:55568},{start:"2026-11-16",end:"2026-11-22",goal:34730},{start:"2026-11-23",end:"2026-11-30",goal:31257}];
const verifiedWeekTwo={weekly:38121.62,cashDays:5,monthly:90689.97};
const confirmedCashDates=new Set(["2026-11-09","2026-11-10","2026-11-11","2026-11-12","2026-11-13"]);
const verifiedWeekOne={weekly:52590.91,monthly:73233.39,cashDays:4,source:"Fechamento informado e validado pela equipe"};
const holidays=new Set(["2026-11-02","2026-11-20"]);
function daysBetween(start:string,end:string){const days:string[]=[];let date=new Date(start+"T12:00:00Z");const last=new Date(end+"T12:00:00Z");while(date<=last){days.push(date.toISOString().slice(0,10));date=new Date(date.getTime()+86400000);}return days;}
function status(label:string,kind:"ok"|"bad"|"wait"|"none"="wait"){return <span className={"brands-pill "+kind}>{label}</span>;}
export default function BrandsPanel(){
 const [daily,setDaily]=useState<Daily[]>([]),[cash,setCash]=useState<Cash[]>([]),[invoices,setInvoices]=useState<Invoice[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [week,setWeek]=useState(defaultWeekIndex);
 async function load(){if(!supabase){setError("Supabase não configurado.");setLoading(false);return;}setLoading(true);const [d,c,i]=await Promise.all([supabase.from("bf_brands_daily").select("*").order("reference_date"),supabase.from("bf_brands_cash").select("*").order("reference_date"),supabase.from("bf_brands_invoices").select("*").order("reference_date")]);setError(d.error?.message||c.error?.message||i.error?.message||"");setDaily((d.data||[]) as Daily[]);setCash((c.data||[]) as Cash[]);setInvoices((i.data||[]) as Invoice[]);setLoading(false);}
 useEffect(()=>{void load();},[]);
 const amounts=useMemo(()=>weeks.map(w=>{const base=daily.filter(r=>r.reference_date>=w.start&&r.reference_date<=w.end).reduce((s,r)=>s+Number(r.quero_pago_unialphaville)+Number(r.quero_pago_uniasp)+Number(r.pef_unialphaville)+Number(r.pef_uniasp),0);const nf=invoices.filter(r=>r.reference_date>=w.start&&r.reference_date<=w.end&&r.classification.trim().toLowerCase()==="mensalidades").reduce((s,r)=>s+Number(r.amount),0);return base+nf;}),[daily,invoices]);
 const snapshotFallback=daily.length===0&&cash.length===0&&invoices.length===0;
 const displayedAmounts=amounts.map((value,index)=>index===1?verifiedWeekTwo.weekly:snapshotFallback&&index===0?verifiedWeekOne.weekly:value);
 const selected=weeks[week],days=daysBetween(selected.start,selected.end),cashMap=new Map(cash.map(c=>[c.reference_date,c]));
 const confirmed=week===1?verifiedWeekTwo.cashDays:snapshotFallback&&week===0?verifiedWeekOne.cashDays:days.filter(d=>cashMap.get(d)?.closed_at_18h===true).length;
 const mandatory=days.filter(d=>!holidays.has(d)&&([1,5].includes(new Date(d+"T12:00:00Z").getUTCDay())));
 const mandatoryFailed=mandatory.filter(d=>cashMap.get(d)?.closed_at_18h===false);
 const mandatoryPending=mandatory.filter(d=>cashMap.get(d)?.closed_at_18h===null||!cashMap.has(d));
 const cashPass=week===1?true:snapshotFallback&&week===0?true:confirmed>=3&&mandatoryFailed.length===0&&mandatoryPending.length===0;
 const revenuePass=displayedAmounts[week]>=selected.goal;
 const monthly=verifiedWeekTwo.monthly+amounts.slice(2).reduce((a,b)=>a+b,0);
 const latest=daily[daily.length-1]?.reference_date;
 const prizeReady=revenuePass&&cashPass;
 const ufbraDocs=invoices.filter(i=>i.classification.trim().toLowerCase()==="ufbra");
 const ufbraTotal=ufbraDocs.reduce((sum,i)=>sum+Number(i.amount),0);
 const phase=weekPhase(week);
 const isWeekend=(d:string)=>[0,6].includes(new Date(d+"T12:00:00Z").getUTCDay());
 const progress=(value:number,goal:number)=>Math.max(0,Math.min(100,value/goal*100));
 return <section className="brands">
  <header className="brands-head"><div><span className="brands-kicker">BLUE FRIDAY 2026 / RELACIONAMENTO</span><h1>Marcas</h1><p className="brands-sub">UniAlphaville + UniASP · Felipe e Isabella · atualização manual</p></div><div className="brands-tools"><label htmlFor="br-week">Semana</label><select id="br-week" className="brands-select" aria-label="Selecionar semana" value={week} onChange={e=>setWeek(Number(e.target.value))}>{weeks.map((w,i)=><option key={w.start} value={i}>{CAMPAIGN_WEEKS[i].label}</option>)}</select><button className="brands-button" type="button" onClick={()=>void load()} disabled={loading}>{loading?"Carregando...":"Atualizar dados"}</button><a className="brands-link" href={source} target="_blank" rel="noreferrer">Planilha original ↗</a></div></header>
 {error&&<div className="brands-alert" role="alert">{error}</div>}
 <div className="brands-grid">
  <article className="brands-card"><span className="bf-kpi-title"><span className="bf-kpi-glyph"><DashboardGlyph name="revenue" size={25}/></span><span className="brands-card-label">Receita da semana</span></span><strong className="brands-value">{money(displayedAmounts[week])}</strong><p className="brands-caption">Meta {money(selected.goal)} · {progress(displayedAmounts[week],selected.goal).toFixed(1).replace(".",",")}%</p><div className="brands-track"><div className="brands-fill" style={{width:progress(displayedAmounts[week],selected.goal)+"%"}}/></div></article>
  <article className="brands-card"><span className="bf-kpi-title"><span className="bf-kpi-glyph"><DashboardGlyph name="wallet" size={25}/></span><span className="brands-card-label">Receita do mês</span></span><strong className="brands-value">{money(monthly)}</strong><p className="brands-caption">Meta {money(173650)} · {progress(monthly,173650).toFixed(1).replace(".",",")}%</p><div className="brands-track"><div className="brands-fill" style={{width:progress(monthly,173650)+"%"}}/></div></article>
  <article className="brands-card"><span className="bf-kpi-title"><span className="bf-kpi-glyph"><DashboardGlyph name="calendar" size={25}/></span><span className="brands-card-label">Caixa zerado às 18h</span></span><strong className="brands-value">{confirmed} {confirmed===1?"dia":"dias"}</strong><p className="brands-caption">Mínimo de 3 dias · segundas e sextas obrigatórias</p>{cashPass?status("Critério de caixa atendido","ok"):mandatoryFailed.length?status("Obrigatório não cumprido","bad"):status("Aguardando validação")}</article>
  <article className="brands-card"><span className="bf-kpi-title"><span className="bf-kpi-glyph"><DashboardGlyph name="upload" size={25}/></span><span className="brands-card-label">Atualização dos dados</span></span><strong className="brands-value">{latest?dateBR(latest)+"/2026":snapshotFallback?"Fechamento":"Sem importação"}</strong><p className="brands-caption">{latest?"Última receita diária importada da planilha":snapshotFallback?"Valores do fechamento validado pela equipe; sem lançamento diário":"Nenhuma receita diária importada ainda"}</p>{status("Atualização manual")}</article>
 </div>
 <div className="brands-sections">
  <section className="brands-panel"><h2>Metas e condições da semana</h2><div className="brands-line"><span>Meta de receita</span><strong>{revenuePass?status("Atingida","ok"):phase==="ended"?status("Não atingida","bad"):phase==="future"?status("—","none"):status("Em andamento","wait")}</strong></div><div className="brands-line"><span>Caixa zerado em pelo menos 3 dias</span><strong>{confirmed} {confirmed===1?"dia":"dias"} {confirmed>=3?status("Atingido","ok"):""}</strong></div><div className="brands-line"><span>Segundas e sextas obrigatórias (exceto feriados)</span><strong>{week===1?status("Cumprida · 2 de 2","ok"):snapshotFallback&&week===0?status("Conforme fechamento semanal","ok"):mandatoryFailed.length?status("Não cumprida","bad"):mandatoryPending.length?status("Pendente","wait"):status("Cumprida","ok")}</strong></div><div className="brands-line"><span>Premiação semanal</span><strong>{prizeReady?status("Critérios atingidos · validar pagamento","ok"):mandatoryFailed.length||(phase==="ended"&&!revenuePass)?status("Não liberada","bad"):status("Ainda não liberada","wait")}</strong></div><p className="brands-note">O cumprimento dos critérios não confirma pagamento. Dias adicionais sem fechamento não bloqueiam a premiação quando o mínimo de 3 dias e os dias obrigatórios já foram cumpridos.</p></section>
  <section className="brands-panel"><h2>Premiação por colaborador</h2><div className="brands-people"><div className="brands-person"><h3>Isabella</h3><p>Mensalidades · receita semanal</p><strong>R$ 60</strong><div style={{marginTop:10}}>{prizeReady?status("Critérios atingidos","ok"):phase==="ended"?status("Não liberado","bad"):status("Não liberado")}</div></div><div className="brands-person"><h3>Felipe</h3><p>Pagamentos, conformidade e UFBRA</p><strong>R$ 60</strong><div style={{marginTop:10}}>{prizeReady?status("Critérios atingidos","ok"):phase==="ended"?status("Não liberado","bad"):status("Não liberado")}</div><p style={{marginTop:13}}>Bônus extra UFBRA: R$ 300, condicionado à conciliação e ao faturamento.</p></div></div></section>
 </div>
 <div className="brands-sections">
  <section className="brands-panel"><h2>Caixa às 18h · dia a dia</h2>{week===1&&<div className="brands-week-confirmed"><strong>✓ Caixa zerado em 5 dias · 2 de 2 dias obrigatórios cumpridos</strong><span>Fechamento oficial da semana 2. A meta de receita não foi atingida, portanto não houve premiação nesta semana.</span></div>}{snapshotFallback&&week===0&&<div className="brands-week-confirmed"><strong>✓ Caixa zerado em {verifiedWeekOne.cashDays} dias (mínimo de 3)</strong><span>Fechamento da semana 1 validado pela equipe. As datas de cada fechamento não foram enviadas, por isso os dias abaixo aparecem sem detalhe.</span></div>}<div className="brands-days">{days.map(d=>{const c=cashMap.get(d),holiday=holidays.has(d),mandatoryDay=mandatory.includes(d),ok=week===1?confirmedCashDates.has(d):c?.closed_at_18h===true,failed=week===1?false:c?.closed_at_18h===false;return <div className="brands-day" key={d}><b>{dateBR(d)}</b><small>{holiday?"Feriado":mandatoryDay?"Obrigatório":isWeekend(d)?"Fim de semana":"Dia útil"}</small>{holiday?status("Dispensado"):ok?status("Zerado","ok"):failed?status("Não zerado","bad"):snapshotFallback&&week===0?status("Sem detalhe","none"):d>todayBR()||(isWeekend(d)&&!mandatoryDay)?status("—","none"):status("Sem registro","none")}</div>;})}</div><p className="brands-note">Feriados não contam como obrigatórios.</p></section>
  <section className="brands-panel"><h2>UFBRA · meta especial</h2><span className="bf-kpi-title"><span className="bf-kpi-glyph"><DashboardGlyph name="upload" size={25}/></span><span className="brands-card-label">Valor classificado como UFBRA nas NFs importadas</span></span><strong className="brands-value">{ufbraDocs.length?money(ufbraTotal):"Aguardando NFs"}</strong><p className="brands-caption">Meta de R$ 400.000 · conciliação 15/11 · faturamento até 20/11</p>{ufbraDocs.length>0&&<div className="brands-track"><div className="brands-fill" style={{width:progress(ufbraTotal,400000)+"%"}}/></div>}<div className="brands-line"><span>Conciliação</span>{status("Sem confirmação")}</div><div className="brands-line"><span>Faturamento</span>{status("Sem confirmação")}</div><div className="brands-line"><span>Bônus exclusivo de Felipe</span><strong>R$ 300 · pendente</strong></div><p className="brands-note">Este valor considera apenas NFs classificadas como UFBRA. Não representa a conciliação total e não comprova o cumprimento da meta.</p></section>
 </div>
 {!daily.length&&!loading&&!snapshotFallback&&<div className="brands-alert">Nenhuma receita importada para Marcas.</div>}
 </section>;
}

export { weeks as BRANDS_WEEKS, verifiedWeekOne as BRANDS_WEEK_ONE, verifiedWeekTwo as BRANDS_WEEK_TWO };
