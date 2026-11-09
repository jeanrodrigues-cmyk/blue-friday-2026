import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Metric = { metric_key: string; metric_value: number; reference_date: string; verified: boolean };
type MpRecord = { reference_date:string; media_queue_cleared:boolean|null; comments_handled:boolean|null; procon_total:number|null; procon_within_24h:number|null; procon_over_24h:number|null; procon_source:string|null; notes:string|null };
type Profile = { role: "admin" | "management" | "collaborator"; active: boolean };
const areas = ["BO e Dados","Reembolso","Mídias e Procon","Recorrência","Chargeback","Resoluções","Quero Pago","Marcas","Reclame Aqui"];

type CsvPreview = { fileName: string; open: number; backlog: number; resolved: number; ingestedAt: string; referenceDate: string };
function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = []; let value = ""; let quoted = false;
  for (let i=0;i<line.length;i++) { const ch=line[i]; if(ch==='"' && line[i+1]==='"' && quoted){value+='"';i++;}else if(ch==='"'){quoted=!quoted;}else if(ch===delimiter && !quoted){values.push(value.trim());value="";}else{value+=ch;} }
  if(quoted) throw new Error("CSV com aspas não fechadas.");
  values.push(value.trim()); return values;
}
function readBoCsv(text: string, fileName: string): CsvPreview {
  const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(l=>l.trim());
  if(lines.length!==2) throw new Error("O CSV deve conter cabeçalho e exatamente uma linha de resultados.");
  const delimiter=lines[0].includes(";")?";":",";
  const headers=parseCsvLine(lines[0],delimiter).map(h=>h.toLowerCase());
  const row=parseCsvLine(lines[1],delimiter);
  const get=(key:string)=>{const index=headers.indexOf(key);if(index<0 || row[index]===undefined)throw new Error("Coluna ausente: "+key);return row[index];};
  const number=(key:string)=>{const raw=get(key);if(!/^\d+$/.test(raw))throw new Error("Valor inválido em "+key);const n=Number(raw);if(!Number.isSafeInteger(n))throw new Error("Número fora do limite em "+key);return n;};
  const ingest=get("ultima_ingestao").trim();
  const timestamp=Date.parse(ingest.replace(" ","T"));
  if(!ingest || !Number.isFinite(timestamp) || !/(Z|[+-]\d{2}:?\d{2})$/i.test(ingest))throw new Error("ultima_ingestao precisa conter data, hora e fuso (ex.: 2026-11-07T04:12:01Z).");
  const date=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
  return {fileName,open:number("bo_em_aberto"),backlog:number("backlog_acima_7_dias"),resolved:number("bos_resolvidos"),ingestedAt:new Date(timestamp).toISOString(),referenceDate:date};
}

function BoIcon({name,size=22}:{name:string;size?:number}) {
  const common={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true as const};
  const paths:Record<string,React.ReactNode>={
    layers:<><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6h5"/></>,
    check:<><circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/></>,
    target:<><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 9-9m-5 0h5v5"/></>,
    chart:<><path d="M3 20h18M5 16h3v4H5zM11 10h3v10h-3zM17 4h3v16h-3z"/></>,
    calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    document:<><path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    trophy:<><path d="M8 4h8v7a4 4 0 0 1-8 0V4ZM8 6H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 15v4m-4 2h8"/></>,
    logout:<><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M13 7l5 5-5 5M8 12h10"/></>,
    home:<><path d="m3 11 9-8 9 8v10h-7v-7h-4v7H3z"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="m19 13 2 1-2 4-2-1-2 1v2H9v-2l-2-1-2 1-2-4 2-1v-2l-2-1 2-4 2 1 2-1V4h6v2l2 1 2-1 2 4-2 1z"/></>,
    refresh:<><path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/></>,
    bag:<><path d="M5 8h14l2 13H3L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    shield:<><path d="m12 2 8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/><path d="m8 12 3 3 5-6"/></>,
    trend:<><path d="m3 17 6-6 4 4 8-9M15 6h6v6"/></>
  };
  return <svg {...common}>{paths[name]??paths.chart}</svg>;
}

