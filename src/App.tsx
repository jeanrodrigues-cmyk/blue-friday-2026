import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Profile = { role: "admin" | "management" | "collaborator"; active: boolean };
const areas = ["BO e Dados","Reembolso","Mídias e Procon","Recorrência","Chargeback","Resoluções","Quero Pago","Marcas","Reclame Aqui"];

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

  return <main className="shell"><header><BrandIcon small /><div><strong>BLUE FRIDAY 2026</strong><p>Dashboard de Performance</p></div><span className="dev">{profile.role === "admin" ? "Administrador" : profile.role === "management" ? "Gestão" : "Colaborador"}</span><button className="signout" onClick={signOut}>Sair</button></header><section className="hero"><small>CENTRAL DE PERFORMANCE</small><h1>Uma campanha. Nove áreas.<br/><em>Resultados com transparência.</em></h1><p>Olá, {session.user.email}. Seu acesso foi autenticado. Os indicadores serão conectados após validação das fontes e regras.</p><aside>Nenhum prêmio está sendo calculado automaticamente.</aside></section><section><h2>Áreas da campanha</h2><div className="grid">{(profile.role === "collaborator" ? ["Minha performance"] : areas).map((area,i)=><article key={area}><span>{String(i+1).padStart(2,"0")}</span><h3>{area}</h3><p>Indicadores em preparação</p><label>A configurar</label></article>)}</div></section><footer>Blue Friday 2026 · Acesso autenticado</footer></main>;
}
