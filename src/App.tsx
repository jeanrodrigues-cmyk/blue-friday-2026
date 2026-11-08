import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Profile = { role: "admin" | "management" | "collaborator"; active: boolean };
const areas = ["BO e Dados","Reembolso","Mídias e Procon","Recorrência","Chargeback","Resoluções","Quero Pago","Marcas","Reclame Aqui"];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
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
  if (!session || !profile) return <main className="shell"><section className="auth-card"><div className="logo">BF</div><h1>{session ? "Acesso não autorizado" : "Entre na Blue Friday"}</h1><p>{session ? "Sua conta ainda não tem um perfil ativo. Solicite acesso ao administrador." : "Dashboard de Performance e Gamificação 2026"}</p>{!session && <form onSubmit={signIn}><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} /><label htmlFor="password">Senha</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /><button type="submit" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button></form>}{error && <p role="alert" className="error">{error}</p>}{session && <button onClick={signOut}>Sair</button>}</section></main>;

  return <main className="shell"><header><div className="logo">BF</div><div><strong>BLUE FRIDAY 2026</strong><p>Dashboard de Performance</p></div><span className="dev">{profile.role === "admin" ? "Administrador" : profile.role === "management" ? "Gestão" : "Colaborador"}</span><button className="signout" onClick={signOut}>Sair</button></header><section className="hero"><small>CENTRAL DE PERFORMANCE</small><h1>Uma campanha. Nove áreas.<br/><em>Resultados com transparência.</em></h1><p>Olá, {session.user.email}. Seu acesso foi autenticado. Os indicadores serão conectados após validação das fontes e regras.</p><aside>Nenhum prêmio está sendo calculado automaticamente.</aside></section><section><h2>Áreas da campanha</h2><div className="grid">{(profile.role === "collaborator" ? ["Minha performance"] : areas).map((area,i)=><article key={area}><span>{String(i+1).padStart(2,"0")}</span><h3>{area}</h3><p>Indicadores em preparação</p><label>A configurar</label></article>)}</div></section><footer>Blue Friday 2026 · Acesso autenticado</footer></main>;
}
