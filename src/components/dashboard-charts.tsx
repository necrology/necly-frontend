"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { categoryPerformance, revenueSeries } from "@/data/seed";
import { formatIDR } from "@/lib/money";
import { orderStatusLabel } from "@/lib/order-status";
import type {
  CategoryBreakdownPoint,
  OrdersSeriesPoint,
  RevenueSeriesPoint,
  StatusBreakdownPoint,
  TopProductPoint,
} from "@/lib/types";

const tooltipStyle = { border: "1px solid #e3eaf2", borderRadius: 5, boxShadow: "0 14px 30px -20px rgba(6,27,49,.3)", fontFamily: "Sora", fontSize: 10 };
const STATUS_COLORS = ["#2463eb", "#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

function formatDayLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function formatDayTooltip(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function ChartEmpty({ message, minHeight = 220 }: { message: string; minHeight?: number }) {
  return (
    <p className="chart-empty muted small" role="status" style={{ minHeight }}>
      {message}
    </p>
  );
}

/** Grafik contoh untuk mode demo/report lama. Data live memakai komponen ber-prop. */
export function RevenueChart() {
  return <div className="chart-wrap" aria-label="Grafik pendapatan tujuh hari"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueSeries} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2463eb" stopOpacity={0.24}/><stop offset="100%" stopColor="#2463eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf1f5" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }} tickFormatter={(value) => `${String(value).replace(".", ",")} jt`}/><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`Rp${String(value).replace(".", ",")} jt`, "Pendapatan"]}/><Area type="monotone" dataKey="revenue" stroke="#2463eb" strokeWidth={2} fill="url(#revenueFill)" activeDot={{ r: 4, strokeWidth: 2, fill: "white" }}/></AreaChart></ResponsiveContainer></div>;
}

export function OrdersChart() {
  return <div className="chart-wrap" aria-label="Grafik pesanan per hari"><ResponsiveContainer width="100%" height="100%"><BarChart data={revenueSeries} margin={{ top: 10, right: 4, left: -30, bottom: 0 }}><CartesianGrid stroke="#edf1f5" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="orders" fill="#3438a4" radius={[3,3,0,0]} maxBarSize={24}/></BarChart></ResponsiveContainer></div>;
}

export function CategoryChart() {
  return <div className="chart-wrap" aria-label="Grafik pendapatan per kategori"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryPerformance} layout="vertical" margin={{ top: 5, right: 15, left: 8, bottom: 0 }}><CartesianGrid stroke="#edf1f5" horizontal={false}/><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }} tickFormatter={(value) => `${String(value).replace(".", ",")} jt`}/><YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={78} tick={{ fill: "#66778c", fontSize: 9 }}/><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`Rp${String(value).replace(".", ",")} jt`, "Pendapatan"]}/><Bar dataKey="revenue" fill="#0ea5e9" radius={[0,3,3,0]} maxBarSize={18}/></BarChart></ResponsiveContainer></div>;
}

