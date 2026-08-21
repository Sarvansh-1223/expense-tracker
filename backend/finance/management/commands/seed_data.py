import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from finance.models import Budget, Category, CategoryBudget, Expense, Income, RecurringExpense, ensure_default_categories

User = get_user_model()

EXPENSE_TITLES = {
    "Food": ["Dinner out", "Lunch with team", "Coffee", "Breakfast", "Food delivery"],
    "Groceries": ["Weekly groceries", "Supermarket run", "Vegetables & fruits"],
    "Transportation": ["Uber ride", "Auto fare", "Fuel", "Metro card recharge"],
    "Shopping": ["Clothes", "Amazon order", "Electronics accessory", "Shoes"],
    "Entertainment": ["Movie tickets", "Concert", "Gaming purchase"],
    "Bills": ["Electricity bill", "Water bill", "Credit card bill"],
    "Travel": ["Flight booking", "Hotel stay", "Travel insurance"],
    "Healthcare": ["Pharmacy", "Doctor visit", "Health checkup"],
    "Personal": ["Salon", "Gifts", "Self-care"],
    "Other": ["Miscellaneous", "Donation"],
}

PAYMENT_METHODS = ["cash", "upi", "credit_card", "debit_card", "bank_transfer", "net_banking"]


class Command(BaseCommand):
    help = "Generates realistic demo data (income, expenses, budgets, recurring expenses) for development/demo purposes only."

    def add_arguments(self, parser):
        parser.add_argument("--username", type=str, default="demo")
        parser.add_argument("--password", type=str, default="demopass123")
        parser.add_argument("--months", type=int, default=6, help="How many months of history to generate")

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        months = options["months"]

        user, created = User.objects.get_or_create(
            username=username, defaults={"email": f"{username}@example.com"}
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created demo user '{username}' / '{password}'"))
        else:
            self.stdout.write(f"Using existing user '{username}'")

        ensure_default_categories(user)
        categories = list(Category.objects.filter(user=user))
        cat_by_name = {c.name: c for c in categories}

        today = timezone.localdate()
        random.seed(42)

        # Wipe previous demo data for idempotent re-seeding
        Expense.objects.filter(user=user).delete()
        Income.objects.filter(user=user).delete()
        Budget.objects.filter(user=user).delete()
        CategoryBudget.objects.filter(user=user).delete()
        RecurringExpense.objects.filter(user=user).delete()

        # --- Recurring expenses -------------------------------------------------
        recurring_defs = [
            ("Rent", 12000, "Rent", "bank_transfer", "monthly", 1),
            ("Netflix", 649, "Subscriptions", "credit_card", "monthly", 10),
            ("Internet", 799, "Utilities", "upi", "monthly", 12),
            ("Gym Membership", 1500, "Healthcare", "upi", "monthly", 5),
            ("Phone Recharge", 299, "Bills", "upi", "monthly", 20),
        ]
        start_month_date = date(today.year, today.month, 1) - timedelta(days=months * 31)
        for name, amount, cat_name, method, freq, day in recurring_defs:
            cat = cat_by_name.get(cat_name, cat_by_name["Other"])
            start = start_month_date.replace(day=min(day, 28))
            RecurringExpense.objects.create(
                user=user, category=cat, name=name, amount=Decimal(amount),
                payment_method=method, frequency=freq, start_date=start,
                next_due_date=start,
            )

        # --- Monthly income + expenses + budgets --------------------------------
        for i in range(months, -1, -1):
            y, m = today.year, today.month - i
            while m <= 0:
                m += 12
                y -= 1
            month_start = date(y, m, 1)

            # Income
            Income.objects.create(
                user=user, source="salary", amount=Decimal(random.choice([48000, 50000, 52000])),
                date=month_start.replace(day=1), description="Monthly salary",
            )
            if random.random() > 0.5:
                Income.objects.create(
                    user=user, source="freelance", amount=Decimal(random.randint(2000, 8000)),
                    date=month_start.replace(day=random.randint(5, 25)), description="Freelance project",
                )

            # Monthly + category budgets
            Budget.objects.create(user=user, year=y, month=m, amount=Decimal(30000))
            for cat_name, amt in [("Food", 6000), ("Shopping", 5000), ("Travel", 4000), ("Entertainment", 2000), ("Bills", 8000)]:
                cat = cat_by_name.get(cat_name)
                if cat:
                    CategoryBudget.objects.create(user=user, category=cat, year=y, month=m, amount=Decimal(amt))

            # Random day-to-day expenses
            days_in_month = (date(y + (1 if m == 12 else 0), (m % 12) + 1, 1) - month_start).days
            num_transactions = random.randint(18, 30)
            for _ in range(num_transactions):
                cat_name = random.choice(list(EXPENSE_TITLES.keys()))
                cat = cat_by_name.get(cat_name, cat_by_name["Other"])
                title = random.choice(EXPENSE_TITLES[cat_name])
                day = random.randint(1, days_in_month)
                tx_date = month_start.replace(day=day)
                if tx_date > today:
                    continue
                amount = Decimal(random.randint(80, 3500))
                Expense.objects.create(
                    user=user, category=cat, title=title, amount=amount, date=tx_date,
                    payment_method=random.choice(PAYMENT_METHODS),
                )

        self.stdout.write(self.style.SUCCESS("Demo data generated. Now run process_recurring_expenses to materialize recurring transactions."))
