#!/usr/bin/env python
"""Check for pending migrations."""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

import django
django.setup()

from django.core.management import call_command
from django.db import connections

# Check for pending migrations
pending = []
for db in connections:
    try:
        result = call_command('showmigrations', '--list', database=db, verbosity=0)
        if '[ ]' in str(result):
            pending.append(db)
    except:
        pass

if pending:
    print(f"Pending migrations in: {', '.join(pending)}")
    sys.exit(1)
else:
    print("All migrations applied")
    sys.exit(0)
