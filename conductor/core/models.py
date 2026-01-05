from .mixins import UUIDMixin, TimestampMixin


class BaseModel(UUIDMixin, TimestampMixin):
    """
    Abstract Base Model with UUID primary key and timestamps.
    """

    class Meta:
        abstract = True
