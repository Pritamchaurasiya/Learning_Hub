"""
DRF Serializers for LearningHub Student Updates Hub.
"""
from rest_framework import serializers
from .models import (
    UpdateSource,
    UpdateSourceEndpoint,
    StudentUpdate,
    UpdateVersion,
    UpdateAttachment,
    UpdateCrossLink,
    UpdateSubscription,
    UpdateBookmark,
    UpdateReminder,
)


class UpdateSourceEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpdateSourceEndpoint
        fields = [
            'id',
            'name',
            'sub_category',
            'endpoint_url',
            'is_active',
        ]


class UpdateSourceSerializer(serializers.ModelSerializer):
    endpoints = UpdateSourceEndpointSerializer(many=True, read_only=True)

    class Meta:
        model = UpdateSource
        fields = [
            'source_id',
            'name',
            'domain',
            'source_type',
            'authority_level',
            'category',
            'country',
            'state',
            'institution',
            'base_url',
            'polling_interval_minutes',
            'is_enabled',
            'last_success_at',
            'last_checked_at',
            'endpoints',
        ]


class UpdateAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpdateAttachment
        fields = [
            'id',
            'title',
            'file_url',
            'file_size_bytes',
            'mime_type',
        ]


class UpdateCrossLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpdateCrossLink
        fields = [
            'id',
            'content_type',
            'target_id',
            'title',
            'action_cta',
            'action_url',
        ]


class UpdateVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpdateVersion
        fields = [
            'id',
            'version_number',
            'title',
            'summary',
            'diff_summary',
            'changed_fields',
            'created_at',
        ]


class StudentUpdateListSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.name', read_only=True, default='')
    source_domain = serializers.CharField(source='source.domain', read_only=True, default='')
    authority_level = serializers.IntegerField(source='source.authority_level', read_only=True, default=1)
    attachments_count = serializers.SerializerMethodField()
    cross_links = UpdateCrossLinkSerializer(many=True, read_only=True)
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = StudentUpdate
        fields = [
            'id',
            'title',
            'summary',
            'source_url',
            'category',
            'sub_category',
            'institution',
            'course',
            'semester',
            'published_at',
            'deadline',
            'importance',
            'status',
            'verification_status',
            'version',
            'source_name',
            'source_domain',
            'authority_level',
            'attachments_count',
            'cross_links',
            'is_bookmarked',
            'created_at',
        ]

    def get_attachments_count(self, obj) -> int:
        return obj.attachments.count()

    def get_is_bookmarked(self, obj) -> bool:
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return obj.bookmarks.filter(user=user).exists()
        return False


class StudentUpdateDetailSerializer(serializers.ModelSerializer):
    source = UpdateSourceSerializer(read_only=True)
    attachments = UpdateAttachmentSerializer(many=True, read_only=True)
    cross_links = UpdateCrossLinkSerializer(many=True, read_only=True)
    versions = UpdateVersionSerializer(many=True, read_only=True)
    is_bookmarked = serializers.SerializerMethodField()
    user_reminders = serializers.SerializerMethodField()

    class Meta:
        model = StudentUpdate
        fields = [
            'id',
            'title',
            'summary',
            'ai_summary',
            'is_ai_summarized',
            'source_url',
            'category',
            'sub_category',
            'institution',
            'exam',
            'course',
            'semester',
            'session',
            'published_at',
            'effective_from',
            'effective_until',
            'deadline',
            'event_date',
            'status',
            'verification_status',
            'importance',
            'content_hash',
            'version',
            'last_checked_at',
            'source',
            'attachments',
            'cross_links',
            'versions',
            'is_bookmarked',
            'user_reminders',
            'created_at',
            'updated_at',
        ]

    def get_is_bookmarked(self, obj) -> bool:
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return obj.bookmarks.filter(user=user).exists()
        return False

    def get_user_reminders(self, obj) -> list:
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return list(obj.reminders.filter(user=user).values('id', 'reminder_type', 'trigger_at', 'is_dispatched'))
        return []


class UpdateBookmarkSerializer(serializers.ModelSerializer):
    update = StudentUpdateListSerializer(read_only=True)

    class Meta:
        model = UpdateBookmark
        fields = [
            'id',
            'update',
            'notes',
            'tag',
            'created_at',
            'updated_at',
        ]


class UpdateReminderSerializer(serializers.ModelSerializer):
    update = StudentUpdateListSerializer(read_only=True)

    class Meta:
        model = UpdateReminder
        fields = [
            'id',
            'update',
            'reminder_type',
            'trigger_at',
            'is_dispatched',
            'dispatched_at',
            'created_at',
        ]


class UpdateSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpdateSubscription
        fields = [
            'id',
            'target_type',
            'target_value',
            'created_at',
        ]


# Input Payloads
class CreateBookmarkInputSerializer(serializers.Serializer):
    update_id = serializers.CharField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    tag = serializers.CharField(required=False, allow_blank=True, default='General')


class CreateReminderInputSerializer(serializers.Serializer):
    update_id = serializers.CharField(required=True)
    reminder_type = serializers.ChoiceField(choices=UpdateReminder.REMINDER_TYPES, default='1_DAY_BEFORE')


class FollowTargetInputSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=UpdateSubscription.TARGET_TYPES)
    target_value = serializers.CharField(required=True, max_length=255)
