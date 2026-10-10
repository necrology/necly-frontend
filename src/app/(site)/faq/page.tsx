import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { faqQuestions as questions } from "@/data/guide";

export const metadata: Metadata = { title: "FAQ", description: "Pertanyaan umum seputar layanan, pembayaran, dan akses Necly." };

export default function FaqPage() {
  return <><section className="support-hero"><div className="container"><span className="eyebrow">Pusat bantuan</span><h1 className="h1">Pertanyaan yang sering ditanyakan</h1><p>Informasi ringkas tentang layanan, pesanan, pembayaran, dan akses Anda.</p></div></section><section className="container faq-page"><div className="faq-list">{questions.map(({ question, answer, action }) => <details key={question}><summary>{question}<ChevronDown className="faq-chevron" size={20} aria-hidden="true" /></summary><p>{answer}</p>{action && <Link className="faq-action" href={action.href}>{action.label}</Link>}</details>)}</div></section></>;
}
