"""
Reusable model mixins for Learning Hub.
"""

from django.db import models
from django.utils import timezone


class TimestampMixin(models.Model):
    """
    Mixin that adds created_at and updated_at timestamps.
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """
    Mixin that implements soft delete functionality.

    Instead of deleting records, they are marked as deleted.
    """

    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Soft delete the record."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])

    def hard_delete(self, using=None, keep_parents=False):
        """Permanently delete the record."""
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Restore a soft-deleted record."""
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at"])


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted records by default."""

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

    def all_with_deleted(self):
        """Return all records including deleted ones."""
        return super().get_queryset()

    def deleted_only(self):
        """Return only deleted records."""
        return super().get_queryset().filter(is_deleted=True)


class UUIDMixin(models.Model):
    """
    Mixin that uses UUID as primary key.
    """

    import uuid

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class OrderMixin(models.Model):
    """
    Mixin for models that need ordering.
    """

    order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        abstract = True
        ordering = ["order"]
