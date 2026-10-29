import type { TestQuestion, TestSection } from './testsAService'

export interface TargetExamMeta {
  id: string
  slug: string
  name: string
  shortName: string
  category: 'Engineering' | 'Medical' | 'Graduate / Tech' | 'Civil Services' | 'Government Jobs' | 'University Entrance'
  conductingBody: string
  examMode: 'cbt_nta' | 'cbt_gate' | 'standard'
  badgeColor: string
  icon: string
  description: string
  totalMarksDefault: number
  durationMinutesDefault: number
  markingSchemeDescription: string
  virtualCalculatorAllowed: boolean
  roughSheetProvided: boolean
  bilingualSupported: boolean
  officialPapersCount: number
}

export const TARGET_EXAMS_REGISTRY: TargetExamMeta[] = [
  {
    id: 'exam-jee-main',
    slug: 'jee-mains',
    name: 'JEE Main (NTA CBT)',
    shortName: 'JEE Main',
    category: 'Engineering',
    conductingBody: 'National Testing Agency (NTA)',
    examMode: 'cbt_nta',
    badgeColor: 'from-amber-500 to-orange-600',
    icon: '⚡',
    description: 'B.E. / B.Tech Computer Based Test with Physics, Chemistry, and Mathematics. Section A (20 MCQs) & Section B (10 Numericals, attempt ANY 5).',
    totalMarksDefault: 300,
    durationMinutesDefault: 180,
    markingSchemeDescription: '+4 for Correct, -1 for Incorrect (both MCQ & NVQ), 0 for Unattempted.',
    virtualCalculatorAllowed: false,
    roughSheetProvided: true,
    bilingualSupported: true,
    officialPapersCount: 24,
  },
  {
    id: 'exam-neet-ug',
    slug: 'neet',
    name: 'NEET UG (Medical Entrance)',
    shortName: 'NEET UG',
    category: 'Medical',
    conductingBody: 'National Testing Agency (NTA)',
    examMode: 'cbt_nta',
    badgeColor: 'from-emerald-500 to-teal-600',
    icon: '🧬',
    description: 'All India Pre-Medical Entrance for MBBS / BDS. 200 Questions (Physics, Chemistry, Botany, Zoology) with Section A (35 mandatory) and Section B (attempt 10 of 15).',
    totalMarksDefault: 720,
    durationMinutesDefault: 200,
    markingSchemeDescription: '+4 for Correct, -1 for Incorrect, 0 for Unattempted. Max 180 questions scored out of 200.',
    virtualCalculatorAllowed: false,
    roughSheetProvided: true,
    bilingualSupported: true,
    officialPapersCount: 18,
  },
  {
    id: 'exam-gate-cs',
    slug: 'gate-cs',
    name: 'GATE CS & IT (IISc / IIT)',
    shortName: 'GATE CS',
    category: 'Graduate / Tech',
    conductingBody: 'IISc Bangalore / IITs',
    examMode: 'cbt_gate',
    badgeColor: 'from-blue-600 to-indigo-700',
    icon: '💻',
    description: 'Graduate Aptitude Test in Engineering for M.Tech admissions & PSU recruitment. Features Virtual Scientific Calculator, MSQs, MCQs, and NAT questions.',
    totalMarksDefault: 100,
    durationMinutesDefault: 180,
    markingSchemeDescription: 'MCQ: +1/-0.33 or +2/-0.66. MSQ & NAT: +1 or +2 with NO negative marking. Virtual Calculator enabled.',
    virtualCalculatorAllowed: true,
    roughSheetProvided: true,
    bilingualSupported: false,
    officialPapersCount: 15,
  },
  {
    id: 'exam-upsc-prelims',
    slug: 'upsc-prelims',
    name: 'UPSC Civil Services Prelims',
    shortName: 'UPSC Prelims',
    category: 'Civil Services',
    conductingBody: 'Union Public Service Commission (UPSC)',
    examMode: 'standard',
    badgeColor: 'from-purple-600 to-pink-600',
    icon: '🏛️',
    description: 'General Studies Paper 1 & CSAT Paper 2 for IAS, IPS, IFS selection. Modern elimination-proof multi-statement and pair-matching questions.',
    totalMarksDefault: 200,
    durationMinutesDefault: 120,
    markingSchemeDescription: '+2 for Correct, -0.66 for Incorrect (1/3rd penalty), 0 for Unattempted.',
    virtualCalculatorAllowed: false,
    roughSheetProvided: true,
    bilingualSupported: true,
    officialPapersCount: 12,
  },
  {
    id: 'exam-ssc-cgl',
    slug: 'ssc-cgl',
    name: 'SSC CGL Tier 1',
    shortName: 'SSC CGL',
    category: 'Government Jobs',
    conductingBody: 'Staff Selection Commission (SSC)',
    examMode: 'standard',
    badgeColor: 'from-cyan-600 to-blue-600',
    icon: '⚖️',
    description: 'Combined Graduate Level Tier-1 examination. High-speed 100 questions in 60 minutes across Reasoning, General Awareness, Quantitative Aptitude, and English.',
    totalMarksDefault: 200,
    durationMinutesDefault: 60,
    markingSchemeDescription: '+2 for Correct, -0.50 for Incorrect (1/4th penalty), 0 for Unattempted.',
    virtualCalculatorAllowed: false,
    roughSheetProvided: true,
    bilingualSupported: true,
    officialPapersCount: 20,
  },
  {
    id: 'exam-bitsat',
    slug: 'bitsat',
    name: 'BITSAT (BITS Pilani)',
    shortName: 'BITSAT',
    category: 'Engineering',
    conductingBody: 'BITS Pilani',
    examMode: 'cbt_gate',
    badgeColor: 'from-rose-500 to-red-600',
    icon: '🚀',
    description: 'BITS Admission Test for Pilani, Goa, and Hyderabad campuses. 130 Questions (+3, -1) with unlockable 12 Bonus Questions upon completing all items.',
    totalMarksDefault: 390,
    durationMinutesDefault: 180,
    markingSchemeDescription: '+3 for Correct, -1 for Incorrect. Bonus 12 Questions unlock when all 130 attempted.',
    virtualCalculatorAllowed: true,
    roughSheetProvided: true,
    bilingualSupported: false,
    officialPapersCount: 10,
  },
]

export type ShiftBenchmark = HistoricalShiftBenchmark

export interface HistoricalShiftBenchmark {
  examSlug: string
  year: number
  shift: string
  paperTitle: string
  totalMarks: number
  durationMinutes: number
  difficultyRating: 'EASY' | 'MODERATE' | 'TOUGH' | 'BRUTAL'
  shiftDifficultySummary: string
  anchors: Array<{ rawMarks: number; percentile: number; estimatedAir: number }>
  categoryCutoffs: {
    general: number
    obc: number
    ews: number
    sc: number
    st: number
  }
}

