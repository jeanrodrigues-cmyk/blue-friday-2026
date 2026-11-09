import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Metric = { metric_key: string; metric_value: number; reference_date: string; verified: boolean };
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
  const [boTab,setBoTab] = useState<"overview"|"history"|"admin">("overview");
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
    return {date,open:get("bo_open"),backlog:get("bo_over_7_days"),resolved:get("bo_resolved"),verified:entries.length>0&&entries.every(m=>m.verified)};
  });
  const fmt=(value:number|undefined)=>value===undefined?"—":new Intl.NumberFormat("pt-BR").format(Number(value));
  const datePt=(value:string)=>value.split("-").reverse().join("/");
  const validRange=Boolean(boStart&&boEnd&&boStart<=boEnd);
  const shownHistory=validRange?history.filter(h=>h.date>=boStart&&h.date<=boEnd):[];
  const selected=shownHistory[0];
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
    <aside className="bf-side"><div className="bf-brand"><BrandIcon small/><div><strong>BLUE FRIDAY</strong><small>Performance 2026</small></div></div><p className="bf-menu-label">NAVEGAÇÃO</p>
      <button className={view==="Visão geral"?"bf-menu selected":"bf-menu"} onClick={()=>setView("Visão geral")}>▦ Visão geral</button><p className="bf-menu-label">ÁREAS</p>
      {(profile.role==="collaborator"?["Minha performance"]:areas).map(area=><button key={area} className={view===area?"bf-menu selected":"bf-menu"} onClick={()=>setView(area)}>◦ {area}{area==="BO e Dados"&&<span className="bf-new">NOVO</span>}</button>)}
      <div className="bf-side-bottom">● Sessão autenticada</div>
    </aside>
    <div className="bf-workspace"><header className="bf-top"><span>Blue Friday 2026 / <strong>{view}</strong></span><div><span className="bf-user-role">{profile.role==="admin"?"Administrador":profile.role==="management"?"Gestão":"Colaborador"}</span><button onClick={signOut}>Sair</button></div></header>
      {view==="BO e Dados"?<div className="bf-body bo-executive bo-v2">
        <section className="bo-hero bo-hero-refined"><div className="bo-hero-main"><span className="bo-hero-kicker"><span className="bo-kicker-dot"/> BLUE FRIDAY 2026 <span className="bo-kicker-separator">/</span> PAINEL DE PERFORMANCE</span><h1>BO e Dados</h1><p>Acompanhamento operacional, indicadores e evolução da missão semanal.</p></div><div className="bo-hero-side"><div className="bo-hero-info"><span className="bo-hero-info-icon"><BoIcon name="calendar" size={20}/></span><small>Semana da campanha<strong>09 a 13 de novembro</strong></small></div><div className="bo-hero-info"><span className="bo-hero-info-icon"><BoIcon name="refresh" size={19}/></span><small>Dados extraídos em<strong>{newestIngest}</strong></small></div></div></section>
        <div className="bo-nav"><div className="bo-tabs"><button className={boTab==="overview"?"active":""} onClick={()=>setBoTab("overview")}><BoIcon name="home" size={18}/> Visão geral</button><button className={boTab==="history"?"active":""} onClick={()=>setBoTab("history")}><BoIcon name="chart" size={18}/> Evolução diária</button>{profile.role==="admin"&&<button className={boTab==="admin"?"active":""} onClick={()=>setBoTab("admin")}><BoIcon name="settings" size={18}/> Administração</button>}</div><div className="bo-nav-actions"><div className="bo-range-filter" role="group" aria-label="Filtrar período"><BoIcon name="calendar" size={18}/><label>De <input aria-label="Data inicial" type="date" value={boStart} onChange={e=>setBoStart(e.target.value)}/></label><label>Até <input aria-label="Data final" type="date" value={boEnd} onChange={e=>setBoEnd(e.target.value)}/></label><button type="button" onClick={()=>{setBoStart("2026-11-02");setBoEnd("2026-11-09");}}>Restaurar</button></div><button className="bo-refresh" onClick={()=>setRefreshCount(v=>v+1)}><BoIcon name="refresh" size={18}/> Atualizar painel</button></div></div>
        {!validRange&&<p className="bo-range-error" role="alert">A data inicial precisa ser anterior ou igual à data final.</p>}{validRange&&shownHistory.length===0&&<p className="bo-range-error" role="status">Não há registros para esse período. Selecione datas com dados importados.</p>}
        {boTab==="overview"&&<>
          <div className="bo-v2-kpis">{cards.map(c=>{const key=c.key==="bo_open"?"open":c.key==="bo_resolved"?"resolved":"backlog";const change=percentage(key);const diff=delta(key);const improving=change!==null&&(key==="resolved"?change>=0:change<=0);return <article className={"bo-v2-kpi "+c.tone} key={c.key}><div className="bo-kpi-icon"><BoIcon name={c.symbol} size={34}/></div><div className="bo-kpi-body"><span>{c.name}</span><strong>{fmt(currentMetric(c.key))}</strong><small>{c.description}</small></div><div className={"bo-kpi-change "+(change===null?"neutral":improving?"good":"bad")}>{change===null?"Sem comparação":(change>0?"↑ ":change<0?"↓ ":"")+Math.abs(change).toFixed(1).replace(".",",")+"%"}<small>{diff===null?"Sem base no período":(diff>0?"+":"")+fmt(diff)+" casos no período"}</small></div></article>})}</div>
          <div className="bo-v2-main"><section className="bf-panel bo-v2-mission"><div className="bo-section-head"><div><h2><BoIcon name="target" size={23}/> Desafio da semana</h2><p>Zerar BOs acima de 7 dias</p><small>09 a 13 de novembro</small></div><span className="bf-status"><BoIcon name="trophy" size={16}/> Em acompanhamento</span></div><div className="bo-mission-goal bo-mission-three"><div><strong>{fmt(baseline?.backlog)}</strong><small>Início do período</small></div><span>→</span><div><strong>{fmt(selected?.backlog)}</strong><small>Último registro</small></div><span>→</span><div><strong>0</strong><small>Meta semanal</small></div></div><div className="bo-v2-progress"><div style={{width:baseline?.backlog&&selected?.backlog!==undefined?Math.max(0,Math.min(100,(Number(baseline.backlog)-Number(selected.backlog))/Number(baseline.backlog)*100))+"%":selected?.backlog===0?"100%":"0%"}}/></div><div className="bo-period-improvement"><BoIcon name="trend" size={20}/><strong>{delta("backlog")===null?"Aguardando comparação":delta("backlog")!<=0?fmt(Math.abs(delta("backlog")!))+" casos a menos":fmt(delta("backlog")!)+" casos a mais"}</strong><span>{percentage("backlog")===null?"":Math.abs(percentage("backlog")!).toFixed(1).replace(".",",")+"% de variação no período"}</span></div><div className="bo-v2-mission-foot"><span>Meta: <strong>0 BOs acima de 7 dias</strong></span><span>Prêmio previsto: <strong>R$ 60,00</strong></span></div><p className="bo-v2-fineprint">Apuração somente após o fechamento semanal. Sem cálculo automático de premiação.</p></section>
          <section className="bf-panel bo-v2-chart"><div className="bo-section-head"><div><h2><BoIcon name="chart" size={23}/> Evolução do backlog</h2><p>BOs acima de 7 dias · {boStart?datePt(boStart):"?"} a {boEnd?datePt(boEnd):"?"}</p></div><button className="bo-link" onClick={()=>setBoTab("history")}>Ver histórico →</button></div>{chartPoints.length>1?<><div className="bo-chart-container"><svg viewBox="0 0 710 245" role="img" aria-label="Gráfico de evolução do backlog por data"><defs><linearGradient id="boChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3678f6" stopOpacity=".24"/><stop offset="1" stopColor="#3678f6" stopOpacity=".02"/></linearGradient></defs>{[0,1,2,3,4].map(i=><g key={i}><line x1="42" x2="675" y1={40+i*40} y2={40+i*40} stroke="#e6edf8"/><text x="5" y={44+i*40} fill="#7a8ca6" fontSize="12">{Math.round(chartMax-(chartMax-chartMin)*i/4)}</text></g>)}<path d={chartArea} fill="url(#boChartFill)"/><path d={chartPath} fill="none" stroke="#2863ed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{chartPoints.map(p=><g key={p.date}><circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#2863ed" strokeWidth="3"/><text x={p.x} y={p.y-13} textAnchor="middle" fill="#18365c" fontSize="13" fontWeight="700">{p.value}</text><text x={p.x} y="237" textAnchor="middle" fill="#6e82a0" fontSize="12">{p.date.slice(8,10)+"/"+p.date.slice(5,7)}</text></g>)}</svg></div><div className="bo-chart-insight">{percentage("backlog")===null?"Comparação indisponível":(percentage("backlog")!<=0?"Redução":"Variação")+" de "+Math.abs(percentage("backlog")!).toFixed(1).replace(".",",")+"% no período selecionado"}</div></>:<div className="bo-empty"><strong>Histórico em construção</strong><p>Importe os próximos dias para acompanhar a evolução real. Nenhum valor é estimado.</p></div>}</section></div>
          <div className="bo-period-summary"><strong><BoIcon name="chart" size={21}/> Resumo do período</strong><span>Backlog inicial <b>{fmt(baseline?.backlog)}</b></span><span>Backlog final <b>{fmt(selected?.backlog)}</b></span><span>Variação <b>{delta("backlog")===null?"—":(delta("backlog")!>0?"+":"")+fmt(delta("backlog")!)}</b></span><span>Percentual <b>{percentage("backlog")===null?"—":percentage("backlog")!.toFixed(1).replace(".",",")+"%"}</b></span></div><div className="bo-v2-bottom"><section className="bf-panel"><div className="bo-section-head"><div><h2><BoIcon name="document" size={23}/> Últimos registros</h2><p>Indicadores importados e preservados</p></div><button className="bo-link" onClick={()=>setBoTab("history")}>Ver todos →</button></div>{shownHistory.length?<div className="bo-table-scroll"><table className="bo-table"><thead><tr><th>Referência</th><th>Em aberto</th><th>Backlog &gt; 7 dias</th><th>Resolvidos</th><th>Variação backlog</th><th>Origem</th></tr></thead><tbody>{shownHistory.slice(0,4).map(h=><tr key={h.date}><td>{datePt(h.date)}</td><td>{fmt(h.open)}</td><td><strong>{fmt(h.backlog)}</strong></td><td>{fmt(h.resolved)}</td><td>{(()=>{const idx=history.findIndex(x=>x.date===h.date);const old=history[idx+1];if(old?.backlog===undefined||!Number(old.backlog))return "—";const pct=(Number(h.backlog)-Number(old.backlog))/Number(old.backlog)*100;return <span className={"bo-table-delta "+(pct<=0?"good":"bad")}>{pct>0?"↑":"↓"} {Math.abs(pct).toFixed(1).replace(".",",")}%</span>})()}</td><td><span className={"bo-data-badge "+(h.verified?"validated":"reconstructed")}>{h.verified?"Validado":"Reconstruído"}</span></td></tr>)}</tbody></table></div>:<div className="bo-empty">Nenhum registro disponível.</div>}</section><section className="bf-panel"><div className="bo-section-head"><div><h2><BoIcon name="chart" size={23}/> Resumo da campanha</h2><p>Indicadores do período selecionado</p></div></div><div className="bo-summary-grid"><div><span className="bo-summary-icon green"><BoIcon name="check" size={25}/></span><strong>{fmt(selected?.resolved)}</strong><small>BOs resolvidos<br/>desde jan/2026</small></div><div><span className="bo-summary-icon blue"><BoIcon name="layers" size={25}/></span><strong>{fmt(selected?.backlog)}</strong><small>Backlog acima<br/>de 7 dias</small></div><div><span className="bo-summary-icon purple"><BoIcon name="target" size={25}/></span><strong>0</strong><small>Meta semanal<br/>de backlog</small></div></div></section></div>
          <div className="bo-bottom-note"><span>ⓘ</span><p><strong>Dados históricos e importações manuais.</strong> Período: {boStart?datePt(boStart):"?"} a {boEnd?datePt(boEnd):"?"}. Último registro disponível: {chosenDate?datePt(chosenDate):"indisponível"}. A última ingestão conhecida é de 07/11/2026. Os dados podem estar defasados e não representam uma operação em tempo real.</p></div>{metricError&&<p role="alert" className="bf-error">{metricError}</p>}
        </>}
        {boTab==="history"&&<section className="bf-panel bo-history-panel"><div className="bo-section-head"><div><h2>Histórico de desempenho</h2><p>Escolha um intervalo de datas acima para consultar os registros disponíveis. Os dados reconstruídos são identificados separadamente dos validados.</p></div></div>{shownHistory.length?<div className="bo-table-scroll"><table className="bo-table"><thead><tr><th>Data de referência</th><th>BOs em aberto</th><th>Backlog acima de 7 dias</th><th>Resolvidos (acumulado)</th><th>Qualidade do dado</th></tr></thead><tbody>{shownHistory.map(h=><tr key={h.date}><td>{datePt(h.date)}</td><td>{fmt(h.open)}</td><td><strong>{fmt(h.backlog)}</strong></td><td>{fmt(h.resolved)}</td><td><span className={"bo-data-badge "+(h.verified?"validated":"reconstructed")}>{h.verified?"Validado":"Histórico reconstruído"}</span></td></tr>)}</tbody></table></div>:<div className="bo-empty">Nenhum histórico disponível.</div>}</section>}
        {boTab==="admin"&&profile.role==="admin"&&<><section className="bf-panel bo-import-panel"><div className="bo-section-head"><div><h2>Importar indicadores</h2><p>Atualização manual do Databricks · acesso restrito</p></div><span className="bo-admin-label">Administrador</span></div><div className="bo-instructions"><strong>Como atualizar</strong><p>Execute a consulta no Databricks, exporte um CSV agregado e selecione o arquivo abaixo. Não inclua informações individuais de alunos.</p></div><label className="bo-upload">Selecionar arquivo CSV<input type="file" accept=".csv,text/csv" onChange={e=>{void chooseCsv(e.target.files?.[0]);e.target.value="";}}/></label>{csvPreview&&<div className="bo-preview"><strong>Prévia da importação</strong><p>{csvPreview.fileName}</p><div className="bo-preview-values"><span>Abertos <b>{fmt(csvPreview.open)}</b></span><span>Backlog <b>{fmt(csvPreview.backlog)}</b></span><span>Resolvidos <b>{fmt(csvPreview.resolved)}</b></span></div><p>Ingestão da fonte: {new Date(csvPreview.ingestedAt).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · Registro: {datePt(csvPreview.referenceDate)}</p>{csvDuplicate&&<label className="bo-confirm"><input type="checkbox" checked={csvReplaceConfirmed} onChange={e=>setCsvReplaceConfirmed(e.target.checked)}/> Confirmo que revisei a fonte e autorizo a substituição auditada desta data.</label>}<button type="button" className="bo-primary" disabled={csvBusy||(csvDuplicate&&!csvReplaceConfirmed)} onClick={()=>void importCsv(csvDuplicate)}>{csvBusy?"Processando...":csvDuplicate?"Atualizar registro existente":"Confirmar importação"}</button></div>}{csvMessage&&<p role="status" className="bo-feedback">{csvMessage}</p>}</section><section className="bf-panel bo-technical"><h2>Informações de controle</h2><div className="bf-detail"><span>Fonte</span><strong>Databricks · bo_operations</strong></div><div className="bf-detail"><span>Indicadores armazenados</span><strong>{metrics.length}</strong></div><div className="bf-detail"><span>Atualização</span><strong>CSV manual com auditoria</strong></div><div className="bf-detail"><span>Apuração da missão</span><strong>Após fechamento semanal</strong></div></section></>}
      </div>:<div className="bf-body"><div className="bf-page-head"><div><small>CENTRAL DE PERFORMANCE</small><h1>{view==="Visão geral"?"Dashboard de Performance":view}</h1><p>{view==="Visão geral"?"Acompanhe a preparação das áreas da campanha.":"Indicadores em preparação e aguardando validação."}</p></div></div><div className="bf-notice"><strong>Premiações protegidas</strong><p>Sem cálculo automático antes de validar fontes e regras.</p></div>{view==="Visão geral"&&<div className="bf-area-grid">{areas.map(area=><button key={area} onClick={()=>setView(area)}><strong>{area}</strong><small>{area==="BO e Dados"?"Painel inicial disponível":"Indicadores em preparação"}</small><span>Ver área →</span></button>)}</div>}</div>}
    </div>
  </main>;
}
