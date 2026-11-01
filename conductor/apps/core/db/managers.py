"""
Standardized BaseManager for consistent soft-delete pattern across all models.
"""

from django.db import models
from django.db.models import QuerySet
from django.utils import timezone


class ActiveQuerySet(QuerySet):
    """QuerySet that filters to active (non-deleted) records by default."""

    def active(self):
        """Return only active records."""
        return self.filter(is_active=True)

    def deleted(self):
        """Return only soft-deleted records."""
        return self.filter(is_active=False)

    def with_deleted(self):
        """Return all records including soft-deleted."""
        return self

    def hard_delete(self):
        """Permanently delete records from database."""
        return super().delete()

    def soft_delete(self):
        """Soft delete by setting is_active=False and deleted_at."""
        return self.update(is_active=False, deleted_at=timezone.now())

    def restore(self):
        """Restore soft-deleted records."""
        return self.update(is_active=True, deleted_at=None)


class ActiveManager(models.Manager):
    """Manager that returns only active records by default."""

    _queryset_class = ActiveQuerySet

    def get_queryset(self):
        return self._queryset_class(self.model, using=self._db).active()

    def all_objects(self):
        """Return all records including soft-deleted."""
        return self._queryset_class(self.model, using=self._db)

    def deleted_objects(self):
        """Return only soft-deleted records."""
        return self._queryset_class(self.model, using=self._db).deleted()

    def hard_delete(self):
        """Permanently delete all records."""
        return self.all_objects().hard_delete()


class BaseModelManager(ActiveManager):
    """Enhanced manager for BaseModel with additional utilities."""

    def get_by_id(self, id):
        """Get active object by ID or return None."""
        try:
            return self.get(id=id)
        except self.model.DoesNotExist:
            return None

    def get_or_none(self, **kwargs):
        """Get object matching kwargs or return None."""
        try:
            return self.get(**kwargs)
        except self.model.DoesNotExist:
            return None

    def filter_active(self, **kwargs):
        """Filter active objects with additional conditions."""
        return self.get_queryset().filter(**kwargs)

    def bulk_soft_delete(self, ids):
        """Soft delete multiple objects by IDs."""
        return self.all_objects().filter(id__in=ids).soft_delete()

    def bulk_restore(self, ids):
        """Restore multiple soft-deleted objects by IDs."""
        return self.deleted_objects().filter(id__in=ids).restore()


# Mixin for models that want the standard soft-delete pattern
class SoftDeleteMixin(models.Model):
    """
    Mixin to add soft-delete functionality to any model.
    Adds is_active and deleted_at fields with ActiveManager.
    """

    is_active = models.BooleanField(default=True, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = BaseModelManager()
    all_objects = models.Manager()  # Access to all objects including deleted

    class Meta:
        abstract = True

    def soft_delete(self):
        """Soft delete this instance."""
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])

    def restore(self):
        """Restore this soft-deleted instance."""
        self.is_active = True
        self.deleted_at = None
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])

    def hard_delete(self):
        """Permanently delete this instance."""
        super().delete()

    delete = soft_delete  # Override default delete to soft delete


# For models that need a different soft-delete field name
class CustomSoftDeleteMixin(models.Model):
    """Soft delete mixin with customizable field names."""

    is_active = models.BooleanField(default=True, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = BaseModelManager()

    class Meta:
        abstract = True

    def soft_delete(self, using=None):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])

    def restore(self, using=None):
        self.is_active = True
        self.deleted_at = None
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)
