import {useState} from "react";
import "./BrandsPanel.css";
import "./RecorrenciaPanel.css";

const weeks=[
{label:"Semana 1 · 01 a 08/11",goal:16842,recovered:10222},
{label:"Semana 2 · 09 a 15/11",goal:21053,recovered:null},
{label:"Semana 3 · 16 a 22/11",goal:16842,recovered:null},
{label:"Semana 4 · 23 a 30/11",goal:25263,recovered:null}
];
const brl=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
export default function RecorrenciaPanel(){
 const [selected,setSelected]=useState(0);
 const w=weeks[selected],known=w.recovered!==null;
 const achieved=known?100*w.recovered!/w.goal:null;
 return <div className="brands rc-dashboard">
 <header className="brands-head rc-header"><div><span className="brands-kicker">BLUE FRIDAY 2026 / RELACIONAMENTO</span><h1>Recorrência</h1><p className="brands-sub">Assinatura e anuidade · Ana Pedroso e Milena</p></div><div className="brands-tools"><label htmlFor="rc-week">Semana</label><select id="rc-week" className="brands-select" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{weeks.map((x,i)=><option key={i} value={i}>{x.label}</option>)}</select></div></header>
 <div className="rc-banner"><div><span>META MENSAL · ASSINATURA</span><strong>R$ 80.000</strong><small>Recuperação de inadimplentes</small></div><div className="rc-banner-note">Anuidade: caixa zerada diariamente até 18h<br/>Reconhecimento sujeito às travas</div></div>
 <div className="brands-grid rc-cards">
 <div className="brands-card"><span className="brands-card-label">Meta semanal · assinatura</span><strong className="brands-value">{brl(w.goal)}</strong><p className="brands-caption">{w.label}</p></div>
 <div className="brands-card"><span className="brands-card-label">Receita recuperada</span><strong className="brands-value">{known?brl(w.recovered!):"Pendente"}</strong><p className="brands-caption">{known?"Resultado da semana informado":"Aguardando fechamento semanal"}</p></div>
 <div className="brands-card"><span className="brands-card-label">Atingimento</span><strong className="brands-value">{achieved===null?"Pendente":achieved.toLocaleString("pt-BR",{maximumFractionDigits:2})+"%"}</strong><p className="brands-caption">{known?brl(Math.max(0,w.goal-w.recovered!))+" para a meta":"Sem dados confirmados"}</p>{achieved!==null&&<div className="rc-track"><div style={{width:Math.min(100,achieved)+"%"}}/></div>}</div>
 <div className="brands-card"><span className="brands-card-label">Meta de assinatura</span><strong className="brands-value rc-status">{!known?"Pendente":w.recovered!>=w.goal?"Atingida":"Não atingida"}</strong><p className="brands-caption">Trava do prêmio em dinheiro</p></div>
 </div>
 <div className="brands-sections rc-sections">
 <section className="brands-panel"><span className="rc-eyebrow">DESTAQUES DA SEMANA</span><h2>Reconhecimento individual</h2>{selected===0?<><div className="rc-person"><div><span className="rc-medal">1º</span><strong>Milena</strong><small>Assinatura · maior contribuição: 9,9%</small></div><span className="brands-pill bad">R$ 60 não liberados</span></div><div className="rc-person"><div><span className="rc-medal">1º</span><strong>Milena</strong><small>373 efetivas na semana</small></div><span className="brands-pill wait">Brinde indicado</span></div><div className="rc-person"><div><span className="rc-medal">★</span><strong>Ana Pedroso</strong><small>Anuidade · destaque de contribuição: 13,8%</small></div><span className="brands-pill wait">Destaque</span></div><p className="brands-note">O resumo enviado indica Milena como destaque em assinatura e efetivas e Ana Pedroso em anuidade. O brinde depende de confirmar a caixa zerada em pelo menos três dias até as 18h, especialmente segunda e sexta.</p></>:<p className="brands-note">Resultados individuais desta semana ainda não informados. Nenhuma premiação presumida.</p>}</section>
 <section className="brands-panel"><span className="rc-eyebrow">REGRAS OFICIAIS</span><h2>Metas e travas</h2><div className="brands-line"><span>Meta semanal de assinatura</span><span className={"brands-pill "+(!known?"wait":w.recovered!>=w.goal?"ok":"bad")}>{!known?"Pendente":w.recovered!>=w.goal?"Cumprida":"Não cumprida"}</span></div><div className="brands-line"><span>Caixas zeradas até 18h em pelo menos 3 dias, especialmente segunda e sexta</span><span className="brands-pill wait">Pendente</span></div><div className="brands-line"><span>200 efetivas no mínimo para o brinde</span><span className={"brands-pill "+(selected===0?"ok":"wait")}>{selected===0?"Cumprida (Milena)":"Pendente"}</span></div><div className="brands-line"><span>Anuidade: caixa zerada todos os dias até 18h</span><span className="brands-pill wait">Sem comprovação</span></div><p className="brands-note">R$ 60/semana: top 1 de contribuição de assinatura, somente se a meta semanal for batida. Brinde: top 1 de efetivas, sujeito às travas operacionais.</p></section></div>
 <section className="brands-panel rc-history"><span className="rc-eyebrow">EVOLUÇÃO SEMANAL</span><h2>Comparativo da campanha</h2><div style={{overflowX:"auto"}}><table><thead><tr><th>Semana</th><th>Meta</th><th>Recuperado</th><th>Atingimento</th><th>R$ 60</th><th>Brinde</th></tr></thead><tbody>{weeks.map((x,i)=><tr key={i}><td>{x.label}</td><td>{brl(x.goal)}</td><td>{x.recovered===null?"Pendente":brl(x.recovered)}</td><td>{x.recovered===null?"Pendente":(100*x.recovered/x.goal).toLocaleString("pt-BR",{maximumFractionDigits:2})+"%"}</td><td>{x.recovered===null?"Pendente":x.recovered<x.goal?"Não liberado":"A validar"}</td><td>{i===0?"Indicado, não homologado":"Pendente"}</td></tr>)}</tbody></table></div></section>
 <p className="brands-note">Fonte: slide oficial de metas e resumo de resultados da Semana 1 enviados pela equipe. Semanas seguintes aguardam dados. Este painel ainda não possui sincronização automática.</p>
 </div>;
}