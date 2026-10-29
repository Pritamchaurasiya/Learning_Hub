with open(r'learninghub/backend/src/routes/v1/tests.routes.ts', 'r', encoding='utf-8') as f:
    code = f.read()

old_import = """  gradeSubjectiveAnswerEndpoint,
  verifyScorecardEndpoint,
} from '../../controllers/testsController'"""

new_import = """  gradeSubjectiveAnswerEndpoint,
  verifyScorecardEndpoint,
  getPyqCatalog,
  getPyqPercentilePrediction,
} from '../../controllers/testsController'"""

if old_import in code:
    code = code.replace(old_import, new_import, 1)

old_route = "router.post('/diagnose-misconception', optionalAuth, testMutationLimiter, diagnoseMisconception)"
new_route = """router.post('/diagnose-misconception', optionalAuth, testMutationLimiter, diagnoseMisconception)
router.get('/pyq/catalog', optionalAuth, testReadLimiter, getPyqCatalog)
router.post('/pyq/predict-percentile', optionalAuth, testMutationLimiter, getPyqPercentilePrediction)"""

if old_route in code:
    code = code.replace(old_route, new_route, 1)

with open(r'learninghub/backend/src/routes/v1/tests.routes.ts', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("tests.routes.ts updated successfully!")
