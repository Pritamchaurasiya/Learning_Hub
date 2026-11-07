# Exam Taxonomy & Study Assets (`conductor/apps/exams`)

## Overview
Domain package managing global competitive exam taxonomies and academic knowledge structures. Implements hierarchical categorization (Country → Exam → Subject → Topic), geo-location-aware exam targeting, user exam preferences with regional isolation, and study asset repositories (`PYQ`, `Formula`, `RevisionNote`).

## Interface
- **Models** ([models.py](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/models.py)):
  - [`Country`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/models.py#L10-L34): ISO country mapping for educational jurisdictions (US, IN, UK, AU, CA).
  - [`Exam`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/models.py#L35-L114): Exam configuration entity (SAT, JEE Main, UPSC CSE, GRE, GMAT, NEET, GATE) containing pattern rules, timing, and difficulty distributions.
  - [`Subject`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/models.py#L115-L149): Academic subject area within an exam defining weightages and expected question counts.
  - [`Topic`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/models.py#L150-L207): Hierarchical topic tree supporting subtopics and tracking question count and average difficulty.
  - [`PYQ`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/models.py#L209-L238): Previous Year Question repository tracking exam, subject, topic, year, paper number, question text, and solution text.
  - [`Formula`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/models.py#L239-L265): LaTeX mathematical and scientific formulas with variable definitions and importance flags.
  - [`RevisionNote`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/models.py#L266-L291): High-yield markdown revision notes and cheat-sheets with key points and reading time estimates.
- **API ViewSets & Views** ([views.py](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/views.py)):
  - [`CountryViewSet`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/views.py#L32-L58): Read-only listing of active countries with nested exams.
  - [`ExamViewSet`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/views.py#L60-L144): Exam catalog filterable by country code, IP header, featured flag, or query search.
  - [`SubjectViewSet`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/views.py#L151-L176): Subject catalog filterable by exam code.
  - [`TopicViewSet`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/views.py#L182-L250): Topic catalog with `tree` action returning hierarchical nested trees.
  - [`GeoDetectView`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/views.py#L252-L321): Evaluates client country via `CF-IPCountry` or `Accept-Language` headers.
  - [`PreferenceView`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/views.py#L324-L455): Manages user target exam preferences.

## Invariants
- Jurisdiction integrity: A selected exam must belong to the user's selected country (`str(target_exam.country_id) == str(target_country.id)`). Cross-jurisdictional mismatch returns HTTP 400.
- Natural key uniqueness: `Country.code` is unique globally; `Subject.code` is unique per exam (`unique_together = ['exam', 'code']`).
- Topic counter atomicity: `increment_question_count` uses Django `F()` expressions to prevent race conditions during parallel question ingestion across parents and children.

## Side Effects
- Modifies database tables: `exam_countries`, `exams`, `exam_subjects`, `exam_topics`, `exam_pyqs`, `exam_formulas`, `exam_revision_notes`.
- Updates `user.country` and `user.preferences` fields on `User` model upon saving preferences.

## Verification
- Run: `pytest conductor/tests/ -k exams`
