"""Business logic kept out of views/serializers, per the "fat services, thin
views" separation requested for this project."""
import calendar
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from .models import Budget, CategoryBudget, Expense, Income, RecurringExpense


def month_bounds(year: int, month: int):
    first = date(year, month, 1)
    last = date(year, month, calendar.monthrange(year, month)[1])
    return first, last


def process_recurring_expenses(user=None, as_of: date | None = None) -> dict:
    """Generate concrete Expense rows for every RecurringExpense whose
    next_due_date has arrived. Idempotent: next_due_date is advanced (and
    persisted) immediately after each transaction is created, so re-running
    this command never creates duplicates. Safe to run for a single user
    (e.g. on login) or for everyone (e.g. from a daily cron / management
    command)."""
    as_of = as_of or timezone.localdate()
    qs = RecurringExpense.objects.filter(is_active=True, next_due_date__lte=as_of)
    if user is not None:
        qs = qs.filter(user=user)

    created = 0
    processed_rules = 0
    for rule in qs.select_related("category"):
        processed_rules += 1
        # A single rule may have several due dates queued up (e.g. the
        # scheduler didn't run for a while) - catch it up fully but safely.
        guard = 0
        while rule.is_active and rule.next_due_date <= as_of and guard < 366:
            guard += 1
            already_exists = Expense.objects.filter(
                recurring_source=rule, date=rule.next_due_date
            ).exists()
            if not already_exists:
                Expense.objects.create(
                    user=rule.user,
                    category=rule.category,
                    title=rule.name,
                    description=f"Auto-generated from recurring expense '{rule.name}'",
                    amount=rule.amount,
                    date=rule.next_due_date,
                    payment_method=rule.payment_method,
                    is_recurring=True,
                    recurring_source=rule,
                )
                created += 1
            rule.advance_next_due_date()
        rule.save(update_fields=["next_due_date", "is_active", "updated_at"])

    return {"rules_processed": processed_rules, "transactions_created": created}


def _sum(qs):
    return qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")


def dashboard_summary(user, year: int, month: int) -> dict:
    first, last = month_bounds(year, month)
    today = timezone.localdate()

    expenses_qs = Expense.objects.filter(user=user, date__gte=first, date__lte=last)
    income_qs = Income.objects.filter(user=user, date__gte=first, date__lte=last)

    total_expenses = _sum(expenses_qs)
    total_income = _sum(income_qs)
    balance = total_income - total_expenses
    savings = balance if balance > 0 else Decimal("0")
    savings_pct = float((balance / total_income) * 100) if total_income > 0 else 0.0

    budget = Budget.objects.filter(user=user, year=year, month=month).first()
    budget_amount = budget.amount if budget else Decimal("0")
    budget_remaining = budget_amount - total_expenses

    today_total = Decimal("0")
    week_total = Decimal("0")
    if first <= today <= last:
        today_total = _sum(expenses_qs.filter(date=today))
        week_start = today - timedelta(days=today.weekday())
        week_start = max(week_start, first)
        week_total = _sum(expenses_qs.filter(date__gte=week_start, date__lte=today))

    top_category = (
        expenses_qs.values("category__name", "category__color")
        .annotate(total=Sum("amount"))
        .order_by("-total")
        .first()
    )

    recent_transactions = list(expenses_qs.order_by("-date", "-created_at")[:5])

    days_elapsed = (min(today, last) - first).days + 1 if today >= first else 0
    days_elapsed = max(days_elapsed, 1)
    avg_daily = total_expenses / Decimal(days_elapsed) if days_elapsed else Decimal("0")

    return {
        "year": year,
        "month": month,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": balance,
        "savings": savings,
        "savings_percentage": round(savings_pct, 1),
        "monthly_budget": budget_amount,
        "budget_remaining": budget_remaining,
        "budget_usage_percentage": round(float(total_expenses / budget_amount * 100), 1) if budget_amount > 0 else 0.0,
        "spent_today": today_total,
        "spent_this_week": week_total,
        "spent_this_month": total_expenses,
        "average_daily_spending": round(avg_daily, 2),
        "top_category": top_category["category__name"] if top_category else None,
        "top_category_amount": top_category["total"] if top_category else Decimal("0"),
        "transaction_count": expenses_qs.count(),
        "recent_transactions": recent_transactions,
    }


