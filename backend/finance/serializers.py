from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from .models import Budget, Category, CategoryBudget, Expense, Income, RecurringExpense


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "icon", "color", "is_default", "created_at")
        read_only_fields = ("id", "is_default", "created_at")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Category name cannot be empty.")
        return value


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)
    category_icon = serializers.CharField(source="category.icon", read_only=True)

    class Meta:
        model = Expense
        fields = (
            "id", "title", "description", "amount", "category", "category_name",
            "category_color", "category_icon", "date", "payment_method", "notes",
            "is_recurring", "recurring_source", "created_at", "updated_at",
        )
        read_only_fields = ("id", "recurring_source", "created_at", "updated_at")

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be a positive number.")
        return value

    def validate_category(self, value):
        request = self.context["request"]
        if value.user_id != request.user.id:
            raise serializers.ValidationError("Invalid category.")
        return value

    def validate_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Expense date cannot be in the future.")
        return value


class IncomeSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source="get_source_display", read_only=True)

    class Meta:
        model = Income
        fields = (
            "id", "source", "source_display", "amount", "date", "description",
            "is_recurring", "notes", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be a positive number.")
        return value


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = ("id", "year", "month", "amount", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Budget cannot be negative.")
        return value

    def validate_month(self, value):
        if not (1 <= value <= 12):
            raise serializers.ValidationError("Month must be between 1 and 12.")
        return value


class CategoryBudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)

    class Meta:
        model = CategoryBudget
        fields = (
            "id", "category", "category_name", "category_color", "year", "month",
            "amount", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Budget cannot be negative.")
        return value

    def validate_category(self, value):
        request = self.context["request"]
        if value.user_id != request.user.id:
            raise serializers.ValidationError("Invalid category.")
        return value


class RecurringExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)
    frequency_display = serializers.CharField(source="get_frequency_display", read_only=True)

    class Meta:
        model = RecurringExpense
        fields = (
            "id", "name", "amount", "category", "category_name", "category_color",
            "payment_method", "frequency", "frequency_display", "start_date",
            "next_due_date", "end_date", "is_active", "notes", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be a positive number.")
        return value

    def validate_category(self, value):
        request = self.context["request"]
        if value.user_id != request.user.id:
            raise serializers.ValidationError("Invalid category.")
        return value

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})
        return attrs

    def create(self, validated_data):
        # next_due_date defaults to start_date the first time the rule is created
        validated_data.setdefault("next_due_date", validated_data["start_date"])
        return super().create(validated_data)
