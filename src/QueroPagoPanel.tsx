import {useState} from "react";
import "./BrandsPanel.css";
import "./QueroPagoPanel.css";

const weeks=[
{label:"Semana 1 · 01 a 08/11",goal:13800,revenue:10360},
{label:"Semana 2 · 09 a 15/11",goal:14720,revenue:null},
{label:"Semana 3 · 16 a 22/11",goal:9200,revenue:null},
{label:"Semana 4 · 23 a 30/11",goal:8280,revenue:null}
];
const brl=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
export default function QueroPagoPanel(){
 const [selected,setSelected]=useState(0);
 const w=weeks[selected],known=w.revenue!==null;
 const achieved=known?100*w.revenue!/w.goal:null;
 return <div className="brands qp-dashboard">
 <header className="brands-head qp-header"><div><span className="brands-kicker">BLUE FRIDAY 2026 / RELACIONAMENTO</span><h1>Quero Pago</h1><p className="brands-sub">Receita, efetivas e premiações · Gabriel e Luiz</p></div><div className="brands-tools"><label htmlFor="qp-week">Semana</label><select id="qp-week" className="brands-select" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{weeks.map((x,i)=><option key={i} value={i}>{x.label}</option>)}</select></div></header>
 <div className="qp-banner"><div><span>META DE NOVEMBRO</span><strong>R$ 46.000</strong><small>Meta mensal oficial da campanha</small></div><div className="qp-banner-note">4 semanas de acompanhamento<br/>Premiações condicionadas às regras</div></div>
 <div className="brands-grid qp-cards">
 <div className="brands-card"><span className="brands-card-label">Meta semanal</span><strong className="brands-value">{brl(w.goal)}</strong><p className="brands-caption">{w.label}</p></div>
 <div className="brands-card"><span className="brands-card-label">Receita realizada</span><strong className="brands-value">{known?brl(w.revenue!):"Pendente"}</strong><p className="brands-caption">{known?"Resultado informado no relatório":"Aguardando resultado semanal"}</p></div>
 <div className="brands-card"><span className="brands-card-label">Atingimento da meta</span><strong className="brands-value">{achieved===null?"Pendente":achieved.toLocaleString("pt-BR",{maximumFractionDigits:2})+"%"}</strong><p className="brands-caption">{known?brl(Math.max(0,w.goal-w.revenue!))+" para a meta":"Sem dados confirmados"}</p>{achieved!==null&&<div className="qp-track"><div style={{width:Math.min(100,achieved)+"%"}}/></div>}</div>
 <div className="brands-card"><span className="brands-card-label">Meta de receita</span><strong className="brands-value qp-status">{!known?"Pendente":w.revenue!>=w.goal?"Atingida":"Não atingida"}</strong><p className="brands-caption">Condição para prêmio em dinheiro</p></div>
 </div>
 <div className="brands-sections qp-sections">
 <section className="brands-panel"><span className="qp-eyebrow">DESTAQUES DA SEMANA</span><h2>Ranking e reconhecimento</h2>{selected===0?<><div className="qp-person"><div><span className="qp-medal">1º</span><strong>Gabriel</strong><small>Maior contribuição informada · 5,8%</small></div><span className="brands-pill bad">R$ 60 não liberados</span></div><div className="qp-person"><div><span className="qp-medal">1º</span><strong>Gabriel</strong><small>275 efetivas na semana</small></div><span className="brands-pill wait">Brinde indicado</span></div><p className="brands-note">O relatório indica Gabriel como destaque de contribuição e vencedor do brinde. A confirmação dos três dias de caixa zerada até as 18h ainda não foi fornecida. Os resultados de Luiz também não foram enviados.</p></>:<p className="brands-note">Resultados individuais ainda não informados para esta semana. Nenhum vencedor ou prêmio presumido.</p>}</section>
 <section className="brands-panel"><span className="qp-eyebrow">REGRAS DA CAMPANHA</span><h2>Metas e travas</h2><div className="brands-line"><span>Receita semanal atingida</span><span className={"brands-pill "+(!known?"wait":w.revenue!>=w.goal?"ok":"bad")}>{!known?"Pendente":w.revenue!>=w.goal?"Cumprida":"Não cumprida"}</span></div><div className="brands-line"><span>Caixa zerada até 18h em pelo menos 3 dias, especialmente segunda e sexta</span><span className="brands-pill wait">Pendente</span></div><div className="brands-line"><span>Mínimo de 200 efetivas para o brinde</span><span className={"brands-pill "+(selected===0?"ok":"wait")}>{selected===0?"Cumprida (Gabriel)":"Pendente"}</span></div><div className="brands-line"><span>Caixa zerada todos os dias até 18h</span><span className="brands-pill wait">Sem comprovação</span></div><p className="brands-note">R$ 60/semana: maior contribuição, somente com meta de receita atingida. Brinde: maior número de efetivas, sujeito às travas operacionais.</p></section></div>
 <section className="brands-panel qp-history"><span className="qp-eyebrow">EVOLUÇÃO DA CAMPANHA</span><h2>Comparativo semanal</h2><div style={{overflowX:"auto"}}><table><thead><tr><th>Semana</th><th>Meta</th><th>Receita</th><th>Atingimento</th><th>Prêmio R$ 60</th><th>Brinde</th></tr></thead><tbody>{weeks.map((x,i)=><tr key={i}><td>{x.label}</td><td>{brl(x.goal)}</td><td>{x.revenue===null?"Pendente":brl(x.revenue)}</td><td>{x.revenue===null?"Pendente":(100*x.revenue/x.goal).toLocaleString("pt-BR",{maximumFractionDigits:2})+"%"}</td><td>{x.revenue===null?"Pendente":x.revenue<x.goal?"Não liberado":"A validar"}</td><td>{i===0?"Indicado, não homologado":"Pendente"}</td></tr>)}</tbody></table></div></section>
 <p className="brands-note">Fonte: metas oficiais da Blue Friday e resumo de resultados da Semana 1 fornecido pela equipe. Semanas 2 a 4 aguardam dados; nenhuma atualização automática está configurada.</p>
 </div>;
}