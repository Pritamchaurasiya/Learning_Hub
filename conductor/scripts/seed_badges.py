
import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.gamification.models import Badge

def seed_badges():
    badges = [
        {
            "name": "Quick Starter",
            "description": "Reach Level 5",
            "icon": "🚀",
            "criteria_type": "level",
            "criteria_value": 5,
            "xp_reward": 500
        },
        {
            "name": "Dedicated Learner",
            "description": "Reach Level 10",
            "icon": "🎓",
            "criteria_type": "level",
            "criteria_value": 10,
            "xp_reward": 1000
        },
        {
            "name": "Consistency King",
            "description": "Maintain a 7-day streak",
            "icon": "🔥",
            "criteria_type": "streak_days",
            "criteria_value": 7,
            "xp_reward": 300
        },
        {
            "name": "Unstoppable",
            "description": "Maintain a 30-day streak",
            "icon": "⚡",
            "criteria_type": "streak_days",
            "criteria_value": 30,
            "xp_reward": 2000
        }
    ]

    print("🌱 Seeding Badges...")
    for b in badges:
        badge, created = Badge.objects.get_or_create(
            name=b['name'],
            defaults=b
        )
        if created:
            print(f"✅ Created: {badge.name}")
        else:
            print(f"ℹ️ Exists: {badge.name}")

if __name__ == "__main__":
    seed_badges()