export const OFFICIAL_HISTORICAL_BENCHMARKS: Record<string, HistoricalShiftBenchmark> = {
  'jee-main-2024-jan-27-s1': {
    examSlug: 'jee-mains',
    year: 2024,
    shift: 'Session 1 - 27 Jan Shift 1',
    paperTitle: 'JEE Main 2024 Session 1 (27 Jan Shift 1)',
    totalMarks: 300,
    durationMinutes: 180,
    difficultyRating: 'MODERATE',
    shiftDifficultySummary: 'High scoring shift with high math speed requirement and straightforward chemistry.',
    anchors: [
      { rawMarks: 275, percentile: 99.92, estimatedAir: 1100 },
      { rawMarks: 240, percentile: 99.15, estimatedAir: 12000 },
      { rawMarks: 205, percentile: 98.2, estimatedAir: 25000 },
      { rawMarks: 175, percentile: 96.5, estimatedAir: 48000 },
      { rawMarks: 145, percentile: 93.8, estimatedAir: 88000 },
      { rawMarks: 115, percentile: 89.2, estimatedAir: 152000 },
      { rawMarks: 85, percentile: 80.5, estimatedAir: 275000 },
      { rawMarks: 50, percentile: 62.0, estimatedAir: 535000 },
    ],
    categoryCutoffs: {
      general: 132,
      obc: 104,
      ews: 108,
      sc: 68,
      st: 48,
    },
  },
  'jee-main-2024-apr-05-s1': {
    examSlug: 'jee-mains',
    year: 2024,
    shift: 'Session 2 - 05 April Shift 1',
    paperTitle: 'JEE Main 2024 Session 2 (05 Apr Shift 1)',
    totalMarks: 300,
    durationMinutes: 180,
    difficultyRating: 'TOUGH',
    shiftDifficultySummary: 'Calculus-heavy math, tricky physical chemistry calculations, and conceptual electromagnetism.',
    anchors: [
      { rawMarks: 255, percentile: 99.91, estimatedAir: 1200 },
      { rawMarks: 218, percentile: 99.12, estimatedAir: 12500 },
      { rawMarks: 186, percentile: 98.15, estimatedAir: 26000 },
      { rawMarks: 154, percentile: 96.2, estimatedAir: 52000 },
      { rawMarks: 124, percentile: 93.1, estimatedAir: 96000 },
      { rawMarks: 96, percentile: 87.5, estimatedAir: 175000 },
      { rawMarks: 70, percentile: 77.0, estimatedAir: 320000 },
      { rawMarks: 40, percentile: 55.0, estimatedAir: 620000 },
    ],
    categoryCutoffs: {
      general: 118,
      obc: 94,
      ews: 98,
      sc: 60,
      st: 42,
    },
  },
  'neet-ug-2023-official': {
    examSlug: 'neet',
    year: 2023,
    shift: 'Official National Shift (07 May 2023)',
    paperTitle: 'NEET UG 2023 (Official All India Paper)',
    totalMarks: 720,
    durationMinutes: 200,
    difficultyRating: 'MODERATE',
    shiftDifficultySummary: 'Standard NCERT-aligned biology, balanced organic chemistry, and concept-heavy physics.',
    anchors: [
      { rawMarks: 715, percentile: 99.99, estimatedAir: 25 },
      { rawMarks: 675, percentile: 99.85, estimatedAir: 2800 },
      { rawMarks: 640, percentile: 99.42, estimatedAir: 11500 },
      { rawMarks: 610, percentile: 98.75, estimatedAir: 24500 },
      { rawMarks: 560, percentile: 96.8, estimatedAir: 62000 },
      { rawMarks: 480, percentile: 92.1, estimatedAir: 155000 },
      { rawMarks: 350, percentile: 81.0, estimatedAir: 375000 },
      { rawMarks: 137, percentile: 50.0, estimatedAir: 980000 },
    ],
    categoryCutoffs: {
      general: 137,
      obc: 107,
      ews: 107,
      sc: 107,
      st: 107,
    },
  },
  'gate-cs-2024-official': {
    examSlug: 'gate-cs',
    year: 2024,
    shift: 'Set 1 (03 Feb 2024 Afternoon)',
    paperTitle: 'GATE Computer Science 2024 (Official Paper)',
    totalMarks: 100,
    durationMinutes: 180,
    difficultyRating: 'TOUGH',
    shiftDifficultySummary: 'Rigorous Discrete Mathematics and Algorithms with deep MSQ questions.',
    anchors: [
      { rawMarks: 88.5, percentile: 99.99, estimatedAir: 5 },
      { rawMarks: 74.0, percentile: 99.85, estimatedAir: 180 },
      { rawMarks: 62.5, percentile: 99.2, estimatedAir: 950 },
      { rawMarks: 52.0, percentile: 97.8, estimatedAir: 2600 },
      { rawMarks: 42.0, percentile: 94.5, estimatedAir: 6500 },
      { rawMarks: 32.5, percentile: 88.0, estimatedAir: 14200 },
      { rawMarks: 27.6, percentile: 78.5, estimatedAir: 25500 },
    ],
    categoryCutoffs: {
      general: 27.6,
      obc: 24.8,
      ews: 24.8,
      sc: 18.4,
      st: 18.4,
    },
  },
  'upsc-prelims-2023-gs1': {
    examSlug: 'upsc-prelims',
    year: 2023,
    shift: 'Official Paper 1 (28 May 2023)',
    paperTitle: 'UPSC Civil Services Prelims 2023 (GS-1)',
    totalMarks: 200,
    durationMinutes: 120,
    difficultyRating: 'BRUTAL',
    shiftDifficultySummary: 'Historic difficulty shift with new elimination-proof options pattern.',
    anchors: [
      { rawMarks: 125, percentile: 99.98, estimatedAir: 50 },
      { rawMarks: 105, percentile: 99.5, estimatedAir: 1200 },
      { rawMarks: 92, percentile: 98.8, estimatedAir: 6000 },
      { rawMarks: 82, percentile: 97.4, estimatedAir: 14600 },
      { rawMarks: 75.4, percentile: 95.0, estimatedAir: 28000 },
      { rawMarks: 65, percentile: 88.0, estimatedAir: 65000 },
      { rawMarks: 50, percentile: 72.0, estimatedAir: 160000 },
    ],
    categoryCutoffs: {
      general: 75.41,
      obc: 74.75,
      ews: 68.02,
      sc: 59.25,
      st: 47.82,
    },
  },
  'ssc-cgl-2024-tier1': {
    examSlug: 'ssc-cgl',
    year: 2024,
    shift: 'Tier 1 Official (Shift 1)',
    paperTitle: 'SSC CGL 2024 Tier-1 Official Paper',
    totalMarks: 200,
    durationMinutes: 60,
    difficultyRating: 'MODERATE',
    shiftDifficultySummary: 'Speed-based exam with 100 questions in 60 mins. High arithmetic and reasoning weightage.',
    anchors: [
      { rawMarks: 178, percentile: 99.95, estimatedAir: 250 },
      { rawMarks: 162, percentile: 99.1, estimatedAir: 4500 },
      { rawMarks: 150, percentile: 97.8, estimatedAir: 15000 },
      { rawMarks: 138, percentile: 94.5, estimatedAir: 42000 },
      { rawMarks: 124, percentile: 88.0, estimatedAir: 95000 },
      { rawMarks: 105, percentile: 78.0, estimatedAir: 210000 },
    ],
    categoryCutoffs: {
      general: 142.5,
      obc: 138.0,
      ews: 136.0,
      sc: 118.0,
      st: 108.5,
    },
  },
}

export interface OfficialPyqPaper {
  id: string
  title: string
  description: string
  examSlug: string
  examName: string
  examCode: string
  countryName: string
  year: number
  shift: string
  benchmarkKey: string
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  difficultyRating: 'EASY' | 'MODERATE' | 'TOUGH' | 'BRUTAL'
  timeLimitMinutes: number
  totalMarks: number
  passingScore: number
  negativeMarksPerQuestion: number
  questionCount: number
  isPYQ: true
  isFeatured: boolean
  attemptCount: number
  createdAt: string
  markingScheme: {
    examType: string
    benchmarkKey: string
    rules: {
      mcqPositive: number
      mcqNegative: number
      nvqPositive?: number
      nvqNegative?: number
      sectionBMaxAttempts?: number
    }
  }
  sections: TestSection[]
  questions: TestQuestion[]
}

