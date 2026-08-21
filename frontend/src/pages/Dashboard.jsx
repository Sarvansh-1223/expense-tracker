import { useEffect, useState, useCallback } from "react";
import {
  Wallet, TrendingDown, Scale, PiggyBank, Target, AlertTriangle,
  Lightbulb, TrendingUp, TrendingDown as TrendDown, ArrowRight, Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardAPI } from "../services/resources";
import StatCard from "../components/StatCard";
import BudgetProgress from "../components/BudgetProgress";
import { LoadingSpinner, MonthSwitcher, EmptyState } from "../components/Common";
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS, monthLabel } from "../utils/format";

const WARNING_ICONS = { danger: AlertTriangle, warning: AlertTriangle, info: Lightbulb };
const WARNING_COLORS = { danger: "var(--danger)", warning: "var(--brass)", info: "var(--info)" };

export default function Dashboard() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await DashboardAPI.get({ year, month });
    setData(data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <div className="page"><LoadingSpinner full /></div>;

  const { summary, warnings, insights, upcoming_expenses, category_budgets } = data;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Overview</h1>
          <p className="page-sub">Everything that happened in {monthLabel(year, month)}, at a glance.</p>
        </div>
        <MonthSwitcher year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <StatCard icon={Wallet} label="Total Income" value={formatCurrency(summary.total_income)} tone="accent" />
        <StatCard icon={TrendingDown} label="Total Expenses" value={formatCurrency(summary.total_expenses)} tone="danger" />
        <StatCard icon={Scale} label="Remaining Balance" value={formatCurrency(summary.balance)} tone="info" />
        <StatCard icon={PiggyBank} label="Savings" value={formatCurrency(summary.savings)}
          trend={{ text: `${summary.savings_percentage}% of income`, negative: summary.savings_percentage < 0 }} tone="accent" />
        <StatCard icon={Target} label="Monthly Budget" value={formatCurrency(summary.monthly_budget)} tone="brass" />
        <StatCard icon={Target} label="Budget Left" value={formatCurrency(summary.budget_remaining)}
          tone={summary.budget_remaining < 0 ? "danger" : "brass"}
          trend={summary.monthly_budget > 0 ? { text: `${summary.budget_usage_percentage}% used`, negative: summary.budget_usage_percentage >= 100 } : null} />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span className="section-title" style={{ marginBottom: 0 }}>Recent Transactions</span>
            <Link to="/transactions" style={{ fontSize: 12.5, color: "var(--accent)", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {summary.recent_transactions.length === 0 ? (
            <EmptyState title="No transactions yet" subtitle="Add your first expense to see it here." />
          ) : (
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="data-table">
                <tbody>
                  {summary.recent_transactions.map((t) => (
                    <tr key={t.id}>
                      <td style={{ color: "var(--ink-muted)", width: 70 }}>{formatDate(t.date)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{t.category_name}</div>
                      </td>
                      <td style={{ textAlign: "right" }} className="num amount-neg">-{formatCurrency(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <span className="section-title">Warnings & Insights</span>
          {warnings.length === 0 && insights.length === 0 ? (
            <EmptyState icon={Sparkles} title="All quiet" subtitle="No warnings yet — keep it up." />
          ) : (
            <div>
              {warnings.map((w, i) => {
                const Icon = WARNING_ICONS[w.type] || Lightbulb;
                return (
                  <div className="insight-item" key={`w${i}`}>
                    <Icon color={WARNING_COLORS[w.type]} />
                    <span>{w.message}</span>
                  </div>
                );
              })}
              {insights.map((msg, i) => (
                <div className="insight-item" key={`i${i}`}>
                  <TrendingUp color="var(--accent)" />
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <span className="section-title">Category Budgets</span>
          {category_budgets.length === 0 ? (
            <EmptyState title="No category budgets set" subtitle="Set one up on the Budgets page." />
          ) : (
            category_budgets.map((cb) => (
              <BudgetProgress key={cb.category_id} label={cb.category_name} color={cb.category_color}
                spent={cb.spent} budget={cb.budget} usagePct={cb.usage_percentage} exceeded={cb.exceeded} />
            ))
          )}
        </div>

        <div className="card">
          <span className="section-title">Upcoming Expenses</span>
          {upcoming_expenses.length === 0 ? (
            <EmptyState title="Nothing coming up" subtitle="No recurring expenses due in the next two weeks." />
          ) : (
            upcoming_expenses.map((u) => (
              <div className="cat-row" key={u.id}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{formatDate(u.next_due_date)} · {PAYMENT_METHOD_LABELS[u.payment_method]}</div>
                </div>
                <span className="num" style={{ fontWeight: 600 }}>{formatCurrency(u.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
