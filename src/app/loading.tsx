export default function Loading() {
  return <main id="main-content" className="container section" aria-busy="true" aria-label="Memuat halaman"><div style={{display:"grid",gap:18}}><span className="skeleton" style={{width:110,height:12,borderRadius:3}}/><span className="skeleton" style={{width:"min(680px, 90%)",height:62,borderRadius:5}}/><span className="skeleton" style={{width:"min(520px, 75%)",height:18,borderRadius:4}}/><div className="service-grid" style={{marginTop:30}}>{[1,2,3].map(item=><span className="skeleton" style={{height:360,borderRadius:7}} key={item}/>)}</div></div></main>;
}
