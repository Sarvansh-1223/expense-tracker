from django.core.management.base import BaseCommand

from finance.services import process_recurring_expenses


class Command(BaseCommand):
    help = (
        "Processes all due recurring expenses across every user, creating the "
        "corresponding Expense transactions and advancing each rule's next_due_date. "
        "Safe to run repeatedly (e.g. daily via cron / Task Scheduler) - it will "
        "never create duplicate transactions for a date that was already processed."
    )

    def handle(self, *args, **options):
        result = process_recurring_expenses()
        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {result['rules_processed']} recurring rule(s), "
                f"created {result['transactions_created']} new transaction(s)."
            )
        )
