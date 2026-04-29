#!/usr/bin/env python
"""
Django Quick Launcher
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
django.setup()

print("Django environment ready!")
print(f"Settings: {os.environ['DJANGO_SETTINGS_MODULE']}")
print(f"Django Version: {django.__version__}")

if __name__ == '__main__':
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
