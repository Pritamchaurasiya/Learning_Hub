"""
Semantic Cache Invalidation Signals

Automatically invalidates semantic cache entries when content is updated.
"""

import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.apps import apps
from django.core.cache import cache

logger = logging.getLogger(__name__)


# Models that should trigger cache invalidation when changed
CONTENT_MODELS = [
    ('courses', 'Course'),
    ('courses', 'Module'),
    ('courses', 'Lesson'),
    ('courses', 'CourseResource'),
    ('dsa', 'Problem'),
    ('test_engine', 'Question'),
    ('ebooks', 'Ebook'),
]


def invalidate_semantic_cache(sender, instance, **kwargs):
    """
    Invalidate semantic cache when content is modified.
    Clears both the specific content embeddings and related search caches.
    """
    try:
        # Get the model label
        model_label = f"{sender._meta.app_label}.{sender._meta.model_name}"
        logger.debug(f"Invalidating semantic cache for {model_label} #{instance.id}")
        
        # 1. Delete related CourseEmbedding entries
        CourseEmbedding = apps.get_model('ai_engine', 'CourseEmbedding')
        deleted_count, _ = CourseEmbedding.objects.filter(
            content_type__app_label=sender._meta.app_label,
            content_type__model=sender._meta.model_name,
            object_id=str(instance.id)
        ).delete()
        
        if deleted_count:
            logger.info(f"Deleted {deleted_count} embeddings for {model_label} #{instance.id}")
        
        # 2. Invalidate search caches that might contain this content
        invalidate_search_caches(sender, instance)
        
        # 3. Invalidate recommendation caches
        invalidate_recommendation_caches(sender, instance)
        
    except Exception as e:
        logger.error(f"Failed to invalidate semantic cache for {sender}: {e}")


def invalidate_search_caches(sender, instance):
    """Invalidate course/search related caches."""
    try:
        # Pattern-based cache deletion for search results
        cache.delete_pattern("course_search:*")
        cache.delete_pattern("rag_context:*")
        logger.debug(f"Invalidated search caches for {sender._meta.model_name} #{instance.id}")
    except Exception as e:
        logger.warning(f"Failed to invalidate search caches: {e}")


def invalidate_recommendation_caches(sender, instance):
    """Invalidate personalized recommendation caches."""
    try:
        # Delete user recommendation caches
        # In a real implementation, you might track which users have recommendations
        # involving this content and only invalidate those
        cache.delete_pattern("recommendations:*")
        logger.debug(f"Invalidated recommendation caches for {sender._meta.model_name} #{instance.id}")
    except Exception as e:
        logger.warning(f"Failed to invalidate recommendation caches: {e}")


def setup_content_model_signals():
    """
    Dynamically connect signals for all content models.
    Call this from AppConfig.ready()
    """
    for app_label, model_name in CONTENT_MODELS:
        try:
            model = apps.get_model(app_label, model_name)
            if model:
                # Use weak=False to prevent garbage collection of signal handlers
                post_save.connect(invalidate_semantic_cache, sender=model, weak=False, dispatch_uid=f"invalidate_cache_{app_label}_{model_name}_save")
                post_delete.connect(invalidate_semantic_cache, sender=model, weak=False, dispatch_uid=f"invalidate_cache_{app_label}_{model_name}_delete")
                logger.debug(f"Connected cache invalidation signals for {app_label}.{model_name}")
        except LookupError:
            logger.warning(f"Model {app_label}.{model_name} not found, skipping cache invalidation signal")
        except Exception as e:
            logger.error(f"Failed to connect cache invalidation for {app_label}.{model_name}: {e}")


# Also handle AI-specific model changes
def setup_ai_engine_signals():
    """Set up signals for AI Engine models that affect caching."""
    try:
        # Invalidate cache when user preferences change
        UserPreferences = apps.get_model('ai_engine', 'UserPreferences')
        if UserPreferences:
            post_save.connect(
                lambda sender, instance, **kwargs: cache.delete(f"ai_user_prefs:{instance.user_id}"),
                sender=UserPreferences,
                weak=False,
                dispatch_uid="invalidate_user_prefs"
            )
        
        # Invalidate cache when learning insight is updated
        LearningInsight = apps.get_model('ai_engine', 'LearningInsight')
        if LearningInsight:
            post_save.connect(
                lambda sender, instance, **kwargs: cache.delete(f"learning_insight:{instance.user_id}"),
                sender=LearningInsight,
                weak=False,
                dispatch_uid="invalidate_learning_insight"
            )
            
        logger.debug("Connected AI Engine cache invalidation signals")
    except Exception as e:
        logger.error(f"Failed to connect AI Engine signals: {e}")