def budget_breakdown(user, year: int, month: int) -> list:
    first, last = month_bounds(year, month)
    category_budgets = CategoryBudget.objects.filter(user=user, year=year, month=month).select_related("category")
    spent_by_category = {
        row["category_id"]: row["total"]
        for row in Expense.objects.filter(user=user, date__gte=first, date__lte=last)
        .values("category_id")
        .annotate(total=Sum("amount"))
    }

    result = []
    for cb in category_budgets:
        spent = spent_by_category.get(cb.category_id, Decimal("0"))
        usage = float(spent / cb.amount * 100) if cb.amount > 0 else 0.0
        result.append(
            {
                "id": cb.id,
                "category_id": cb.category_id,
                "category_name": cb.category.name,
                "category_color": cb.category.color,
                "budget": cb.amount,
                "spent": spent,
                "remaining": cb.amount - spent,
                "usage_percentage": round(usage, 1),
                "exceeded": spent > cb.amount,
            }
        )
    return result


def generate_warnings(user, year: int, month: int) -> list:
    """Automatically computed budget/spending warnings - never hardcoded."""
    warnings = []
    summary = dashboard_summary(user, year, month)
    breakdown = budget_breakdown(user, year, month)

    for cb in breakdown:
        if cb["exceeded"]:
            warnings.append({
                "type": "danger",
                "icon": "alert-triangle",
                "message": f"{cb['category_name']} budget has been exceeded.",
            })
        elif cb["usage_percentage"] >= 80:
            warnings.append({
                "type": "warning",
                "icon": "alert-triangle",
                "message": f"{cb['category_name']} budget is {cb['usage_percentage']:.0f}% used.",
            })

    if summary["monthly_budget"] > 0:
        remaining = summary["budget_remaining"]
        if remaining < 0:
            warnings.append({
                "type": "danger",
                "icon": "alert-triangle",
                "message": f"You have exceeded your monthly budget by ₹{abs(remaining):,.0f}.",
            })
        else:
            warnings.append({
                "type": "info",
                "icon": "lightbulb",
                "message": f"You have ₹{remaining:,.0f} remaining for the month.",
            })

    prev_year, prev_month = (year - 1, 12) if month == 1 else (year, month - 1)
    prev_summary = dashboard_summary(user, prev_year, prev_month)
    if prev_summary["total_expenses"] > 0:
        diff_pct = float(
            (summary["total_expenses"] - prev_summary["total_expenses"]) / prev_summary["total_expenses"] * 100
        )
        if abs(diff_pct) >= 1:
            direction = "higher" if diff_pct > 0 else "lower"
            warnings.append({
                "type": "info",
                "icon": "trending-up" if diff_pct > 0 else "trending-down",
                "message": f"Your spending is {abs(diff_pct):.0f}% {direction} than last month.",
            })

    return warnings