export const OFFICIAL_PYQ_PAPERS: OfficialPyqPaper[] = [
  {
    id: 'pyq-jee-main-2024-jan27-s1',
    title: 'JEE Main 2024 Session 1 (27 Jan Shift 1) Official Paper',
    description: 'Exact NTA CBT exam pattern. Section A: 20 mandatory MCQs (+4, -1). Section B: 10 Numericals, attempt ANY 5 (+4, -1) per subject.',
    examSlug: 'jee-mains',
    examName: 'JEE Main (NTA CBT)',
    examCode: 'NTA-JEE-2024-S1',
    countryName: 'India',
    year: 2024,
    shift: '27 Jan Shift 1',
    benchmarkKey: 'jee-main-2024-jan-27-s1',
    difficulty: 'mixed',
    difficultyRating: 'MODERATE',
    timeLimitMinutes: 180,
    totalMarks: 300,
    passingScore: 40,
    negativeMarksPerQuestion: 1,
    questionCount: 15,
    isPYQ: true,
    isFeatured: true,
    attemptCount: 14250,
    createdAt: '2024-01-27T12:00:00Z',
    markingScheme: {
      examType: 'JEE_MAIN',
      benchmarkKey: 'jee-main-2024-jan-27-s1',
      rules: {
        mcqPositive: 4,
        mcqNegative: -1,
        nvqPositive: 4,
        nvqNegative: -1,
        sectionBMaxAttempts: 5,
      },
    },
    sections: [
      {
        id: 'sec-jee-phys-a',
        title: 'Physics - Section A (MCQ)',
        description: 'Mandatory 20 Multiple Choice Questions (+4, -1)',
        order: 1,
        maxQuestionsToAttempt: 20,
        sectionType: 'MANDATORY',
        question_count: 5,
      },
      {
        id: 'sec-jee-phys-b',
        title: 'Physics - Section B (Numerical)',
        description: 'Numerical Value Type: Attempt ANY 5 out of 10 questions (+4, -1)',
        order: 2,
        maxQuestionsToAttempt: 5,
        sectionType: 'OPTIONAL_CHOICE',
        question_count: 2,
      },
      {
        id: 'sec-jee-chem-a',
        title: 'Chemistry - Section A (MCQ)',
        description: 'Mandatory 20 Multiple Choice Questions (+4, -1)',
        order: 3,
        maxQuestionsToAttempt: 20,
        sectionType: 'MANDATORY',
        question_count: 4,
      },
      {
        id: 'sec-jee-math-a',
        title: 'Mathematics - Section A (MCQ)',
        description: 'Mandatory 20 Multiple Choice Questions (+4, -1)',
        order: 4,
        maxQuestionsToAttempt: 20,
        sectionType: 'MANDATORY',
        question_count: 4,
      },
    ],
    questions: [
      {
        id: 'q-jee-phys-1',
        section_id: 'sec-jee-phys-a',
        text: 'A particle moves along the x-axis under a conservative force with potential energy $U(x) = 2x^2 - 8x + 5$. The position of stable equilibrium is:',
        text_hi: 'एक कण एक संरक्षी बल के अंतर्गत x-अक्ष के अनुदिश गति करता है, जिसकी स्थितिज ऊर्जा $U(x) = 2x^2 - 8x + 5$ है। स्थायी साम्यावस्था की स्थिति क्या होगी?',
        question_type: 'mcq',
        difficulty: 0.4,
        bloom_level: 'understand',
        marks: 4,
        order: 1,
        options: [
          { id: 'opt-1-a', text: '$x = 2\\text{ m}$', text_hi: '$x = 2\\text{ m}$', order: 1, isCorrect: true },
          { id: 'opt-1-b', text: '$x = 4\\text{ m}$', text_hi: '$x = 4\\text{ m}$', order: 2, isCorrect: false },
          { id: 'opt-1-c', text: '$x = -2\\text{ m}$', text_hi: '$x = -2\\text{ m}$', order: 3, isCorrect: false },
          { id: 'opt-1-d', text: '$x = 0\\text{ m}$', text_hi: '$x = 0\\text{ m}$', order: 4, isCorrect: false },
        ],
        explanation: 'At equilibrium, $dU/dx = 0 \\implies 4x - 8 = 0 \\implies x = 2\\text{ m}$. Check second derivative: $d^2U/dx^2 = 4 > 0$, confirming stable equilibrium.',
        explanation_hi: 'साम्यावस्था पर, $dU/dx = 0 \\implies 4x - 8 = 0 \\implies x = 2\\text{ m}$। द्वितीय अवकलज $d^2U/dx^2 = 4 > 0$ है, जो पुष्टि करता है कि साम्यावस्था स्थायी है।',
      },
      {
        id: 'q-jee-phys-2',
        section_id: 'sec-jee-phys-a',
        text: 'In an electromagnetic wave, the electric field amplitude is $E_0 = 600\\text{ V/m}$. The magnetic field amplitude $B_0$ associated with this wave is:',
        text_hi: 'एक विद्युत चुम्बकीय तरंग में, विद्युत क्षेत्र का आयाम $E_0 = 600\\text{ V/m}$ है। इस तरंग से संबंधित चुम्बकीय क्षेत्र का आयाम $B_0$ होगा:',
        question_type: 'mcq',
        difficulty: 0.35,
        bloom_level: 'remember',
        marks: 4,
        order: 2,
        options: [
          { id: 'opt-2-a', text: '$2 \\times 10^{-6}\\text{ T}$', text_hi: '$2 \\times 10^{-6}\\text{ T}$', order: 1, isCorrect: true },
          { id: 'opt-2-b', text: '$1.8 \\times 10^{11}\\text{ T}$', text_hi: '$1.8 \\times 10^{11}\\text{ T}$', order: 2, isCorrect: false },
          { id: 'opt-2-c', text: '$5 \\times 10^{-7}\\text{ T}$', text_hi: '$5 \\times 10^{-7}\\text{ T}$', order: 3, isCorrect: false },
          { id: 'opt-2-d', text: '$3 \\times 10^{-6}\\text{ T}$', text_hi: '$3 \\times 10^{-6}\\text{ T}$', order: 4, isCorrect: false },
        ],
        explanation: 'Relationship between electric and magnetic fields in EM wave: $c = E_0 / B_0 \\implies B_0 = E_0 / c = 600 / (3 \\times 10^8) = 2 \\times 10^{-6}\\text{ T}$.',
        explanation_hi: 'विद्युत चुम्बकीय तरंग में संबंध: $c = E_0 / B_0 \\implies B_0 = E_0 / c = 600 / (3 \\times 10^8) = 2 \\times 10^{-6}\\text{ T}$।',
      },
      {
        id: 'q-jee-phys-3',
        section_id: 'sec-jee-phys-a',
        text: 'A Carnot engine operates between temperatures $T_1 = 500\\text{ K}$ and $T_2 = 300\\text{ K}$. If the heat absorbed from the source is $1000\\text{ J}$, the work done per cycle is:',
        text_hi: 'एक कार्नो इंजन तापमान $T_1 = 500\\text{ K}$ तथा $T_2 = 300\\text{ K}$ के बीच कार्य करता है। यदि स्रोत से अवशोषित ऊष्मा $1000\\text{ J}$ है, तो प्रति चक्र किया गया कार्य क्या है?',
        question_type: 'mcq',
        difficulty: 0.45,
        bloom_level: 'apply',
        marks: 4,
        order: 3,
        options: [
          { id: 'opt-3-a', text: '$400\\text{ J}$', text_hi: '$400\\text{ J}$', order: 1, isCorrect: true },
          { id: 'opt-3-b', text: '$600\\text{ J}$', text_hi: '$600\\text{ J}$', order: 2, isCorrect: false },
          { id: 'opt-3-c', text: '$500\\text{ J}$', text_hi: '$500\\text{ J}$', order: 3, isCorrect: false },
          { id: 'opt-3-d', text: '$300\\text{ J}$', text_hi: '$300\\text{ J}$', order: 4, isCorrect: false },
        ],
        explanation: 'Efficiency $\\eta = 1 - T_2/T_1 = 1 - 300/500 = 0.4$. Work done $W = \\eta Q_1 = 0.4 \\times 1000 = 400\\text{ J}$.',
        explanation_hi: 'दक्षता $\\eta = 1 - T_2/T_1 = 1 - 300/500 = 0.4$। किया गया कार्य $W = \\eta Q_1 = 0.4 \\times 1000 = 400\\text{ J}$।',
      },
      {
        id: 'q-jee-phys-4',
        section_id: 'sec-jee-phys-a',
        text: 'The de-Broglie wavelength of an electron accelerated through a potential difference of $100\\text{ V}$ is approximately:',
        text_hi: '$100\\text{ V}$ के विभवांतर से त्वरित एक इलेक्ट्रॉन की दे-ब्रॉग्ली तरंगदैर्ध्य लगभग कितनी होगी?',
        question_type: 'mcq',
        difficulty: 0.4,
        bloom_level: 'apply',
        marks: 4,
        order: 4,
        options: [
          { id: 'opt-4-a', text: '$1.227\\text{ \\AA}$', text_hi: '$1.227\\text{ \\AA}$', order: 1, isCorrect: true },
          { id: 'opt-4-b', text: '$0.123\\text{ \\AA}$', text_hi: '$0.123\\text{ \\AA}$', order: 2, isCorrect: false },
          { id: 'opt-4-c', text: '$12.27\\text{ \\AA}$', text_hi: '$12.27\\text{ \\AA}$', order: 3, isCorrect: false },
          { id: 'opt-4-d', text: '$2.454\\text{ \\AA}$', text_hi: '$2.454\\text{ \\AA}$', order: 4, isCorrect: false },
        ],
        explanation: 'For an electron: $\\lambda = \\frac{12.27}{\\sqrt{V}}\\text{ \\AA} = \\frac{12.27}{\\sqrt{100}} = 1.227\\text{ \\AA}$.',
        explanation_hi: 'इलेक्ट्रॉन के लिए: $\\lambda = \\frac{12.27}{\\sqrt{V}}\\text{ \\AA} = \\frac{12.27}{10} = 1.227\\text{ \\AA}$।',
      },
      {
        id: 'q-jee-phys-5',
        section_id: 'sec-jee-phys-a',
        text: 'Two simple harmonic motions are represented by $y_1 = 5\\sin(2\\pi t + \\pi/3)$ and $y_2 = 5\\sqrt{3}(\\sin 2\\pi t + \\cos 2\\pi t)$. The ratio of their amplitudes is:',
        text_hi: 'दो सरल आवर्त गतियों को $y_1 = 5\\sin(2\\pi t + \\pi/3)$ तथा $y_2 = 5\\sqrt{3}(\\sin 2\\pi t + \\cos 2\\pi t)$ द्वारा दर्शाया गया है। उनके आयामों का अनुपात क्या है?',
        question_type: 'mcq',
        difficulty: 0.55,
        bloom_level: 'analyze',
        marks: 4,
        order: 5,
        options: [
          { id: 'opt-5-a', text: '$1 : \\sqrt{6}$', text_hi: '$1 : \\sqrt{6}$', order: 1, isCorrect: true },
          { id: 'opt-5-b', text: '$1 : 2$', text_hi: '$1 : 2$', order: 2, isCorrect: false },
          { id: 'opt-5-c', text: '$\\sqrt{3} : 1$', text_hi: '$\\sqrt{3} : 1$', order: 3, isCorrect: false },
          { id: 'opt-5-d', text: '$1 : \\sqrt{3}$', text_hi: '$1 : \\sqrt{3}$', order: 4, isCorrect: false },
        ],
        explanation: 'Amplitude of $y_1$ is $A_1 = 5$. For $y_2 = 5\\sqrt{3}\\sin 2\\pi t + 5\\sqrt{3}\\cos 2\\pi t$, $A_2 = \\sqrt{(5\\sqrt{3})^2 + (5\\sqrt{3})^2} = 5\\sqrt{6}$. Ratio $A_1 / A_2 = 5 / (5\\sqrt{6}) = 1/\\sqrt{6}$.',
        explanation_hi: '$y_1$ का आयाम $A_1 = 5$ है। $y_2$ के लिए $A_2 = \\sqrt{(5\\sqrt{3})^2 + (5\\sqrt{3})^2} = 5\\sqrt{6}$। अतः अनुपात $A_1/A_2 = 1/\\sqrt{6}$।',
      },
      {
        id: 'q-jee-phys-6-nvq',
        section_id: 'sec-jee-phys-b',
        text: 'A circular coil of 100 turns and radius $10\\text{ cm}$ carries a current of $2\\text{ A}$. The magnetic field at the center of the coil is $B = x \\pi \\times 10^{-4}\\text{ T}$. The value of $x$ is: (Enter integer value)',
        text_hi: '100 फेरों और $10\\text{ cm}$ त्रिज्या वाली एक वृत्ताकार कुंडली में $2\\text{ A}$ की धारा प्रवाहित होती है। कुंडली के केंद्र पर चुंबकीय क्षेत्र $B = x \\pi \\times 10^{-4}\\text{ T}$ है। $x$ का मान ज्ञात कीजिए:',
        question_type: 'numerical',
        difficulty: 0.5,
        bloom_level: 'apply',
        marks: 4,
        order: 6,
        options: [
          { id: 'opt-6-a', text: '4', text_hi: '4', order: 1, isCorrect: true },
        ],
        explanation: '$B = \\frac{\\mu_0 N I}{2R} = \\frac{(4\\pi \\times 10^{-7})(100)(2)}{2 \\times 0.1} = 4\\pi \\times 10^{-4}\\text{ T}$. Hence $x = 4$.',
        explanation_hi: '$B = \\frac{\\mu_0 N I}{2R} = \\frac{(4\\pi \\times 10^{-7})(100)(2)}{2 \\times 0.1} = 4\\pi \\times 10^{-4}\\text{ T}$। अतः $x = 4$।',
      },
      {
        id: 'q-jee-phys-7-nvq',
        section_id: 'sec-jee-phys-b',
        text: 'A parallel plate capacitor with air between the plates has capacitance $9\\text{ pF}$. The separation between its plates is $d$. The space between the plates is now filled with two dielectrics of dielectric constants $K_1 = 3$ and $K_2 = 6$, each of thickness $d/2$. The new capacitance is _____ $\\text{pF}$.',
        text_hi: 'वायु युक्त एक समांतर प्लेट संधारित्र की धारिता $9\\text{ pF}$ है। प्लेटों के बीच की दूरी $d$ है। अब प्लेटों के बीच के स्थान को परावैद्युतांक $K_1 = 3$ और $K_2 = 6$ वाले दो परावैद्युतों से भरा जाता है, प्रत्येक की मोटाई $d/2$ है। नई धारिता _____ $\\text{pF}$ होगी।',
        question_type: 'numerical',
        difficulty: 0.6,
        bloom_level: 'analyze',
        marks: 4,
        order: 7,
        options: [
          { id: 'opt-7-a', text: '36', text_hi: '36', order: 1, isCorrect: true },
        ],
        explanation: 'Effective dielectric constant $K_{\\text{eq}} = \\frac{2 K_1 K_2}{K_1 + K_2} = \\frac{2 \\times 3 \\times 6}{3 + 6} = \\frac{36}{9} = 4$. New capacitance $C\' = K_{\\text{eq}} C_0 = 4 \\times 9 = 36\\text{ pF}$.',
        explanation_hi: 'प्रभावी परावैद्युतांक $K_{\\text{eq}} = \\frac{2 K_1 K_2}{K_1 + K_2} = \\frac{36}{9} = 4$। नई धारिता $C\' = 4 \\times 9 = 36\\text{ pF}$।',
      },
      {
        id: 'q-jee-chem-1',
        section_id: 'sec-jee-chem-a',
        text: 'Among the following coordination complexes, which one is diamagnetic in nature? (Atomic number: $\\text{Fe}=26, \\text{Co}=27, \\text{Mn}=25$)',
        text_hi: 'निम्नलिखित उपसहसंयोजन संकुलों में से कौन-सा प्रतिचुम्बकीय (diamagnetic) प्रकृति का है? (परमाणु क्रमांक: $\\text{Fe}=26, \\text{Co}=27, \\text{Mn}=25$)',
        question_type: 'mcq',
        difficulty: 0.5,
        bloom_level: 'analyze',
        marks: 4,
        order: 8,
        options: [
          { id: 'opt-chem-1-a', text: '$[Co(NH_3)_6]^{3+}$', text_hi: '$[Co(NH_3)_6]^{3+}$', order: 1, isCorrect: true },
          { id: 'opt-chem-1-b', text: '$[CoF_6]^{3-}$', text_hi: '$[CoF_6]^{3-}$', order: 2, isCorrect: false },
          { id: 'opt-chem-1-c', text: '$[Fe(H_2O)_6]^{2+}$', text_hi: '$[Fe(H_2O)_6]^{2+}$', order: 3, isCorrect: false },
          { id: 'opt-chem-1-d', text: '$[MnCl_6]^{3-}$', text_hi: '$[MnCl_6]^{3-}$', order: 4, isCorrect: false },
        ],
        explanation: 'In $[Co(NH_3)_6]^{3+}$, $Co^{3+}$ has $3d^6$ configuration. $NH_3$ is a strong field ligand causing pairing of electrons into $t_{2g}^6 e_g^0$, leaving 0 unpaired electrons $\\implies$ diamagnetic.',
        explanation_hi: '$[Co(NH_3)_6]^{3+}$ में $Co^{3+}$ का विन्यास $3d^6$ होता है। $NH_3$ प्रबल क्षेत्र लिगैंड है जिससे इलेक्ट्रॉनों का युग्मन $t_{2g}^6 e_g^0$ हो जाता है। अयुग्मित इलेक्ट्रॉन = 0 $\\implies$ प्रतिचुम्बकीय।',
      },
      {
        id: 'q-jee-chem-2',
        section_id: 'sec-jee-chem-a',
        text: 'Which of the following carbocations is most stable?',
        text_hi: 'निम्नलिखित में से कौन-सा कार्बधनायन सर्वाधिक स्थायी है?',
        question_type: 'mcq',
        difficulty: 0.45,
        bloom_level: 'understand',
        marks: 4,
        order: 9,
        options: [
          { id: 'opt-chem-2-a', text: 'Tropylium cation ($C_7H_7^+$)', text_hi: 'ट्रोपिलियम धनायन ($C_7H_7^+$)', order: 1, isCorrect: true },
          { id: 'opt-chem-2-b', text: 'Benzyl carbocation ($C_6H_5CH_2^+$)', text_hi: 'बेन्जिल कार्बधनायन ($C_6H_5CH_2^+$)', order: 2, isCorrect: false },
          { id: 'opt-chem-2-c', text: 'Tert-butyl carbocation ($(CH_3)_3C^+$)', text_hi: 'टर्ट-ब्यूटिल कार्बधनायन ($(CH_3)_3C^+$)', order: 3, isCorrect: false },
          { id: 'opt-chem-2-d', text: 'Allyl carbocation ($CH_2=CH-CH_2^+$)', text_hi: 'एलिल कार्बधनायन ($CH_2=CH-CH_2^+$)', order: 4, isCorrect: false },
        ],
        explanation: 'Tropylium cation is aromatic with 6 $\\pi$ electrons completely delocalized across a 7-membered planar ring satisfying Huckel\'s $(4n+2)$ rule, making it exceptionally stable.',
        explanation_hi: 'ट्रोपिलियम धनायन हकल के $(4n+2)$ नियम के अनुसार 6 $\\pi$ इलेक्ट्रॉनों से युक्त एरोमैटिक निकाय है, जो इसे असाधारण रूप से स्थायी बनाता है।',
      },
      {
        id: 'q-jee-chem-3',
        section_id: 'sec-jee-chem-a',
        text: 'The standard reduction potential $E^\\circ$ values are: $Zn^{2+}/Zn = -0.76\\text{ V}$, $Fe^{2+}/Fe = -0.44\\text{ V}$, $Cu^{2+}/Cu = +0.34\\text{ V}$, $Ag^+/Ag = +0.80\\text{ V}$. The strongest reducing agent is:',
        text_hi: 'मानक अपचयन विभव $E^\\circ$ के मान हैं: $Zn^{2+}/Zn = -0.76\\text{ V}$, $Fe^{2+}/Fe = -0.44\\text{ V}$, $Cu^{2+}/Cu = +0.34\\text{ V}$, $Ag^+/Ag = +0.80\\text{ V}$। सबसे प्रबल अपचायक है:',
        question_type: 'mcq',
        difficulty: 0.35,
        bloom_level: 'remember',
        marks: 4,
        order: 10,
        options: [
          { id: 'opt-chem-3-a', text: '$Zn$', text_hi: '$Zn$', order: 1, isCorrect: true },
          { id: 'opt-chem-3-b', text: '$Ag$', text_hi: '$Ag$', order: 2, isCorrect: false },
          { id: 'opt-chem-3-c', text: '$Fe$', text_hi: '$Fe$', order: 3, isCorrect: false },
          { id: 'opt-chem-3-d', text: '$Cu$', text_hi: '$Cu$', order: 4, isCorrect: false },
        ],
        explanation: 'Lower the reduction potential, higher is the oxidation tendency and stronger is the reducing agent. $Zn$ has lowest $E^\\circ = -0.76\\text{ V}$.',
        explanation_hi: 'अपचयन विभव जितना कम ऋणात्मक होगा, ऑक्सीकरण प्रवृत्ति उतनी ही अधिक होगी और अपचायक उतना ही प्रबल होगा। $Zn$ का $E^\\circ = -0.76\\text{ V}$ न्यूनतम है।',
      },
      {
        id: 'q-jee-chem-4',
        section_id: 'sec-jee-chem-a',
        text: 'For a first order reaction, if $75\\%$ of the reaction completes in $32\\text{ minutes}$, the half-life ($t_{1/2}$) of the reaction is:',
        text_hi: 'एक प्रथम कोटि की अभिक्रिया के लिए, यदि अभिक्रिया का $75\\%$ भाग $32\\text{ मिनट}$ में पूरा होता है, तो अभिक्रिया की अर्ध-आयु ($t_{1/2}$) क्या है?',
        question_type: 'mcq',
        difficulty: 0.4,
        bloom_level: 'apply',
        marks: 4,
        order: 11,
        options: [
          { id: 'opt-chem-4-a', text: '$16\\text{ minutes}$', text_hi: '$16\\text{ मिनट}$', order: 1, isCorrect: true },
          { id: 'opt-chem-4-b', text: '$8\\text{ minutes}$', text_hi: '$8\\text{ मिनट}$', order: 2, isCorrect: false },
          { id: 'opt-chem-4-c', text: '$24\\text{ minutes}$', text_hi: '$24\\text{ मिनट}$', order: 3, isCorrect: false },
          { id: 'opt-chem-4-d', text: '$32\\text{ minutes}$', text_hi: '$32\\text{ मिनट}$', order: 4, isCorrect: false },
        ],
        explanation: 'For 1st order: $t_{75\\%} = 2 \\times t_{1/2} \\implies t_{1/2} = 32 / 2 = 16\\text{ minutes}$.',
        explanation_hi: 'प्रथम कोटि अभिक्रिया के लिए: $t_{75\\%} = 2 \\times t_{1/2} \\implies t_{1/2} = 32 / 2 = 16\\text{ मिनट}$।',
      },
      {
        id: 'q-jee-math-1',
        section_id: 'sec-jee-math-a',
        text: 'Evaluate the definite integral $\\int_0^{\\pi/2} \\frac{\\sin^3 x}{\\sin^3 x + \\cos^3 x} dx$.',
        text_hi: 'निश्चित समाकल $\\int_0^{\\pi/2} \\frac{\\sin^3 x}{\\sin^3 x + \\cos^3 x} dx$ का मान ज्ञात कीजिए।',
        question_type: 'mcq',
        difficulty: 0.45,
        bloom_level: 'apply',
        marks: 4,
        order: 12,
        options: [
          { id: 'opt-math-1-a', text: '$\\frac{\\pi}{4}$', text_hi: '$\\frac{\\pi}{4}$', order: 1, isCorrect: true },
          { id: 'opt-math-1-b', text: '$\\frac{\\pi}{2}$', text_hi: '$\\frac{\\pi}{2}$', order: 2, isCorrect: false },
          { id: 'opt-math-1-c', text: '$\\pi$', text_hi: '$\\pi$', order: 3, isCorrect: false },
          { id: 'opt-math-1-d', text: '$\\frac{\\pi}{8}$', text_hi: '$\\frac{\\pi}{8}$', order: 4, isCorrect: false },
        ],
        explanation: 'Using King\'s property $\\int_a^b f(x)dx = \\int_a^b f(a+b-x)dx$, $I = \\int_0^{\\pi/2} \\frac{\\cos^3 x}{\\cos^3 x + \\sin^3 x} dx$. Adding equations gives $2I = \\int_0^{\\pi/2} 1 dx = \\frac{\\pi}{2} \\implies I = \\frac{\\pi}{4}$.',
        explanation_hi: 'गुणधर्म $\\int_a^b f(x)dx = \\int_a^b f(a+b-x)dx$ का उपयोग करने पर, $2I = \\int_0^{\\pi/2} 1 dx = \\frac{\\pi}{2} \\implies I = \\frac{\\pi}{4}$।',
      },
      {
        id: 'q-jee-math-2',
        section_id: 'sec-jee-math-a',
        text: 'The number of real solutions of the equation $e^x = x^2$ is:',
        text_hi: 'समीकरण $e^x = x^2$ के वास्तविक हलों की संख्या क्या है?',
        question_type: 'mcq',
        difficulty: 0.5,
        bloom_level: 'analyze',
        marks: 4,
        order: 13,
        options: [
          { id: 'opt-math-2-a', text: '1', text_hi: '1', order: 1, isCorrect: true },
          { id: 'opt-math-2-b', text: '0', text_hi: '0', order: 2, isCorrect: false },
          { id: 'opt-math-2-c', text: '2', text_hi: '2', order: 3, isCorrect: false },
          { id: 'opt-math-2-d', text: '3', text_hi: '3', order: 4, isCorrect: false },
        ],
        explanation: 'For $x \\ge 0$, $e^x > x^2$ for all $x$ because $e^x = 1 + x + x^2/2 + x^3/6 > x^2$. For $x < 0$, $y = e^x$ is strictly positive and decaying from 0 to 1, while $y = x^2$ increases from 0 to $\\infty$, intersecting at exactly one point ($x \\approx -0.703$). Thus exactly 1 real root.',
        explanation_hi: '$x \\ge 0$ के लिए $e^x > x^2$ हमेशा सत्य है। $x < 0$ के लिए $y = e^x$ तथा $y = x^2$ का ठीक 1 प्रतिच्छेदन बिंदु ($x \\approx -0.703$) है। अतः ठीक 1 वास्तविक हल है।',
      },
      {
        id: 'q-jee-math-3',
        section_id: 'sec-jee-math-a',
        text: 'If the system of linear equations $x + y + z = 6$, $x + 2y + 3z = 10$, $x + 2y + \\lambda z = \\mu$ has infinitely many solutions, then $\\lambda + \\mu$ is equal to:',
        text_hi: 'यदि रैखिक समीकरण निकाय $x + y + z = 6$, $x + 2y + 3z = 10$, $x + 2y + \\lambda z = \\mu$ के अनंत हल हैं, तो $\\lambda + \\mu$ का मान होगा:',
        question_type: 'mcq',
        difficulty: 0.45,
        bloom_level: 'apply',
        marks: 4,
        order: 14,
        options: [
          { id: 'opt-math-3-a', text: '13', text_hi: '13', order: 1, isCorrect: true },
          { id: 'opt-math-3-b', text: '10', text_hi: '10', order: 2, isCorrect: false },
          { id: 'opt-math-3-c', text: '16', text_hi: '16', order: 3, isCorrect: false },
          { id: 'opt-math-3-d', text: '7', text_hi: '7', order: 4, isCorrect: false },
        ],
        explanation: 'For infinitely many solutions, the coefficient determinant $D = 0 \\implies \\lambda = 3$. Also $D_z = 0 \\implies \\mu = 10$. Hence $\\lambda + \\mu = 3 + 10 = 13$.',
        explanation_hi: 'अनंत हलों के लिए $D = 0 \\implies \\lambda = 3$ तथा $D_z = 0 \\implies \\mu = 10$। अतः $\\lambda + \\mu = 3 + 10 = 13$।',
      },
      {
        id: 'q-jee-math-4',
        section_id: 'sec-jee-math-a',
        text: 'The area of the region enclosed by the parabola $y^2 = 4x$ and the line $y = 2x$ is:',
        text_hi: 'परवलय $y^2 = 4x$ तथा रेखा $y = 2x$ द्वारा परिबद्ध क्षेत्र का क्षेत्रफल क्या है?',
        question_type: 'mcq',
        difficulty: 0.5,
        bloom_level: 'apply',
        marks: 4,
        order: 15,
        options: [
          { id: 'opt-math-4-a', text: '$\\frac{1}{3}$', text_hi: '$\\frac{1}{3}$', order: 1, isCorrect: true },
          { id: 'opt-math-4-b', text: '$\\frac{2}{3}$', text_hi: '$\\frac{2}{3}$', order: 2, isCorrect: false },
          { id: 'opt-math-4-c', text: '$\\frac{1}{6}$', text_hi: '$\\frac{1}{6}$', order: 3, isCorrect: false },
          { id: 'opt-math-4-d', text: '$\\frac{4}{3}$', text_hi: '$\\frac{4}{3}$', order: 4, isCorrect: false },
        ],
        explanation: 'Points of intersection: $(2x)^2 = 4x \\implies 4x^2 - 4x = 0 \\implies x = 0, 1$. Area $= \\int_0^1 (2\\sqrt{x} - 2x) dx = \\left[ \\frac{4}{3} x^{3/2} - x^2 \\right]_0^1 = \\frac{4}{3} - 1 = \\frac{1}{3}$.',
        explanation_hi: 'प्रतिच्छेदन बिंदु: $x = 0, 1$। क्षेत्रफल $= \\int_0^1 (2\\sqrt{x} - 2x) dx = \\frac{4}{3} - 1 = \\frac{1}{3}$।',
      },
    ],
  },
  {
    id: 'pyq-neet-ug-2023-national',
    title: 'NEET UG 2023 Official All India Question Paper',
    description: 'National Medical Entrance paper. Section A (35 mandatory questions) and Section B (attempt 10 of 15) for Physics, Chemistry, Botany, and Zoology. Marking: +4, -1.',
    examSlug: 'neet',
    examName: 'NEET UG (Medical Entrance)',
    examCode: 'NTA-NEET-2023',
    countryName: 'India',
    year: 2023,
    shift: 'Official National Shift',
    benchmarkKey: 'neet-ug-2023-official',
    difficulty: 'medium',
    difficultyRating: 'MODERATE',
    timeLimitMinutes: 200,
    totalMarks: 720,
    passingScore: 50,
    negativeMarksPerQuestion: 1,
    questionCount: 8,
    isPYQ: true,
    isFeatured: true,
    attemptCount: 19800,
    createdAt: '2023-05-07T14:00:00Z',
    markingScheme: {
      examType: 'NEET_UG',
      benchmarkKey: 'neet-ug-2023-official',
      rules: {
        mcqPositive: 4,
        mcqNegative: -1,
        sectionBMaxAttempts: 10,
      },
    },
    sections: [
      {
        id: 'sec-neet-phys-a',
        title: 'Physics - Section A',
        description: 'Mandatory 35 Questions (+4, -1)',
        order: 1,
        maxQuestionsToAttempt: 35,
        sectionType: 'MANDATORY',
        question_count: 2,
      },
      {
        id: 'sec-neet-chem-a',
        title: 'Chemistry - Section A',
        description: 'Mandatory 35 Questions (+4, -1)',
        order: 2,
        maxQuestionsToAttempt: 35,
        sectionType: 'MANDATORY',
        question_count: 2,
      },
      {
        id: 'sec-neet-bot-a',
        title: 'Botany - Section A',
        description: 'Mandatory 35 Questions (+4, -1)',
        order: 3,
        maxQuestionsToAttempt: 35,
        sectionType: 'MANDATORY',
        question_count: 2,
      },
      {
        id: 'sec-neet-zoo-a',
        title: 'Zoology - Section A',
        description: 'Mandatory 35 Questions (+4, -1)',
        order: 4,
        maxQuestionsToAttempt: 35,
        sectionType: 'MANDATORY',
        question_count: 2,
      },
    ],
    questions: [
      {
        id: 'q-neet-bio-1',
        section_id: 'sec-neet-bot-a',
        text: 'The historic Convention on Biological Diversity (\'The Earth Summit\') was held in Rio de Janeiro in the year:',
        text_hi: 'जैविक विविधता पर ऐतिहासिक सम्मेलन (\'पृथ्वी शिखर सम्मेलन\') रियो डी जेनेरो में किस वर्ष आयोजित किया गया था?',
        question_type: 'mcq',
        difficulty: 0.3,
        bloom_level: 'remember',
        marks: 4,
        order: 1,
        options: [
          { id: 'opt-nb-1-a', text: '1992', text_hi: '1992', order: 1, isCorrect: true },
          { id: 'opt-nb-1-b', text: '1986', text_hi: '1986', order: 2, isCorrect: false },
          { id: 'opt-nb-1-c', text: '2002', text_hi: '2002', order: 3, isCorrect: false },
          { id: 'opt-nb-1-d', text: '1972', text_hi: '1972', order: 4, isCorrect: false },
        ],
        explanation: 'The historic Convention on Biological Diversity (The Earth Summit) was held in Rio de Janeiro in 1992, calling upon all nations to take appropriate measures for conservation of biodiversity.',
        explanation_hi: 'जैव विविधता पर ऐतिहासिक सम्मेलन (पृथ्वी शिखर सम्मेलन) 1992 में रियो डी जेनेरो में आयोजित किया गया था।',
      },
      {
        id: 'q-neet-bio-2',
        section_id: 'sec-neet-bot-a',
        text: 'In tissue culture experiments, which pair of plant growth regulators is required for root and shoot differentiation from callus?',
        text_hi: 'ऊतक संवर्धन प्रयोगों में, कैलस से जड़ तथा प्ररोह विभेदन के लिए पादप वृद्धि नियामकों का कौन-सा युग्म आवश्यक होता है?',
        question_type: 'mcq',
        difficulty: 0.4,
        bloom_level: 'understand',
        marks: 4,
        order: 2,
        options: [
          { id: 'opt-nb-2-a', text: 'Auxin and Cytokinin', text_hi: 'ऑक्सिन और साइटोकाइनिन', order: 1, isCorrect: true },
          { id: 'opt-nb-2-b', text: 'Auxin and Gibberellin', text_hi: 'ऑक्सिन और जिबरेलिन', order: 2, isCorrect: false },
          { id: 'opt-nb-2-c', text: 'Gibberellin and Abscisic acid', text_hi: 'जिबरेलिन और एब्सिसिक एसिड', order: 3, isCorrect: false },
          { id: 'opt-nb-2-d', text: 'Cytokinin and Ethylene', text_hi: 'साइटोकाइनिन और एथिलीन', order: 4, isCorrect: false },
        ],
        explanation: 'High auxin to cytokinin ratio induces root differentiation (rhizogenesis), while high cytokinin to auxin ratio induces shoot differentiation (caulogenesis).',
        explanation_hi: 'ऑक्सिन/साइटोकाइनिन का उच्च अनुपात जड़ विभेदन को प्रेरित करता है, जबकि साइटोकाइनिन/ऑक्सिन का उच्च अनुपात प्ररोह विभेदन को प्रेरित करता है।',
      },
      {
        id: 'q-neet-zoo-1',
        section_id: 'sec-neet-zoo-a',
        text: 'Broad palm with single palm crease and furrowed tongue with mental retardation are characteristic phenotypic symptoms of:',
        text_hi: 'एकल हथेली क्रीज के साथ चौड़ी हथेली तथा विदरित जीभ के साथ मानसिक मंदता किसके विशिष्ट लक्षण हैं?',
        question_type: 'mcq',
        difficulty: 0.35,
        bloom_level: 'remember',
        marks: 4,
        order: 3,
        options: [
          { id: 'opt-nz-1-a', text: 'Down\'s syndrome', text_hi: 'डाउन सिंड्रोम', order: 1, isCorrect: true },
          { id: 'opt-nz-1-b', text: 'Turner\'s syndrome', text_hi: 'टर्नर सिंड्रोम', order: 2, isCorrect: false },
          { id: 'opt-nz-1-c', text: 'Klinefelter\'s syndrome', text_hi: 'क्लाइनफेल्टर सिंड्रोम', order: 3, isCorrect: false },
          { id: 'opt-nz-1-d', text: 'Thalassemia', text_hi: 'थैलेसीमिया', order: 4, isCorrect: false },
        ],
        explanation: 'Down\'s syndrome is caused by trisomy of chromosome 21. Phenotypes include furrowed tongue, partially open mouth, broad palm with simian crease, and mental development retardation.',
        explanation_hi: 'डाउन सिंड्रोम क्रोमोसोम 21 की ट्राइसोमी के कारण होता है। इसमें विदरित जीभ, चौड़ी हथेली और मानसिक मंदता पाई जाती है।',
      },
      {
        id: 'q-neet-zoo-2',
        section_id: 'sec-neet-zoo-a',
        text: 'Which of the following is NOT an intra-uterine contraceptive device (IUD)?',
        text_hi: 'निम्नलिखित में से कौन-सा अंतःगर्भाशयी गर्भनिरोधक उपकरण (IUD) नहीं है?',
        question_type: 'mcq',
        difficulty: 0.35,
        bloom_level: 'remember',
        marks: 4,
        order: 4,
        options: [
          { id: 'opt-nz-2-a', text: 'Progestasert', text_hi: 'प्रोजेस्टासर्ट', order: 1, isCorrect: false },
          { id: 'opt-nz-2-b', text: 'Lippes loop', text_hi: 'लिप्स लूप', order: 2, isCorrect: false },
          { id: 'opt-nz-2-c', text: 'Multiload 375', text_hi: 'मल्टीलोड 375', order: 3, isCorrect: false },
          { id: 'opt-nz-2-d', text: 'Saheli', text_hi: 'सहेली', order: 4, isCorrect: true },
        ],
        explanation: 'Saheli is an oral non-steroidal contraceptive pill (centchroman), developed by CDRI Lucknow, taken once a week. The other options are IUDs.',
        explanation_hi: 'सहेली एक मौखिक गैर-स्टेरॉयड गर्भनिरोधक गोली है, जबकि अन्य विकल्प IUD (अंतःगर्भाशयी उपकरण) हैं।',
      },
      {
        id: 'q-neet-phys-1',
        section_id: 'sec-neet-phys-a',
        text: 'The magnetic energy stored in an inductor of inductance $4\\,\\mu\\text{H}$ carrying a current of $2\\text{ A}$ is:',
        text_hi: '$2\\text{ A}$ की धारा प्रवाहित होने वाले $4\\,\\mu\\text{H}$ प्रेरकत्व के प्रेरक में संचित चुंबकीय ऊर्जा क्या होगी?',
        question_type: 'mcq',
        difficulty: 0.3,
        bloom_level: 'apply',
        marks: 4,
        order: 5,
        options: [
          { id: 'opt-np-1-a', text: '$8\\,\\mu\\text{J}$', text_hi: '$8\\,\\mu\\text{J}$', order: 1, isCorrect: true },
          { id: 'opt-np-1-b', text: '$4\\,\\mu\\text{J}$', text_hi: '$4\\,\\mu\\text{J}$', order: 2, isCorrect: false },
          { id: 'opt-np-1-c', text: '$16\\,\\mu\\text{J}$', text_hi: '$16\\,\\mu\\text{J}$', order: 3, isCorrect: false },
          { id: 'opt-np-1-d', text: '$2\\,\\mu\\text{J}$', text_hi: '$2\\,\\mu\\text{J}$', order: 4, isCorrect: false },
        ],
        explanation: '$U = \\frac{1}{2} L I^2 = \\frac{1}{2} \\times (4 \\times 10^{-6}) \\times 2^2 = 8 \\times 10^{-6}\\text{ J} = 8\\,\\mu\\text{J}$.',
        explanation_hi: '$U = \\frac{1}{2} L I^2 = \\frac{1}{2} \\times 4\\,\\mu\\text{H} \\times 4 = 8\\,\\mu\\text{J}$।',
      },
      {
        id: 'q-neet-phys-2',
        section_id: 'sec-neet-phys-a',
        text: 'If $\\oint \\vec{B} \\cdot d\\vec{A} = 0$ over a closed surface, then:',
        text_hi: 'यदि किसी बंद पृष्ठ पर $\\oint \\vec{B} \\cdot d\\vec{A} = 0$ है, तो:',
        question_type: 'mcq',
        difficulty: 0.35,
        bloom_level: 'understand',
        marks: 4,
        order: 6,
        options: [
          { id: 'opt-np-2-a', text: 'Isolated magnetic poles (monopoles) do not exist', text_hi: 'विलगित चुंबकीय ध्रुवों (एकल ध्रुव) का अस्तित्व नहीं होता', order: 1, isCorrect: true },
          { id: 'opt-np-2-b', text: 'The magnetic field is everywhere zero inside the surface', text_hi: 'पृष्ठ के भीतर चुंबकीय क्षेत्र सर्वत्र शून्य है', order: 2, isCorrect: false },
          { id: 'opt-np-2-c', text: 'There is only a single north pole inside the surface', text_hi: 'पृष्ठ के भीतर केवल एक उत्तरी ध्रुव उपस्थित है', order: 3, isCorrect: false },
          { id: 'opt-np-2-d', text: 'Electric flux through the surface is zero', text_hi: 'पृष्ठ से गुजरने वाला विद्युत फ्लक्स शून्य है', order: 4, isCorrect: false },
        ],
        explanation: 'Gauss\'s law for magnetism states net magnetic flux through any closed surface is zero, which signifies that isolated magnetic monopoles do not exist.',
        explanation_hi: 'चुंबकत्व के लिए गॉस का नियम बताता है कि बंद पृष्ठ से गुजरने वाला कुल चुंबकीय फ्लक्स शून्य होता है, जिसका अर्थ है कि एकल चुंबकीय ध्रुवों का अस्तित्व नहीं होता।',
      },
      {
        id: 'q-neet-chem-1',
        section_id: 'sec-neet-chem-a',
        text: 'Which of the following compounds will undergo aldol condensation reaction?',
        text_hi: 'निम्नलिखित में से कौन-सा यौगिक एल्डोल संघनन अभिक्रिया देगा?',
        question_type: 'mcq',
        difficulty: 0.4,
        bloom_level: 'understand',
        marks: 4,
        order: 7,
        options: [
          { id: 'opt-nc-1-a', text: 'Acetaldehyde ($CH_3CHO$)', text_hi: 'एसिटैल्डिहाइड ($CH_3CHO$)', order: 1, isCorrect: true },
          { id: 'opt-nc-1-b', text: 'Formaldehyde ($HCHO$)', text_hi: 'फॉर्मैल्डिहाइड ($HCHO$)', order: 2, isCorrect: false },
          { id: 'opt-nc-1-c', text: 'Benzaldehyde ($C_6H_5CHO$)', text_hi: 'बेन्जैल्डिहाइड ($C_6H_5CHO$)', order: 3, isCorrect: false },
          { id: 'opt-nc-1-d', text: 'Trimethylacetaldehyde ($(CH_3)_3CCHO$)', text_hi: 'ट्राईमेथिलएसिटैल्डिहाइड ($(CH_3)_3CCHO$)', order: 4, isCorrect: false },
        ],
        explanation: 'Aldol condensation requires aldehydes/ketones having at least one $\\alpha$-hydrogen atom. Acetaldehyde ($CH_3CHO$) has 3 $\\alpha$-hydrogens, whereas $HCHO$, $C_6H_5CHO$ and $(CH_3)_3CCHO$ have no $\\alpha$-hydrogens.',
        explanation_hi: 'एल्डोल संघनन के लिए कम से कम एक $\\alpha$-हाइड्रोजन परमाणु की आवश्यकता होती है। $CH_3CHO$ में 3 $\\alpha$-हाइड्रोजन होते हैं।',
      },
      {
        id: 'q-neet-chem-2',
        section_id: 'sec-neet-chem-a',
        text: 'The oxidation state of chromium in $CrO_5$ (having butterfly structure) is:',
        text_hi: '$CrO_5$ (तितली संरचना वाले) में क्रोमियम की ऑक्सीकरण अवस्था क्या है?',
        question_type: 'mcq',
        difficulty: 0.45,
        bloom_level: 'apply',
        marks: 4,
        order: 8,
        options: [
          { id: 'opt-nc-2-a', text: '+6', text_hi: '+6', order: 1, isCorrect: true },
          { id: 'opt-nc-2-b', text: '+10', text_hi: '+10', order: 2, isCorrect: false },
          { id: 'opt-nc-2-c', text: '+4', text_hi: '+4', order: 3, isCorrect: false },
          { id: 'opt-nc-2-d', text: '+3', text_hi: '+3', order: 4, isCorrect: false },
        ],
        explanation: 'In $CrO_5$, there is one oxo oxygen ($O^{2-}$) and two peroxo bonds (four peroxo oxygens, each $-1$). So $x + (-2) + 4(-1) = 0 \\implies x = +6$.',
        explanation_hi: '$CrO_5$ में एक ऑक्सो ऑक्सीजन ($O^{2-}$) और दो परऑक्सो बंध (प्रत्येक परऑक्सो ऑक्सीजन $-1$) होते हैं। अतः $x - 2 - 4 = 0 \\implies x = +6$।',
      },
    ],
  },
  {
    id: 'pyq-gate-cs-2024-set1',
    title: 'GATE CS 2024 (Set 1) Official Paper',
    description: 'Official IISc Bangalore GATE CS examination. Features General Aptitude & Core CS with Multiple Choice (MCQ), Multiple Select (MSQ), and Numerical Answer Type (NAT). Virtual Calculator enabled.',
    examSlug: 'gate-cs',
    examName: 'GATE CS & IT (IISc / IIT)',
    examCode: 'GATE-CS-2024-S1',
    countryName: 'India',
    year: 2024,
    shift: 'Set 1 (03 Feb Afternoon)',
    benchmarkKey: 'gate-cs-2024-official',
    difficulty: 'hard',
    difficultyRating: 'TOUGH',
    timeLimitMinutes: 180,
    totalMarks: 100,
    passingScore: 28,
    negativeMarksPerQuestion: 0.33,
    questionCount: 6,
    isPYQ: true,
    isFeatured: true,
    attemptCount: 8900,
    createdAt: '2024-02-03T17:00:00Z',
    markingScheme: {
      examType: 'GATE_CS',
      benchmarkKey: 'gate-cs-2024-official',
      rules: {
        mcqPositive: 2,
        mcqNegative: -0.66,
        nvqPositive: 2,
        nvqNegative: 0,
      },
    },
    sections: [
      {
        id: 'sec-gate-ga',
        title: 'General Aptitude (GA)',
        description: 'Verbal, Quantitative, and Analytical Aptitude (15 Marks)',
        order: 1,
        maxQuestionsToAttempt: 10,
        sectionType: 'MANDATORY',
        question_count: 2,
      },
      {
        id: 'sec-gate-core',
        title: 'Computer Science Core',
        description: 'Algorithms, Data Structures, OS, DBMS, TOC, CN, COA (85 Marks)',
        order: 2,
        maxQuestionsToAttempt: 55,
        sectionType: 'MANDATORY',
        question_count: 4,
      },
    ],
    questions: [
      {
        id: 'q-gate-ga-1',
        section_id: 'sec-gate-ga',
        text: 'If $P$ is $40\\%$ more efficient than $Q$, and $Q$ can complete a piece of software task alone in $28\\text{ days}$, then the time taken by $P$ and $Q$ working together to complete the same task is:',
        question_type: 'mcq',
        difficulty: 0.45,
        bloom_level: 'apply',
        marks: 2,
        order: 1,
        options: [
          { id: 'opt-gga-1-a', text: '$11\\frac{2}{3}\\text{ days}$', order: 1, isCorrect: true },
          { id: 'opt-gga-1-b', text: '$12\\text{ days}$', order: 2, isCorrect: false },
          { id: 'opt-gga-1-c', text: '$14\\text{ days}$', order: 3, isCorrect: false },
          { id: 'opt-gga-1-d', text: '$10\\frac{1}{2}\\text{ days}$', order: 4, isCorrect: false },
        ],
        explanation: 'Efficiency of $Q = 1\\text{ unit/day} \\implies \\text{Total Work} = 28 \\times 1 = 28\\text{ units}$. Efficiency of $P = 1.4\\text{ units/day}$. Combined efficiency = $1 + 1.4 = 2.4\\text{ units/day}$. Time $= 28 / 2.4 = 280 / 24 = 35 / 3 = 11\\frac{2}{3}\\text{ days}$.',
      },
      {
        id: 'q-gate-ga-2',
        section_id: 'sec-gate-ga',
        text: 'Choose the grammatically correct sentence:',
        question_type: 'mcq',
        difficulty: 0.35,
        bloom_level: 'understand',
        marks: 1,
        order: 2,
        options: [
          { id: 'opt-gga-2-a', text: 'Neither the principal nor the teachers were present at the meeting.', order: 1, isCorrect: true },
          { id: 'opt-gga-2-b', text: 'Neither the principal nor the teachers was present at the meeting.', order: 2, isCorrect: false },
          { id: 'opt-gga-2-c', text: 'Neither the principal or the teachers were present at the meeting.', order: 3, isCorrect: false },
          { id: 'opt-gga-2-d', text: 'Neither the principal nor the teachers has been present at the meeting.', order: 4, isCorrect: false },
        ],
        explanation: 'In correlative conjunction \'neither...nor\', the verb agrees with the subject closest to it. Here \'teachers\' is plural, so plural verb \'were\' is correct.',
      },
      {
        id: 'q-gate-core-1',
        section_id: 'sec-gate-core',
        text: 'Which of the following statements is/are TRUE regarding language classes in the Chomsky Hierarchy? (Select ALL correct options - MSQ)',
        question_type: 'multiple_select',
        difficulty: 0.65,
        bloom_level: 'analyze',
        marks: 2,
        order: 3,
        options: [
          { id: 'opt-gtoc-1-a', text: 'Every regular language is context-free.', order: 1, isCorrect: true },
          { id: 'opt-gtoc-1-b', text: 'The intersection of two context-free languages is always context-free.', order: 2, isCorrect: false },
          { id: 'opt-gtoc-1-c', text: 'Regular languages are closed under complementation.', order: 3, isCorrect: true },
          { id: 'opt-gtoc-1-d', text: 'Context-free languages are closed under complementation.', order: 4, isCorrect: false },
        ],
        explanation: 'Regular languages are a proper subset of Context-Free Languages. Regular languages are closed under union, intersection, and complement. Context-Free Languages are NOT closed under intersection or complementation.',
      },
      {
        id: 'q-gate-core-2',
        section_id: 'sec-gate-core',
        text: 'Consider a 4-way set associative cache memory with $64\\text{ KB}$ total capacity and $64\\text{-byte}$ cache line size. The number of sets in the cache is _______. (Enter integer value - NAT)',
        question_type: 'numerical',
        difficulty: 0.6,
        bloom_level: 'apply',
        marks: 2,
        order: 4,
        options: [
          { id: 'opt-gca-2-a', text: '256', order: 1, isCorrect: true },
        ],
        explanation: 'Total Cache Capacity = $64\\text{ KB} = 64 \\times 1024 = 65,536\\text{ bytes}$. Line size = $64\\text{ bytes}$. Number of lines/blocks = $65,536 / 64 = 1024$. Number of sets = $\\text{Lines} / \\text{Associativity} = 1024 / 4 = 256$.',
      },
      {
        id: 'q-gate-core-3',
        section_id: 'sec-gate-core',
        text: 'What is the worst-case time complexity of finding the median of an unsorted array of $n$ elements using the deterministic Median-of-Medians selection algorithm?',
        question_type: 'mcq',
        difficulty: 0.5,
        bloom_level: 'understand',
        marks: 1,
        order: 5,
        options: [
          { id: 'opt-galg-3-a', text: '$O(n)$', order: 1, isCorrect: true },
          { id: 'opt-galg-3-b', text: '$O(n \\log n)$', order: 2, isCorrect: false },
          { id: 'opt-galg-3-c', text: '$O(n^2)$', order: 3, isCorrect: false },
          { id: 'opt-galg-3-d', text: '$O(\\log n)$', order: 4, isCorrect: false },
        ],
        explanation: 'The BFPRT (Median-of-Medians) algorithm guarantees $O(n)$ linear time in the worst case by partitioning groups of 5 and recursively choosing a balanced pivot.',
      },
      {
        id: 'q-gate-core-4',
        section_id: 'sec-gate-core',
        text: 'In relational database systems, which of the following schedules is guaranteed to be conflict serializable? (Select ALL correct options - MSQ)',
        question_type: 'multiple_select',
        difficulty: 0.7,
        bloom_level: 'evaluate',
        marks: 2,
        order: 6,
        options: [
          { id: 'opt-gdb-4-a', text: 'Any schedule whose precedence graph contains no directed cycles', order: 1, isCorrect: true },
          { id: 'opt-gdb-4-b', text: 'Any schedule produced under strict 2-Phase Locking (Strict 2PL)', order: 2, isCorrect: true },
          { id: 'opt-gdb-4-c', text: 'Any view-serializable schedule', order: 3, isCorrect: false },
          { id: 'opt-gdb-4-d', text: 'Any schedule with no dirty read anomaly', order: 4, isCorrect: false },
        ],
        explanation: 'A schedule is conflict serializable iff its serialization (precedence) graph is acyclic. Strict 2PL guarantees both conflict serializability and recoverability/freedom from cascading aborts. View serializability is a superset of conflict serializability (not all view serializable schedules are conflict serializable).',
      },
    ],
  },
]

