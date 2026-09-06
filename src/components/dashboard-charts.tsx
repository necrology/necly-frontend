"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryPerformance, revenueSeries } from "@/data/seed";

const tooltipStyle = { border: "1px solid #e3eaf2", borderRadius: 5, boxShadow: "0 14px 30px -20px rgba(6,27,49,.3)", fontFamily: "Sora", fontSize: 10 };

export function RevenueChart() {
  return <div className="chart-wrap" aria-label="Grafik pendapatan tujuh hari"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueSeries} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2463eb" stopOpacity={0.24}/><stop offset="100%" stopColor="#2463eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf1f5" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }} tickFormatter={(value) => `${String(value).replace(".", ",")} jt`}/><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`Rp${String(value).replace(".", ",")} jt`, "Pendapatan"]}/><Area type="monotone" dataKey="revenue" stroke="#2463eb" strokeWidth={2} fill="url(#revenueFill)" activeDot={{ r: 4, strokeWidth: 2, fill: "white" }}/></AreaChart></ResponsiveContainer></div>;
}

export function OrdersChart() {
  return <div className="chart-wrap" aria-label="Grafik pesanan per hari"><ResponsiveContainer width="100%" height="100%"><BarChart data={revenueSeries} margin={{ top: 10, right: 4, left: -30, bottom: 0 }}><CartesianGrid stroke="#edf1f5" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="orders" fill="#3438a4" radius={[3,3,0,0]} maxBarSize={24}/></BarChart></ResponsiveContainer></div>;
}

export function CategoryChart() {
  return <div className="chart-wrap" aria-label="Grafik pendapatan per kategori"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryPerformance} layout="vertical" margin={{ top: 5, right: 15, left: 8, bottom: 0 }}><CartesianGrid stroke="#edf1f5" horizontal={false}/><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8b98a9", fontSize: 9 }} tickFormatter={(value) => `${String(value).replace(".", ",")} jt`}/><YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={78} tick={{ fill: "#66778c", fontSize: 9 }}/><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`Rp${String(value).replace(".", ",")} jt`, "Pendapatan"]}/><Bar dataKey="revenue" fill="#0ea5e9" radius={[0,3,3,0]} maxBarSize={18}/></BarChart></ResponsiveContainer></div>;
}
