from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AnalyticsView, BudgetViewSet, CalendarView, CategoryBudgetViewSet, CategoryViewSet,
    DashboardView, ExpenseViewSet, IncomeViewSet, ProcessRecurringView, RecurringExpenseViewSet,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("income", IncomeViewSet, basename="income")
router.register("budgets", BudgetViewSet, basename="budget")
router.register("category-budgets", CategoryBudgetViewSet, basename="category-budget")
router.register("recurring-expenses", RecurringExpenseViewSet, basename="recurring-expense")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("analytics/", AnalyticsView.as_view(), name="analytics"),
    path("calendar/", CalendarView.as_view(), name="calendar"),
    path("recurring-expenses/process/", ProcessRecurringView.as_view(), name="process-recurring"),
    path("", include(router.urls)),
]