export interface PercentilePredictionResult {
  percentile: number
  estimatedAir: number
  clearedCutoff: boolean
  difficultyRating: string
  summary: string
  targetCollegeTiers: string[]
}

/**
 * High-precision shift percentile and AIR interpolation based on historical benchmark anchors.
 */
export function calculateShiftPercentileLocally(
  rawMarks: number,
  benchmarkKey: string
): PercentilePredictionResult {
  const bm = OFFICIAL_HISTORICAL_BENCHMARKS[benchmarkKey]
  if (!bm) {
    const fallbackPct = Math.min(99.9, Math.max(1, (rawMarks / 300) * 100))
    return {
      percentile: Math.round(fallbackPct * 100) / 100,
      estimatedAir: Math.round((100 - fallbackPct) * 14000),
      clearedCutoff: rawMarks >= 95,
      difficultyRating: 'MODERATE',
      summary: 'Estimated via standard percentile interpolation.',
      targetCollegeTiers: ['Tier-2 NITs / Reputed State Colleges'],
    }
  }

  const { anchors, categoryCutoffs } = bm
  const sorted = [...anchors].sort((a, b) => a.rawMarks - b.rawMarks)

  let estimatedPct = 50.0
  let estimatedAir = 150000

  if (rawMarks <= sorted[0].rawMarks) {
    const frac = Math.max(0.01, rawMarks / Math.max(1, sorted[0].rawMarks))
    estimatedPct = Math.round(sorted[0].percentile * frac * 100) / 100
    estimatedAir = Math.round(sorted[0].estimatedAir * (2 - frac))
  } else if (rawMarks >= sorted[sorted.length - 1].rawMarks) {
    estimatedPct = sorted[sorted.length - 1].percentile
    estimatedAir = sorted[sorted.length - 1].estimatedAir
  } else {
    for (let i = 0; i < sorted.length - 1; i++) {
      const lower = sorted[i]
      const upper = sorted[i + 1]
      if (rawMarks >= lower.rawMarks && rawMarks <= upper.rawMarks) {
        const ratio = (rawMarks - lower.rawMarks) / (upper.rawMarks - lower.rawMarks)
        estimatedPct = lower.percentile + ratio * (upper.percentile - lower.percentile)
        estimatedAir = Math.round(lower.estimatedAir - ratio * (lower.estimatedAir - upper.estimatedAir))
        break
      }
    }
  }

  const targetCollegeTiers: string[] = []
  if (estimatedPct >= 99.5) {
    targetCollegeTiers.push('Top Tier-1 Institutes (Top 3 NITs / IITs CSE / Top AIIMS)')
    targetCollegeTiers.push('Premium PSU Direct Recruitment / Merit Scholarships')
  } else if (estimatedPct >= 98.0) {
    targetCollegeTiers.push('Top 10 NITs / IIITs (CSE / ECE) / Reputed Government Medical Colleges')
  } else if (estimatedPct >= 95.0) {
    targetCollegeTiers.push('Established NITs Core Branches / Top State Government Institutes')
  } else if (estimatedPct >= 90.0) {
    targetCollegeTiers.push('Reputed State Universities / Premier Private Universities')
  } else {
    targetCollegeTiers.push('Foundation Revision & Focused PYQ Error Drill recommended')
  }

  return {
    percentile: Math.round(estimatedPct * 100) / 100,
    estimatedAir,
    clearedCutoff: rawMarks >= categoryCutoffs.general,
    difficultyRating: bm.difficultyRating,
    summary: bm.shiftDifficultySummary,
    targetCollegeTiers,
  }
}
