"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="id"><body><main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,fontFamily:"system-ui",color:"#061b31",background:"#fbfbf8"}}><div style={{maxWidth:520,textAlign:"center"}}><h1>Aplikasi Necly tidak dapat dimuat.</h1><p>Muat ulang antarmuka atau coba lagi.</p><button onClick={reset} style={{minHeight:44,padding:"8px 16px",color:"white",background:"#061b31",border:0,borderRadius:5}}>Coba lagi</button></div></main></body></html>;
}
