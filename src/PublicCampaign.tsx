import {useState} from "react";
import BrandsPanel from "./BrandsPanel";
import ChargebackPanel from "./ChargebackPanel";
import ReclameAquiPanel from "./ReclameAquiPanel";
import QueroPagoPanel from "./QueroPagoPanel";
import RecorrenciaPanel from "./RecorrenciaPanel";
import ResolucoesPanel from "./ResolucoesPanel";
import PublicOperationsPanels from "./PublicOperationsPanels";
import RefundPanel from "./RefundPanel";
import PublicMediaProconPanel from "./PublicMediaProconPanel";
import "./PublicCampaign.css";

const areas=["Visão geral","BO e Dados","Reembolso","Mídias e Procon","Recorrência","Chargeback","Resoluções","Quero Pago","Marcas","Reclame Aqui"];
const implemented=new Set(["Marcas","Chargeback","Reclame Aqui","Quero Pago","Recorrência","Resoluções"]);
const highlights=[
{area:"Quero Pago",goal:"R$ 13.800",actual:"R$ 10.360",pct:75.07},
{area:"Recorrência",goal:"R$ 16.842",actual:"R$ 10.222",pct:60.69},
{area:"Marcas",goal:"R$ 52.095",actual:"R$ 52.590,91",pct:100.95}
];
export default function PublicCampaign(){
 const [area,setArea]=useState("Visão geral");
 const [menuOpen,setMenuOpen]=useState(false);
 const navigate=(next:string)=>{setArea(next);setMenuOpen(false);window.scrollTo({top:0,behavior:"smooth"});};
 return <div className="public-campaign">
  <div className="public-ticker" aria-label="Blue Friday">{"🔥 BLUE FRIDAY　　".repeat(12)}</div>
  <header className="public-header"><div className="public-brand"><span className="public-brand-icon">Q</span><span>Quero<span className="public-brand-light">Bolsa</span></span></div><div className="public-header-right"><span className="public-header-tag">BLUE FRIDAY 2026</span><button type="button" className="public-menu-toggle" onClick={()=>setMenuOpen(v=>!v)} aria-expanded={menuOpen}>☰ Áreas</button></div></header>
  <div className="public-layout"><nav className={"public-nav "+(menuOpen?"is-open":"")} aria-label="Áreas da campanha"><span className="public-nav-caption">ACOMPANHAMENTO</span>{areas.map(item=><button type="button" key={item} onClick={()=>navigate(item)} className={item===area?"is-active":""}>{item}</button>)}<div className="public-nav-note">Consulta pública · sem login<br/>Atualização de dados sujeita à fonte de cada área</div></nav>
  <main className="public-main">
   {area==="Visão geral"?<div className="public-overview"><div className="public-intro"><span className="public-eyebrow">CAMPANHA · NOVEMBRO 2026</span><h1>Blue Friday <span>2026</span></h1><p>Metas, desempenho e premiações das áreas em um só lugar.</p></div><div className="public-feature"><div><span className="public-eyebrow">PANORAMA DA CAMPANHA</span><h2>9 áreas em acompanhamento</h2><p>Selecione uma área para conferir os resultados e as metas específicas. Indicadores ainda não confirmados permanecem pendentes.</p></div><div className="public-feature-stat"><strong>09</strong><span>ÁREAS</span></div></div><div className="public-section-heading"><h2>Resultados de referência · Semana 1</h2><span>01 a 08/11</span></div><div className="public-highlight-grid">{highlights.map(item=><button type="button" className="public-highlight" key={item.area} onClick={()=>navigate(item.area)}><div className="public-highlight-top"><strong>{item.area}</strong><span className={item.pct>=100?"is-good":"is-bad"}>{item.pct.toLocaleString("pt-BR",{maximumFractionDigits:2})}%</span></div><div className="public-progress"><span style={{width:Math.min(100,item.pct)+"%",background:item.pct>=100?"#15986e":"#4b90ff"}}/></div><p>{item.actual} <small>de {item.goal}</small></p></button>)}</div><div className="public-section-heading"><h2>Explorar áreas</h2><span>Selecione um painel</span></div><div className="public-area-grid">{areas.filter(a=>a!=="Visão geral").map(item=><button type="button" key={item} onClick={()=>navigate(item)}><span>{item}</span><small>{implemented.has(item)?"Ver resultados →":"Dados em preparação →"}</small></button>)}</div></div>
   :area==="Reembolso"?<RefundPanel/>
   :area==="Mídias e Procon"?<PublicMediaProconPanel/>
   :area==="Marcas"?<BrandsPanel/>
   :area==="Chargeback"?<ChargebackPanel admin={false}/>
   :area==="Reclame Aqui"?<ReclameAquiPanel admin={false}/>
   :area==="Quero Pago"?<QueroPagoPanel/>
   :area==="Recorrência"?<RecorrenciaPanel/>
   :area==="Resoluções"?<ResolucoesPanel/>
   :area==="BO e Dados"?<PublicOperationsPanels area={area}/>
   :<div className="public-placeholder"><span className="public-eyebrow">BLUE FRIDAY 2026</span><h1>{area}</h1><p>Esta área depende de dados internos e de consultas protegidas. O painel público ainda não tem uma fonte de leitura aprovada. Nenhuma informação foi inventada.</p><button type="button" onClick={()=>navigate("Visão geral")}>Voltar à visão geral</button></div>}
  </main></div>
 </div>;
}