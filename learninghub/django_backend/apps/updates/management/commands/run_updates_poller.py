"""
Management command to run the Student Updates Hub Ingestion & Reminder Poller Daemon.
Supports both one-shot runs (CI/cron) and continuous loop daemon modes.
"""
import time
import signal
import sys
from django.core.management.base import BaseCommand
from apps.updates.tasks import poll_all_active_sources, dispatch_deadline_reminders


class Command(BaseCommand):
    help = "Runs the background poller daemon for student notice sources and deadline reminders."

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Run a single iteration of source polling and reminder dispatch, then exit.'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=1800,
            help='Polling interval in seconds for daemon mode (default: 1800s / 30m).'
        )

    def handle(self, *args, **options):
        once = options.get('once', False)
        interval = options.get('interval', 1800)

        self.stdout.write(self.style.SUCCESS("[Student Updates Poller] Initializing daemon..."))

        def run_iteration():
            self.stdout.write(self.style.NOTICE("-> Polling active registered educational sources..."))
            poll_results = poll_all_active_sources()
            self.stdout.write(
                self.style.SUCCESS(f"-> Polled {len(poll_results)} sources.")
            )

            self.stdout.write(self.style.NOTICE("-> Dispatching pending deadline reminders..."))
            dispatched = dispatch_deadline_reminders()
            self.stdout.write(
                self.style.SUCCESS(f"-> Dispatched {len(dispatched)} deadline reminders.")
            )

        if once:
            run_iteration()
            self.stdout.write(self.style.SUCCESS("[Student Updates Poller] Single iteration complete. Exiting."))
            return

        # Continuous daemon mode
        running = True

        def handle_shutdown(signum, frame):
            nonlocal running
            self.stdout.write(self.style.WARNING("\n[Student Updates Poller] Caught termination signal. Gracefully shutting down..."))
            running = False

        signal.signal(signal.SIGINT, handle_shutdown)
        signal.signal(signal.SIGTERM, handle_shutdown)

        self.stdout.write(
            self.style.SUCCESS(f"[Student Updates Poller] Daemon active. Polling interval: {interval}s. Press Ctrl+C to stop.")
        )

        while running:
            try:
                run_iteration()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"[Student Updates Poller] Error during iteration: {e}"))

            # Sleep with 1-second check intervals for fast SIGINT response
            for _ in range(interval):
                if not running:
                    break
                time.sleep(1)

        self.stdout.write(self.style.SUCCESS("[Student Updates Poller] Stopped cleanly."))
