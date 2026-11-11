import {useEffect,useMemo,useState} from "react";
import {supabase} from "./lib/supabase";
type Daily={reference_date:string;quero_pago_unialphaville:number;quero_pago_uniasp:number;pef_unialphaville:number;pef_uniasp:number;synced_at:string};
type Cash={reference_date:string;required:boolean;closed_at_18h:boolean|null;confirmed_at:string|null};
type Invoice={document_key:string;reference_date:string;amount:number;classification:string};
const source="https://docs.google.com/spreadsheets/d/18EhvKH4oBOlZQOH-BHsbP7_kFVCkP3N92pe2gKqp364/edit";
const money=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const weeks=[{start:"2026-11-01",end:"2026-11-08",goal:52095},{start:"2026-11-09",end:"2026-11-15",goal:55568},{start:"2026-11-16",end:"2026-11-22",goal:34730},{start:"2026-11-23",end:"2026-11-30",goal:31257}];
export default function BrandsPanel(){
 const [daily,setDaily]=useState<Daily[]>([]),[cash,setCash]=useState<Cash[]>([]),[invoices,setInvoices]=useState<Invoice[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [week,setWeek]=useState(1);
 async function load(){if(!supabase)return;setLoading(true);const [d,c,i]=await Promise.all([supabase.from("bf_brands_daily").select("*").order("reference_date"),supabase.from("bf_brands_cash").select("*").order("reference_date"),supabase.from("bf_brands_invoices").select("*").order("reference_date")]);setError(d.error?.message||c.error?.message||i.error?.message||"");setDaily((d.data||[]) as Daily[]);setCash((c.data||[]) as Cash[]);setInvoices((i.data||[]) as Invoice[]);setLoading(false);}
 useEffect(()=>{void load();},[]);
 const amounts=useMemo(()=>weeks.map(w=>{const base=daily.filter(r=>r.reference_date>=w.start&&r.reference_date<=w.end).reduce((s,r)=>s+Number(r.quero_pago_unialphaville)+Number(r.quero_pago_uniasp)+Number(r.pef_unialphaville)+Number(r.pef_uniasp),0);const nf=invoices.filter(r=>r.reference_date>=w.start&&r.reference_date<=w.end&&r.classification.toLowerCase()==="mensalidades").reduce((s,r)=>s+Number(r.amount),0);return base+nf;}),[daily,invoices]);
 const selected=weeks[week],weekCash=cash.filter(r=>r.reference_date>=selected.start&&r.reference_date<=selected.end);
 const missing=weekCash.filter(r=>r.closed_at_18h===null),failed=weekCash.filter(r=>r.required&&r.closed_at_18h===false);
 const latest=daily[daily.length-1]?.reference_date;
 return <section className="bf-goal-page"><header className="bf-page-head"><div><small>BLUE FRIDAY 2026 · DADOS IMPORTADOS</small><h1>Marcas</h1><p>UniAlphaville + UniASP · Felipe e Isabella</p></div></header>
 <div className="bf-goal-toolbar"><label>Semana <select value={week} onChange={e=>setWeek(Number(e.target.value))}>{weeks.map((w,i)=><option key={w.start} value={i}>Semana {i+1} · {w.start.slice(8,10)}/{w.start.slice(5,7)} a {w.end.slice(8,10)}/{w.end.slice(5,7)}</option>)}</select></label><button type="button" onClick={()=>void load()}>Atualizar painel</button><a href={source} target="_blank" rel="noreferrer">Abrir planilha</a></div>
 {error&&<p className="bf-notice" role="alert">{error}</p>}
 <div className="bf-goal-grid"><article className="bf-goal-card"><small>Receita da semana</small><strong>{money(amounts[week])}</strong><p>Meta: {money(selected.goal)}</p><span>{(amounts[week]/selected.goal*100).toFixed(1).replace(".",",")}% da meta</span></article><article className="bf-goal-card"><small>Receita do mês</small><strong>{money(amounts.reduce((a,b)=>a+b,0))}</strong><p>Meta: {money(173650)}</p><span>Somente dados sincronizados</span></article><article className="bf-goal-card"><small>Caixa às 18h</small><strong>{weekCash.filter(r=>r.closed_at_18h===true).length} dia(s)</strong><p>{missing.length} pendente(s) · {failed.length} falha(s) em dia obrigatório</p><span>Sem fechamento não significa falha</span></article><article className="bf-goal-card"><small>Atualização da receita</small><strong>{latest?latest.split("-").reverse().join("/"):"Sem dados"}</strong><p>Fonte: Google Sheets, importação manual</p><span>{loading?"Carregando...":"Leitura do Supabase"}</span></article></div>
 <section className="bf-panel" style={{padding:20,marginTop:18}}><h2>Conferência semanal</h2><p>Meta financeira: {amounts[week]>=selected.goal?"Atingida":"Em andamento"}. Caixa: {missing.length?"Aguardando fechamento":failed.length?"Há falha em dia obrigatório":"Aguardando validação completa"}. Premiação de R$ 60 por pessoa depende da confirmação de todas as travas e da homologação.</p><p>UFBRA: {money(invoices.filter(r=>r.classification.toLowerCase()==="ufbra").reduce((s,r)=>s+Number(r.amount),0))} de {money(400000)}. Bônus de Felipe: R$ 300, ainda não homologado.</p><p><small>Os dias futuros e o dia 11/11 antes das 18h permanecem pendentes até confirmação explícita na fonte.</small></p></section>
 {!daily.length&&!loading&&<p className="bf-notice">Ainda não há dados importados para Marcas.</p>}
 </section>;
}
