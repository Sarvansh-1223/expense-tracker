import { useEffect, useState, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import { Lightbulb, TrendingUp } from "lucide-react";
import { AnalyticsAPI } from "../services/resources";
import { LoadingSpinner, MonthSwitcher, EmptyState } from "../components/Common";
import { formatCurrency, monthLabel } from "../utils/format";

function useCssVar(name, fallback) {
  const [val, setVal] = useState(fallback);
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) setVal(v);
  }, [name]);
  return val;
}

export default function Analytics() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const inkMuted = useCssVar("--ink-muted", "#666");
  const border = useCssVar("--border", "#eee");
  const accent = useCssVar("--accent", "#1F7A5C");
  const danger = useCssVar("--danger", "#B8443C");
  const surface = useCssVar("--surface", "#fff");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await AnalyticsAPI.get({ year, month, months_back: 8 });
    setData(data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <div className="page"><LoadingSpinner full /></div>;

  const { category_breakdown, monthly_trend, daily_spending, insights } = data;

  const tooltipStyle = { background: surface, border: `1px solid ${border}`, borderRadius: 8, fontSize: 12.5 };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Spending patterns for {monthLabel(year, month)}, computed from your real transactions.</p>
        </div>
        <MonthSwitcher year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <span className="section-title">Expense by Category</span>
          {category_breakdown.length === 0 ? <EmptyState title="No expenses this month" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={category_breakdown} dataKey="amount" nameKey="category" innerRadius={62} outerRadius={100} paddingAngle={2}>
                  {category_breakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(val, name, props) => [`${formatCurrency(val)} (${props.payload.percentage}%)`, props.payload.category]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {category_breakdown.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
              {category_breakdown.slice(0, 6).map((c) => (
                <div key={c.category} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                  <span className="avatar-dot" style={{ background: c.color }} /> {c.category} <span style={{ color: "var(--ink-faint)" }}>{c.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <span className="section-title">Income vs Expenses</span>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: inkMuted }} axisLine={{ stroke: border }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: inkMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
              <Tooltip contentStyle={tooltipStyle} formatter={(val) => formatCurrency(val)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill={accent} name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill={danger} name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <span className="section-title">Daily Spending — {monthLabel(year, month)}</span>
          {daily_spending.every((d) => Number(d.amount) === 0) ? <EmptyState title="No spending recorded this month" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily_spending}>
                <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: inkMuted }} tickFormatter={(d) => d.slice(-2)} interval={2} axisLine={{ stroke: border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: inkMuted }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val) => formatCurrency(val)} />
                <Line type="monotone" dataKey="amount" stroke={accent} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <span className="section-title">Automatic Insights</span>
          {insights.length === 0 ? <EmptyState icon={Lightbulb} title="Not enough data yet" subtitle="Insights appear as you log more transactions." /> : (
            insights.map((msg, i) => (
              <div className="insight-item" key={i}>
                <TrendingUp color="var(--accent)" />
                <span>{msg}</span>
              </div>
            ))
          )}

          <div style={{ marginTop: 18 }}>
            <span className="section-title" style={{ marginBottom: 10 }}>Monthly Trend (Savings)</span>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={monthly_trend}>
                <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: inkMuted }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(val) => formatCurrency(val)} />
                <Line type="monotone" dataKey="savings" stroke={accent} strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
