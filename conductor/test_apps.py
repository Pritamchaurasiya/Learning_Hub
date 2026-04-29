import os
import sys

print('Starting debug...')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

print('Importing django...')
import django
from django.conf import settings

print('Setting up django...')
try:
    django.setup()
    print('Django setup successful!')
except Exception as e:
    import traceback
    traceback.print_exc()
