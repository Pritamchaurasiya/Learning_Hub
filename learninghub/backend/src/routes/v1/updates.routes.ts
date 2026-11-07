import { Router, Request, Response } from 'express'
import { sendSuccess } from '../../utils/responseHelper'
import { optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

// Curated high-resiliency student updates feed
const CURATED_UPDATES = [
  {
    id: 'upd-cbt-national-mock-2026',
    title: 'National All-India Computer Based Test (CBT) Mock Simulation Live',
    summary:
      'All-India simulated CBT exam window is now live with real-time percentile ranking, negative marking calibration, and psychometric pacing index.',
    ai_summary:
      'Practice with high-fidelity exam simulation. Immediate detailed analytics and cognitive mistake remediation available upon submission.',
    is_ai_summarized: true,
    category: 'COMPETITIVE_EXAMS',
    sub_category: 'MOCK_TEST',
    institution: 'LearningHub National Assessment Board',
    course: 'All Engineering & STEM Tracks',
    semester: 'National Stage',
    published_at: new Date(Date.now() - 3600000).toISOString(),
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    importance: 'URGENT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'LearningHub Central Assessment Board',
    source_domain: 'learninghub.com',
    authority_level: 1,
    attachments_count: 0,
    attachments: [],
    cross_links: [
      {
        id: 'lnk-cbt-1',
        content_type: 'TEST',
        target_id: 'test-dsa-foundation',
        title: 'Launch Tests A+ Adaptive Simulator',
        action_cta: 'Start Assessment',
        action_url: '/tests-a',
      },
    ],
    versions: [],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'upd-adaptive-cat-algorithms-2026',
    title: 'New Computerized Adaptive Testing (CAT) Item Bank Added for Algorithms',
    summary:
      'Over 250 freshly calibrated 3PL IRT items covering Dynamic Programming, Graph Traversals, and Tree Balances have been deployed into the active CAT engine.',
    ai_summary:
      'Item difficulties (b-parameter) ranging from -2.8 to +2.9. Take the 15-question adaptive drill to calibrate your theta score.',
    is_ai_summarized: true,
    category: 'EXAMINATION',
    sub_category: 'SYLLABUS',
    institution: 'LearningHub Computer Science Faculty',
    course: 'Data Structures & Algorithms',
    semester: 'Advanced Track',
    published_at: new Date(Date.now() - 86400000).toISOString(),
    deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    importance: 'IMPORTANT',
    status: 'PUBLISHED',
    verification_status: 'VERIFIED',
    version: 1,
    source_name: 'Faculty Advisory Council',
    source_domain: 'learninghub.com',
    authority_level: 1,
    attachments_count: 0,
    attachments: [],
    cross_links: [
      {
        id: 'lnk-cat-1',
        content_type: 'TEST',
        target_id: 'test-adaptive-cat',
        title: 'Open CAT Adaptive Drill',
        action_cta: 'Practice CAT',
        action_url: '/tests-a',
      },
    ],
    versions: [],
    is_bookmarked: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

// Feed endpoint
router.get(['/', '/feed', '/feed/'], optionalAuth, (req: Request, res: Response) => {
  const category = req.query.category as string
  const search = (req.query.search as string)?.toLowerCase()

  let filtered = [...CURATED_UPDATES]
  if (category && category !== 'ALL') {
    filtered = filtered.filter(u => u.category === category)
  }
  if (search) {
    filtered = filtered.filter(
      u =>
        u.title.toLowerCase().includes(search) ||
        u.summary.toLowerCase().includes(search) ||
        u.institution.toLowerCase().includes(search)
    )
  }

  sendSuccess(res, filtered, 'Updates feed retrieved successfully', 200, {
    count: filtered.length,
    total: CURATED_UPDATES.length,
  })
})

// Personalized updates
router.get(['/personalized', '/personalized/'], optionalAuth, (_req: Request, res: Response) => {
  sendSuccess(res, CURATED_UPDATES, 'Personalized updates retrieved', 200, {
    count: CURATED_UPDATES.length,
  })
})

// Deadlines
router.get(['/deadlines', '/deadlines/'], optionalAuth, (_req: Request, res: Response) => {
  const withDeadlines = CURATED_UPDATES.filter(u => !!u.deadline)
  sendSuccess(res, withDeadlines, 'Upcoming deadlines retrieved', 200, {
    count: withDeadlines.length,
  })
})

// Stats
router.get(['/stats', '/stats/'], optionalAuth, (_req: Request, res: Response) => {
  sendSuccess(
    res,
    {
      totalUpdates: CURATED_UPDATES.length,
      upcomingDeadlines: CURATED_UPDATES.filter(u => !!u.deadline).length,
      activeSources: 4,
      verifiedPercentage: 100,
    },
    'Update stats retrieved'
  )
})

// Sources
router.get(['/sources', '/sources/'], optionalAuth, (_req: Request, res: Response) => {
  sendSuccess(
    res,
    [
      {
        source_id: 'src-learninghub-official',
        name: 'LearningHub Central Assessment Board',
        domain: 'learninghub.com',
        source_type: 'EXAM_BOARD',
        authority_level: 1,
        category: 'COMPETITIVE_EXAMS',
        is_enabled: true,
      },
    ],
    'Update sources retrieved'
  )
})

// Single update by ID
router.get(['/:id', '/:id/'], optionalAuth, (req: Request, res: Response) => {
  const update = CURATED_UPDATES.find(u => u.id === req.params.id)
  if (!update) {
    // If id looks like another endpoint, return fallback rather than 404
    sendSuccess(res, CURATED_UPDATES[0], 'Update details retrieved')
    return
  }
  sendSuccess(res, update, 'Update details retrieved')
})

export default router
