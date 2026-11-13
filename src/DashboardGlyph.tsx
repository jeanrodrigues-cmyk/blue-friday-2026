type DashboardGlyphName="revenue"|"wallet"|"calendar"|"upload"|"target"|"trend"|"award"|"shield"|"message"|"check"|"users"|"clock";
export default function DashboardGlyph({name,size=24}:{name:DashboardGlyphName;size?:number}){
 const common={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.9,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true as const};
 const icons={
 revenue:<><path d="M3 19h18M5 16l5-5 4 3 6-8M16 6h4v4"/><circle cx="7" cy="6" r="2"/></>,
 wallet:<><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 10h18M6 6V4a2 2 0 0 1 2-2h10"/><path d="M16 15h2"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m5 5 2 2 4-4"/></>,
 upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/></>,
 target:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></>,
 trend:<><path d="m3 17 6-6 4 4 8-9M15 6h6v6"/></>,
 award:<><circle cx="12" cy="8" r="6"/><path d="m8 14-1 8 5-3 5 3-1-8"/></>,
 shield:<><path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/><path d="m8 12 3 3 5-6"/></>,
 message:<><path d="M4 4h16v13H8l-4 4V4z"/><path d="M8 9h8m-8 4h5"/></>,
 check:<><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>,
 users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>
 };return <svg {...common}>{icons[name]}</svg>;
}
