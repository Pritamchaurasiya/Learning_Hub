"""Notification URLs — Enhanced with delete endpoint."""

from django.urls import path
from .views import (
    NotificationListView,
    MarkReadView,
    MarkSingleNotificationReadView,
    DeleteNotificationsView,
    RegisterDeviceView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="list"),
    path("<int:pk>/read/", MarkSingleNotificationReadView.as_view(), name="mark-single-read"),
    path("<uuid:pk>/read/", MarkSingleNotificationReadView.as_view(), name="mark-single-read-uuid"),
    path("mark-read/", MarkReadView.as_view(), name="mark-read"),
    path("delete/", DeleteNotificationsView.as_view(), name="delete"),
    path("register-device/", RegisterDeviceView.as_view(), name="register-device"),
]
