import csv
from datetime import date

from django.db.models import ProtectedError
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .filters import ExpenseFilter, IncomeFilter
from .models import Budget, Category, CategoryBudget, Expense, Income, RecurringExpense, ensure_default_categories
from .serializers import (
    BudgetSerializer, CategoryBudgetSerializer, CategorySerializer, ExpenseSerializer,
    IncomeSerializer, RecurringExpenseSerializer,
)


class UserScopedViewSet(viewsets.ModelViewSet):
    """Base class guaranteeing every queryset/object is scoped to
    request.user, so one user can never read or mutate another user's data."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryViewSet(UserScopedViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = []
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, is_default=False)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This category is used by existing transactions and can't be deleted.", "errors": None},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ExpenseViewSet(UserScopedViewSet):
    queryset = Expense.objects.select_related("category").all()
    serializer_class = ExpenseSerializer
    filterset_class = ExpenseFilter
    search_fields = ["title", "description", "notes"]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        return ctx

    @action(detail=False, methods=["get"])
    def export(self, request):
        """CSV export - supports optional date_from/date_to/year/month filters
        (same query params as the list endpoint)."""
        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=expenses_export.csv"
        writer = csv.writer(response)
        writer.writerow(["Date", "Title", "Category", "Payment Method", "Amount", "Description", "Notes"])
        for e in qs:
            writer.writerow([e.date, e.title, e.category.name, e.get_payment_method_display(), e.amount, e.description, e.notes])
        return response


class IncomeViewSet(UserScopedViewSet):
    queryset = Income.objects.all()
    serializer_class = IncomeSerializer
    filterset_class = IncomeFilter
    search_fields = ["description"]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date"]

    @action(detail=False, methods=["get"])
    def export(self, request):
        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=income_export.csv"
        writer = csv.writer(response)
        writer.writerow(["Date", "Source", "Amount", "Description", "Notes"])
        for i in qs:
            writer.writerow([i.date, i.get_source_display(), i.amount, i.description, i.notes])
        return response


class BudgetViewSet(UserScopedViewSet):
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    filter_backends = []
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if year:
            qs = qs.filter(year=year)
        if month:
            qs = qs.filter(month=month)
        return qs

    def create(self, request, *args, **kwargs):
        # Upsert: creating a budget for a month that already has one updates it instead of erroring.
        year = request.data.get("year")
        month = request.data.get("month")
        existing = Budget.objects.filter(user=request.user, year=year, month=month).first()
        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)


class CategoryBudgetViewSet(UserScopedViewSet):
    queryset = CategoryBudget.objects.select_related("category").all()
    serializer_class = CategoryBudgetSerializer
    filter_backends = []
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if year:
            qs = qs.filter(year=year)
        if month:
            qs = qs.filter(month=month)
        return qs

    def create(self, request, *args, **kwargs):
        year, month, category = request.data.get("year"), request.data.get("month"), request.data.get("category")
        existing = CategoryBudget.objects.filter(user=request.user, year=year, month=month, category_id=category).first()
        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)


class RecurringExpenseViewSet(UserScopedViewSet):
    queryset = RecurringExpense.objects.select_related("category").all()
    serializer_class = RecurringExpenseSerializer
    filter_backends = []
    pagination_class = None
    ordering = ["next_due_date"]


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ensure_default_categories(request.user)
        services.process_recurring_expenses(user=request.user)

        today = timezone.localdate()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))

        summary = services.dashboard_summary(request.user, year, month)
        summary["recent_transactions"] = ExpenseSerializer(summary["recent_transactions"], many=True).data

        warnings = services.generate_warnings(request.user, year, month)
        insights = services.generate_insights(request.user, year, month)
        upcoming = services.upcoming_expenses(request.user)
        budget_breakdown = services.budget_breakdown(request.user, year, month)

        return Response({
            "summary": summary,
            "warnings": warnings,
            "insights": insights,
            "upcoming_expenses": RecurringExpenseSerializer(upcoming, many=True).data,
            "category_budgets": budget_breakdown,
        })


class AnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))
        months_back = int(request.query_params.get("months_back", 8))

        return Response({
            "category_breakdown": services.category_breakdown_chart(request.user, year, month),
            "monthly_trend": services.monthly_trend_chart(request.user, year, month, months_back),
            "daily_spending": services.daily_spending_chart(request.user, year, month),
            "insights": services.generate_insights(request.user, year, month),
        })


class CalendarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))
        return Response({"year": year, "month": month, "days": services.calendar_data(request.user, year, month)})


class ProcessRecurringView(APIView):
    """Lets the frontend trigger recurring-expense processing on demand
    (e.g. right after login) in addition to the management command."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        result = services.process_recurring_expenses(user=request.user)
        return Response(result)
