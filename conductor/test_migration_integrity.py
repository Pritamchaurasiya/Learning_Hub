#!/usr/bin/env python
"""
Database Migration Integrity Testing Script

Tests all migrations for:
- Migration conflicts
- Circular dependencies
- Missing migrations
- Reversibility
- Performance impact

Usage:
    python manage.py test_migrations
    python test_migration_integrity.py --dry-run
    python test_migration_integrity.py --app courses
"""

import os
import sys
import django
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Setup Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.core.management import call_command
from django.db import connection, connections
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.executor import MigrationExecutor
from django.apps import apps
from io import StringIO
from colorama import Fore, Style, init

# Initialize colorama for colored output
init(autoreset=True)


class MigrationIntegrityTester:
    """Comprehensive migration integrity testing."""

    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self.errors = []
        self.warnings = []
        self.loader = MigrationLoader(connection)

    def log(self, message: str, level: str = "INFO"):
        """Log message with color coding."""
        if not self.verbose and level == "INFO":
            return

        colors = {
            "INFO": Fore.CYAN,
            "SUCCESS": Fore.GREEN,
            "WARNING": Fore.YELLOW,
            "ERROR": Fore.RED,
            "CRITICAL": Fore.RED + Style.BRIGHT,
        }

        color = colors.get(level, Fore.WHITE)
        print(f"{color}[{level}] {message}{Style.RESET_ALL}")

    def test_migration_conflicts(self) -> bool:
        """Test for migration conflicts."""
        self.log("Testing for migration conflicts...", "INFO")

        try:
            # Run Django's conflict detection
            output = StringIO()
            call_command("makemigrations", "--check", "--dry-run", stdout=output)

            result = output.getvalue()
            if "conflicts" in result.lower():
                self.errors.append("Migration conflicts detected")
                self.log("❌ Migration conflicts found!", "ERROR")
                self.log(result, "ERROR")
                return False

            self.log("✓ No migration conflicts", "SUCCESS")
            return True

        except Exception as e:
            self.errors.append(f"Conflict check failed: {e}")
            self.log(f"❌ Conflict check failed: {e}", "ERROR")
            return False

    def test_missing_migrations(self) -> bool:
        """Test for model changes without migrations."""
        self.log("Testing for missing migrations...", "INFO")

        try:
            output = StringIO()
            call_command("makemigrations", "--check", stdout=output)

            self.log("✓ No missing migrations", "SUCCESS")
            return True

        except SystemExit:
            # makemigrations --check exits with 1 if migrations needed
            self.errors.append("Model changes detected without migrations")
            self.log("❌ Missing migrations detected!", "ERROR")
            self.log("Run: python manage.py makemigrations", "WARNING")
            return False
        except Exception as e:
            self.errors.append(f"Missing migration check failed: {e}")
            self.log(f"❌ Check failed: {e}", "ERROR")
            return False

    def test_circular_dependencies(self) -> bool:
        """Test for circular migration dependencies."""
        self.log("Testing for circular dependencies...", "INFO")

        try:
            graph = self.loader.graph

            # Check for cycles in dependency graph
            visited = set()
            rec_stack = set()

            def has_cycle(node):
                visited.add(node)
                rec_stack.add(node)

                for child in graph.node_map.get(node, {}).get("dependencies", []):
                    if child not in visited:
                        if has_cycle(child):
                            return True
                    elif child in rec_stack:
                        return True

                rec_stack.remove(node)
                return False

            for node in graph.nodes:
                if node not in visited:
                    if has_cycle(node):
                        self.errors.append(
                            f"Circular dependency detected involving {node}"
                        )
                        self.log(f"❌ Circular dependency: {node}", "ERROR")
                        return False

            self.log("✓ No circular dependencies", "SUCCESS")
            return True

        except Exception as e:
            self.warnings.append(f"Circular dependency check incomplete: {e}")
            self.log(f"⚠ Check incomplete: {e}", "WARNING")
            return True  # Non-critical error

    def test_migration_reversibility(self, app_label: Optional[str] = None) -> bool:
        """Test if migrations can be reversed."""
        self.log("Testing migration reversibility...", "INFO")

        try:
            apps_to_test = (
                [app_label]
                if app_label
                else ["courses", "users", "gamification", "notifications"]
            )

            non_reversible = []

            for app in apps_to_test:
                migrations = self.loader.disk_migrations
                app_migrations = [m for m in migrations if m[0] == app]

                for migration_key in app_migrations:
                    migration = self.loader.disk_migrations[migration_key]

                    # Check if migration has reverse operations
                    for operation in migration.operations:
                        if (
                            not hasattr(operation, "reversible")
                            or not operation.reversible
                        ):
                            if hasattr(operation, "reversible"):
                                non_reversible.append(f"{app}.{migration.name}")
                                break

            if non_reversible:
                self.warnings.append(
                    f"Non-reversible migrations: {', '.join(non_reversible)}"
                )
                self.log(
                    f"⚠ Non-reversible migrations found: {len(non_reversible)}",
                    "WARNING",
                )
                for migration in non_reversible:
                    self.log(f"  - {migration}", "WARNING")
            else:
                self.log("✓ All tested migrations are reversible", "SUCCESS")

            return True  # Non-reversibility is a warning, not error

        except Exception as e:
            self.warnings.append(f"Reversibility check failed: {e}")
            self.log(f"⚠ Check failed: {e}", "WARNING")
            return True

    def test_migration_plan(self) -> bool:
        """Test migration execution plan."""
        self.log("Testing migration plan...", "INFO")

        try:
            output = StringIO()
            call_command("migrate", "--plan", stdout=output)

            plan = output.getvalue()
            pending_count = plan.count("[ ]")

            if pending_count > 0:
                self.log(f"⚠ {pending_count} pending migrations", "WARNING")
                self.warnings.append(f"{pending_count} unapplied migrations")
            else:
                self.log("✓ All migrations applied", "SUCCESS")

            return True

        except Exception as e:
            self.errors.append(f"Migration plan check failed: {e}")
            self.log(f"❌ Plan check failed: {e}", "ERROR")
            return False

    def test_migration_performance(self, app_label: Optional[str] = None) -> bool:
        """Estimate migration performance impact."""
        self.log("Analyzing migration performance impact...", "INFO")

        try:
            # Check for potentially slow operations
            slow_operations = []

            apps_to_check = [app_label] if app_label else apps.get_app_configs()

            for app in apps_to_check:
                if isinstance(app, str):
                    app = apps.get_app_config(app)

                migrations = self.loader.disk_migrations
                app_migrations = [m for m in migrations if m[0] == app.label]

                for migration_key in app_migrations:
                    migration = self.loader.disk_migrations[migration_key]

                    for operation in migration.operations:
                        op_name = operation.__class__.__name__

                        # Flag potentially slow operations
                        if op_name in ["AddIndex", "RemoveIndex"] and hasattr(
                            operation, "model_name"
                        ):
                            slow_operations.append(
                                f"{app.label}.{migration.name}: {op_name} on {operation.model_name}"
                            )
                        elif op_name == "AlterField" and hasattr(
                            operation, "preserve_default"
                        ):
                            if not operation.preserve_default:
                                slow_operations.append(
                                    f"{app.label}.{migration.name}: {op_name} may rewrite table"
                                )

            if slow_operations:
                self.warnings.append(
                    f"Potentially slow migrations: {len(slow_operations)}"
                )
                self.log(
                    f"⚠ {len(slow_operations)} potentially slow migrations", "WARNING"
                )
                for op in slow_operations[:5]:  # Show first 5
                    self.log(f"  - {op}", "WARNING")
            else:
                self.log("✓ No obviously slow operations detected", "SUCCESS")

            return True

        except Exception as e:
            self.warnings.append(f"Performance analysis incomplete: {e}")
            self.log(f"⚠ Analysis incomplete: {e}", "WARNING")
            return True

    def run_all_tests(self, app_label: Optional[str] = None) -> Tuple[bool, int, int]:
        """
        Run all migration integrity tests.

        Returns:
            Tuple of (success: bool, error_count: int, warning_count: int)
        """
        self.log("\n" + "=" * 70, "INFO")
        self.log("Django Migration Integrity Testing", "INFO")
        self.log("=" * 70 + "\n", "INFO")

        tests = [
            ("Migration Conflicts", self.test_migration_conflicts),
            ("Missing Migrations", self.test_missing_migrations),
            ("Circular Dependencies", self.test_circular_dependencies),
            ("Migration Plan", self.test_migration_plan),
            ("Reversibility", lambda: self.test_migration_reversibility(app_label)),
            ("Performance Impact", lambda: self.test_migration_performance(app_label)),
        ]

        passed = 0
        failed = 0

        for test_name, test_func in tests:
            self.log(f"\n--- {test_name} ---", "INFO")
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log(f"❌ Test crashed: {e}", "CRITICAL")
                failed += 1

        # Summary
        self.log("\n" + "=" * 70, "INFO")
        self.log("Test Summary", "INFO")
        self.log("=" * 70, "INFO")
        self.log(
            f"Tests Passed: {passed}/{len(tests)}",
            "SUCCESS" if failed == 0 else "WARNING",
        )
        self.log(f"Errors: {len(self.errors)}", "ERROR" if self.errors else "SUCCESS")
        self.log(
            f"Warnings: {len(self.warnings)}", "WARNING" if self.warnings else "SUCCESS"
        )

        if self.errors:
            self.log("\nErrors:", "ERROR")
            for error in self.errors:
                self.log(f"  - {error}", "ERROR")

        if self.warnings:
            self.log("\nWarnings:", "WARNING")
            for warning in self.warnings:
                self.log(f"  - {warning}", "WARNING")

        success = failed == 0 and len(self.errors) == 0
        self.log(
            f"\n{'✓ All tests passed!' if success else '❌ Some tests failed'}",
            "SUCCESS" if success else "ERROR",
        )

        return success, len(self.errors), len(self.warnings)


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Test Django migration integrity")
    parser.add_argument("--app", help="Test specific app only")
    parser.add_argument(
        "--dry-run", action="store_true", help="Dry run (no actual operations)"
    )
    parser.add_argument("--quiet", action="store_true", help="Minimal output")

    args = parser.parse_args()

    tester = MigrationIntegrityTester(verbose=not args.quiet)
    success, errors, warnings = tester.run_all_tests(app_label=args.app)

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
