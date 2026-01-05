"""Notification URLs."""

from django.urls import path
from .views import NotificationListView, MarkReadView, RegisterDeviceView

urlpatterns = [
    path("", NotificationListView.as_view(), name="list"),
    path("mark-read/", MarkReadView.as_view(), name="mark-read"),
    path("register-device/", RegisterDeviceView.as_view(), name="register-device"),
]
