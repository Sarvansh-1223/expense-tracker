from datetime import timedelta

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


PAYMENT_METHODS = [
    ("cash", "Cash"),
    ("upi", "UPI"),
    ("credit_card", "Credit Card"),
    ("debit_card", "Debit Card"),
    ("bank_transfer", "Bank Transfer"),
    ("net_banking", "Net Banking"),
    ("other", "Other"),
]

FREQUENCY_CHOICES = [
    ("daily", "Daily"),
    ("weekly", "Weekly"),
    ("monthly", "Monthly"),
    ("yearly", "Yearly"),
]

INCOME_SOURCES = [
    ("salary", "Salary"),
    ("freelance", "Freelance"),
    ("business", "Business"),
    ("investments", "Investments"),
    ("bonus", "Bonus"),
    ("other", "Other"),
]


class Category(TimeStampedModel):
    """Expense categories. A set of default categories is seeded per-user;
    users may also create their own custom categories."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=60)
    icon = models.CharField(max_length=40, default="tag")
    color = models.CharField(max_length=20, default="#6366f1")
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="unique_category_per_user")
        ]

    def __str__(self):
        return f"{self.name} ({self.user})"


DEFAULT_CATEGORIES = [
    ("Food", "utensils", "#f97316"),
    ("Groceries", "shopping-basket", "#22c55e"),
    ("Transportation", "car", "#0ea5e9"),
    ("Shopping", "shopping-bag", "#ec4899"),
    ("Entertainment", "film", "#a855f7"),
    ("Bills", "receipt", "#ef4444"),
    ("Rent", "home", "#8b5cf6"),
    ("Education", "graduation-cap", "#14b8a6"),
    ("Healthcare", "heart-pulse", "#f43f5e"),
    ("Travel", "plane", "#3b82f6"),
    ("Subscriptions", "repeat", "#eab308"),
    ("Utilities", "plug", "#06b6d4"),
    ("Personal", "user", "#64748b"),
    ("Other", "more-horizontal", "#94a3b8"),
]


def ensure_default_categories(user):
    existing = set(Category.objects.filter(user=user).values_list("name", flat=True))
    to_create = [
        Category(user=user, name=name, icon=icon, color=color, is_default=True)
        for name, icon, color in DEFAULT_CATEGORIES
        if name not in existing
    ]
    if to_create:
        Category.objects.bulk_create(to_create)


class Expense(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="expenses")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="expenses")
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    date = models.DateField(default=timezone.localdate)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default="upi")
    notes = models.TextField(blank=True, default="")
    is_recurring = models.BooleanField(default=False)
    recurring_source = models.ForeignKey(
        "RecurringExpense", null=True, blank=True, on_delete=models.SET_NULL, related_name="generated_expenses"
    )

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "category"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.amount} on {self.date}"


class Income(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="incomes")
    source = models.CharField(max_length=20, choices=INCOME_SOURCES, default="salary")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    date = models.DateField(default=timezone.localdate)
    description = models.CharField(max_length=200, blank=True, default="")
    is_recurring = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["user", "date"])]

    def __str__(self):
        return f"{self.get_source_display()} - {self.amount} on {self.date}"


class Budget(TimeStampedModel):
    """One overall monthly budget per user per month, plus optional per-category budgets."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budgets")
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()  # 1-12
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ["-year", "-month"]
        constraints = [
            models.UniqueConstraint(fields=["user", "year", "month"], name="unique_monthly_budget")
        ]

    def __str__(self):
        return f"Budget {self.month}/{self.year}: {self.amount}"


class CategoryBudget(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="category_budgets")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="budgets")
    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "category", "year", "month"], name="unique_category_budget"
            )
        ]

    def __str__(self):
        return f"{self.category.name} budget {self.month}/{self.year}: {self.amount}"


class RecurringExpense(TimeStampedModel):
    """Definition of a recurring expense. process_recurring_expenses() generates
    concrete Expense rows from these as they become due, using next_due_date as
    a cursor so runs are idempotent and never create duplicates."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="recurring_expenses")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="recurring_expenses")
    name = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default="upi")
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default="monthly")
    start_date = models.DateField()
    next_due_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["next_due_date"]
        indexes = [models.Index(fields=["user", "next_due_date"])]

    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()})"

    def advance_next_due_date(self):
        """Move next_due_date forward by one period, calendar-aware for
        monthly/yearly so e.g. 31st Jan -> 28th Feb doesn't error out."""
        d = self.next_due_date
        if self.frequency == "daily":
            self.next_due_date = d + timedelta(days=1)
        elif self.frequency == "weekly":
            self.next_due_date = d + timedelta(weeks=1)
        elif self.frequency == "monthly":
            self.next_due_date = _add_months(d, 1)
        elif self.frequency == "yearly":
            self.next_due_date = _add_months(d, 12)
        if self.end_date and self.next_due_date > self.end_date:
            self.is_active = False


def _add_months(source_date, months):
    month = source_date.month - 1 + months
    year = source_date.year + month // 12
    month = month % 12 + 1
    import calendar

    day = min(source_date.day, calendar.monthrange(year, month)[1])
    return source_date.replace(year=year, month=month, day=day)
