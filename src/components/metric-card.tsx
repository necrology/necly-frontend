import type { ReactNode } from "react";

export function MetricCard({ label, value, change, icon }: { label: string; value: string; change: string; icon?: ReactNode }) {
  return (
    <article className="card metric-card">
      <div className="metric-label"><span>{label}</span>{icon}</div>
      <strong className="metric-value tabular">{value}</strong>
      <span className="metric-change">{change}</span>
    </article>
  );
}
