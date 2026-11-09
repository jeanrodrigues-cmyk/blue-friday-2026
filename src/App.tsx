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
      .eq("area_name","BO e Dados").eq("verified",true)
      .order("reference_date",{ascending:false}).limit(100)
      .then(({data,error}) => {
        if (!mounted) return;
        setMetrics((data ?? []) as Metric[]);
        setMetricError(error ? "Falha ao consultar métricas validadas." : "");
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

  const official = new Map<string,Metric>();
  for (const m of metrics) if (!official.has(m.metric_key)) official.set(m.metric_key,m);
  const cards = [
    {key:"bo_open",name:"BOs em aberto",note:"new + inProgress + screening",tone:"blue"},
    {key:"bo_over_7_days",name:"Backlog acima de 7 dias",note:"Abertura há mais de 7 dias",tone:"red"},
    {key:"bo_resolved",name:"BOs resolvidos",note:"Desde janeiro de 2026",tone:"green"}
  ];
  const allMetricsLoaded = cards.every(c => official.has(c.key));
  const history = Array.from(new Set(metrics.map(m=>m.reference_date))).sort().reverse().map(date=>{
    const entries=metrics.filter(m=>m.reference_date===date);
    const get=(key:string)=>entries.find(m=>m.metric_key===key)?.metric_value;
    return {date,open:get("bo_open"),backlog:get("bo_over_7_days"),resolved:get("bo_resolved")};
  });
  const latestDate=history[0]?.date;
  const previous=history[1];
  const delta=(key:"open"|"backlog"|"resolved")=>{
    const now=history[0]?.[key],before=previous?.[key];
    return now===undefined||before===undefined?null:Number(now)-Number(before);
  };
  const fmt=(value:number|undefined)=>value===undefined?"—":new Intl.NumberFormat("pt-BR").format(Number(value));
  const datePt=(value:string)=>value.split("-").reverse().join("/");
  const backlogMax=Math.max(1,...history.map(h=>Number(h.backlog??0)));
  return <main className="bf-layout">
    <aside className="bf-side"><div className="bf-brand"><BrandIcon small/><div><strong>BLUE FRIDAY</strong><small>Performance 2026</small></div></div><p className="bf-menu-label">NAVEGAÇÃO</p>
      <button className={view==="Visão geral"?"bf-menu selected":"bf-menu"} onClick={()=>setView("Visão geral")}>▦ Visão geral</button><p className="bf-menu-label">ÁREAS</p>
      {(profile.role==="collaborator"?["Minha performance"]:areas).map(area=><button key={area} className={view===area?"bf-menu selected":"bf-menu"} onClick={()=>setView(area)}>◦ {area}{area==="BO e Dados"&&<span className="bf-new">NOVO</span>}</button>)}
      <div className="bf-side-bottom">● Sessão autenticada</div>
    </aside>
    <div className="bf-workspace"><header className="bf-top"><span>Blue Friday 2026 / <strong>{view}</strong></span><div><span className="bf-user-role">{profile.role==="admin"?"Administrador":profile.role==="management"?"Gestão":"Colaborador"}</span><button onClick={signOut}>Sair</button></div></header>
      {view==="BO e Dados"?<div className="bf-body bo-executive">
        <div className="bf-page-head"><div><small>BLUE FRIDAY 2026 · PERFORMANCE</small><h1>BO e Dados</h1><p>Visão executiva da operação e acompanhamento da missão semanal.</p></div><button className="bo-refresh" onClick={()=>setRefreshCount(v=>v+1)}>↻ Atualizar painel</button></div>
        <div className="bo-toolbar"><div className="bo-tabs">
          <button className={boTab==="overview"?"active":""} onClick={()=>setBoTab("overview")}>Visão geral</button>
          <button className={boTab==="history"?"active":""} onClick={()=>setBoTab("history")}>Evolução diária</button>
          {profile.role==="admin"&&<button className={boTab==="admin"?"active":""} onClick={()=>setBoTab("admin")}>Administração</button>}
        </div><span className="bo-date">Referência: {latestDate?datePt(latestDate):"sem dados"}</span></div>
        {boTab==="overview"&&<>
          <div className="bo-source-strip"><span className="bo-source-dot"/><span><strong>Dados registrados</strong> · atualização manual diária</span><span className="bo-source-date">Última extração conhecida: 07/11/2026, 01h12</span></div>
          <div className="bf-metrics bo-metrics">{cards.map(c=>{const validated=official.get(c.key);const key=c.key==="bo_open"?"open":c.key==="bo_resolved"?"resolved":"backlog";const change=delta(key);return <article className={"bf-metric "+c.tone} key={c.key}><span>{c.name}</span><strong>{validated?fmt(Number(validated.metric_value)):"—"}</strong><div className="bo-metric-foot"><small>{c.key==="bo_resolved"?"Acumulado desde janeiro de 2026":c.key==="bo_open"?"Casos pendentes":"Casos abertos há mais de 7 dias"}</small><span className={change===null?"bo-delta neutral":change>0?"bo-delta up":"bo-delta down"}>{change===null?"Sem comparação":(change>0?"+":"")+fmt(change)+" vs. registro anterior"}</span></div></article>})}</div>
          <div className="bo-main-grid">
            <section className="bf-panel bo-mission-panel"><div className="bf-panel-title"><div><span className="bo-eyebrow">DESAFIO DA SEMANA</span><h2>Zerar BOs acima de 7 dias</h2><p>Semana de 09 a 13 de novembro</p></div><span className="bf-status">Em acompanhamento</span></div>
              <div className="bo-mission-number"><strong>{fmt(history[0]?.backlog)}</strong><span>BOs acima de 7 dias na última fotografia registrada</span></div>
              <div className="bo-progress"><span style={{width:history[0]?.backlog===0?"100%":"0%"}}/></div>
              <div className="bo-mission-bottom"><span>Meta de encerramento: <strong>0 casos</strong></span><span>Premiação prevista: <strong>R$ 60,00</strong></span></div>
              <p className="bf-note">Resultado e elegibilidade serão apurados após o fechamento da semana. Os dados não são em tempo real.</p>
            </section>
            <section className="bf-panel bo-trend-panel"><div className="bf-panel-title"><div><h2>Evolução do backlog</h2><p>Comparação dos registros disponíveis</p></div><button className="bo-link" onClick={()=>setBoTab("history")}>Ver histórico →</button></div>
              {history.length>1?<div className="bo-spark">{history.slice(0,7).reverse().map(h=><div className="bo-spark-item" key={h.date}><strong>{fmt(h.backlog)}</strong><div className="bo-spark-track"><span style={{height:(Math.max(3,Number(h.backlog??0)/backlogMax*100))+"%"}}/></div><small>{h.date.slice(8,10)}/{h.date.slice(5,7)}</small></div>)}</div>:<div className="bo-empty"><strong>Histórico em construção</strong><p>Assim que você importar os próximos dias, o gráfico mostrará a evolução do backlog.</p></div>}
              <div className="bo-trend-footer">Comparações baseadas nas datas de registro, não necessariamente nas datas de extração.</div>
            </section>
          </div>
          <div className="bo-bottom-note"><span>ⓘ</span><p><strong>Sobre os números:</strong> os indicadores refletem a última base importada. A fonte disponível foi ingerida em 07/11; confirme a atualização no Databricks antes de usar os números em decisões operacionais.</p></div>
          {metricError&&<p role="alert" className="bf-error">{metricError}</p>}
        </>}
        {boTab==="history"&&<section className="bf-panel bo-history-panel"><div className="bf-panel-title"><div><h2>Histórico de desempenho</h2><p>Registros diários preservados para comparação e acompanhamento.</p></div></div>
          {history.length?<div className="bo-table-scroll"><table className="bo-table"><thead><tr><th>Data do registro</th><th>BOs em aberto</th><th>Backlog acima de 7 dias</th><th>Resolvidos (acumulado)</th></tr></thead><tbody>{history.map(h=><tr key={h.date}><td>{datePt(h.date)}</td><td>{fmt(h.open)}</td><td><strong>{fmt(h.backlog)}</strong></td><td>{fmt(h.resolved)}</td></tr>)}</tbody></table></div>:<div className="bo-empty">Nenhum histórico disponível.</div>}
        </section>}
        {boTab==="admin"&&profile.role==="admin"&&<>
          <section className="bf-panel bo-import-panel"><div className="bf-panel-title"><div><h2>Importar indicadores</h2><p>Atualização manual do Databricks · acesso restrito</p></div><span className="bo-admin-label">Administrador</span></div>
            <div className="bo-instructions"><strong>Como atualizar</strong><p>Execute a consulta no Databricks, exporte um CSV agregado e selecione o arquivo abaixo. Não inclua informações individuais de alunos.</p></div>
            <label className="bo-upload">Selecionar arquivo CSV<input type="file" accept=".csv,text/csv" onChange={e=>{void chooseCsv(e.target.files?.[0]);e.target.value="";}}/></label>
            {csvPreview&&<div className="bo-preview"><strong>Prévia da importação</strong><p>{csvPreview.fileName}</p><div className="bo-preview-values"><span>Abertos <b>{fmt(csvPreview.open)}</b></span><span>Backlog <b>{fmt(csvPreview.backlog)}</b></span><span>Resolvidos <b>{fmt(csvPreview.resolved)}</b></span></div><p>Ingestão da fonte: {new Date(csvPreview.ingestedAt).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · Registro: {datePt(csvPreview.referenceDate)}</p>
              {csvDuplicate&&<label className="bo-confirm"><input type="checkbox" checked={csvReplaceConfirmed} onChange={e=>setCsvReplaceConfirmed(e.target.checked)}/> Confirmo que revisei a fonte e autorizo a substituição auditada desta data.</label>}
              <button type="button" className="bo-primary" disabled={csvBusy||(csvDuplicate&&!csvReplaceConfirmed)} onClick={()=>void importCsv(csvDuplicate)}>{csvBusy?"Processando...":csvDuplicate?"Atualizar registro existente":"Confirmar importação"}</button>
            </div>}
            {csvMessage&&<p role="status" className="bo-feedback">{csvMessage}</p>}
          </section>
          <section className="bf-panel bo-technical"><h2>Informações de controle</h2><div className="bf-detail"><span>Fonte</span><strong>Databricks · bo_operations</strong></div><div className="bf-detail"><span>Indicadores armazenados</span><strong>{metrics.length}</strong></div><div className="bf-detail"><span>Atualização</span><strong>CSV manual com auditoria</strong></div><div className="bf-detail"><span>Apuração da missão</span><strong>Após fechamento semanal</strong></div></section>
        </>}
      </div>:<div className="bf-body"><div className="bf-page-head"><div><small>CENTRAL DE PERFORMANCE</small><h1>{view==="Visão geral"?"Dashboard de Performance":view}</h1><p>{view==="Visão geral"?"Acompanhe a preparação das áreas da campanha.":"Indicadores em preparação e aguardando validação."}</p></div></div><div className="bf-notice"><strong>Premiações protegidas</strong><p>Sem cálculo automático antes de validar fontes e regras.</p></div>{view==="Visão geral"&&<div className="bf-area-grid">{areas.map(area=><button key={area} onClick={()=>setView(area)}><strong>{area}</strong><small>{area==="BO e Dados"?"Painel inicial disponível":"Indicadores em preparação"}</small><span>Ver área →</span></button>)}</div>}</div>}
    </div>
  </main>;
}
