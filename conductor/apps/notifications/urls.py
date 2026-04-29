"""Notification URLs — Enhanced with delete endpoint."""

from django.urls import path
from .views import (
    NotificationListView,
    MarkReadView,
    DeleteNotificationsView,
    RegisterDeviceView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="list"),
    path("mark-read/", MarkReadView.as_view(), name="mark-read"),
    path("delete/", DeleteNotificationsView.as_view(), name="delete"),
    path("register-device/", RegisterDeviceView.as_view(), name="register-device"),
]