/** Tren pendapatan harian dari `revenue_series`. */
export function RevenueTrendChart({ data }: { data: RevenueSeriesPoint[] }) {
  if (data.length === 0) {
    return <ChartEmpty message="Belum ada data pendapatan pada periode ini." />;
  }
  const chartData = data.map((point) => ({ ...point, label: formatDayLabel(point.date) }));
  const total = data.reduce((sum, point) => sum + point.amount, 0);

  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label={`Tren pendapatan harian ${data.length} hari, total ${formatIDR(total)}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="analyticsRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2463eb" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#2463eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#edf1f5" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }} minTickGap={12} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }} tickFormatter={(value) => formatIDR(Number(value))} width={54} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(label, payload) => {
              const date = payload?.[0]?.payload?.date;
              return typeof date === "string" ? formatDayTooltip(date) : String(label);
            }}
            formatter={(value) => [formatIDR(Number(value)), "Pendapatan"]}
          />
          <Area type="monotone" dataKey="amount" stroke="#2463eb" strokeWidth={2} fill="url(#analyticsRevenueFill)" activeDot={{ r: 4, strokeWidth: 2, fill: "white" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Jumlah pesanan per hari dari `orders_series`. */
export function OrdersSeriesChart({ data }: { data: OrdersSeriesPoint[] }) {
  if (data.length === 0) {
    return <ChartEmpty message="Belum ada data pesanan pada periode ini." />;
  }
  const chartData = data.map((point) => ({ ...point, label: formatDayLabel(point.date) }));
  const total = data.reduce((sum, point) => sum + point.orders, 0);

  return (
    <div className="chart-wrap" role="img" aria-label={`Pesanan per hari selama ${data.length} hari, total ${total} pesanan.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="#edf1f5" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }} minTickGap={12} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }} width={34} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(label, payload) => {
              const date = payload?.[0]?.payload?.date;
              return typeof date === "string" ? formatDayTooltip(date) : String(label);
            }}
            formatter={(value) => [String(value), "Pesanan"]}
          />
          <Bar dataKey="orders" fill="#3438a4" radius={[3, 3, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Komposisi status pesanan dengan label bahasa Indonesia dari `order-status.ts`. */
export function OrderStatusDonutChart({ data }: { data: StatusBreakdownPoint[] }) {
  if (data.length === 0) {
    return <ChartEmpty message="Belum ada data status pesanan pada periode ini." />;
  }
  const chartData = data.map((point) => ({
    ...point,
    label: orderStatusLabel(point.status),
  }));
  const total = chartData.reduce((sum, point) => sum + point.count, 0);
  const summary = chartData.map((point) => `${point.label} ${point.count}`).join(", ");

  return (
    <div className="status-chart-layout">
      <div className="chart-wrap chart-donut" role="img" aria-label={`Komposisi status pesanan: ${summary}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="count" nameKey="label" innerRadius="55%" outerRadius="82%" paddingAngle={2} strokeWidth={0}>
              {chartData.map((point, index) => (
                <Cell key={`${point.status}-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${String(value)} pesanan`, String(name)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="chart-legend" aria-label="Keterangan komposisi status pesanan">
        {chartData.map((point, index) => (
          <li key={`${point.status}-${index}`}>
            <span className="chart-legend-dot" style={{ background: STATUS_COLORS[index % STATUS_COLORS.length] }} aria-hidden="true" />
            <span>{point.label}</span>
            <strong>{point.count}</strong>
            <small>{total > 0 ? `${Math.round((point.count / total) * 100)}%` : "0%"}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pendapatan per kategori dari `category_breakdown` (horizontal bar). */
export function CategoryRevenueBarChart({ data }: { data: CategoryBreakdownPoint[] }) {
  if (data.length === 0) {
    return <ChartEmpty message="Belum ada data pendapatan per kategori pada periode ini." />;
  }
  const chartData = data.map((point) => ({
    ...point,
    name: point.categoryName,
  }));
  const total = data.reduce((sum, point) => sum + point.revenue, 0);
  const summary = data.map((point) => `${point.categoryName} ${formatIDR(point.revenue)}`).join(", ");

  return (
    <div className="chart-wrap" role="img" aria-label={`Pendapatan per kategori: ${summary}. Total ${formatIDR(total)}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#edf1f5" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }} tickFormatter={(value) => formatIDR(Number(value))} />
          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={104} tick={{ fill: "#66778c", fontSize: 9 }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatIDR(Number(value)), "Pendapatan"]} />
          <Bar dataKey="revenue" fill="#0ea5e9" radius={[0, 3, 3, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Produk terlaris: tabel ringkas dengan bar proporsi penjualan. */
export function TopProductsBreakdown({ data }: { data: TopProductPoint[] }) {
  if (data.length === 0) {
    return <ChartEmpty message="Belum ada produk terjual pada periode ini." minHeight={120} />;
  }
  const maxSales = Math.max(...data.map((item) => item.salesCount), 1);

  return (
    <div className="table-scroll">
      <table className="data-table" aria-label="Produk terlaris">
        <thead>
          <tr>
            <th>#</th>
            <th>Produk</th>
            <th>Terjual</th>
            <th>Pendapatan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.productId || `${item.productName}-${index}`}>
              <td className="table-secondary">{index + 1}</td>
              <td>
                <span className="table-primary">{item.productName}</span>
                <span className="ranking-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(4, Math.round((item.salesCount / maxSales) * 100))}%` }} />
                </span>
              </td>
              <td className="tabular">{item.salesCount}</td>
              <td className="tabular">{formatIDR(item.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
