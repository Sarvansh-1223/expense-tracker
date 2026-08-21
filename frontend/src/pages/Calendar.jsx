import { useEffect, useState, useCallback } from "react";
import { CalendarAPI, ExpenseAPI } from "../services/resources";
import { MonthSwitcher, LoadingSpinner, EmptyState } from "../components/Common";
import { formatCurrency, formatDate, monthLabel } from "../utils/format";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayTransactions, setDayTransactions] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await CalendarAPI.get({ year, month });
    setDays(data.days);
    setSelectedDate(null);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const maxAmount = Math.max(1, ...days.map((d) => Number(d.amount)));

  const openDay = async (dateStr) => {
    setSelectedDate(dateStr);
    setDayLoading(true);
    const { data } = await ExpenseAPI.list({ date_from: dateStr, date_to: dateStr });
    setDayTransactions(data.results ?? data);
    setDayLoading(false);
  };

  if (loading) return <div className="page"><LoadingSpinner full /></div>;

  const firstDow = days.length ? new Date(days[0].date + "T00:00:00").getDay() : 0;
  const leadingBlanks = Array.from({ length: firstDow });

  const heatColor = (amount) => {
    if (amount === 0) return "";
    const intensity = amount / maxAmount;
    if (intensity > 0.66) return "var(--danger-soft)";
    if (intensity > 0.33) return "var(--brass-soft)";
    return "var(--accent-soft)";
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-sub">Daily spending for {monthLabel(year, month)}. Click a day to see transactions.</p>
        </div>
        <MonthSwitcher year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="cal-grid" style={{ marginBottom: 8 }}>
            {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
          </div>
          <div className="cal-grid">
            {leadingBlanks.map((_, i) => <div key={`b${i}`} className="cal-cell empty" />)}
            {days.map((d) => {
              const dayNum = Number(d.date.slice(-2));
              const isToday = d.date === today.toISOString().slice(0, 10);
              return (
                <div
                  key={d.date}
                  className={`cal-cell ${isToday ? "today" : ""}`}
                  style={{ background: selectedDate === d.date ? "var(--accent-soft)" : heatColor(Number(d.amount)) || "var(--surface)" }}
                  onClick={() => openDay(d.date)}
                >
                  <span className="cal-day-num">{dayNum}</span>
                  {Number(d.amount) > 0 && <span className="cal-amount num">{formatCurrency(d.amount, { compact: true })}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <span className="section-title">{selectedDate ? formatDate(selectedDate) : "Select a day"}</span>
          {!selectedDate ? (
            <EmptyState title="No day selected" subtitle="Click any date on the calendar to see its transactions." />
          ) : dayLoading ? (
            <LoadingSpinner />
          ) : dayTransactions.length === 0 ? (
            <EmptyState title="No spending on this day" />
          ) : (
            dayTransactions.map((t) => (
              <div className="cat-row" key={t.id}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{t.category_name}</div>
                </div>
                <span className="num amount-neg">-{formatCurrency(t.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
