import {useEffect,useMemo,useState,type FormEvent} from "react";
import {supabase} from "./lib/supabase";
type RecordRow={reference_date:string;requests:number;resolved:number;pending:number;amount:number;source:string;notes:string|null};
const money=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
export default function QueroPagoPanel({isAdmin}:{isAdmin:boolean}){
 const [rows,setRows]=useState<RecordRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [date,setDate]=useState("2026-11-09");
 const [form,setForm]=useState({requests:"",resolved:"",pending:"",amount:"",source:"",notes:""});
 async function reload(){
  if(!supabase){setError("Supabase não configurado.");setLoading(false);return;}
  setLoading(true);const {data,error:e}=await supabase.from("bf_quero_pago_daily").select("reference_date,requests,resolved,pending,amount,source,notes").gte("reference_date","2026-11-01").lte("reference_date","2026-11-30").order("reference_date",{ascending:false});
  if(e)setError("Tabela indisponível. Execute a migração SQL no Supabase da Blue Friday: "+e.message);else{setRows((data??[]) as RecordRow[]);setError("");}
  setLoading(false);
 }
 useEffect(()=>{void reload();},[]);
 const totals=useMemo(()=>rows.reduce((a,r)=>({requests:a.requests+r.requests,resolved:a.resolved+r.resolved,pending:a.pending+r.pending,amount:a.amount+r.amount}),{requests:0,resolved:0,pending:0,amount:0}),[rows]);
 async function submit(e:FormEvent){e.preventDefault();setMessage("");setError("");if(!isAdmin||!supabase)return;
 const counts=[form.requests,form.resolved,form.pending].map(Number);
 const amount=Number(form.amount.replace(",","."));if(counts.some((n,i)=>!Number.isSafeInteger(n)||n<0||form[["requests","resolved","pending"][i] as keyof typeof form]==="")||!Number.isFinite(amount)||amount<0||!form.source.trim()){setError("Preencha números válidos e informe a fonte.");return;}
 if(counts[1]+counts[2]!==counts[0]){setError("Resolvidos + pendentes deve ser igual ao total de solicitações.");return;}
 setSaving(true);const {error:e}=await supabase.from("bf_quero_pago_daily").upsert({reference_date:date,requests:counts[0],resolved:counts[1],pending:counts[2],amount,source:form.source.trim(),notes:form.notes.trim()||null},{onConflict:"reference_date"});
 setSaving(false);if(e){setError("Não foi possível salvar: "+e.message);return;}setMessage("Registro salvo no banco compartilhado.");await reload();
 }
 return <div className="refund-page"><section className="refund-panel"><div className="refund-section-heading"><div><span className="refund-overline">BLUE FRIDAY 2026</span><h2>Quero Pago</h2><p>Apuração operacional diária, com fonte e histórico. Sem números estimados.</p></div></div>
 {loading?<p>Carregando dados...</p>:<><div className="refund-management-kpis"><div><small>Solicitações</small><strong>{totals.requests}</strong></div><div><small>Resolvidas</small><strong>{totals.resolved}</strong></div><div><small>Pendentes</small><strong>{totals.pending}</strong></div><div><small>Valor registrado</small><strong>{money(totals.amount)}</strong></div></div><p>{rows.length} dia(s) com registros. Ausência de dados não significa zero.</p></>}
 {error&&<p role="alert" className="refund-error">{error}</p>}{message&&<p role="status">{message}</p>}
 <button type="button" className="refund-btn refund-btn-light" onClick={()=>void reload()}>Atualizar dados</button>
 <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Data</th><th>Solicitações</th><th>Resolvidas</th><th>Pendentes</th><th>Valor</th><th>Fonte</th></tr></thead><tbody>{rows.map(r=><tr key={r.reference_date}><td>{r.reference_date.split("-").reverse().join("/")}</td><td>{r.requests}</td><td>{r.resolved}</td><td>{r.pending}</td><td>{money(r.amount)}</td><td>{r.source}</td></tr>)}</tbody></table></div></section>
 {isAdmin&&<section className="refund-panel"><h2>Registrar apuração diária</h2><form onSubmit={submit} className="refund-import"><div><label>Data<input type="date" min="2026-11-01" max="2026-11-30" value={date} onChange={e=>setDate(e.target.value)} required/></label>{(["requests","resolved","pending","amount","source","notes"] as const).map(k=><label key={k}>{({requests:"Solicitações",resolved:"Resolvidas",pending:"Pendentes",amount:"Valor (R$)",source:"Fonte dos dados",notes:"Observações"})[k]}<input type={k==="source"||k==="notes"?"text":"number"} step={k==="amount"?"0.01":"1"} min={k==="amount"||k==="requests"||k==="resolved"||k==="pending"?"0":undefined} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} required={k!=="notes"}/></label>)}</div><button className="refund-btn refund-btn-light" disabled={saving} type="submit">{saving?"Salvando...":"Salvar no Supabase"}</button></form></section>}
 </div>;
}
