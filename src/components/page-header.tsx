import type { ReactNode } from "react";
import { DEMO_MODE } from "@/lib/api";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <div className="demo-data-label">{DEMO_MODE ? "Mode simulasi — data contoh, bukan data nyata" : "Data operasional langsung"}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
