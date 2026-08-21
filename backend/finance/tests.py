from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Budget, Category, Expense, Income, RecurringExpense, ensure_default_categories
from .services import process_recurring_expenses, dashboard_summary

User = get_user_model()


class AuthTests(APITestCase):
    def test_register_creates_user_and_returns_tokens(self):
        resp = self.client.post(reverse("register"), {
            "username": "alice", "email": "alice@example.com",
            "password": "Str0ngPass!23", "password2": "Str0ngPass!23",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
        self.assertTrue(User.objects.filter(username="alice").exists())

    def test_register_rejects_mismatched_passwords(self):
        resp = self.client.post(reverse("register"), {
            "username": "bob", "email": "bob@example.com",
            "password": "Str0ngPass!23", "password2": "Different!23",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_jwt(self):
        User.objects.create_user(username="carol", password="Str0ngPass!23")
        resp = self.client.post(reverse("login"), {"username": "carol", "password": "Str0ngPass!23"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)

    def test_me_requires_authentication(self):
        resp = self.client.get(reverse("me"))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class ExpenseAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="dave", password="pass12345")
        self.other = User.objects.create_user(username="erin", password="pass12345")
        ensure_default_categories(self.user)
        ensure_default_categories(self.other)
        self.category = Category.objects.filter(user=self.user, name="Food").first()
        self.client.force_authenticate(self.user)

    def test_create_expense(self):
        resp = self.client.post("/api/expenses/", {
            "title": "Dinner", "amount": "450.00", "category": self.category.id,
            "date": str(date.today()), "payment_method": "upi",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Expense.objects.filter(user=self.user).count(), 1)

    def test_negative_amount_rejected(self):
        resp = self.client.post("/api/expenses/", {
            "title": "Bad", "amount": "-5.00", "category": self.category.id,
            "date": str(date.today()), "payment_method": "upi",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_future_date_rejected(self):
        future = date.today() + timedelta(days=5)
        resp = self.client.post("/api/expenses/", {
            "title": "Future", "amount": "10.00", "category": self.category.id,
            "date": str(future), "payment_method": "upi",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_and_delete_expense(self):
        expense = Expense.objects.create(user=self.user, category=self.category, title="X", amount=Decimal("100"), date=date.today())
        resp = self.client.patch(f"/api/expenses/{expense.id}/", {"amount": "150.00"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        expense.refresh_from_db()
        self.assertEqual(expense.amount, Decimal("150.00"))

        resp = self.client.delete(f"/api/expenses/{expense.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Expense.objects.filter(id=expense.id).exists())

    def test_user_cannot_access_other_users_expense(self):
        other_category = Category.objects.filter(user=self.other, name="Food").first()
        other_expense = Expense.objects.create(user=self.other, category=other_category, title="Secret", amount=Decimal("99"), date=date.today())
        resp = self.client.get(f"/api/expenses/{other_expense.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_expense_nonexistent_404(self):
        resp = self.client.get("/api/expenses/99999/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_401_when_unauthenticated(self):
        self.client.force_authenticate(None)
        resp = self.client.get("/api/expenses/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class IncomeAndBudgetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="frank", password="pass12345")
        ensure_default_categories(self.user)
        self.client.force_authenticate(self.user)

    def test_create_income(self):
        resp = self.client.post("/api/income/", {"source": "salary", "amount": "50000", "date": str(date.today())})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_budget_negative_rejected(self):
        resp = self.client.post("/api/budgets/", {"year": 2026, "month": 8, "amount": "-100"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_budget_upsert_on_duplicate_month(self):
        self.client.post("/api/budgets/", {"year": 2026, "month": 8, "amount": "20000"})
        resp = self.client.post("/api/budgets/", {"year": 2026, "month": 8, "amount": "30000"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Budget.objects.filter(user=self.user, year=2026, month=8).count(), 1)
        self.assertEqual(Budget.objects.get(user=self.user, year=2026, month=8).amount, Decimal("30000"))


class DashboardCalculationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="grace", password="pass12345")
        ensure_default_categories(self.user)
        self.category = Category.objects.filter(user=self.user, name="Food").first()

    def test_dashboard_summary_math(self):
        today = date.today()
        Income.objects.create(user=self.user, source="salary", amount=Decimal("50000"), date=today.replace(day=1))
        Expense.objects.create(user=self.user, category=self.category, title="A", amount=Decimal("1000"), date=today)
        Expense.objects.create(user=self.user, category=self.category, title="B", amount=Decimal("500"), date=today)

        summary = dashboard_summary(self.user, today.year, today.month)
        self.assertEqual(summary["total_income"], Decimal("50000"))
        self.assertEqual(summary["total_expenses"], Decimal("1500"))
        self.assertEqual(summary["balance"], Decimal("48500"))


class RecurringExpenseTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="heidi", password="pass12345")
        ensure_default_categories(self.user)
        self.category = Category.objects.filter(user=self.user, name="Subscriptions").first()

    def test_process_recurring_creates_transaction_when_due(self):
        past = date.today() - timedelta(days=1)
        RecurringExpense.objects.create(
            user=self.user, category=self.category, name="Netflix", amount=Decimal("649"),
            frequency="monthly", start_date=past, next_due_date=past,
        )
        result = process_recurring_expenses(user=self.user)
        self.assertEqual(result["transactions_created"], 1)
        self.assertEqual(Expense.objects.filter(user=self.user, is_recurring=True).count(), 1)

    def test_process_recurring_does_not_duplicate_on_rerun(self):
        past = date.today() - timedelta(days=1)
        RecurringExpense.objects.create(
            user=self.user, category=self.category, name="Netflix", amount=Decimal("649"),
            frequency="monthly", start_date=past, next_due_date=past,
        )
        process_recurring_expenses(user=self.user)
        result2 = process_recurring_expenses(user=self.user)
        self.assertEqual(result2["transactions_created"], 0)
        self.assertEqual(Expense.objects.filter(user=self.user, is_recurring=True).count(), 1)

    def test_process_recurring_not_due_yet_creates_nothing(self):
        future = date.today() + timedelta(days=10)
        RecurringExpense.objects.create(
            user=self.user, category=self.category, name="Future Sub", amount=Decimal("100"),
            frequency="monthly", start_date=future, next_due_date=future,
        )
        result = process_recurring_expenses(user=self.user)
        self.assertEqual(result["transactions_created"], 0)
