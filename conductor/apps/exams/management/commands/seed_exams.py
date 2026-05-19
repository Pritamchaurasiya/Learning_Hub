"""
Seed command: Populate exam taxonomy with real-world exam data.
Usage: python manage.py seed_exams
"""
from django.core.management.base import BaseCommand
from apps.exams.models import Country, Exam, Subject, Topic


class Command(BaseCommand):
    help = 'Seed exam taxonomy with real-world exam data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding exam taxonomy...')

        countries = self._seed_countries()
        self._seed_exams(countries)

        self.stdout.write(self.style.SUCCESS('Exam taxonomy seeded successfully!'))

    def _seed_countries(self):
        countries_data = [
            {'code': 'IN', 'name': 'India', 'timezone': 'Asia/Kolkata', 'currency': 'INR'},
            {'code': 'US', 'name': 'United States', 'timezone': 'America/New_York', 'currency': 'USD'},
            {'code': 'UK', 'name': 'United Kingdom', 'timezone': 'Europe/London', 'currency': 'GBP'},
            {'code': 'AU', 'name': 'Australia', 'timezone': 'Australia/Sydney', 'currency': 'AUD'},
            {'code': 'CA', 'name': 'Canada', 'timezone': 'America/Toronto', 'currency': 'CAD'},
        ]

        countries = {}
        for data in countries_data:
            country, created = Country.objects.get_or_create(
                code=data['code'],
                defaults=data,
            )
            countries[data['code']] = country
            if created:
                self.stdout.write(f"  Created country: {country.name}")

        return countries

    def _seed_exams(self, countries):
        exams_data = {
            'IN': [
                {
                    'code': 'JEE_MAIN',
                    'name': 'JEE Main',
                    'full_name': 'Joint Entrance Examination Main',
                    'description': 'National-level engineering entrance exam in India.',
                    'pattern': {
                        'sections': [
                            {'name': 'Mathematics', 'questions': 30, 'marks_each': 4},
                            {'name': 'Physics', 'questions': 30, 'marks_each': 4},
                            {'name': 'Chemistry', 'questions': 30, 'marks_each': 4},
                        ],
                        'total_questions': 90,
                        'total_marks': 300,
                        'duration_minutes': 180,
                        'marks_per_correct': 4,
                        'negative_marks_per_wrong': 1,
                        'marks_per_unattempted': 0,
                        'question_types': ['mcq', 'numerical'],
                    },
                    'difficulty_distribution': {'easy': 0.25, 'medium': 0.50, 'hard': 0.25},
                    'conducting_body': 'NTA',
                    'frequency': 'annual',
                    'popularity_score': 95,
                    'subjects': [
                        {
                            'code': 'MATH', 'name': 'Mathematics', 'weightage': 33.3, 'expected_questions': 30,
                            'topics': [
                                'Algebra', 'Calculus', 'Coordinate Geometry', 'Trigonometry',
                                'Probability & Statistics', 'Vectors & 3D Geometry',
                            ]
                        },
                        {
                            'code': 'PHY', 'name': 'Physics', 'weightage': 33.3, 'expected_questions': 30,
                            'topics': [
                                'Mechanics', 'Electrodynamics', 'Optics', 'Thermodynamics',
                                'Modern Physics', 'Waves & Oscillations',
                            ]
                        },
                        {
                            'code': 'CHEM', 'name': 'Chemistry', 'weightage': 33.3, 'expected_questions': 30,
                            'topics': [
                                'Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry',
                                'Chemical Bonding', 'Electrochemistry',
                            ]
                        },
                    ]
                },
                {
                    'code': 'NEET',
                    'name': 'NEET',
                    'full_name': 'National Eligibility cum Entrance Test',
                    'description': 'National-level medical entrance exam in India.',
                    'pattern': {
                        'sections': [
                            {'name': 'Physics', 'questions': 45, 'marks_each': 4},
                            {'name': 'Chemistry', 'questions': 45, 'marks_each': 4},
                            {'name': 'Biology', 'questions': 90, 'marks_each': 4},
                        ],
                        'total_questions': 180,
                        'total_marks': 720,
                        'duration_minutes': 180,
                        'marks_per_correct': 4,
                        'negative_marks_per_wrong': 1,
                        'marks_per_unattempted': 0,
                        'question_types': ['mcq'],
                    },
                    'difficulty_distribution': {'easy': 0.30, 'medium': 0.50, 'hard': 0.20},
                    'conducting_body': 'NTA',
                    'frequency': 'annual',
                    'popularity_score': 93,
                    'subjects': [
                        {
                            'code': 'PHY', 'name': 'Physics', 'weightage': 25, 'expected_questions': 45,
                            'topics': ['Mechanics', 'Optics', 'Electrodynamics', 'Thermodynamics', 'Modern Physics']
                        },
                        {
                            'code': 'CHEM', 'name': 'Chemistry', 'weightage': 25, 'expected_questions': 45,
                            'topics': ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry']
                        },
                        {
                            'code': 'BIO', 'name': 'Biology', 'weightage': 50, 'expected_questions': 90,
                            'topics': ['Botany', 'Zoology', 'Ecology', 'Genetics', 'Human Physiology']
                        },
                    ]
                },
                {
                    'code': 'UPSC_CSE',
                    'name': 'UPSC Civil Services',
                    'full_name': 'Union Public Service Commission - Civil Services Examination',
                    'description': 'India\'s premier civil services examination.',
                    'pattern': {
                        'sections': [
                            {'name': 'General Studies I', 'questions': 100, 'marks_each': 2},
                            {'name': 'CSAT', 'questions': 80, 'marks_each': 2.5},
                        ],
                        'total_questions': 180,
                        'total_marks': 400,
                        'duration_minutes': 240,
                        'marks_per_correct': 2,
                        'negative_marks_per_wrong': 0.66,
                        'marks_per_unattempted': 0,
                        'question_types': ['mcq'],
                    },
                    'difficulty_distribution': {'easy': 0.20, 'medium': 0.50, 'hard': 0.30},
                    'conducting_body': 'UPSC',
                    'frequency': 'annual',
                    'popularity_score': 90,
                    'subjects': [
                        {
                            'code': 'GS1', 'name': 'General Studies I', 'weightage': 50, 'expected_questions': 100,
                            'topics': ['History', 'Geography', 'Indian Polity', 'Economics', 'Environment', 'Science & Tech']
                        },
                        {
                            'code': 'CSAT', 'name': 'CSAT (Aptitude)', 'weightage': 50, 'expected_questions': 80,
                            'topics': ['Comprehension', 'Logical Reasoning', 'Quantitative Aptitude', 'Data Interpretation']
                        },
                    ]
                },
                {
                    'code': 'GATE',
                    'name': 'GATE',
                    'full_name': 'Graduate Aptitude Test in Engineering',
                    'description': 'National-level exam for engineering postgraduate admissions.',
                    'pattern': {
                        'sections': [
                            {'name': 'General Aptitude', 'questions': 10, 'marks_each': 1},
                            {'name': 'Technical', 'questions': 55, 'marks_each': 2},
                        ],
                        'total_questions': 65,
                        'total_marks': 100,
                        'duration_minutes': 180,
                        'marks_per_correct': 2,
                        'negative_marks_per_wrong': 0.66,
                        'marks_per_unattempted': 0,
                        'question_types': ['mcq', 'numerical'],
                    },
                    'difficulty_distribution': {'easy': 0.20, 'medium': 0.45, 'hard': 0.35},
                    'conducting_body': 'IITs',
                    'frequency': 'annual',
                    'popularity_score': 85,
                    'subjects': [
                        {
                            'code': 'GA', 'name': 'General Aptitude', 'weightage': 15, 'expected_questions': 10,
                            'topics': ['Verbal Ability', 'Numerical Ability', 'Logical Reasoning']
                        },
                        {
                            'code': 'TECH', 'name': 'Technical Subject', 'weightage': 85, 'expected_questions': 55,
                            'topics': ['Core Subject Topics']
                        },
                    ]
                },
            ],
            'US': [
                {
                    'code': 'SAT',
                    'name': 'SAT',
                    'full_name': 'Scholastic Assessment Test',
                    'description': 'Standardized test for US college admissions.',
                    'pattern': {
                        'sections': [
                            {'name': 'Reading & Writing', 'questions': 54, 'marks_each': 1},
                            {'name': 'Math', 'questions': 44, 'marks_each': 1},
                        ],
                        'total_questions': 98,
                        'total_marks': 1600,
                        'duration_minutes': 134,
                        'marks_per_correct': 1,
                        'negative_marks_per_wrong': 0,
                        'marks_per_unattempted': 0,
                        'question_types': ['mcq'],
                    },
                    'difficulty_distribution': {'easy': 0.30, 'medium': 0.45, 'hard': 0.25},
                    'conducting_body': 'College Board',
                    'frequency': 'monthly',
                    'popularity_score': 88,
                    'subjects': [
                        {
                            'code': 'RW', 'name': 'Reading & Writing', 'weightage': 50, 'expected_questions': 54,
                            'topics': ['Craft & Structure', 'Information & Ideas', 'Standard English Conventions', 'Expression of Ideas']
                        },
                        {
                            'code': 'MATH', 'name': 'Mathematics', 'weightage': 50, 'expected_questions': 44,
                            'topics': ['Algebra', 'Advanced Math', 'Problem-Solving & Data Analysis', 'Geometry & Trigonometry']
                        },
                    ]
                },
                {
                    'code': 'GRE',
                    'name': 'GRE',
                    'full_name': 'Graduate Record Examination',
                    'description': 'Standardized test for graduate school admissions.',
                    'pattern': {
                        'sections': [
                            {'name': 'Verbal Reasoning', 'questions': 27, 'marks_each': 1},
                            {'name': 'Quantitative Reasoning', 'questions': 27, 'marks_each': 1},
                        ],
                        'total_questions': 54,
                        'total_marks': 340,
                        'duration_minutes': 120,
                        'marks_per_correct': 1,
                        'negative_marks_per_wrong': 0,
                        'marks_per_unattempted': 0,
                        'question_types': ['mcq', 'numerical'],
                    },
                    'difficulty_distribution': {'easy': 0.20, 'medium': 0.50, 'hard': 0.30},
                    'conducting_body': 'ETS',
                    'frequency': 'monthly',
                    'popularity_score': 80,
                    'subjects': [
                        {
                            'code': 'VERB', 'name': 'Verbal Reasoning', 'weightage': 50, 'expected_questions': 27,
                            'topics': ['Text Completion', 'Sentence Equivalence', 'Reading Comprehension']
                        },
                        {
                            'code': 'QUANT', 'name': 'Quantitative Reasoning', 'weightage': 50, 'expected_questions': 27,
                            'topics': ['Arithmetic', 'Algebra', 'Geometry', 'Data Analysis']
                        },
                    ]
                },
            ],
        }

        for country_code, exams in exams_data.items():
            country = countries.get(country_code)
            if not country:
                continue

            for exam_data in exams:
                subjects_data = exam_data.pop('subjects')
                exam, created = Exam.objects.get_or_create(
                    code=exam_data['code'],
                    defaults={**exam_data, 'country': country},
                )
                if created:
                    self.stdout.write(f"  Created exam: {exam.name}")

                for subj_data in subjects_data:
                    topics_data = subj_data.pop('topics')
                    subject, created = Subject.objects.get_or_create(
                        exam=exam, code=subj_data['code'],
                        defaults=subj_data,
                    )
                    if created:
                        self.stdout.write(f"    Created subject: {subject.name}")

                    for topic_name in topics_data:
                        Topic.objects.get_or_create(
                            subject=subject,
                            name=topic_name,
                        )
