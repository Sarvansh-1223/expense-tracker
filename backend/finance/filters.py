import django_filters as df

from .models import Expense, Income


class ExpenseFilter(df.FilterSet):
    category = df.NumberFilter(field_name="category_id")
    payment_method = df.CharFilter(field_name="payment_method")
    date_from = df.DateFilter(field_name="date", lookup_expr="gte")
    date_to = df.DateFilter(field_name="date", lookup_expr="lte")
    min_amount = df.NumberFilter(field_name="amount", lookup_expr="gte")
    max_amount = df.NumberFilter(field_name="amount", lookup_expr="lte")
    year = df.NumberFilter(field_name="date", lookup_expr="year")
    month = df.NumberFilter(field_name="date", lookup_expr="month")

    class Meta:
        model = Expense
        fields = ["category", "payment_method", "date_from", "date_to", "year", "month"]


class IncomeFilter(df.FilterSet):
    source = df.CharFilter(field_name="source")
    date_from = df.DateFilter(field_name="date", lookup_expr="gte")
    date_to = df.DateFilter(field_name="date", lookup_expr="lte")
    year = df.NumberFilter(field_name="date", lookup_expr="year")
    month = df.NumberFilter(field_name="date", lookup_expr="month")

    class Meta:
        model = Income
        fields = ["source", "date_from", "date_to", "year", "month"]