function BrandIcon({ small = false }: { small?: boolean }) {
  return <div className={small ? "brand-icon brand-icon-small" : "brand-icon"} aria-label="Blue Friday">
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs><linearGradient id="bfGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#25e2ff"/><stop offset="1" stopColor="#2855ff"/></linearGradient></defs>
      <path d="M11 69C30 88 76 78 89 49" stroke="url(#bfGradient)" strokeWidth="6" strokeLinecap="round"/>
      <path d="M17 42C37 18 69 17 83 32" stroke="#16caff" strokeWidth="4" strokeLinecap="round"/>
      <rect x="24" y="51" width="12" height="23" rx="3" fill="#d9edff"/>
      <rect x="41" y="40" width="12" height="34" rx="3" fill="#8dbaff"/>
      <rect x="58" y="29" width="12" height="45" rx="3" fill="#467dff"/>
      <g transform="rotate(17 74 40)"><path d="M64 19H84L92 29V51L72 56L57 44V29Z" fill="url(#bfGradient)" stroke="#58e5ff" strokeWidth="2"/><circle cx="78" cy="28" r="3" fill="#09132e"/><path d="M67 44L82 32M68 34H69M81 43H82" stroke="white" strokeWidth="3.5" strokeLinecap="round"/></g>
    </svg>
  </div>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("Visão geral");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricError, setMetricError] = useState("");
  const [csvPreview,setCsvPreview] = useState<CsvPreview|null>(null);
  const [csvMessage,setCsvMessage] = useState("");
  const [csvBusy,setCsvBusy] = useState(false);
  const [csvDuplicate,setCsvDuplicate] = useState(false);
  const [csvReplaceConfirmed,setCsvReplaceConfirmed] = useState(false);
  const [refreshCount,setRefreshCount] = useState(0);
  const [boTab,setBoTab] = useState<"overview"|"history"|"weekly"|"admin">("overview");
  const [selectedWeek,setSelectedWeek] = useState(0);
  const [mpRecords,setMpRecords] = useState<MpRecord[]>([]);
  const [mpError,setMpError] = useState("");
  const [mpSaving,setMpSaving] = useState(false);
  const [mpDate,setMpDate] = useState("2026-11-09");
  const [mpWeek,setMpWeek] = useState(1);
  const [mpTab,setMpTab] = useState<"overview"|"history"|"weekly"|"admin">("overview");
  const [mpForm,setMpForm] = useState({media:"",comments:"",total:"",within:"",over:"",source:"Cloude",notes:""});
  const [boStart,setBoStart] = useState("2026-11-02");
  const [boEnd,setBoEnd] = useState("2026-11-09");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    let current = true;
    async function load(next: Session | null) {
      setLoading(true);
      setSession(next);
      setProfile(null);
      if (next) {
        const { data, error: profileError } = await client.from("bf_profiles")
          .select("role, active").eq("user_id", next.user.id).maybeSingle();
        if (current) {
          if (profileError) setError("Não foi possível verificar as permissões.");
          setProfile(data?.active ? data as Profile : null);
        }
      }
      if (current) setLoading(false);
    }
    void client.auth.getSession().then(({ data }) => load(data.session));
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      // Evita consultas assíncronas diretamente dentro do callback de Auth.
      setTimeout(() => { if (current) void load(next); }, 0);
    });
    return () => { current = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !session || !profile || view !== "BO e Dados") return;
    let mounted = true;
    void supabase.from("bf_daily_metrics").select("metric_key,metric_value,reference_date,verified")
      .eq("area_name","BO e Dados")
      .order("reference_date",{ascending:false}).limit(500)
      .then(({data,error}) => {
        if (!mounted) return;
        setMetrics((data ?? []) as Metric[]);
        setMetricError(error ? "Falha ao consultar o histórico de indicadores." : "");
      });
    return () => { mounted = false; };
  }, [session,profile,view,refreshCount]);

  useEffect(()=>{
    if(!supabase||!session||!profile||view!=="Mídias e Procon")return;
    let active=true;
    void supabase.from("bf_media_procon_daily").select("reference_date,media_queue_cleared,comments_handled,procon_total,procon_within_24h,procon_over_24h,procon_source,notes").gte("reference_date","2026-11-04").lte("reference_date","2026-11-30").order("reference_date",{ascending:false}).then(({data,error})=>{if(active){setMpRecords((data??[]) as MpRecord[]);setMpError(error?"Não foi possível carregar os registros. Execute a migration SQL no Supabase e verifique suas permissões.":"");}});
    return ()=>{active=false;};
  },[session,profile,view,refreshCount]);
  useEffect(()=>{
    const rec=mpRecords.find(r=>r.reference_date===mpDate);
    setMpForm({media:rec?.media_queue_cleared===null||rec?.media_queue_cleared===undefined?"":rec.media_queue_cleared?"yes":"no",comments:rec?.comments_handled===null||rec?.comments_handled===undefined?"":rec.comments_handled?"yes":"no",total:rec?.procon_total===null||rec?.procon_total===undefined?"":String(rec.procon_total),within:rec?.procon_within_24h===null||rec?.procon_within_24h===undefined?"":String(rec.procon_within_24h),over:rec?.procon_over_24h===null||rec?.procon_over_24h===undefined?"":String(rec.procon_over_24h),source:rec?.procon_source??"Cloude",notes:rec?.notes??""});
  },[mpDate,mpRecords]);
  async function saveMp(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!supabase||!session||profile?.role!=="admin")return;
    const hasProcon=[mpForm.total,mpForm.within,mpForm.over].some(v=>v!=="");
    if(hasProcon&&(![mpForm.total,mpForm.within,mpForm.over].every(v=>/^\d+$/.test(v))||Number(mpForm.total)!==Number(mpForm.within)+Number(mpForm.over))){setMpError("Procon: preencha os três totais com números inteiros. Dentro de 24h + fora de 24h deve ser igual ao total.");return;}
    setMpSaving(true);setMpError("");
    const row={reference_date:mpDate,media_queue_cleared:mpForm.media===""?null:mpForm.media==="yes",comments_handled:mpForm.comments===""?null:mpForm.comments==="yes",procon_total:hasProcon?Number(mpForm.total):null,procon_within_24h:hasProcon?Number(mpForm.within):null,procon_over_24h:hasProcon?Number(mpForm.over):null,procon_source:mpForm.source.trim()||null,notes:mpForm.notes.trim()||null,recorded_by:session.user.id};
    const {error}=await supabase.from("bf_media_procon_daily").upsert(row,{onConflict:"reference_date"});
    setMpSaving(false);if(error){setMpError("Não foi possível salvar: "+error.message);return;}setRefreshCount(n=>n+1);
  }
  async function chooseCsv(file?:File) {
    setCsvPreview(null);setCsvMessage("");setCsvDuplicate(false);setCsvReplaceConfirmed(false);
    if(!file)return;
    if(file.size>100000) {setCsvMessage("Arquivo muito grande. Exporte apenas a linha agregada da consulta.");return;}
    try {setCsvPreview(readBoCsv(await file.text(),file.name));}
    catch(e){setCsvMessage(e instanceof Error?e.message:"Não foi possível ler o CSV.");}
  }
  async function importCsv(replaceExisting = false) {
    if(!supabase || !csvPreview || profile?.role!=="admin")return;
    if(replaceExisting && (!csvDuplicate || !csvReplaceConfirmed)) {setCsvMessage("Confirme a substituição antes de continuar.");return;}
    setCsvBusy(true);setCsvMessage("");
    try {
      const {data,error:importError}=await supabase.rpc(replaceExisting ? "bf_update_bo_csv" : "bf_import_bo_csv",{
        p_reference_date:csvPreview.referenceDate,
        p_file_name:csvPreview.fileName,
        p_bo_open:csvPreview.open,
        p_bo_backlog:csvPreview.backlog,
        p_bo_resolved:csvPreview.resolved,
        p_ingested_at:csvPreview.ingestedAt,
        ...(replaceExisting ? {p_confirm_replace:true} : {})
      });
      if(importError)throw importError;
      setCsvMessage((replaceExisting ? "Atualização auditada concluída. Lote: " : "Importação concluída. Lote: ")+String(data));
      setCsvPreview(null);setCsvDuplicate(false);setCsvReplaceConfirmed(false);setRefreshCount(v=>v+1);
    }catch(e){
      const details = e && typeof e === "object" && "message" in e ? String(e.message) : "Falha inesperada ao importar.";
      if (/Ja existem indicadores nesta data|Já existem indicadores nesta data/i.test(details)) {
        setCsvDuplicate(true);
        setCsvMessage("Já existem indicadores nesta data. Nenhum dado foi alterado. Confira os valores e confirme a atualização auditada abaixo.");
      } else {
        setCsvMessage("Importação não realizada: " + details);
      }
    }
    finally{setCsvBusy(false);}
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) setError("Não foi possível entrar. Confira seu e-mail e senha.");
    setBusy(false);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setPassword(""); setError("");
  }

  if (!supabase) return <main className="shell"><section className="auth-card"><h1>Blue Friday 2026</h1><p>Configuração pendente: adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ao ambiente local.</p></section></main>;
  if (loading) return <main className="shell"><section className="auth-card"><h1>Blue Friday 2026</h1><p>Verificando acesso...</p></section></main>;
  if (!session || !profile) return <main className="login-page login-light">
    <div className="login-wave login-wave-top" aria-hidden="true" />
    <div className="login-wave login-wave-bottom" aria-hidden="true" />
    <div className="login-dots login-dots-top" aria-hidden="true" />
    <div className="login-dots login-dots-right" aria-hidden="true" />
    <svg className="login-chart-line login-chart-line-left" viewBox="0 0 440 240" fill="none" aria-hidden="true"><path d="M0 166 68 197 142 120 208 202 288 137 334 145 440 32" stroke="currentColor" strokeWidth="2"/><g fill="currentColor"><circle cx="68" cy="197" r="5"/><circle cx="142" cy="120" r="5"/><circle cx="208" cy="202" r="5"/><circle cx="288" cy="137" r="5"/><circle cx="334" cy="145" r="5"/></g></svg>
    <svg className="login-chart-line login-chart-line-top" viewBox="0 0 440 240" fill="none" aria-hidden="true"><path d="M0 207 85 112 168 164 268 42 334 68 440 0" stroke="currentColor" strokeWidth="2"/><g fill="currentColor"><circle cx="85" cy="112" r="5"/><circle cx="168" cy="164" r="5"/><circle cx="268" cy="42" r="5"/><circle cx="334" cy="68" r="5"/></g></svg>
    <div className="login-watermark" aria-hidden="true"><div className="watermark-bars"><i/><i/><i/><i/></div><svg viewBox="0 0 160 160" fill="none"><path d="M12 133C68 122 109 78 143 17M108 20l35-3-3 36" stroke="currentColor" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
    <div className="login-content">
      <div className="login-heading"><BrandIcon /><h1>Blue Friday <span>2026</span></h1><p>Dashboard de Performance da Campanha</p><div className="heading-accent" aria-hidden="true"/></div>
      <section className="login-panel">
        <p className="login-eyebrow">ACESSO AO SISTEMA</p>
        <h2>{session ? "Acesso restrito" : "Entrar na campanha"}</h2>
        <p className="login-helper">{session ? "Seu acesso precisa ser liberado pela administração." : "Use seu e-mail corporativo para acessar o Blue Friday 2026."}</p>
        {session ? <><p className="login-note">Sua conta ainda não tem um perfil ativo.</p><button className="login-submit" onClick={signOut}>Sair</button></> :
        <form className="login-form" onSubmit={signIn}>
          <label className="login-input-group" htmlFor="email"><span>E-mail</span><span className="login-field"><span className="field-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg></span><input id="email" placeholder="Digite seu e-mail" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} /></span></label>
          <label className="login-input-group" htmlFor="password"><span>Senha</span><span className="login-field"><span className="field-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg></span><input id="password" placeholder="Digite sua senha" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /><button className="password-toggle" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{showPassword && <path d="M3 21 21 3"/>}</svg></button></span></label>
          <button className="login-submit" type="submit" disabled={busy}>{busy ? "Entrando..." : "Entrar no sistema →"}</button>
        </form>}
        {error && <p role="alert" className="login-error">{error}</p>}
        <div className="login-security"><span className="security-icon" aria-hidden="true">ⓘ</span><div><strong>Acesso restrito à equipe da campanha</strong><small>Blue Friday 2026 · Quero Bolsa</small></div></div>
      </section>
    </div>
  </main>;

  const cards = [
    {key:"bo_open",name:"BOs em aberto",tone:"blue",symbol:"layers",description:"Casos pendentes na operação"},
    {key:"bo_over_7_days",name:"Backlog acima de 7 dias",tone:"red",symbol:"clock",description:"Casos abertos há mais de 7 dias"},
    {key:"bo_resolved",name:"BOs resolvidos",tone:"green",symbol:"check",description:"Acumulado desde janeiro de 2026"}
  ];
  const history = Array.from(new Set(metrics.map(m=>m.reference_date))).sort().reverse().map(date=>{
    const entries=metrics.filter(m=>m.reference_date===date);
    const get=(key:string)=>entries.find(m=>m.metric_key===key)?.metric_value;
    return {date,open:get("bo_open"),backlog:get("bo_over_7_days"),resolved:get("bo_resolved"),verified:entries.length>=3&&["bo_open","bo_over_7_days","bo_resolved"].every(key=>entries.some(m=>m.metric_key===key&&m.verified)),partial:entries.length<3||["bo_open","bo_over_7_days","bo_resolved"].some(key=>!entries.some(m=>m.metric_key===key))};
  });
  const fmt=(value:number|undefined)=>value===undefined?"—":new Intl.NumberFormat("pt-BR").format(Number(value));
  const datePt=(value:string)=>value.split("-").reverse().join("/");
  const validRange=Boolean(boStart&&boEnd&&boStart<=boEnd);
  const shownHistory=validRange?history.filter(h=>h.date>=boStart&&h.date<=boEnd):[];
  const selected=shownHistory[0];
  // A missão usa sempre a semana oficial, independentemente do filtro livre.
  const weekRows=history.filter(h=>h.date>="2026-11-09"&&h.date<="2026-11-13");
  const weekFirst=weekRows[weekRows.length-1];
  const weekLast=weekRows[0];
  const weekRemaining=weekLast?.backlog===undefined?null:Number(weekLast.backlog);
  const weekChange=weekFirst?.backlog===undefined||weekRemaining===null?null:weekRemaining-Number(weekFirst.backlog);
  const weekHasClosing=weekRows.some(h=>h.date==="2026-11-13");
  const weekAllVerified=weekRows.length>0&&weekRows.every(h=>h.verified);
  const weekReduction=weekFirst?.backlog===undefined||weekRemaining===null?null:Number(weekFirst.backlog)-weekRemaining;
  const weekProgress=weekReduction===null?0:Number(weekFirst?.backlog)===0?100:Math.max(0,Math.min(100,weekReduction/Number(weekFirst?.backlog)*100));
  const weekReductionPercent=weekReduction===null||Number(weekFirst?.backlog)===0?null:(weekReduction ?? 0)/Number(weekFirst?.backlog)*100;
  const campaignWeeks = [{start:"2026-11-04",end:"2026-11-06",label:"Semana 1 · 04 a 06/11"},{start:"2026-11-09",end:"2026-11-13",label:"Semana 2 · 09 a 13/11"},{start:"2026-11-16",end:"2026-11-20",label:"Semana 3 · 16 a 20/11"},{start:"2026-11-23",end:"2026-11-27",label:"Semana 4 · 23 a 27/11"}];
  const weeklyResults=campaignWeeks.map(w=>{
    const rows=history.filter(h=>h.date>=w.start&&h.date<=w.end);
    const close=rows.find(h=>h.date===w.end);
    const earliest=rows[rows.length-1];
    const last=rows[0];
    const closed=Boolean(close?.verified&&close.backlog!==undefined);
    const hit=closed&&Number(close?.backlog)===0;
    return {...w,rows,close,earliest,last,closed,hit,eligible:closed?(hit?"Meta atingida":"Meta não atingida"):"Aguardando fechamento"};
  });
  const weeklySelected=weeklyResults[selectedWeek]??weeklyResults[0];
  const unverifiedDays=shownHistory.filter(h=>!h.verified).length;
  const productivity=[...shownHistory].reverse().map((h,i,arr)=>{
    const prior=arr[i-1];
    const difference=h.resolved===undefined||prior?.resolved===undefined?null:Number(h.resolved)-Number(prior.resolved);
    return {date:h.date,cumulative:h.resolved,change:difference!==null&&difference>=0?difference:null,verified:h.verified&&Boolean(prior?.verified)};
  }).reverse();
  const baseline=shownHistory[shownHistory.length-1];
  const chosenDate=selected?.date;
  const chartHistory=shownHistory.filter(h=>h.backlog!==undefined).slice(0,31).reverse();
  const delta=(key:"open"|"backlog"|"resolved")=>{
    const now=selected?.[key],before=baseline?.[key];
    return now===undefined||before===undefined||shownHistory.length<2?null:Number(now)-Number(before);
  };
  const percentage=(key:"open"|"backlog"|"resolved")=>{
    const change=delta(key),before=baseline?.[key];
    return change===null||before===undefined||Number(before)===0?null:change/Number(before)*100;
  };
  const chartValues=chartHistory.map(h=>Number(h.backlog??0));
  const chartMin=chartValues.length?Math.max(0,Math.floor((Math.min(...chartValues)-5)/10)*10):0;
  const chartMax=chartValues.length?Math.max(chartMin+10,Math.ceil((Math.max(...chartValues)+5)/10)*10):10;
  const chartPoints=chartValues.map((value,i)=>({x:42+i*(620/Math.max(1,chartValues.length-1)),y:200-(value-chartMin)/(chartMax-chartMin)*160,value,date:chartHistory[i].date}));
  const chartPath=chartPoints.map((p,i)=>(i===0?"M":"L")+p.x+" "+p.y).join(" ");
  const chartArea=chartPoints.length>1?chartPath+" L "+chartPoints[chartPoints.length-1].x+" 210 L "+chartPoints[0].x+" 210 Z":"";
  const currentMetric=(key:string)=>selected?.[key==="bo_open"?"open":key==="bo_resolved"?"resolved":"backlog"];
  const newestIngest="07/11/2026, 01h12"; // Última ingestão conhecida, não é atualização em tempo real.
  return <main className="bf-layout">
    <aside className="bf-side bf-side-light" aria-label="Navegação principal">
      <div className="bf-brand"><BrandIcon small/><div><strong>BLUE <span>FRIDAY</span></strong><small>Performance 2026</small></div></div>
      <p className="bf-menu-label">NAVEGAÇÃO</p>
      <button type="button" aria-current={view==="Visão geral"?"page":undefined} className={view==="Visão geral"?"bf-menu selected":"bf-menu"} onClick={()=>setView("Visão geral")}><span className="bf-menu-icon"><BoIcon name="home" size={19}/></span><span className="bf-menu-text">Visão geral</span></button>
      <p className="bf-menu-label">ÁREAS</p>
      {(profile.role==="collaborator"?["Minha performance"]:areas).map(area=>{
        const iconName:Record<string,string>={"BO e Dados":"layers","Reembolso":"refresh","Mídias e Procon":"shield","Recorrência":"calendar","Chargeback":"bag","Resoluções":"check","Quero Pago":"chart","Marcas":"target","Reclame Aqui":"document","Minha performance":"trend"};
        return <button type="button" key={area} aria-current={view===area?"page":undefined} className={view===area?"bf-menu selected":"bf-menu"} onClick={()=>setView(area)}><span className="bf-menu-icon"><BoIcon name={iconName[area]??"chart"} size={19}/></span><span className="bf-menu-text">{area}</span>{area==="BO e Dados"&&<span className="bf-new">NOVO</span>}<span className="bf-menu-chevron" aria-hidden="true">›</span></button>;
      })}
      <div className="bf-side-bottom"><span className="bf-online-dot"/> Sessão autenticada</div>
    </aside>
    <div className="bf-workspace"><header className="bf-top"><nav className="bf-breadcrumb" aria-label="Localização atual"><button className="bf-breadcrumb-home" type="button" aria-label="Ir para Visão geral" onClick={()=>setView("Visão geral")}><BoIcon name="home" size={17}/></button><button className="bf-breadcrumb-root" type="button" onClick={()=>setView("Visão geral")}>Blue Friday 2026</button><span className="bf-breadcrumb-separator" aria-hidden="true">›</span><span className="bf-breadcrumb-current">{view}</span></nav><div className="bf-top-actions"><span className="bf-user-role"><BoIcon name="shield" size={16}/>{profile.role==="admin"?"Administrador":profile.role==="management"?"Gestão":"Colaborador"}</span><span className="bf-top-divider" aria-hidden="true"/><button className="bf-top-signout" type="button" onClick={signOut}><BoIcon name="logout" size={16}/> Sair</button></div></header>
      {view==="BO e Dados"?<div className="bf-body bo-executive bo-v2">
        <section className="bo-hero bo-hero-refined"><div className="bo-hero-main"><span className="bo-hero-kicker"><span className="bo-kicker-dot"/> BLUE FRIDAY 2026 <span className="bo-kicker-separator">/</span> PAINEL DE PERFORMANCE</span><h1>BO e Dados</h1><p>Acompanhamento operacional, indicadores e evolução da missão semanal.</p></div><div className="bo-hero-side"><div className="bo-hero-info"><span className="bo-hero-info-icon"><BoIcon name="calendar" size={20}/></span><small>Semana da campanha<strong>09 a 13 de novembro</strong></small></div><div className="bo-hero-info"><span className="bo-hero-info-icon"><BoIcon name="refresh" size={19}/></span><small>Dados extraídos em<strong>{newestIngest}</strong></small></div></div></section>
        <div className="bo-nav"><div className="bo-tabs"><button className={boTab==="overview"?"active":""} onClick={()=>setBoTab("overview")}><BoIcon name="home" size={18}/> Visão geral</button><button className={boTab==="history"?"active":""} onClick={()=>setBoTab("history")}><BoIcon name="chart" size={18}/> Evolução diária</button><button className={boTab==="weekly"?"active":""} onClick={()=>setBoTab("weekly")}><BoIcon name="trophy" size={18}/> Resultados semanais</button>{profile.role==="admin"&&<button className={boTab==="admin"?"active":""} onClick={()=>setBoTab("admin")}><BoIcon name="settings" size={18}/> Administração</button>}</div><div className="bo-nav-actions"><div className="bo-range-filter" role="group" aria-label="Filtrar período"><BoIcon name="calendar" size={18}/><label>De <input aria-label="Data inicial" type="date" value={boStart} onChange={e=>setBoStart(e.target.value)}/></label><label>Até <input aria-label="Data final" type="date" value={boEnd} onChange={e=>setBoEnd(e.target.value)}/></label><button type="button" onClick={()=>{setBoStart("2026-11-02");setBoEnd("2026-11-09");}}>Restaurar</button></div><button className="bo-refresh" onClick={()=>setRefreshCount(v=>v+1)}><BoIcon name="refresh" size={18}/> Atualizar painel</button></div></div>
        {validRange&&<div className="bo-quality-strip" role="status"><span className="bo-quality-label"><BoIcon name="shield" size={18}/><strong>Qualidade dos dados</strong> {unverifiedDays>0?unverifiedDays+" de "+shownHistory.length+" datas pendentes de validação":"Todas as datas completas e validadas"}</span><span className="bo-quality-latest">Último registro: <strong>{history[0]?.date?datePt(history[0].date):"indisponível"}</strong></span></div>}
        {!validRange&&<p className="bo-range-error" role="alert">A data inicial precisa ser anterior ou igual à data final.</p>}{validRange&&shownHistory.length===0&&<p className="bo-range-error" role="status">Não há registros para esse período. Selecione datas com dados importados.</p>}
        {boTab==="weekly"&&<section className="bf-panel bo-weekly-panel"><div className="bo-section-head"><div><h2><BoIcon name="trophy" size={23}/> Resultados semanais</h2><p>Resumo para gestão, com evidências de fechamento e situação das missões.</p></div><label className="bo-weekly-selector">Semana <select value={selectedWeek} onChange={e=>setSelectedWeek(Number(e.target.value))}>{campaignWeeks.map((w,i)=><option value={i} key={w.start}>{w.label}</option>)}</select></label></div>
  <div className="bo-weekly-summary"><article><small>Backlog no fechamento</small><strong>{fmt(weeklySelected.close?.backlog)}</strong><span>Meta: zero BOs acima de 7 dias</span></article><article><small>Variação no período</small><strong>{weeklySelected.earliest?.backlog!==undefined&&weeklySelected.last?.backlog!==undefined?fmt(Number(weeklySelected.last.backlog)-Number(weeklySelected.earliest.backlog)):"—"}</strong><span>Diferença entre registros disponíveis</span></article><article><small>Resultado da missão principal</small><strong className={weeklySelected.hit?"bo-weekly-good":weeklySelected.closed?"bo-weekly-bad":"bo-weekly-wait"}>{weeklySelected.eligible}</strong><span>{weeklySelected.closed?"Fechamento registrado e validado":"Sem fechamento validado em "+datePt(weeklySelected.end)}</span></article></div>
  <div className="bo-weekly-missions"><h3>Conferência das metas e premiações</h3><div className="bo-weekly-mission"><div><strong>BOs acima de 7 dias zerados</strong><small>Conferido pelo indicador no fechamento semanal</small></div><span className={weeklySelected.hit?"bo-weekly-tag good":weeklySelected.closed?"bo-weekly-tag bad":"bo-weekly-tag"}>{weeklySelected.eligible}</span><b>R$ 60/semana</b></div><div className="bo-weekly-mission"><div><strong>Dashboard e atualização até as 10h</strong><small>Requer confirmação da entrega e das atualizações de cada dia útil</small></div><span className="bo-weekly-tag">Sem evidência registrada</span><b>R$ 20/semana</b></div><div className="bo-weekly-mission"><div><strong>Hub do Reclame Aqui</strong><small>Entrega completa até 30/11, condicionada à missão de BO</small></div><span className="bo-weekly-tag">Aguardando entrega</span><b>R$ 200 no mês</b></div></div>
  <div className="bo-weekly-foot"><BoIcon name="shield" size={19}/><p><strong>Premiação não homologada.</strong> O resultado do backlog é calculado apenas com o registro validado do último dia da semana. O sistema ainda não possui evidências das atualizações até as 10h ou aprovação da liderança, portanto não confirma pagamentos.</p></div>
  <div className="bo-table-scroll"><table className="bo-table"><thead><tr><th>Data</th><th>BOs em aberto</th><th>Backlog acima de 7 dias</th><th>Resolvidos acumulados</th><th>Qualidade</th></tr></thead><tbody>{weeklySelected.rows.length?weeklySelected.rows.map(h=><tr key={h.date}><td>{datePt(h.date)}</td><td>{fmt(h.open)}</td><td>{fmt(h.backlog)}</td><td>{fmt(h.resolved)}</td><td>{h.verified?"Validado":"Pendente"}</td></tr>):<tr><td colSpan={5}>Sem registros para esta semana.</td></tr>}</tbody></table></div>
</section>}
        {boTab==="overview"&&<>
          <div className="bo-v2-kpis">{cards.map(c=>{const key=c.key==="bo_open"?"open":c.key==="bo_resolved"?"resolved":"backlog";const change=percentage(key);const diff=delta(key);const improving=change!==null&&(key==="resolved"?change>=0:change<=0);return <article className={"bo-v2-kpi "+c.tone} key={c.key}><div className="bo-kpi-icon"><BoIcon name={c.symbol} size={34}/></div><div className="bo-kpi-body"><span>{c.name}</span><strong>{fmt(currentMetric(c.key))}</strong><small>{c.description}</small></div><div className={"bo-kpi-change "+(change===null?"neutral":improving?"good":"bad")}>{change===null?"Sem comparação":(change>0?"↑ ":change<0?"↓ ":"")+Math.abs(change).toFixed(1).replace(".",",")+"%"}<small>{diff===null?"Sem base no período":(diff>0?"+":"")+fmt(diff)+" casos no período"}</small></div></article>})}</div>
          <div className="bo-v2-main"><section className="bf-panel bo-v2-mission"><div className="bo-section-head"><div><h2><BoIcon name="target" size={23}/> Desafio da semana</h2><p>Zerar BOs acima de 7 dias</p><small>09 a 13 de novembro</small></div><span className="bf-status"><BoIcon name="trophy" size={16}/> Em acompanhamento</span></div><div className="bo-mission-goal bo-mission-three"><div><strong>{fmt(weekFirst?.backlog)}</strong><small>Primeiro registro da semana</small></div><span>→</span><div><strong>{fmt(weekLast?.backlog)}</strong><small>Último registro da semana</small></div><span>→</span><div><strong>0</strong><small>Meta: zerar backlog</small></div></div><div className="bo-v2-progress" role="progressbar" aria-label="Progresso da redução do backlog na semana" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(weekProgress)}><div style={{width:weekProgress+"%"}}/></div><div className="bo-period-improvement"><BoIcon name="trend" size={20}/><strong>{weekReduction===null?"Aguardando primeiro registro da semana":weekReduction>0?fmt(weekReduction)+" casos a menos":weekReduction<0?fmt(Math.abs(weekReduction))+" casos a mais":"0 casos de redução nesta semana"}</strong><span>{weekReductionPercent===null?"Sem base semanal para comparação":Math.abs(weekReductionPercent).toFixed(1).replace(".",",")+"% de "+((weekReduction ?? 0)>0?"redução":(weekReduction ?? 0)<0?"aumento":"variação")+" na semana (09 a 13/11)"}</span></div><div className="bo-v2-mission-foot"><span>Meta: <strong>0 BOs acima de 7 dias</strong></span><span>Prêmio previsto: <strong>R$ 60,00</strong></span></div><p className="bo-v2-fineprint">{weekRemaining===null?"Sem dados desta semana.":"Faltam "+fmt(weekRemaining)+" BOs para zerar o backlog."} {weekChange===null?"Comparação semanal indisponível.":"Variação semanal: "+(weekChange>0?"+":"")+fmt(weekChange)+" casos."} {weekHasClosing?"Registro de sexta-feira disponível.":"Aguardando fechamento de 13/11."} {weekAllVerified?"Dados marcados como validados.":"Dados ainda não integralmente validados."} Premiação sujeita à aprovação.</p></section>
          <section className="bf-panel bo-v2-chart"><div className="bo-section-head"><div><h2><BoIcon name="chart" size={23}/> Evolução do backlog</h2><p>BOs acima de 7 dias · {boStart?datePt(boStart):"?"} a {boEnd?datePt(boEnd):"?"}</p></div><button className="bo-link" onClick={()=>setBoTab("history")}>Ver histórico →</button></div>{chartPoints.length>1?<><div className="bo-chart-container"><svg viewBox="0 0 710 245" role="img" aria-label="Gráfico de evolução do backlog por data"><defs><linearGradient id="boChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3678f6" stopOpacity=".24"/><stop offset="1" stopColor="#3678f6" stopOpacity=".02"/></linearGradient></defs>{[0,1,2,3,4].map(i=><g key={i}><line x1="42" x2="675" y1={40+i*40} y2={40+i*40} stroke="#e6edf8"/><text x="5" y={44+i*40} fill="#7a8ca6" fontSize="12">{Math.round(chartMax-(chartMax-chartMin)*i/4)}</text></g>)}<path d={chartArea} fill="url(#boChartFill)"/><path d={chartPath} fill="none" stroke="#2863ed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{chartPoints.map(p=><g key={p.date}><circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#2863ed" strokeWidth="3"/><text x={p.x} y={p.y-13} textAnchor="middle" fill="#18365c" fontSize="13" fontWeight="700">{p.value}</text><text x={p.x} y="237" textAnchor="middle" fill="#6e82a0" fontSize="12">{p.date.slice(8,10)+"/"+p.date.slice(5,7)}</text></g>)}</svg></div><div className="bo-chart-insight">{percentage("backlog")===null?"Comparação indisponível":(percentage("backlog")!<=0?"Redução":"Variação")+" de "+Math.abs(percentage("backlog")!).toFixed(1).replace(".",",")+"% no período selecionado"}</div></>:<div className="bo-empty"><strong>Histórico em construção</strong><p>Importe os próximos dias para acompanhar a evolução real. Nenhum valor é estimado.</p></div>}</section></div>
          <section className="bo-special-missions" aria-label="Missões especiais de BO e Dados">
            <div className="bo-special-heading"><div><span className="bo-special-eyebrow">BLUE FRIDAY 2026 · BO E DADOS</span><h2><BoIcon name="trophy" size={24}/> Minhas missões especiais</h2><p>Além da meta semanal de BO, acompanhe as duas entregas adicionais da campanha.</p></div><span className="bo-special-count">2 desafios adicionais</span></div>
            <div className="bo-special-grid">
              <article className="bo-special-card"><div className="bo-special-card-top"><span className="bo-special-icon"><BoIcon name="chart" size={25}/></span><span className="bo-special-pending">Aguardando confirmação</span></div><h3>Dashboard da campanha</h3><p>Disponibilizar até <strong>13/11</strong> o acompanhamento com gamificação e resultados do time, mantendo os dados do dia anterior atualizados até as <strong>10h de cada dia útil</strong>.</p><div className="bo-special-card-bottom"><div><strong>R$ 20</strong><small>por semana elegível</small></div><span>Prazo: 13/11</span></div><p className="bo-special-condition"><BoIcon name="shield" size={16}/> Depende de BOs acima de 7 dias zerados e da confirmação da atualização semanal.</p></article>
              <article className="bo-special-card"><div className="bo-special-card-top"><span className="bo-special-icon"><BoIcon name="document" size={25}/></span><span className="bo-special-pending">Aguardando entrega</span></div><h3>Hub do Reclame Aqui</h3><p>Entregar até <strong>30/11</strong> os quatro recursos previstos:</p><ul><li>Dados integrados à API do Reclame Aqui</li><li>Calculadora de reputação</li><li>Consulta de todas as reclamações</li><li>Indicadores individuais de performance</li></ul><div className="bo-special-card-bottom"><div><strong>R$ 200</strong><small>no fim do mês</small></div><span>Prazo: 30/11</span></div><p className="bo-special-condition"><BoIcon name="shield" size={16}/> Entrega parcial não conta. Prêmio condicionado à meta principal de BO.</p></article>
            </div>
            <div className="bo-special-lock"><BoIcon name="shield" size={21}/><div><strong>Condição para as premiações extras</strong><p>{weekLast?.backlog===0&&weekHasClosing&&weekAllVerified?"O registro de fechamento semanal indica backlog zerado. As entregas extras e as premiações ainda exigem confirmação.":"É necessário zerar os BOs com mais de 7 dias no fechamento semanal. "+(weekLast?.backlog===null||weekLast?.backlog===undefined?"Sem registro semanal para verificar a condição.":"Último registro semanal: "+fmt(weekLast.backlog)+" BOs acima de 7 dias.")} Nenhum prêmio é liberado automaticamente.</p></div></div>
          </section>
          <section className="bf-panel bo-productivity"><div className="bo-section-head"><div><h2><BoIcon name="trend" size={23}/> Produtividade diária</h2><p>Diferença entre totais acumulados de BOs resolvidos</p></div></div><p className="bo-v2-fineprint">Estimativa por variação de acumulados, não representa eventos diários auditados nem produtividade individual.</p><div className="bo-table-scroll"><table className="bo-table"><thead><tr><th>Data</th><th>Resolvidos acumulados</th><th>Variação diária estimada</th><th>Qualidade</th></tr></thead><tbody>{productivity.map(p=><tr key={p.date}><td>{datePt(p.date)}</td><td>{fmt(p.cumulative)}</td><td>{p.change===null?"Sem comparação":"+"+fmt(p.change)}</td><td><span className={"bo-data-badge "+(p.verified?"validated":"reconstructed")}>{p.verified?"Validado":"Não validado"}</span></td></tr>)}</tbody></table></div></section>
          <div className="bo-period-summary"><strong><BoIcon name="chart" size={21}/> Resumo do período</strong><span>Backlog inicial <b>{fmt(baseline?.backlog)}</b></span><span>Backlog final <b>{fmt(selected?.backlog)}</b></span><span>Variação <b>{delta("backlog")===null?"—":(delta("backlog")!>0?"+":"")+fmt(delta("backlog")!)}</b></span><span>Percentual <b>{percentage("backlog")===null?"—":percentage("backlog")!.toFixed(1).replace(".",",")+"%"}</b></span></div><div className="bo-v2-bottom"><section className="bf-panel"><div className="bo-section-head"><div><h2><BoIcon name="document" size={23}/> Últimos registros</h2><p>Indicadores importados e preservados</p></div><button className="bo-link" onClick={()=>setBoTab("history")}>Ver todos →</button></div>{shownHistory.length?<div className="bo-table-scroll"><table className="bo-table"><thead><tr><th>Referência</th><th>Em aberto</th><th>Backlog &gt; 7 dias</th><th>Resolvidos</th><th>Variação backlog</th><th>Origem</th></tr></thead><tbody>{shownHistory.slice(0,4).map(h=><tr key={h.date}><td>{datePt(h.date)}</td><td>{fmt(h.open)}</td><td><strong>{fmt(h.backlog)}</strong></td><td>{fmt(h.resolved)}</td><td>{(()=>{const idx=history.findIndex(x=>x.date===h.date);const old=history[idx+1];if(old?.backlog===undefined||!Number(old.backlog))return "—";const pct=(Number(h.backlog)-Number(old.backlog))/Number(old.backlog)*100;return <span className={"bo-table-delta "+(pct<=0?"good":"bad")}>{pct>0?"↑":"↓"} {Math.abs(pct).toFixed(1).replace(".",",")}%</span>})()}</td><td><span className={"bo-data-badge "+(h.verified?"validated":"reconstructed")}>{h.verified?"Validado":"Reconstruído"}</span></td></tr>)}</tbody></table></div>:<div className="bo-empty">Nenhum registro disponível.</div>}</section><section className="bf-panel"><div className="bo-section-head"><div><h2><BoIcon name="chart" size={23}/> Resumo da campanha</h2><p>Indicadores do período selecionado</p></div></div><div className="bo-summary-grid"><div><span className="bo-summary-icon green"><BoIcon name="check" size={25}/></span><strong>{fmt(selected?.resolved)}</strong><small>BOs resolvidos<br/>desde jan/2026</small></div><div><span className="bo-summary-icon blue"><BoIcon name="layers" size={25}/></span><strong>{fmt(selected?.backlog)}</strong><small>Backlog acima<br/>de 7 dias</small></div><div><span className="bo-summary-icon purple"><BoIcon name="target" size={25}/></span><strong>0</strong><small>Meta semanal<br/>de backlog</small></div></div></section></div>
          <div className="bo-bottom-note"><span>ⓘ</span><p><strong>Dados históricos e importações manuais.</strong> Período: {boStart?datePt(boStart):"?"} a {boEnd?datePt(boEnd):"?"}. Último registro disponível: {chosenDate?datePt(chosenDate):"indisponível"}. A última ingestão conhecida é de 07/11/2026. Os dados podem estar defasados e não representam uma operação em tempo real.</p></div>{metricError&&<p role="alert" className="bf-error">{metricError}</p>}
        </>}
        {boTab==="history"&&<section className="bf-panel bo-history-panel"><div className="bo-section-head"><div><h2>Histórico de desempenho</h2><p>Consulte as datas disponíveis e acompanhe o backlog. Registros parciais ou reconstruídos permanecem sinalizados até validação.</p></div></div>{shownHistory.length?<div className="bo-table-scroll"><table className="bo-table bo-history-table"><thead><tr><th>Data de referência</th><th>BOs em aberto</th><th>Backlog acima de 7 dias</th><th>Resolvidos (acumulado)</th><th>Qualidade do dado</th></tr></thead><tbody>{shownHistory.map(h=><tr key={h.date}><td>{datePt(h.date)}</td><td>{fmt(h.open)}</td><td><strong>{fmt(h.backlog)}</strong></td><td>{fmt(h.resolved)}</td><td><span className={"bo-data-badge "+(h.verified?"validated":"reconstructed")}>{h.verified?"Validado":h.partial?"Parcial / não validado":"Histórico reconstruído"}</span></td></tr>)}</tbody></table></div>:<div className="bo-empty">Nenhum histórico disponível.</div>}</section>}
        {boTab==="admin"&&profile.role==="admin"&&<><section className="bf-panel bo-import-panel"><div className="bo-section-head"><div><h2>Importar indicadores</h2><p>Atualização manual do Databricks · acesso restrito</p></div><span className="bo-admin-label">Administrador</span></div><div className="bo-instructions"><strong>Como atualizar</strong><p>Execute a consulta no Databricks, exporte um CSV agregado e selecione o arquivo abaixo. Não inclua informações individuais de alunos.</p></div><label className="bo-upload">Selecionar arquivo CSV<input type="file" accept=".csv,text/csv" onChange={e=>{void chooseCsv(e.target.files?.[0]);e.target.value="";}}/></label>{csvPreview&&<div className="bo-preview"><strong>Prévia da importação</strong><p>{csvPreview.fileName}</p><div className="bo-preview-values"><span>Abertos <b>{fmt(csvPreview.open)}</b></span><span>Backlog <b>{fmt(csvPreview.backlog)}</b></span><span>Resolvidos <b>{fmt(csvPreview.resolved)}</b></span></div><p>Ingestão da fonte: {new Date(csvPreview.ingestedAt).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · Registro: {datePt(csvPreview.referenceDate)}</p>{csvDuplicate&&<label className="bo-confirm"><input type="checkbox" checked={csvReplaceConfirmed} onChange={e=>setCsvReplaceConfirmed(e.target.checked)}/> Confirmo que revisei a fonte e autorizo a substituição auditada desta data.</label>}<button type="button" className="bo-primary" disabled={csvBusy||(csvDuplicate&&!csvReplaceConfirmed)} onClick={()=>void importCsv(csvDuplicate)}>{csvBusy?"Processando...":csvDuplicate?"Atualizar registro existente":"Confirmar importação"}</button></div>}{csvMessage&&<p role="status" className="bo-feedback">{csvMessage}</p>}</section><section className="bf-panel bo-technical"><h2>Informações de controle</h2><div className="bf-detail"><span>Fonte</span><strong>Databricks · bo_operations</strong></div><div className="bf-detail"><span>Indicadores armazenados</span><strong>{metrics.length}</strong></div><div className="bf-detail"><span>Atualização</span><strong>CSV manual com auditoria</strong></div><div className="bf-detail"><span>Apuração da missão</span><strong>Após fechamento semanal</strong></div></section></>}
      </div>:<div className="bf-body bf-overview">
        {view==="Mídias e Procon"?<div className="mp-page">
        <section className="mp-hero mp-bo-hero"><div className="mp-hero-main"><span className="mp-hero-kicker"><BoIcon name="shield" size={15}/> BLUE FRIDAY 2026 / PAINEL DE PERFORMANCE</span><h1>Mídias e Procon</h1><p>Acompanhamento operacional, metas e evolução da campanha.</p></div><div className="mp-hero-side"><span className="mp-hero-person"><BoIcon name="check" size={16}/> Manuela</span><span className="mp-hero-admin">Responsável pela área</span></div></section>
        <nav className="mp-nav" aria-label="Seções de Mídias e Procon">{([{id:"overview",label:"Visão geral",icon:"home"},{id:"history",label:"Evolução diária",icon:"trend"},{id:"weekly",label:"Resultados semanais",icon:"trophy"},{id:"admin",label:"Administração",icon:"settings"}] as const).map(t=><button key={t.id} type="button" className={"mp-nav-tab "+(mpTab===t.id?"active":"")} onClick={()=>setMpTab(t.id)}><BoIcon name={t.icon} size={17}/>{t.label}</button>)}<button className="bo-refresh mp-nav-refresh" onClick={()=>setRefreshCount(n=>n+1)}><BoIcon name="refresh" size={16}/> Atualizar painel</button></nav>
        {mpError&&<p className="bo-range-error" role="alert">{mpError}</p>}
        {(mpTab==="overview"||mpTab==="weekly"||mpTab==="history")&&<div className="mp-section-stack">
          {mpTab==="overview"&&<div className="mp-kpi-row"><div className="mp-kpi"><span><BoIcon name="check" size={22}/></span><div><small>Fila de Mídias</small><strong>Meta diária</strong><p>Zerar a fila todos os dias</p></div></div><div className="mp-kpi"><span><BoIcon name="document" size={22}/></span><div><small>Comentários</small><strong>Tratamento completo</strong><p>Todos os comentários necessários</p></div></div><div className="mp-kpi"><span><BoIcon name="shield" size={22}/></span><div><small>Procon</small><strong>Até 24 horas</strong><p>Todos os casos respondidos no prazo</p></div></div></div>}
          <section className="bf-panel mp-week-panel"><div className="mp-week-head"><div><h2><BoIcon name="trophy" size={22}/> Acompanhamento semanal</h2><p>Selecione a semana para conferir as três metas.</p></div><select aria-label="Semana da campanha" value={mpWeek} onChange={e=>setMpWeek(Number(e.target.value))}>{[{label:"Semana 1 · 04 a 06/11"},{label:"Semana 2 · 09 a 13/11"},{label:"Semana 3 · 16 a 20/11"},{label:"Semana 4 · 23 a 27/11"}].map((w,i)=><option key={i} value={i}>{w.label}</option>)}</select></div>
          {(()=>{const weeks=[["2026-11-04","2026-11-06"],["2026-11-09","2026-11-13"],["2026-11-16","2026-11-20"],["2026-11-23","2026-11-27"]];const [start,end]=weeks[mpWeek];const dates:string[]=[];for(let d=new Date(start+"T12:00:00Z");d<=new Date(end+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+1))dates.push(d.toISOString().slice(0,10));const entries=dates.map(date=>({date,record:mpRecords.find(r=>r.reference_date===date)}));const mediaOk=entries.every(e=>e.record?.media_queue_cleared===true);const commentsOk=entries.every(e=>e.record?.comments_handled===true);const proconOk=entries.every(e=>e.record?.procon_total!==null&&e.record?.procon_total!==undefined&&e.record?.procon_over_24h===0);const complete=entries.every(e=>e.record&&e.record.media_queue_cleared!==null&&e.record.comments_handled!==null&&e.record.procon_total!==null);const failed=entries.some(e=>e.record?.media_queue_cleared===false||e.record?.comments_handled===false||(e.record?.procon_over_24h??0)>0);const state=complete?(mediaOk&&commentsOk&&proconOk?"Metas cumpridas":"Meta não cumprida"):failed?"Falha identificada · apuração incompleta":"Aguardando registros";const campaignRanges=[["2026-11-04","2026-11-06"],["2026-11-09","2026-11-13"],["2026-11-16","2026-11-20"],["2026-11-23","2026-11-27"]];const weeklyEligible=campaignRanges.map(([a,b])=>{const records:MpRecord[]=[];for(let d=new Date(a+"T12:00:00Z");d<=new Date(b+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+1)){const rec=mpRecords.find(x=>x.reference_date===d.toISOString().slice(0,10));if(!rec||rec.media_queue_cleared!==true||rec.comments_handled!==true||rec.procon_total===null||rec.procon_over_24h!==0)return false;records.push(rec);}return records.length>0;});const eligibleTotal=weeklyEligible.filter(Boolean).length*60;const mediaDays=entries.filter(e=>e.record?.media_queue_cleared===true).length;const commentsDays=entries.filter(e=>e.record?.comments_handled===true).length;const proconDays=entries.filter(e=>e.record?.procon_total!==null&&e.record?.procon_total!==undefined&&e.record?.procon_over_24h===0).length;const weekEligible=complete&&mediaOk&&commentsOk&&proconOk;const total=entries.reduce((n,e)=>n+(e.record?.procon_total??0),0);const onTime=entries.reduce((n,e)=>n+(e.record?.procon_within_24h??0),0);return <><div className="mp-award-summary"><div className="mp-award-primary"><div><span className="mp-award-eyebrow"><BoIcon name="trophy" size={18}/> PREMIAÇÃO DA MANUELA</span><h3>R$ 60 <small>/ semana</small></h3><p>Três metas cumpridas para habilitar a premiação.</p></div><div className="mp-award-inline"><div><small>Elegível até agora</small><strong>R$ {eligibleTotal.toLocaleString("pt-BR")}</strong></div><div><small>Potencial total</small><strong>R$ 240</strong></div><div><small>Semanas elegíveis</small><strong>{weeklyEligible.filter(Boolean).length}/4</strong></div></div></div></div><div className="mp-status-strip"><span className={weekEligible?"mp-status-icon mp-status-done":"mp-status-icon"}><BoIcon name={weekEligible?"check":"clock"} size={22}/></span><div><strong>{state}</strong><p>{weekEligible?"R$ 60 elegíveis nesta semana, aguardando homologação.":failed?"Existe pelo menos uma meta não cumprida. Consulte os registros.":"Complete os registros da semana para verificar a elegibilidade."}</p></div></div><div className="mp-progress-grid">{[{name:"Fila de Mídias",count:mediaDays,icon:"check"},{name:"Comentários",count:commentsDays,icon:"document"},{name:"Procon até 24h",count:proconDays,icon:"shield"}].map((goal,i)=><div className="mp-progress-card" key={goal.name}><span className="mp-progress-icon"><BoIcon name={goal.icon} size={19}/></span><strong>{goal.name}</strong><div className="mp-progress-numbers"><b>{goal.count}/{dates.length} dias</b><span className={"mp-goal-status "+(goal.count===dates.length?"is-done":goal.count===0?"is-pending":"is-progress")}>{goal.count===dates.length?"Cumprida":goal.count===0?"Pendente":"Em andamento"}</span></div><div className="mp-progress-track"><div style={{width:(goal.count/dates.length*100)+"%"}}/></div><small>{i===0?"Fila zerada diariamente":i===1?"Todos os comentários necessários":"Todos os casos dentro de 24h"}</small></div>)}</div>{(mpTab==="history"||mpTab==="weekly")&&<><div className="mp-table-title"><h3><BoIcon name="calendar" size={19}/> Acompanhamento diário</h3><span>{start.split("-").reverse().join("/")} a {end.split("-").reverse().join("/")}</span></div><div className="bo-table-scroll"><table className="bo-table"><thead><tr><th>Dia</th><th>Mídias</th><th>Comentários</th><th>Procon até 24h</th><th>Status do dia</th></tr></thead><tbody>{entries.map(e=><tr key={e.date}><td>{e.date.split("-").reverse().join("/")}</td><td>{e.record?.media_queue_cleared===null||e.record?.media_queue_cleared===undefined?"Pendente":e.record.media_queue_cleared?"Cumprido":"Não cumprido"}</td><td>{e.record?.comments_handled===null||e.record?.comments_handled===undefined?"Pendente":e.record.comments_handled?"Cumprido":"Não cumprido"}</td><td>{e.record?.procon_total===null||e.record?.procon_total===undefined?"Pendente":e.record.procon_over_24h===0?"Cumprido":"Fora do prazo"}</td><td><span className={"mp-day-badge "+(!e.record||e.record.media_queue_cleared===null||e.record.comments_handled===null||e.record.procon_total===null?"mp-day-pending":e.record.media_queue_cleared&&e.record.comments_handled&&e.record.procon_over_24h===0?"mp-day-good":"mp-day-fail")}>{!e.record||e.record.media_queue_cleared===null||e.record.comments_handled===null||e.record.procon_total===null?"Pendente":e.record.media_queue_cleared&&e.record.comments_handled&&e.record.procon_over_24h===0?"Concluído":"Não cumprido"}</span></td></tr>)}</tbody></table></div><p className="mp-note">A apuração considera os dias definidos para a semana. Caso o fechamento exija fins de semana ou feriados, a regra deverá ser confirmada antes da homologação.</p></>}</>})()}</section>
        </div>}
        {mpTab==="admin"&&<div className="mp-admin-layout"><div className="mp-dashboard-form"><section className="bf-panel mp-form-panel"><h2><BoIcon name="calendar" size={21}/> Registrar resultados do dia</h2><p>Somente administradores podem salvar ou corrigir registros. Alterações são auditadas no banco.</p>
          <form onSubmit={saveMp} className="mp-form"><label>Data de referência<input type="date" min="2026-11-04" max="2026-11-30" value={mpDate} onChange={e=>setMpDate(e.target.value)} required/></label>
          <label>Fila de Mídias zerada?<select value={mpForm.media} onChange={e=>setMpForm(p=>({...p,media:e.target.value}))}><option value="">Não informado</option><option value="yes">Sim</option><option value="no">Não</option></select></label>
          <label>Todos os comentários necessários tratados?<select value={mpForm.comments} onChange={e=>setMpForm(p=>({...p,comments:e.target.value}))}><option value="">Não informado</option><option value="yes">Sim</option><option value="no">Não</option></select></label>
          <h3>Procon · extração do Cloude</h3><div className="mp-form-numbers"><label>Total de casos<input type="number" min="0" value={mpForm.total} onChange={e=>setMpForm(p=>({...p,total:e.target.value}))} placeholder="0"/></label><label>Respondidos até 24h<input type="number" min="0" value={mpForm.within} onChange={e=>setMpForm(p=>({...p,within:e.target.value}))} placeholder="0"/></label><label>Acima de 24h<input type="number" min="0" value={mpForm.over} onChange={e=>setMpForm(p=>({...p,over:e.target.value}))} placeholder="0"/></label></div>
          <label>Origem dos dados<input value={mpForm.source} onChange={e=>setMpForm(p=>({...p,source:e.target.value}))} placeholder="Cloude"/></label><label>Observações / evidência<textarea rows={3} value={mpForm.notes} onChange={e=>setMpForm(p=>({...p,notes:e.target.value}))} placeholder="Identificação do relatório, observações ou justificativa"/></label>
          <button className="login-submit" type="submit" disabled={mpSaving||profile.role!=="admin"}>{mpSaving?"Salvando...":"Salvar registro do dia"}</button>{profile.role!=="admin"&&<small>Consulta liberada. Edição restrita ao administrador.</small>}</form></section>
          </div></div>}
      </div>:view==="Visão geral"?<>
          <section className="bf-overview-hero"><div className="bf-overview-hero-copy"><small>CENTRAL DE PERFORMANCE</small><h1>Dashboard de Performance</h1><p>Acompanhe os indicadores e a evolução das áreas da campanha Blue Friday 2026.</p></div><div className="bf-overview-hero-art" aria-hidden="true"><div className="bf-hero-bars"><i/><i/><i/><i/><i/></div><BoIcon name="trend" size={82}/></div></section>
          <section className="bf-overview-stats" aria-label="Resumo da campanha">
            <div className="bf-overview-stat"><span className="bf-overview-stat-icon"><BoIcon name="layers" size={27}/></span><div><small>Áreas da campanha</small><strong>{areas.length}</strong></div></div>
            <div className="bf-overview-stat"><span className="bf-overview-stat-icon"><BoIcon name="check" size={27}/></span><div><small>Painéis disponíveis</small><strong>1</strong></div></div>
            <div className="bf-overview-stat"><span className="bf-overview-stat-icon"><BoIcon name="clock" size={27}/></span><div><small>Painéis em preparação</small><strong>{areas.length-1}</strong></div></div>
            <div className="bf-overview-stat"><span className="bf-overview-stat-icon"><BoIcon name="calendar" size={27}/></span><div><small>Período da campanha</small><strong className="bf-stat-period">Nov/2026</strong></div></div>
          </section>
          <div className="bf-overview-awards"><span className="bf-overview-awards-icon"><BoIcon name="trophy" size={25}/></span><div><strong>Premiações protegidas</strong><p>Sem cálculo automático antes de validar fontes e regras.</p></div></div>
          <div className="bf-overview-section-head"><div><span className="bf-overview-section-icon"><BoIcon name="layers" size={21}/></span><h2>Acompanhamento por área</h2></div><p>Acesse cada área para consultar seus indicadores e detalhes.</p></div>
          <div className="bf-overview-area-grid">{areas.map(area=>{
            const areaIcons:Record<string,string>={"BO e Dados":"layers","Reembolso":"refresh","Mídias e Procon":"shield","Recorrência":"calendar","Chargeback":"bag","Resoluções":"check","Quero Pago":"chart","Marcas":"target","Reclame Aqui":"document"};
            return <button type="button" key={area} className="bf-overview-area" onClick={()=>setView(area)}><span className="bf-overview-area-icon"><BoIcon name={areaIcons[area]??"chart"} size={27}/></span><span className="bf-overview-area-copy"><strong>{area}{area==="BO e Dados"&&<em>NOVO</em>}</strong><small>{area==="BO e Dados"?"Painel inicial disponível":"Indicadores em preparação"}</small></span><span className="bf-overview-area-arrow" aria-hidden="true">›</span></button>;
          })}</div>
        </>:<><div className="bf-page-head"><div><small>CENTRAL DE PERFORMANCE</small><h1>{view}</h1><p>Indicadores em preparação e aguardando validação.</p></div></div><div className="bf-notice"><strong>Premiações protegidas</strong><p>Sem cálculo automático antes de validar fontes e regras.</p></div></>}
      </div>}
    </div>
  </main>;
}