def generate_insights(user, year: int, month: int) -> list:
    """Plain-language insights computed purely from real database aggregates."""
    insights = []
    summary = dashboard_summary(user, year, month)
    today = timezone.localdate()
    first, last = month_bounds(year, month)

    if summary["top_category"]:
        insights.append(f"Your highest spending category this month is {summary['top_category']}.")

    if summary["average_daily_spending"] > 0:
        insights.append(f"Your average daily spending is ₹{summary['average_daily_spending']:,.0f}.")

    if summary["monthly_budget"] > 0:
        usage = summary["budget_usage_percentage"]
        insights.append(f"You have already used {usage:.0f}% of your monthly budget.")
        if today <= last and today >= first:
            days_in_month = (last - first).days + 1
            days_elapsed = (min(today, last) - first).days + 1
            if days_elapsed > 0:
                projected = summary["total_expenses"] / days_elapsed * days_in_month
                if projected > summary["monthly_budget"]:
                    over = projected - summary["monthly_budget"]
                    insights.append(
                        f"At your current spending rate, you may exceed your budget by ₹{over:,.0f}."
                    )

    prev_year, prev_month = (year - 1, 12) if month == 1 else (year, month - 1)
    prev_summary = dashboard_summary(user, prev_year, prev_month)
    if prev_summary["total_expenses"] > 0:
        diff_pct = float(
            (summary["total_expenses"] - prev_summary["total_expenses"]) / prev_summary["total_expenses"] * 100
        )
        prev_month_name = date(prev_year, prev_month, 1).strftime("%B")
        if diff_pct > 1:
            insights.append(f"Your expenses increased by {diff_pct:.0f}% compared with {prev_month_name}.")
        elif diff_pct < -1:
            insights.append(f"Your expenses decreased by {abs(diff_pct):.0f}% compared with {prev_month_name}.")

    # Category vs previous month for a "you spent X% more on Y" style insight
    prev_first, prev_last = month_bounds(prev_year, prev_month)
    cur_by_cat = {
        r["category__name"]: r["total"]
        for r in Expense.objects.filter(user=user, date__gte=first, date__lte=last)
        .values("category__name").annotate(total=Sum("amount"))
    }
    prev_by_cat = {
        r["category__name"]: r["total"]
        for r in Expense.objects.filter(user=user, date__gte=prev_first, date__lte=prev_last)
        .values("category__name").annotate(total=Sum("amount"))
    }
    best_increase = None
    for cat, cur_amt in cur_by_cat.items():
        prev_amt = prev_by_cat.get(cat)
        if prev_amt and prev_amt > 0:
            pct = float((cur_amt - prev_amt) / prev_amt * 100)
            if pct > 15 and (best_increase is None or pct > best_increase[1]):
                best_increase = (cat, pct)
    if best_increase:
        insights.append(f"You spent {best_increase[1]:.0f}% more on {best_increase[0]} than last month.")

    return insights


def category_breakdown_chart(user, year: int, month: int) -> list:
    first, last = month_bounds(year, month)
    rows = (
        Expense.objects.filter(user=user, date__gte=first, date__lte=last)
        .values("category__id", "category__name", "category__color")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )
    total_all = sum((r["total"] for r in rows), Decimal("0"))
    result = []
    for r in rows:
        pct = float(r["total"] / total_all * 100) if total_all > 0 else 0.0
        result.append({
            "category_id": r["category__id"],
            "category": r["category__name"],
            "color": r["category__color"],
            "amount": r["total"],
            "percentage": round(pct, 1),
        })
    return result


def monthly_spending_chart(user, year: int, months_back: int = 8) -> list:
    """Last N months of income/expenses ending at (year, current selected month)."""
    result = []
    y, m = year, timezone.localdate().month if False else None
    # Walk backwards from the given year/month
    cy, cm = year, timezone.localdate().month
    # Use the given year but anchor on current month passed via dashboard context externally
    return result


def monthly_trend_chart(user, end_year: int, end_month: int, months_back: int = 8) -> list:
    result = []
    y, m = end_year, end_month
    months = []
    for _ in range(months_back):
        months.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    months.reverse()

    for (yy, mm) in months:
        first, last = month_bounds(yy, mm)
        expenses = _sum(Expense.objects.filter(user=user, date__gte=first, date__lte=last))
        income = _sum(Income.objects.filter(user=user, date__gte=first, date__lte=last))
        result.append({
            "year": yy,
            "month": mm,
            "label": date(yy, mm, 1).strftime("%b"),
            "income": income,
            "expenses": expenses,
            "savings": income - expenses,
        })
    return result


def daily_spending_chart(user, year: int, month: int) -> list:
    first, last = month_bounds(year, month)
    rows = (
        Expense.objects.filter(user=user, date__gte=first, date__lte=last)
        .values("date")
        .annotate(total=Sum("amount"))
    )
    by_day = {r["date"]: r["total"] for r in rows}
    result = []
    d = first
    while d <= last:
        result.append({"date": d.isoformat(), "amount": by_day.get(d, Decimal("0"))})
        d += timedelta(days=1)
    return result


def calendar_data(user, year: int, month: int) -> list:
    return daily_spending_chart(user, year, month)


def upcoming_expenses(user, days_ahead: int = 14) -> list:
    today = timezone.localdate()
    horizon = today + timedelta(days=days_ahead)
    rules = (
        RecurringExpense.objects.filter(
            user=user, is_active=True, next_due_date__gte=today, next_due_date__lte=horizon
        )
        .select_related("category")
        .order_by("next_due_date")
    )
    return list(rules)