# Manual cache invalidation utilities
class SemanticCacheManager:
    """Utilities for manual semantic cache management."""
    
    @staticmethod
    def invalidate_for_content(app_label: str, model_name: str, object_id: str):
        """Manually invalidate cache for specific content."""
        try:
            CourseEmbedding = apps.get_model('ai_engine', 'CourseEmbedding')
            deleted_count, _ = CourseEmbedding.objects.filter(
                content_type__app_label=app_label,
                content_type__model=model_name,
                object_id=object_id
            ).delete()
            
            invalidate_search_caches(None, None)
            invalidate_recommendation_caches(None, None)
            
            logger.info(f"Manually invalidated {deleted_count} embeddings for {app_label}.{model_name}#{object_id}")
            return deleted_count
        except Exception as e:
            logger.error(f"Manual cache invalidation failed: {e}")
            return 0
    
    @staticmethod
    def invalidate_all_embeddings():
        """Clear all semantic cache embeddings (use with caution)."""
        try:
            CourseEmbedding = apps.get_model('ai_engine', 'CourseEmbedding')
            deleted_count, _ = CourseEmbedding.objects.all().delete()
            cache.delete_pattern("course_search:*")
            cache.delete_pattern("rag_context:*")
            cache.delete_pattern("recommendations:*")
            logger.warning(f"Cleared ALL embeddings ({deleted_count} deleted)")
            return deleted_count
        except Exception as e:
            logger.error(f"Full cache clear failed: {e}")
            return 0
    
    @staticmethod
    def get_cache_stats():
        """Get statistics about semantic cache."""
        try:
            CourseEmbedding = apps.get_model('ai_engine', 'CourseEmbedding')
            total = CourseEmbedding.objects.count()
            
            # Count by content type
            from django.db.models import Count
            by_type = CourseEmbedding.objects.values(
                'content_type__app_label', 'content_type__model'
            ).annotate(count=Count('id')).order_by('-count')
            
            return {
                'total_embeddings': total,
                'by_content_type': list(by_type),
            }
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def rebuild_embeddings_for_model(app_label: str, model_name: str):
        """Rebuild embeddings for all instances of a model."""
        try:
            model = apps.get_model(app_label, model_name)
            if not model:
                return 0
            
            from apps.ai_engine.vector_service import VectorService
            
            count = 0
            for instance in model.objects.all():
                # Generate text content based on model type
                text = SemanticCacheManager._get_text_for_instance(instance)
                if text:
                    VectorService.store_content_embedding(instance, text)
                    count += 1
            
            logger.info(f"Rebuilt {count} embeddings for {app_label}.{model_name}")
            return count
        except Exception as e:
            logger.error(f"Embedding rebuild failed: {e}")
            return 0
    
    @staticmethod
    def _get_text_for_instance(instance):
        """Extract text content from various model types for embedding."""
        model_name = instance.__class__.__name__
        
        if model_name == 'Course':
            return f"{instance.title}. {instance.description}. {instance.short_description}"
        elif model_name == 'Module':
            return f"{instance.title}. {instance.description}"
        elif model_name == 'Lesson':
            return f"{instance.title}. {instance.text_content}"
        elif model_name == 'Problem':
            return f"{instance.title}. {instance.description}"
        elif model_name == 'Question':
            return f"{instance.text}. {instance.explanation}"
        elif model_name == 'Ebook':
            return f"{instance.title}. {instance.description}"
        
        # Fallback: try common fields
        for field in ['title', 'name', 'text', 'content', 'description']:
            if hasattr(instance, field):
                value = getattr(instance, field)
                if value:
                    return str(value)
        
        return None


# Signal to regenerate embeddings after content update
@receiver(pre_save, sender=apps.get_model('courses', 'Course'))
def course_pre_save(sender, instance, **kwargs):
    """Mark course embedding for regeneration on content change."""
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            content_fields = ['title', 'description', 'short_description']
            if any(getattr(old, f) != getattr(instance, f) for f in content_fields):
                instance._regenerate_embedding = True
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender=apps.get_model('courses', 'Course'))
def course_post_save(sender, instance, created, **kwargs):
    """Regenerate embedding if content changed."""
    if getattr(instance, '_regenerate_embedding', False) or created:
        from apps.ai_engine.vector_service import VectorService
        from apps.courses.tasks import generate_course_embedding_task
        from django.db import transaction
        
        text = f"{instance.title}. {instance.description}. {instance.short_description}"
        if text.strip():
            # Schedule async regeneration
            transaction.on_commit(
                lambda: generate_course_embedding_task.delay(instance.id)
            )