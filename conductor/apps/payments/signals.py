"""
Signals for the Payments app.
"""
from django.dispatch import Signal

# Signal sent when a payment is successfully completed
# Provides: sender, payment_id, user, course, amount
payment_completed = Signal()

# Signal sent when a payment fails
# Provides: sender, payment_id, user, error_message
payment_failed = Signal()
