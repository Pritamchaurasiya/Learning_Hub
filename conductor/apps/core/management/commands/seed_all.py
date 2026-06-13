from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils.text import slugify

User = get_user_model()


class Command(BaseCommand):
    help = "Seed comprehensive demo data for Learning Hub"

    def handle(self, *args, **options):
        self.stdout.write("Seeding Learning Hub with demo data...")
        with transaction.atomic():
            users = self._seed_users()
            categories = self._seed_categories()
            self._seed_courses(users, categories)
        self.stdout.write(self.style.SUCCESS("Done! All seed data created."))

    def _seed_users(self):
        data = [
            {"email": "admin@learninghub.dev", "username": "admin", "password": "Admin@123", "role": "admin", "display_name": "Admin User", "is_staff": True, "is_superuser": True},
            {"email": "instructor@learninghub.dev", "username": "instructor", "password": "Instructor@123", "role": "instructor", "display_name": "Dr. Sarah Chen"},
            {"email": "student@learninghub.dev", "username": "student", "password": "Student@123", "role": "student", "display_name": "Alex Johnson"},
            {"email": "demo@learninghub.dev", "username": "demo", "password": "Demo@123", "role": "student", "display_name": "Demo User"},
        ]
        created_users = {}
        for u in data:
            user, _ = User.objects.get_or_create(email=u["email"], defaults={k: v for k, v in u.items() if k != "password"})
            if _:
                user.set_password(u["password"])
                user.save()
            created_users[u["username"]] = user
            self.stdout.write(f"  {'Created' if _ else 'Found'} user: {u['email']} ({u['role']})")
        return created_users

    def _seed_categories(self):
        from apps.courses.models import Category
        data = [
            ("Programming", "code", 1),
            ("Web Development", "web", 2),
            ("Data Science", "analytics", 3),
            ("AI & Machine Learning", "psychology", 4),
            ("Mobile Development", "phone_android", 5),
            ("DevOps & Cloud", "cloud", 6),
        ]
        cats = {}
        for name, icon, order in data:
            cat, _ = Category.objects.get_or_create(name=name, defaults={"slug": slugify(name), "icon": icon, "order": order, "is_active": True})
            cats[name] = cat
        return cats

    def _seed_courses(self, users, categories):
        from apps.courses.models import Course, Module, Lesson, Enrollment

        courses_data = [
            {
                "title": "Python Programming Masterclass",
                "slug": "python-masterclass",
                "description": "Comprehensive Python course from basics to advanced topics including OOP, decorators, generators, and async programming.",
                "short_description": "Master Python from zero to advanced with hands-on projects.",
                "category": "Programming",
                "instructor": "instructor",
                "price": 49.99,
                "difficulty": "beginner",
                "duration_hours": 40,
                "is_published": True,
                "is_featured": True,
                "modules": [
                    {
                        "title": "Python Fundamentals",
                        "order": 1,
                        "lessons": [
                            ("Introduction to Python", "text", 15, 1),
                            ("Variables & Data Types", "text", 20, 2),
                            ("Control Flow", "video", 25, 3),
                            ("Functions & Modules", "video", 30, 4),
                        ]
                    },
                    {
                        "title": "Object-Oriented Programming",
                        "order": 2,
                        "lessons": [
                            ("Classes & Objects", "video", 25, 1),
                            ("Inheritance & Polymorphism", "video", 30, 2),
                            ("Magic Methods", "text", 20, 3),
                        ]
                    },
                ]
            },
            {
                "title": "Full Stack Web Development",
                "slug": "full-stack-web",
                "description": "Build modern web applications with React, Node.js, Express, and MongoDB. Covers frontend, backend, databases, and deployment.",
                "short_description": "Complete web development bootcamp with React & Node.js.",
                "category": "Web Development",
                "instructor": "instructor",
                "price": 79.99,
                "difficulty": "intermediate",
                "duration_hours": 60,
                "is_published": True,
                "is_featured": True,
                "modules": [
                    {
                        "title": "Frontend with React",
                        "order": 1,
                        "lessons": [
                            ("JSX & Components", "video", 20, 1),
                            ("State & Props", "video", 25, 2),
                            ("React Hooks Deep Dive", "video", 35, 3),
                            ("Routing with React Router", "text", 20, 4),
                        ]
                    },
                    {
                        "title": "Backend with Node.js",
                        "order": 2,
                        "lessons": [
                            ("Express.js Basics", "video", 25, 1),
                            ("RESTful APIs", "video", 30, 2),
                            ("Database with MongoDB", "video", 25, 3),
                        ]
                    },
                ]
            },
            {
                "title": "Machine Learning A-Z",
                "slug": "machine-learning-az",
                "description": "Learn machine learning algorithms, neural networks, and build AI applications with Python, TensorFlow, and PyTorch.",
                "short_description": "Master ML algorithms and build AI applications.",
                "category": "AI & Machine Learning",
                "instructor": "instructor",
                "price": 89.99,
                "difficulty": "advanced",
                "duration_hours": 55,
                "is_published": True,
                "is_featured": True,
                "modules": [
                    {
                        "title": "Supervised Learning",
                        "order": 1,
                        "lessons": [
                            ("Linear & Logistic Regression", "video", 30, 1),
                            ("Decision Trees & Random Forests", "video", 35, 2),
                            ("Support Vector Machines", "video", 25, 3),
                        ]
                    },
                    {
                        "title": "Deep Learning",
                        "order": 2,
                        "lessons": [
                            ("Neural Networks Fundamentals", "video", 40, 1),
                            ("CNNs for Computer Vision", "video", 35, 2),
                            ("RNNs & Transformers", "video", 45, 3),
                        ]
                    },
                ]
            },
            {
                "title": "Data Science Bootcamp",
                "slug": "data-science-bootcamp",
                "description": "Master data analysis, visualization, statistics, and predictive modeling using Python, Pandas, and Scikit-learn.",
                "short_description": "Complete data science foundations with real-world projects.",
                "category": "Data Science",
                "instructor": "instructor",
                "price": 0,
                "difficulty": "beginner",
                "duration_hours": 45,
                "is_published": True,
                "is_featured": False,
                "modules": [
                    {
                        "title": "Data Analysis with Pandas",
                        "order": 1,
                        "lessons": [
                            ("Series & DataFrames", "video", 20, 1),
                            ("Data Cleaning & Preparation", "video", 30, 2),
                            ("Grouping & Aggregation", "text", 20, 3),
                            ("Merging & Joining Datasets", "video", 25, 4),
                        ]
                    },
                    {
                        "title": "Data Visualization",
                        "order": 2,
                        "lessons": [
                            ("Matplotlib & Seaborn", "video", 30, 1),
                            ("Interactive Charts with Plotly", "text", 20, 2),
                        ]
                    },
                ]
            },
            {
                "title": "Flutter & Dart - Build Native Apps",
                "slug": "flutter-dart",
                "description": "Build beautiful, natively compiled iOS and Android apps from a single codebase using Flutter and Dart.",
                "short_description": "Cross-platform mobile development with Flutter.",
                "category": "Mobile Development",
                "instructor": "instructor",
                "price": 59.99,
                "difficulty": "intermediate",
                "duration_hours": 50,
                "is_published": True,
                "is_featured": True,
                "modules": [
                    {
                        "title": "Dart Fundamentals",
                        "order": 1,
                        "lessons": [
                            ("Dart Syntax & Types", "video", 15, 1),
                            ("Object-Oriented Dart", "video", 25, 2),
                            ("Async Programming", "video", 20, 3),
                        ]
                    },
                    {
                        "title": "Flutter Widgets",
                        "order": 2,
                        "lessons": [
                            ("Stateless & Stateful Widgets", "video", 25, 1),
                            ("Layouts & Styling", "video", 30, 2),
                            ("State Management with Riverpod", "video", 40, 3),
                        ]
                    },
                ]
            },
            {
                "title": "Docker & Kubernetes Mastery",
                "slug": "docker-kubernetes",
                "description": "Learn containerization with Docker and orchestration with Kubernetes. Deploy, scale, and manage microservices.",
                "short_description": "Master containers and orchestration for modern apps.",
                "category": "DevOps & Cloud",
                "instructor": "instructor",
                "price": 69.99,
                "difficulty": "intermediate",
                "duration_hours": 35,
                "is_published": True,
                "is_featured": False,
                "modules": [
                    {
                        "title": "Docker Fundamentals",
                        "order": 1,
                        "lessons": [
                            ("Containers & Images", "video", 20, 1),
                            ("Docker Compose", "video", 25, 2),
                            ("Dockerfile Best Practices", "text", 15, 3),
                        ]
                    },
                    {
                        "title": "Kubernetes",
                        "order": 2,
                        "lessons": [
                            ("Pods, Services & Deployments", "video", 35, 1),
                            ("ConfigMaps & Secrets", "video", 20, 2),
                            ("Helm Charts", "text", 20, 3),
                        ]
                    },
                ]
            },
        ]

        for cd in courses_data:
            category = categories[cd["category"]]
            instructor = users[cd["instructor"]]
            course, created = Course.objects.update_or_create(
                slug=cd["slug"],
                defaults={
                    "title": cd["title"],
                    "description": cd["description"],
                    "short_description": cd["short_description"],
                    "category": category,
                    "instructor": instructor,
                    "price": cd["price"],
                    "difficulty": cd["difficulty"],
                    "duration_hours": cd["duration_hours"],
                    "is_published": cd["is_published"],
                    "is_featured": cd["is_featured"],
                    "is_free": cd["price"] == 0,
                    "requirements": [],
                    "learning_objectives": [f"Master {cd['title']}", "Build real-world projects"],
                },
            )
            if created:
                lessons_count = 0
                for mod_data in cd["modules"]:
                    module, _ = Module.objects.get_or_create(course=course, title=mod_data["title"], defaults={"order": mod_data["order"]})
                    for title, content_type, duration, order in mod_data["lessons"]:
                        Lesson.objects.get_or_create(module=module, slug=slugify(title), defaults={
                            "title": title, "content_type": content_type, "duration_minutes": duration, "order": order,
                        })
                        lessons_count += 1
                Course.objects.filter(id=course.id).update(lessons_count=lessons_count)
            self.stdout.write(f"  {'Created' if created else 'Found'} course: {cd['title']}")

        Enrollment.objects.get_or_create(user=users["student"], course=Course.objects.get(slug="python-masterclass"))
        Enrollment.objects.get_or_create(user=users["student"], course=Course.objects.get(slug="data-science-bootcamp"))
