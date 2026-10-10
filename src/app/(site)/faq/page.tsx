import type { Metadata } from "next";
import { faqQuestions as questions } from "@/data/guide";

export const metadata: Metadata = { title: "FAQ", description: "Pertanyaan umum seputar layanan, pembayaran, dan akses Necly." };

export default function FaqPage() {
  return <><section className="support-hero"><div className="container"><span className="eyebrow">Pusat bantuan</span><h1 className="h1">Pertanyaan yang sering ditanyakan</h1><p>Informasi ringkas tentang layanan, pesanan, pembayaran, dan akses Anda.</p></div></section><section className="container faq-page"><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section></>;
}
