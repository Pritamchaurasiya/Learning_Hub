# LEARNINGHUB STUDENT UPDATES HUB — COMPREHENSIVE TEST PLAN (V1.0)

> **Testing Frameworks:** Pytest / Pytest-Django (Backend) & Vitest + React Testing Library (Frontend)  
> **Target Coverage:** >= 90% Business Logic, Ingestion, and Security Paths  

---

## 1. TEST SUITE MATRIX

```
learninghub/django_backend/apps/updates/tests/
├── conftest.py                   # Fixtures: mock sources, sample updates, users, tokens
├── test_validators.py            # SSRF validation, private IP blocking, URL scheme tests
├── test_parsers.py               # MGKVP, RSS, and generic table parser fixtures
├── test_change_detection.py      # SHA-256 hash comparison, version incrementing, diffs
├── test_deduplication.py         # Exact and semantic deduplication rules
├── test_services.py              # Ingestion, publication, bookmarking, reminders
├── test_selectors.py             # Feed filtering, search ranking, cross-link queries
├── test_api.py                   # DRF REST API endpoints, pagination, status codes
└── test_tasks.py                 # Celery polling tasks, reminder dispatch, failure backoff
```

---

## 2. KEY TEST SCENARIOS & CRITICAL ASSERTIONS

### 2.1 Ingestion & Change Detection Test
```python
def test_change_detection_flow(db, mock_source):
    # 1. Initial ingestion of a notice
    notice_v1 = {
        'title': 'BCA 3rd Sem Exam Form Extended',
        'url': 'https://mgkvp.ac.in/notice/1.pdf',
        'date': '2026-10-10'
    }
    update, created = ingest_notice(mock_source, notice_v1)
    assert created is True
    assert update.version == 1

    # 2. Ingesting identical notice produces NO change and NO duplicate
    update_same, created_same = ingest_notice(mock_source, notice_v1)
    assert created_same is False
    assert update_same.version == 1

    # 3. Notice modified with extended deadline
    notice_v2 = {
        'title': 'BCA 3rd Sem Exam Form Extended to 15th Oct',
        'url': 'https://mgkvp.ac.in/notice/1.pdf',
        'date': '2026-10-15'
    }
    update_mod, created_mod = ingest_notice(mock_source, notice_v2)
    assert created_mod is False
    assert update_mod.version == 2
    assert update_mod.versions.count() == 1
    assert 'Extended to 15th Oct' in update_mod.versions.first().diff_summary
```

### 2.2 SSRF Prevention Test
```python
@pytest.mark.parametrize("malicious_url", [
    "http://127.0.0.1:8000/internal",
    "http://localhost:6379",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/admin",
    "http://192.168.1.1/router",
    "file:///etc/passwd",
    "ftp://example.com/file",
])
def test_ssrf_validator_blocks_private_targets(malicious_url):
    with pytest.raises(ValidationError):
        validate_safe_external_url(malicious_url)
```

### 2.3 Cross-Feature Resolution Test
```python
def test_cross_feature_linking(db, test_factory, update_factory):
    test_dbms = test_factory.create(title="BCA DBMS Semester Mock", category="BCA")
    update = update_factory.create(category="EXAMINATION", course="BCA")
    
    cross_links = get_update_cross_links(update)
    assert len(cross_links['related_tests']) >= 1
    assert cross_links['related_tests'][0].id == test_dbms.id
```

---

## 3. FAILURE & RESILIENCE TESTING

1. **Official Server Down (HTTP 503):** Poller logs failure, updates `failure_count`, and triggers exponential backoff without destroying active records.
2. **Corrupted / Empty HTML:** Parser returns empty set safely without raising unhandled exceptions or altering existing state.
3. **Database Race Conditions:** Distributed Redis lock prevents duplicate worker execution for the same source ID.
4. **Timezone Transitions:** All deadline and published timestamps strictly normalized to UTC with localized client display.
