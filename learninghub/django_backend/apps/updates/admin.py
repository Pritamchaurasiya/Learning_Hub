"""
Django Admin Configuration for LearningHub Student Updates Hub.
"""
from django.contrib import admin
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
    UpdateFetchLog,
)


class UpdateSourceEndpointInline(admin.TabularInline):
    model = UpdateSourceEndpoint
    extra = 1


@admin.register(UpdateSource)
class UpdateSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'domain', 'authority_level', 'category', 'is_enabled', 'last_checked_at')
    list_filter = ('authority_level', 'is_enabled', 'category')
    search_fields = ('name', 'domain', 'institution')
    inlines = [UpdateSourceEndpointInline]
    actions = ['trigger_source_crawl']

    @admin.action(description="Trigger Immediate Crawl for Selected Sources")
    def trigger_source_crawl(self, request, queryset):
        from .crawler import SourceCrawler
        from django.contrib import messages
        crawler = SourceCrawler()
        total_created = 0
        total_modified = 0
        for source in queryset:
            res = crawler.crawl_source(source)
            total_created += res.get('created', 0)
            total_modified += res.get('modified', 0)
        self.message_user(
            request,
            f"Successfully crawled {queryset.count()} source(s): {total_created} created, {total_modified} modified.",
            level=messages.SUCCESS
        )


class UpdateAttachmentInline(admin.TabularInline):
    model = UpdateAttachment
    extra = 0


class UpdateCrossLinkInline(admin.TabularInline):
    model = UpdateCrossLink
    extra = 0


class UpdateVersionInline(admin.TabularInline):
    model = UpdateVersion
    extra = 0
    readonly_fields = ('version_number', 'content_hash', 'diff_summary', 'created_at')


@admin.register(StudentUpdate)
class StudentUpdateAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'institution', 'importance', 'status', 'verification_status', 'deadline', 'published_at')
    list_filter = ('category', 'importance', 'status', 'verification_status')
    search_fields = ('title', 'summary', 'institution', 'course')
    inlines = [UpdateAttachmentInline, UpdateCrossLinkInline, UpdateVersionInline]
    actions = ['approve_and_publish_updates', 'mark_as_urgent', 'reject_and_flag_updates']

    @admin.action(description="Approve and Publish Selected Notices (Verified)")
    def approve_and_publish_updates(self, request, queryset):
        from django.contrib import messages
        updated = queryset.update(status='PUBLISHED', verification_status='VERIFIED')
        self.message_user(request, f"Approved and published {updated} notices as Verified Official.", level=messages.SUCCESS)

    @admin.action(description="Mark Selected Notices as URGENT Alert")
    def mark_as_urgent(self, request, queryset):
        from django.contrib import messages
        updated = queryset.update(importance='URGENT')
        self.message_user(request, f"Marked {updated} notices as URGENT.", level=messages.WARNING)

    @admin.action(description="Reject / Flag Selected Notices")
    def reject_and_flag_updates(self, request, queryset):
        from django.contrib import messages
        updated = queryset.update(status='REJECTED', verification_status='FLAGGED')
        self.message_user(request, f"Flagged and rejected {updated} notices.", level=messages.INFO)


@admin.register(UpdateBookmark)
class UpdateBookmarkAdmin(admin.ModelAdmin):
    list_display = ('user', 'update', 'tag', 'created_at')
    search_fields = ('user__email', 'update__title', 'tag')


@admin.register(UpdateReminder)
class UpdateReminderAdmin(admin.ModelAdmin):
    list_display = ('user', 'update', 'reminder_type', 'trigger_at', 'is_dispatched')
    list_filter = ('reminder_type', 'is_dispatched')


@admin.register(UpdateSubscription)
class UpdateSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_type', 'target_value', 'created_at')
    list_filter = ('target_type',)


@admin.register(UpdateFetchLog)
class UpdateFetchLogAdmin(admin.ModelAdmin):
    list_display = ('source', 'status_code', 'latency_ms', 'change_detected', 'created_at')
    list_filter = ('status_code', 'change_detected')
