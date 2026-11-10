import { useMemo, useState } from "react";
import "./RefundPanel.css";

const weeks = [
  { label: "Semana 1", dates: "01 a 08/11", cap: 53168 },
  { label: "Semana 2", dates: "09 a 15/11", cap: 57268 },
  { label: "Semana 3", dates: "16 a 22/11", cap: 51208 },
  { label: "Semana 4", dates: "23 a 30/11", cap: 67260 }
];
const days = [{day:"Seg",cap:9992},{day:"Ter",cap:10086},{day:"Qua",cap:10551},{day:"Qui",cap:12202},{day:"Sex",cap:10285},{day:"Sáb",cap:2486},{day:"Dom",cap:1667},{day:"Feriado",cap:4225}];
const money = (value:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(value);
const percent = (value:number) => new Intl.NumberFormat("pt-BR",{style:"percent",minimumFractionDigits:1,maximumFractionDigits:2}).format(value);
const parseAmount = (text:string) => {const normalized=text.trim().replace(/\./g,"").replace(",",".");if(!normalized)return null;const value=Number(normalized);return Number.isFinite(value)&&value>=0?value:null;};

export default function RefundPanel(){
  const [week,setWeek]=useState(1);
  const [refunded,setRefunded]=useState("");
  const [revenue,setRevenue]=useState("");
  const [conversion,setConversion]=useState("");
  const [backlog,setBacklog]=useState("");
  const [source,setSource]=useState("");
  const [referenceDate,setReferenceDate]=useState("");
  const values=useMemo(()=>({refunded:parseAmount(refunded),revenue:parseAmount(revenue),conversion:parseAmount(conversion),backlog:parseAmount(backlog)}),[refunded,revenue,conversion,backlog]);
  const selected=weeks[week];
  const dynamicMonthlyCap=values.revenue===null?null:values.revenue*.082;
  const capOk=values.refunded===null?null:values.refunded<=selected.cap;
  const conversionOk=values.conversion===null?null:values.conversion>=4;
  const backlogOk=values.backlog===null?null:values.backlog===0;
  const eligible=[capOk,conversionOk,backlogOk].every(v=>v!==null)?[capOk,conversionOk,backlogOk].every(Boolean):null;
  const progress=values.refunded===null?null:Math.min(100,values.refunded/selected.cap*100);
  const status=(v:boolean|null)=>v===null?"Aguardando dados":v?"Dentro da regra":"Fora da regra";
  return <div className="refund-page">
    <header className="refund-hero"><div><span className="refund-eyebrow">BLUE FRIDAY 2026 / RELACIONAMENTO</span><h1>Reembolso</h1><p>Controle de teto, conversão e backlog. Valores operacionais só aparecem após informar a fonte.</p></div><div className="refund-hero-badge">Metas oficiais · Novembro 2026</div></header>
    <section className="refund-kpis" aria-label="Metas oficiais">
      <article className="refund-kpi"><span>Teto mensal de referência</span><strong>{money(228905)}</strong><small>8,2% da receita PEF estimada</small></article>
      <article className="refund-kpi"><span>Teto da semana selecionada</span><strong>{money(selected.cap)}</strong><small>{selected.label} · {selected.dates}</small></article>
      <article className="refund-kpi"><span>Conversão mínima</span><strong>4%</strong><small>Trava para premiação</small></article>
      <article className="refund-kpi"><span>Backlog acima de 7 dias</span><strong>0</strong><small>Exigido no fechamento semanal</small></article>
    </section>
    <section className="refund-panel"><div className="refund-section-heading"><div><span>ACOMPANHAMENTO</span><h2>Tetos por semana</h2></div><label>Semana <select value={week} onChange={e=>setWeek(Number(e.target.value))}>{weeks.map((w,i)=><option value={i} key={i}>{w.label} · {w.dates}</option>)}</select></label></div><div className="refund-week-grid">{weeks.map((w,i)=><button type="button" key={i} className={"refund-week "+(week===i?"selected":"")} onClick={()=>setWeek(i)}><span>{w.label}</span><strong>{money(w.cap)}</strong><small>{w.dates}</small></button>)}</div><p className="refund-footnote">Os tetos semanais são referências do material oficial. A regra mensal prevalente é 8,2% da receita PEF efetiva. A distribuição semanal com receita diferente precisa ser homologada.</p></section>
    <div className="refund-two-col"><section className="refund-panel"><div className="refund-section-heading"><div><span>ENTRADA MANUAL TEMPORÁRIA</span><h2>Simular fechamento semanal</h2></div></div><p className="refund-muted">Preencha valores reais para conferir as travas. Estes campos não são salvos no banco e não geram premiação.</p><div className="refund-form"><label>Valor reembolsado na semana (R$)<input inputMode="decimal" placeholder="Ex.: 45000,00" value={refunded} onChange={e=>setRefunded(e.target.value)}/></label><label>Receita PEF do mês (R$)<input inputMode="decimal" placeholder="Ex.: 2790000,00" value={revenue} onChange={e=>setRevenue(e.target.value)}/></label><label>Conversão semanal (%)<input inputMode="decimal" placeholder="Ex.: 4,5" value={conversion} onChange={e=>setConversion(e.target.value)}/></label><label>Casos de backlog acima de 7 dias<input inputMode="numeric" placeholder="Ex.: 0" value={backlog} onChange={e=>setBacklog(e.target.value)}/></label><label>Fonte / relatório<input placeholder="Ex.: relatório operacional" value={source} onChange={e=>setSource(e.target.value)}/></label><label>Data de referência<input type="date" value={referenceDate} onChange={e=>setReferenceDate(e.target.value)}/></label></div><div className="refund-inline-info">Teto mensal calculado: <strong>{dynamicMonthlyCap===null?"Aguardando receita PEF":money(dynamicMonthlyCap)}</strong></div></section>
    <section className="refund-panel"><div className="refund-section-heading"><div><span>REGRAS DE ELEGIBILIDADE</span><h2>Travas da premiação</h2></div><span className={"refund-pill "+(eligible===true?"ok":eligible===false?"fail":"pending")}>{eligible===null?"Apuração incompleta":eligible?"Travas atendidas":"Trava não atendida"}</span></div><div className="refund-rule"><div><strong>Teto semanal</strong><small>{values.refunded===null?"Informe o valor reembolsado":money(values.refunded)+" de "+money(selected.cap)}</small></div><span>{status(capOk)}</span></div>{progress!==null&&<div className="refund-progress"><div style={{width:progress+"%"}}/></div>}<div className="refund-rule"><div><strong>Conversão de pelo menos 4%</strong><small>{values.conversion===null?"Informe a conversão":percent(values.conversion/100)}</small></div><span>{status(conversionOk)}</span></div><div className="refund-rule"><div><strong>Zero backlog acima de 7 dias</strong><small>{values.backlog===null?"Informe o backlog do fechamento":values.backlog+" caso(s)"}</small></div><span>{status(backlogOk)}</span></div><div className="refund-prize"><span>PREMIAÇÃO PREVISTA</span><strong>R$ 60 por semana</strong><p>Top 1 de conversão. Brinde para Top 1 de processamento. Ranking e pagamento dependem de dados por analista e homologação da gestão.</p></div><p className="refund-footnote">Resultado indicativo, não constitui aprovação de prêmio. {source?"Fonte informada: "+source+". ":"Sem fonte registrada. "}{referenceDate?"Referência: "+referenceDate.split("-").reverse().join("/")+".":""}</p></section></div>
    <section className="refund-panel"><div className="refund-section-heading"><div><span>DISTRIBUIÇÃO DE REFERÊNCIA</span><h2>Teto por dia da semana</h2></div></div><div className="refund-days">{days.map(d=><div key={d.day}><span>{d.day}</span><strong>{money(d.cap)}</strong></div>)}</div><p className="refund-footnote">Quinta-feira possui o maior teto diário. Valores são referências do material da campanha e não substituem o limite de 8,2% da receita real.</p></section>
  </div>;
}
