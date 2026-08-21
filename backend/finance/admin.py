from django.contrib import admin

from .models import Budget, Category, CategoryBudget, Expense, Income, RecurringExpense


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "is_default", "color")
    list_filter = ("is_default",)
    search_fields = ("name", "user__username")


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "category", "amount", "date", "payment_method", "is_recurring")
    list_filter = ("category", "payment_method", "is_recurring")
    search_fields = ("title", "description", "user__username")
    date_hierarchy = "date"


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ("source", "user", "amount", "date")
    list_filter = ("source",)
    date_hierarchy = "date"


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("user", "year", "month", "amount")
    list_filter = ("year", "month")


@admin.register(CategoryBudget)
class CategoryBudgetAdmin(admin.ModelAdmin):
    list_display = ("user", "category", "year", "month", "amount")
    list_filter = ("year", "month", "category")


@admin.register(RecurringExpense)
class RecurringExpenseAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "amount", "frequency", "next_due_date", "is_active")
    list_filter = ("frequency", "is_active")
