import os
import sys

print('Starting migrate script...')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

import django
django.setup()

from django.core.management import call_command
print('Calling migrate...')
call_command('migrate')
print('Migrate successful!')
