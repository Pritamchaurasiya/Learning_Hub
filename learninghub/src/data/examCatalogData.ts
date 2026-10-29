/**
 * Curated High-Fidelity Exam & Subject Catalog Data
 *
 * Provides offline-first resilient catalog data for LearningHub.
 * Guarantees zero-latency, zero-failure user experience even when
 * offline, in flaky network conditions, or before backend warmup.
 */

import type {
  ActiveCountryInfo,
  ActiveExamInfo,
  ActiveSubjectInfo,
} from '../types/learningContext'

export interface CatalogExam extends ActiveExamInfo {
  badge?: string
  format?: string
  difficultyBadge?: 'Hard' | 'Moderate' | 'Comprehensive' | 'Adaptive'
  subjects: ActiveSubjectInfo[]
}

export const EXAM_CATEGORIES = [
  'All Categories',
  'Engineering & Tech',
  'Medical & Healthcare',
  'Government & Civil Services',
  'Software & Computer Science',
  'Management & MBA',
  'Global & College Entrance',
  'School Boards (K-12)',
] as const

export type ExamCategory = (typeof EXAM_CATEGORIES)[number]

export const DEFAULT_COUNTRIES: ActiveCountryInfo[] = [
  { id: 'all', name: 'All Countries', code: 'ALL', flagEmoji: '🌍' },
  { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
  { id: 'country-global', name: 'Global / Tech', code: 'GLOBAL', flagEmoji: '🌐' },
  { id: 'country-us', name: 'United States', code: 'US', flagEmoji: '🇺🇸' },
  { id: 'country-gb', name: 'United Kingdom', code: 'GB', flagEmoji: '🇬🇧' },
  { id: 'country-ca', name: 'Canada', code: 'CA', flagEmoji: '🇨🇦' },
  { id: 'country-au', name: 'Australia', code: 'AU', flagEmoji: '🇦🇺' },
  { id: 'country-eu', name: 'European Union', code: 'EU', flagEmoji: '🇪🇺' },
]

export const DEFAULT_EXAMS: CatalogExam[] = [
  // ================= INDIA: ENGINEERING & MEDICAL =================
  {
    id: 'exam-jee-main',
    name: 'JEE Main',
    slug: 'jee-main',
    description:
      'National Testing Agency (NTA) Computer-Based Test for Engineering Admissions (NITs, IIITs, CFTIs).',
    countryId: 'country-in',
    category: 'Engineering & Tech',
    badge: '🔥 Top Engineering',
    format: 'CBT (MCQ + NV)',
    difficultyBadge: 'Hard',
    country: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
    subjects: [
      {
        id: 'sub-jee-phy',
        name: 'Physics',
        slug: 'jee-main-physics',
        topics: [
          { id: 'top-jp-1', name: 'Kinematics & Laws of Motion', slug: 'kinematics' },
          { id: 'top-jp-2', name: 'Work, Energy & Power', slug: 'work-energy-power' },
          { id: 'top-jp-3', name: 'Rotational Dynamics & Gravitation', slug: 'rotational-dynamics' },
          { id: 'top-jp-4', name: 'Electrostatics & Current Electricity', slug: 'electrostatics' },
          { id: 'top-jp-5', name: 'Optics (Ray & Wave)', slug: 'optics' },
          { id: 'top-jp-6', name: 'Modern Physics & Semiconductors', slug: 'modern-physics' },
        ],
      },
      {
        id: 'sub-jee-chem',
        name: 'Chemistry',
        slug: 'jee-main-chemistry',
        topics: [
          { id: 'top-jc-1', name: 'Chemical Bonding & Molecular Structure', slug: 'chemical-bonding' },
          { id: 'top-jc-2', name: 'Chemical & Ionic Equilibrium', slug: 'equilibrium' },
          { id: 'top-jc-3', name: 'Thermodynamics & Solutions', slug: 'thermodynamics' },
          { id: 'top-jc-4', name: 'General Organic Chemistry (GOC)', slug: 'goc' },
          { id: 'top-jc-5', name: 'Coordination Compounds & p-Block', slug: 'coordination-compounds' },
        ],
      },
      {
        id: 'sub-jee-math',
        name: 'Mathematics',
        slug: 'jee-main-mathematics',
        topics: [
          { id: 'top-jm-1', name: 'Calculus (Limits, Continuity, Derivatives)', slug: 'calculus-derivatives' },
          { id: 'top-jm-2', name: 'Integral Calculus & Differential Equations', slug: 'integral-calculus' },
          { id: 'top-jm-3', name: 'Coordinate Geometry (Conic Sections)', slug: 'conic-sections' },
          { id: 'top-jm-4', name: 'Vectors & 3D Geometry', slug: 'vectors-3d' },
          { id: 'top-jm-5', name: 'Matrices, Determinants & Probability', slug: 'matrices' },
        ],
      },
    ],
  },
  {
    id: 'exam-jee-adv',
    name: 'JEE Advanced',
    slug: 'jee-advanced',
    description:
      'Premier Entrance Examination conducted by IITs for prestigious Bachelor of Technology programmes.',
    countryId: 'country-in',
    category: 'Engineering & Tech',
    badge: '⚡ Ultra Competitive',
    format: 'CBT (Multi-Select, Numeric)',
    difficultyBadge: 'Hard',
    country: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
    subjects: [
      {
        id: 'sub-adv-phy',
        name: 'Advanced Physics',
        slug: 'jee-adv-physics',
        topics: [
          { id: 'top-ap-1', name: 'Advanced Mechanics & Angular Momentum', slug: 'adv-mechanics' },
          { id: 'top-ap-2', name: 'Electrodynamics & Maxwell Laws', slug: 'electrodynamics' },
          { id: 'top-ap-3', name: 'Wave Optics & Interference', slug: 'wave-optics' },
          { id: 'top-ap-4', name: 'Nuclear Physics & Quantum Phenomena', slug: 'nuclear-physics' },
        ],
      },
      {
        id: 'sub-adv-chem',
        name: 'Advanced Chemistry',
        slug: 'jee-adv-chemistry',
        topics: [
          { id: 'top-ac-1', name: 'Organic Reaction Mechanisms & Stereochemistry', slug: 'organic-mechanisms' },
          { id: 'top-ac-2', name: 'Physical Chemistry & Electrochemistry', slug: 'electrochemistry' },
          { id: 'top-ac-3', name: 'Inorganic Qualitative Analysis', slug: 'qualitative-analysis' },
        ],
      },
      {
        id: 'sub-adv-math',
        name: 'Advanced Mathematics',
        slug: 'jee-adv-mathematics',
        topics: [
          { id: 'top-am-1', name: 'Advanced Real Analysis & Functions', slug: 'real-analysis' },
          { id: 'top-am-2', name: 'Complex Numbers & Polynomials', slug: 'complex-numbers' },
          { id: 'top-am-3', name: 'Definite Integrals & Area under Curves', slug: 'definite-integrals' },
        ],
      },
    ],
  },
  {
    id: 'exam-neet-ug',
    name: 'NEET-UG',
    slug: 'neet-ug',
    description:
      'National Eligibility cum Entrance Test for MBBS, BDS, and Premier Medical & Dental Admissions.',
    countryId: 'country-in',
    category: 'Medical & Healthcare',
    badge: '🩺 Top Medical',
    format: 'Pen-Paper OMR / 720 Marks',
    difficultyBadge: 'Hard',
    country: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
    subjects: [
      {
        id: 'sub-neet-bio',
        name: 'Biology (Botany & Zoology)',
        slug: 'neet-biology',
        topics: [
          { id: 'top-nb-1', name: 'Genetics & Molecular Basis of Inheritance', slug: 'genetics' },
          { id: 'top-nb-2', name: 'Human Physiology & Organ Systems', slug: 'human-physiology' },
          { id: 'top-nb-3', name: 'Plant Physiology & Photosynthesis', slug: 'plant-physiology' },
          { id: 'top-nb-4', name: 'Cell Biology, Cell Cycle & Biomolecules', slug: 'cell-biology' },
          { id: 'top-nb-5', name: 'Ecology, Environment & Biodiversity', slug: 'ecology' },
        ],
      },
      {
        id: 'sub-neet-phy',
        name: 'Physics for NEET',
        slug: 'neet-physics',
        topics: [
          { id: 'top-np-1', name: 'Kinematics & Laws of Motion', slug: 'kinematics' },
          { id: 'top-np-2', name: 'Current Electricity & Magnetism', slug: 'current-electricity' },
          { id: 'top-np-3', name: 'Ray & Wave Optics', slug: 'optics' },
          { id: 'top-np-4', name: 'Modern Physics & Dual Nature', slug: 'dual-nature' },
        ],
      },
      {
        id: 'sub-neet-chem',
        name: 'Chemistry for NEET',
        slug: 'neet-chemistry',
        topics: [
          { id: 'top-nc-1', name: 'Organic Chemistry & Biomolecules', slug: 'organic-biomolecules' },
          { id: 'top-nc-2', name: 'Chemical Kinetics, Equilibrium & Solutions', slug: 'kinetics-solutions' },
          { id: 'top-nc-3', name: 'Periodic Table & Coordination Compounds', slug: 'coordination-compounds' },
        ],
      },
    ],
  },
  {
    id: 'exam-bitsat',
    name: 'BITSAT',
    slug: 'bitsat',
    description:
      'Birla Institute of Technology and Science Admission Test for BITS Pilani, Goa & Hyderabad.',
    countryId: 'country-in',
    category: 'Engineering & Tech',
    badge: '⭐ Premier Tech',
    format: 'CBT Speed & Accuracy',
    difficultyBadge: 'Moderate',
    country: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
    subjects: [
      {
        id: 'sub-bits-phy',
        name: 'Physics',
        slug: 'bitsat-physics',
        topics: [
          { id: 'top-bp-1', name: 'Mechanics & Oscillations', slug: 'mechanics' },
          { id: 'top-bp-2', name: 'Electromagnetism & Optics', slug: 'electromagnetism' },
        ],
      },
      {
        id: 'sub-bits-chem',
        name: 'Chemistry',
        slug: 'bitsat-chemistry',
        topics: [
          { id: 'top-bc-1', name: 'Physical & Inorganic Chemistry', slug: 'physical-inorganic' },
          { id: 'top-bc-2', name: 'Organic Chemistry', slug: 'organic' },
        ],
      },
      {
        id: 'sub-bits-math',
        name: 'Mathematics',
        slug: 'bitsat-mathematics',
        topics: [
          { id: 'top-bm-1', name: 'Calculus, Algebra & Trigonometry', slug: 'calculus-algebra' },
          { id: 'top-bm-2', name: 'Coordinate Geometry & Vectors', slug: 'geometry-vectors' },
        ],
      },
      {
        id: 'sub-bits-eng',
        name: 'English & Logical Reasoning',
        slug: 'bitsat-english-lr',
        topics: [
          { id: 'top-be-1', name: 'English Grammar, Vocab & Reading', slug: 'english-grammar' },
          { id: 'top-be-2', name: 'Logical & Non-Verbal Reasoning', slug: 'logical-reasoning' },
        ],
      },
    ],
  },

  // ================= INDIA: GOVT, CIVIL SERVICES & BANKING =================
  {
    id: 'exam-ssc-cgl',
    name: 'SSC CGL',
    slug: 'ssc-cgl',
    description:
      'Staff Selection Commission Combined Graduate Level examination for Group B and C Gazetted/Non-Gazetted Posts.',
    countryId: 'country-in',
    category: 'Government & Civil Services',
    badge: '🏛️ Popular Govt Exam',
    format: 'Tier 1 & Tier 2 CBT',
    difficultyBadge: 'Moderate',
    country: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
    subjects: [
      {
        id: 'sub-ssc-quant',
        name: 'Quantitative Aptitude',
        slug: 'ssc-quantitative-aptitude',
        topics: [
          { id: 'top-sq-1', name: 'Arithmetic (Percentage, Profit & Loss, SI/CI)', slug: 'arithmetic' },
          { id: 'top-sq-2', name: 'Time, Speed, Distance & Work', slug: 'time-work' },
          { id: 'top-sq-3', name: 'Advance Maths (Algebra, Trigonometry, Geometry)', slug: 'advance-maths' },
          { id: 'top-sq-4', name: 'Mensuration 2D & 3D and Data Interpretation', slug: 'mensuration-di' },
        ],
      },
      {
        id: 'sub-ssc-reasoning',
        name: 'General Intelligence & Reasoning',
        slug: 'ssc-reasoning',
        topics: [
          { id: 'top-sr-1', name: 'Analogies, Classification & Series', slug: 'analogies-series' },
          { id: 'top-sr-2', name: 'Blood Relations & Direction Sense', slug: 'relations-directions' },
          { id: 'top-sr-3', name: 'Syllogism, Venn Diagrams & Puzzles', slug: 'syllogism-puzzles' },
          { id: 'top-sr-4', name: 'Non-Verbal & Mirror/Water Images', slug: 'non-verbal' },
        ],
      },
      {
        id: 'sub-ssc-english',
        name: 'English Comprehension',
        slug: 'ssc-english',
        topics: [
          { id: 'top-se-1', name: 'Reading Comprehension & Cloze Test', slug: 'rc-cloze' },
          { id: 'top-se-2', name: 'Grammar (Spotting Errors, Sentence Improvement)', slug: 'grammar-errors' },
          { id: 'top-se-3', name: 'Vocabulary, Idioms & One-Word Substitution', slug: 'vocabulary-idioms' },
        ],
      },
      {
        id: 'sub-ssc-ga',
        name: 'General Awareness',
        slug: 'ssc-general-awareness',
        topics: [
          { id: 'top-sa-1', name: 'Indian Polity & Constitution', slug: 'polity-constitution' },
          { id: 'top-sa-2', name: 'Modern & Ancient Indian History', slug: 'history' },
          { id: 'top-sa-3', name: 'Geography & Economy Basics', slug: 'geography-economy' },
          { id: 'top-sa-4', name: 'General Science & Current Affairs', slug: 'science-current-affairs' },
        ],
      },
    ],
  },
  {
    id: 'exam-upsc-cse',
    name: 'UPSC Civil Services (IAS / IPS)',
    slug: 'upsc-civil-services',
    description:
      'Union Public Service Commission Civil Services Examination for IAS, IPS, IFS, and Central Group A Services.',
    countryId: 'country-in',
    category: 'Government & Civil Services',
    badge: '🏆 Premier Civil Service',
    format: 'Prelims (MCQ) + Mains + Interview',
    difficultyBadge: 'Hard',
    country: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
    subjects: [
      {
        id: 'sub-upsc-gs1',
        name: 'General Studies Paper 1 (Prelims)',
        slug: 'upsc-gs-1',
        topics: [
          { id: 'top-ug-1', name: 'Indian Polity, Governance & Judiciary', slug: 'polity-governance' },
          { id: 'top-ug-2', name: 'Indian History & Art and Culture', slug: 'history-culture' },
          { id: 'top-ug-3', name: 'Physical, Social & Economic Geography', slug: 'geography' },
          { id: 'top-ug-4', name: 'Macroeconomics, Sustainable Development & Budget', slug: 'economics' },
          { id: 'top-ug-5', name: 'Environment, Ecology & Climate Change', slug: 'environment' },
        ],
      },
      {
        id: 'sub-upsc-csat',
        name: 'CSAT (General Studies Paper 2)',
        slug: 'upsc-csat',
        topics: [
          { id: 'top-uc-1', name: 'Reading Comprehension & Critical Reasoning', slug: 'rc-critical' },
          { id: 'top-uc-2', name: 'Basic Numeracy & Data Interpretation', slug: 'numeracy' },
          { id: 'top-uc-3', name: 'Logical Reasoning & Analytical Ability', slug: 'logical-reasoning' },
        ],
      },
    ],
  },
  {
    id: 'exam-gate-cse',
    name: 'GATE Computer Science',
    slug: 'gate-cse',
    description:
      'Graduate Aptitude Test in Engineering for Master’s admissions (IITs/IISc) and PSU Recruitments.',
    countryId: 'country-in',
    category: 'Engineering & Tech',
    badge: '💻 M.Tech & PSU',
    format: 'CBT (MCQ, MSQ, NAT)',
    difficultyBadge: 'Hard',
    country: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
    subjects: [
      {
        id: 'sub-gate-dsa',
        name: 'Data Structures & Algorithms',
        slug: 'gate-dsa',
        topics: [
          { id: 'top-gd-1', name: 'Asymptotic Analysis & Recurrences', slug: 'asymptotic-analysis' },
          { id: 'top-gd-2', name: 'Arrays, Stacks, Queues & Linked Lists', slug: 'linear-ds' },
          { id: 'top-gd-3', name: 'Trees, Binary Search Trees & Heaps', slug: 'trees-heaps' },
          { id: 'top-gd-4', name: 'Graph Traversals, MST & Shortest Paths', slug: 'graph-algorithms' },
          { id: 'top-gd-5', name: 'Dynamic Programming & Greedy Algorithms', slug: 'dp-greedy' },
        ],
      },
      {
        id: 'sub-gate-os',
        name: 'Operating Systems',
        slug: 'gate-os',
        topics: [
          { id: 'top-go-1', name: 'Processes, Threads & CPU Scheduling', slug: 'processes-scheduling' },
          { id: 'top-go-2', name: 'Process Synchronization & Semaphores', slug: 'synchronization' },
          { id: 'top-go-3', name: 'Deadlock Handling & Bankers Algorithm', slug: 'deadlocks' },
          { id: 'top-go-4', name: 'Virtual Memory, Paging & Page Replacement', slug: 'virtual-memory' },
          { id: 'top-go-5', name: 'File Systems & Disk Scheduling', slug: 'file-systems' },
        ],
      },
      {
        id: 'sub-gate-dbms',
        name: 'Database Management Systems',
        slug: 'gate-dbms',
        topics: [
          { id: 'top-gdb-1', name: 'ER Diagrams & Relational Model', slug: 'relational-model' },
          { id: 'top-gdb-2', name: 'SQL & Relational Algebra Queries', slug: 'sql-algebra' },
          { id: 'top-gdb-3', name: 'Normalization (1NF, 2NF, 3NF, BCNF)', slug: 'normalization' },
          { id: 'top-gdb-4', name: 'Transactions, ACID & Concurrency Control', slug: 'transactions' },
          { id: 'top-gdb-5', name: 'Indexing & B/B+ Trees', slug: 'indexing-trees' },
        ],
      },
      {
        id: 'sub-gate-toc',
        name: 'Theory of Computation & Compilers',
        slug: 'gate-toc-compilers',
        topics: [
          { id: 'top-gt-1', name: 'Regular Languages & Finite Automata', slug: 'automata' },
          { id: 'top-gt-2', name: 'Context-Free Grammars & Pushdown Automata', slug: 'cfg-pda' },
          { id: 'top-gt-3', name: 'Turing Machines & Decidability', slug: 'turing-decidability' },
          { id: 'top-gt-4', name: 'Lexical Analysis & LL/LR Parsing', slug: 'parsing' },
        ],
      },
      {
        id: 'sub-gate-cn',
        name: 'Computer Networks',
        slug: 'gate-computer-networks',
        topics: [
          { id: 'top-gn-1', name: 'OSI & TCP/IP Layering Concepts', slug: 'layering' },
          { id: 'top-gn-2', name: 'Data Link Layer (Flow Control, Error Detection)', slug: 'datalink' },
          { id: 'top-gn-3', name: 'Routing Algorithms (OSPF, BGP, Distance Vector)', slug: 'routing' },
          { id: 'top-gn-4', name: 'TCP/UDP, Congestion Control & Sockets', slug: 'transport' },
        ],
      },
      {
        id: 'sub-gate-math',
        name: 'Engineering Mathematics',
        slug: 'gate-engineering-mathematics',
        topics: [
          { id: 'top-gm-1', name: 'Discrete Math & Propositional Logic', slug: 'discrete-math' },
          { id: 'top-gm-2', name: 'Linear Algebra (Matrices, Eigenvalues)', slug: 'linear-algebra' },
          { id: 'top-gm-3', name: 'Probability Distributions & Statistics', slug: 'probability' },
        ],
      },
    ],
  },
  {
    id: 'exam-cat-mba',
    name: 'CAT (IIMs / MBA Entrance)',
    slug: 'cat-mba',
    description:
      'Common Admission Test for elite Indian Institutes of Management (IIMs) and top business schools.',
    countryId: 'country-in',
    category: 'Management & MBA',
    badge: '💼 Top MBA Exam',
    format: 'CBT / 3 Sections',
    difficultyBadge: 'Hard',
    country: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
    subjects: [
      {
        id: 'sub-cat-quant',
        name: 'Quantitative Aptitude (QA)',
        slug: 'cat-qa',
        topics: [
          { id: 'top-cq-1', name: 'Arithmetic (Averages, Ratios, Time-Work)', slug: 'cat-arithmetic' },
          { id: 'top-cq-2', name: 'Algebra & Higher Degree Polynomials', slug: 'cat-algebra' },
          { id: 'top-cq-3', name: 'Geometry, Coordinate & Mensuration', slug: 'cat-geometry' },
          { id: 'top-cq-4', name: 'Number Systems & Modern Math (P&C, Probability)', slug: 'cat-modern-math' },
        ],
      },
      {
        id: 'sub-cat-dilr',
        name: 'Data Interpretation & Logical Reasoning (DILR)',
        slug: 'cat-dilr',
        topics: [
          { id: 'top-cd-1', name: 'Complex Caselets, Charts & Graphs', slug: 'caselets' },
          { id: 'top-cd-2', name: 'Seating Arrangements & Grid Logic', slug: 'arrangements' },
          { id: 'top-cd-3', name: 'Binary Logic, Tournaments & Venn Sets', slug: 'binary-logic' },
        ],
      },
      {
        id: 'sub-cat-varc',
        name: 'Verbal Ability & Reading Comprehension (VARC)',
        slug: 'cat-varc',
        topics: [
          { id: 'top-cv-1', name: 'Long RC Passages (Philosophy, Science, Economics)', slug: 'rc-passages' },
          { id: 'top-cv-2', name: 'Parajumbles, Summary & Odd-One-Out', slug: 'parajumbles' },
        ],
      },
    ],
  },
  {
    id: 'exam-cbse-12',
    name: 'CBSE Class 12 Boards',
    slug: 'cbse-class-12',
    description:
      'Central Board of Secondary Education Class 12 Examination for Science stream with NCERT curriculum.',
    countryId: 'country-in',
    category: 'School Boards (K-12)',
    badge: '📚 School Board',
    format: 'Descriptive & Objective',
    difficultyBadge: 'Moderate',
    country: { id: 'country-in', name: 'India', code: 'IN', flagEmoji: '🇮🇳' },
    subjects: [
      {
        id: 'sub-cbse-phy',
        name: 'Physics Class 12',
        slug: 'cbse-12-physics',
        topics: [
          { id: 'top-cp-1', name: 'Electrostatics & Current Electricity', slug: 'electrostatics' },
          { id: 'top-cp-2', name: 'Electromagnetic Induction & AC', slug: 'emi-ac' },
          { id: 'top-cp-3', name: 'Optics & Wave Theory', slug: 'optics' },
          { id: 'top-cp-4', name: 'Electronic Devices & Semiconductors', slug: 'semiconductors' },
        ],
      },
      {
        id: 'sub-cbse-chem',
        name: 'Chemistry Class 12',
        slug: 'cbse-12-chemistry',
        topics: [
          { id: 'top-cc-1', name: 'Solutions & Electrochemistry', slug: 'solutions' },
          { id: 'top-cc-2', name: 'Chemical Kinetics & Surface Chemistry', slug: 'kinetics' },
          { id: 'top-cc-3', name: 'Haloalkanes, Alcohols & Aldehydes', slug: 'organic' },
        ],
      },
      {
        id: 'sub-cbse-math',
        name: 'Mathematics Class 12',
        slug: 'cbse-12-mathematics',
        topics: [
          { id: 'top-cm-1', name: 'Relations, Functions & Inverse Trig', slug: 'functions' },
          { id: 'top-cm-2', name: 'Calculus (Differentiation & Integration)', slug: 'calculus' },
          { id: 'top-cm-3', name: 'Vectors & 3D Geometry', slug: 'vectors-3d' },
        ],
      },
    ],
  },

  // ================= GLOBAL: SOFTWARE & TECH CAREERS =================
  {
    id: 'exam-dsa-swe',
    name: 'Software Engineering & FAANG DSA',
    slug: 'dsa-software-engineering',
    description:
      'Data Structures, Algorithms, Scalable System Design & Core CS for Google, Meta, Amazon & Unicorn coding interviews.',
    countryId: 'country-global',
    category: 'Software & Computer Science',
    badge: '🚀 FAANG / MAANG Track',
    format: 'Coding Sandbox & System Design',
    difficultyBadge: 'Hard',
    country: { id: 'country-global', name: 'Global / Tech', code: 'GLOBAL', flagEmoji: '🌐' },
    subjects: [
      {
        id: 'sub-dsa-core',
        name: 'Data Structures & Algorithms',
        slug: 'dsa-core',
        topics: [
          { id: 'top-dc-1', name: 'Arrays, Two Pointers & Sliding Window', slug: 'arrays-sliding-window' },
          { id: 'top-dc-2', name: 'Binary Trees, BSTs & Trie Trees', slug: 'trees-bst-trie' },
          { id: 'top-dc-3', name: 'Graph Algorithms (BFS, DFS, Dijkstra, Topo Sort)', slug: 'graphs-dijkstra' },
          { id: 'top-dc-4', name: 'Dynamic Programming (1D, 2D, Knapsack, Intervals)', slug: 'dp-algorithms' },
          { id: 'top-dc-5', name: 'Heaps, Priority Queues & Monotonic Stacks', slug: 'heaps-stacks' },
        ],
      },
      {
        id: 'sub-sys-design',
        name: 'System Design & High Scalability',
        slug: 'system-design',
        topics: [
          { id: 'top-sd-1', name: 'Horizontal Scaling, Load Balancing & CDN', slug: 'scaling-cdn' },
          { id: 'top-sd-2', name: 'Database Sharding, Replication & CAP Theorem', slug: 'database-sharding' },
          { id: 'top-sd-3', name: 'Caching (Redis) & Distributed Queues (Kafka)', slug: 'caching-kafka' },
          { id: 'top-sd-4', name: 'Microservices, API Gateways & Rate Limiting', slug: 'microservices-gateways' },
        ],
      },
      {
        id: 'sub-cs-fund',
        name: 'Core Computer Science Fundamentals',
        slug: 'core-cs-fundamentals',
        topics: [
          { id: 'top-cf-1', name: 'Operating Systems (Processes, Threads, Concurrency)', slug: 'os-concurrency' },
          { id: 'top-cf-2', name: 'Database Internals (Indexes, ACID, B-Trees)', slug: 'db-internals' },
          { id: 'top-cf-3', name: 'Computer Networks (HTTP/3, TCP/IP, WebSockets)', slug: 'network-protocols' },
        ],
      },
      {
        id: 'sub-lld-design',
        name: 'Low-Level Object-Oriented Design',
        slug: 'lld-ood',
        topics: [
          { id: 'top-ld-1', name: 'SOLID Principles & Design Patterns', slug: 'solid-patterns' },
          { id: 'top-ld-2', name: 'Clean Architecture & Domain Modeling', slug: 'clean-architecture' },
          { id: 'top-ld-3', name: 'Real-world System Modeling (Parking Lot, Ride Share)', slug: 'system-modeling' },
        ],
      },
    ],
  },
  {
    id: 'exam-fullstack-dev',
    name: 'Full-Stack Web Development',
    slug: 'fullstack-web-dev',
    description:
      'Modern Frontend React/TypeScript, Robust Node.js Backends, REST/GraphQL APIs, Databases and DevOps.',
    countryId: 'country-global',
    category: 'Software & Computer Science',
    badge: '💻 Modern Tech Stack',
    format: 'Project & Code Simulation',
    difficultyBadge: 'Moderate',
    country: { id: 'country-global', name: 'Global / Tech', code: 'GLOBAL', flagEmoji: '🌐' },
    subjects: [
      {
        id: 'sub-fs-frontend',
        name: 'Modern React & TypeScript',
        slug: 'react-typescript',
        topics: [
          { id: 'top-rt-1', name: 'React Hooks, Context & State Management', slug: 'react-state' },
          { id: 'top-rt-2', name: 'TypeScript Generics, Utility Types & Type Guards', slug: 'ts-generics' },
          { id: 'top-rt-3', name: 'Performance Optimization & Web Vitals', slug: 'web-performance' },
        ],
      },
      {
        id: 'sub-fs-backend',
        name: 'Backend Architecture & Databases',
        slug: 'backend-databases',
        topics: [
          { id: 'top-bd-1', name: 'Node.js, Express & RESTful API Best Practices', slug: 'rest-apis' },
          { id: 'top-bd-2', name: 'PostgreSQL, Prisma ORM & Migrations', slug: 'postgres-prisma' },
          { id: 'top-bd-3', name: 'Auth, JWT, Session Security & CSRF Defense', slug: 'auth-security' },
        ],
      },
      {
        id: 'sub-fs-cloud',
        name: 'Cloud, CI/CD & Containers',
        slug: 'cloud-cicd',
        topics: [
          { id: 'top-cc-1', name: 'Docker Containerization & Compose', slug: 'docker' },
          { id: 'top-cc-2', name: 'GitHub Actions & Automated Deployments', slug: 'github-actions' },
        ],
      },
    ],
  },
  {
    id: 'exam-ai-ml-eng',
    name: 'Machine Learning & AI Engineering',
    slug: 'machine-learning-ai',
    description:
      'Foundations of Machine Learning, Deep Neural Networks, Large Language Models (LLMs), and Production AI.',
    countryId: 'country-global',
    category: 'Software & Computer Science',
    badge: '🤖 Cutting-Edge AI',
    format: 'ML Lab & Python Tests',
    difficultyBadge: 'Hard',
    country: { id: 'country-global', name: 'Global / Tech', code: 'GLOBAL', flagEmoji: '🌐' },
    subjects: [
      {
        id: 'sub-ml-foundations',
        name: 'Machine Learning Foundations',
        slug: 'ml-foundations',
        topics: [
          { id: 'top-mf-1', name: 'Supervised Learning (Regression & Classification)', slug: 'supervised-learning' },
          { id: 'top-mf-2', name: 'Feature Engineering, Regularization & Metrics', slug: 'feature-engineering' },
          { id: 'top-mf-3', name: 'Unsupervised Learning & Dimensionality Reduction', slug: 'unsupervised' },
        ],
      },
      {
        id: 'sub-dl-llm',
        name: 'Deep Learning & LLM Systems',
        slug: 'deep-learning-llms',
        topics: [
          { id: 'top-dl-1', name: 'PyTorch, Neural Networks & Backpropagation', slug: 'pytorch-nn' },
          { id: 'top-dl-2', name: 'Transformer Architecture & Self-Attention', slug: 'transformers' },
          { id: 'top-dl-3', name: 'Retrieval Augmented Generation (RAG) & Vector DBs', slug: 'rag-vector-db' },
        ],
      },
    ],
  },

  // ================= UNITED STATES: SAT, GRE, MCAT =================
  {
    id: 'exam-sat',
    name: 'SAT',
    slug: 'sat',
    description:
      'Digital SAT standardized entrance exam administered by College Board for US Undergraduate admissions.',
    countryId: 'country-us',
    category: 'Global & College Entrance',
    badge: '🇺🇸 US College Entrance',
    format: 'Digital Adaptive / 1600 Score',
    difficultyBadge: 'Moderate',
    country: { id: 'country-us', name: 'United States', code: 'US', flagEmoji: '🇺🇸' },
    subjects: [
      {
        id: 'sub-sat-rw',
        name: 'Reading and Writing',
        slug: 'sat-reading-writing',
        topics: [
          { id: 'top-sr-1', name: 'Craft and Structure (Words in Context)', slug: 'craft-structure' },
          { id: 'top-sr-2', name: 'Information and Ideas (Evidence & Arguments)', slug: 'information-ideas' },
          { id: 'top-sr-3', name: 'Standard English Conventions (Grammar & Punctuation)', slug: 'conventions' },
          { id: 'top-sr-4', name: 'Expression of Ideas (Rhetorical Synthesis)', slug: 'expression' },
        ],
      },
      {
        id: 'sub-sat-math',
        name: 'Mathematics',
        slug: 'sat-math',
        topics: [
          { id: 'top-sm-1', name: 'Algebra (Linear Equations, Systems & Inequalities)', slug: 'algebra' },
          { id: 'top-sm-2', name: 'Advanced Math (Quadratic, Exponential & Polynomials)', slug: 'advanced-math' },
          { id: 'top-sm-3', name: 'Problem-Solving & Data Analysis (Percentages, Rates)', slug: 'data-analysis' },
          { id: 'top-sm-4', name: 'Geometry & Trigonometry (Triangles, Circles)', slug: 'geometry-trig' },
        ],
      },
    ],
  },
  {
    id: 'exam-gre-gen',
    name: 'GRE General Test',
    slug: 'gre-general',
    description:
      'ETS Graduate Record Examination for master’s and doctoral programmes across international universities.',
    countryId: 'country-us',
    category: 'Global & College Entrance',
    badge: '🎓 Graduate Admissions',
    format: 'Computer-Adaptive / 340 Scale',
    difficultyBadge: 'Hard',
    country: { id: 'country-us', name: 'United States', code: 'US', flagEmoji: '🇺🇸' },
    subjects: [
      {
        id: 'sub-gre-verbal',
        name: 'Verbal Reasoning',
        slug: 'gre-verbal',
        topics: [
          { id: 'top-gv-1', name: 'Reading Comprehension (Complex Academic Prose)', slug: 'reading-comp' },
          { id: 'top-gv-2', name: 'Text Completion (Single, Double & Triple Blanks)', slug: 'text-completion' },
          { id: 'top-gv-3', name: 'Sentence Equivalence (Vocabulary Nuance)', slug: 'sentence-equiv' },
        ],
      },
      {
        id: 'sub-gre-quant',
        name: 'Quantitative Reasoning',
        slug: 'gre-quant',
        topics: [
          { id: 'top-gq-1', name: 'Arithmetic & Number Properties', slug: 'arithmetic' },
          { id: 'top-gq-2', name: 'Algebra & Coordinate Geometry', slug: 'algebra' },
          { id: 'top-gq-3', name: 'Data Analysis (Statistics, Distributions & Counting)', slug: 'data-analysis' },
          { id: 'top-gq-4', name: 'Quantitative Comparison Questions', slug: 'quant-comp' },
        ],
      },
      {
        id: 'sub-gre-awa',
        name: 'Analytical Writing (AWA)',
        slug: 'gre-awa',
        topics: [
          { id: 'top-ga-1', name: 'Analyze an Issue Essay Task', slug: 'issue-task' },
        ],
      },
    ],
  },
  {
    id: 'exam-mcat-us',
    name: 'MCAT',
    slug: 'mcat',
    description:
      'Medical College Admission Test for medical schools in the United States and Canada.',
    countryId: 'country-us',
    category: 'Medical & Healthcare',
    badge: '🩺 US Medical School',
    format: 'CBT / 528 Scale',
    difficultyBadge: 'Hard',
    country: { id: 'country-us', name: 'United States', code: 'US', flagEmoji: '🇺🇸' },
    subjects: [
      {
        id: 'sub-mcat-bio',
        name: 'Biological & Biochemical Foundations',
        slug: 'mcat-bio',
        topics: [
          { id: 'top-mb-1', name: 'Biochemistry, Amino Acids & Enzymes', slug: 'biochem' },
          { id: 'top-mb-2', name: 'Cellular Genetics & Microbiology', slug: 'genetics' },
        ],
      },
      {
        id: 'sub-mcat-chem',
        name: 'Chemical & Physical Foundations',
        slug: 'mcat-chem-phys',
        topics: [
          { id: 'top-mc-1', name: 'General Chemistry, Thermodynamics & Kinetics', slug: 'gen-chem' },
          { id: 'top-mc-2', name: 'Organic Chemistry & Physics for Biology', slug: 'org-chem-phys' },
        ],
      },
      {
        id: 'sub-mcat-cars',
        name: 'Critical Analysis & Reasoning (CARS)',
        slug: 'mcat-cars',
        topics: [
          { id: 'top-mr-1', name: 'Humanities & Social Sciences Comprehension', slug: 'humanities-reasoning' },
        ],
      },
    ],
  },

  // ================= UNITED KINGDOM & GLOBAL =================
  {
    id: 'exam-alevel',
    name: 'A-Level (Cambridge / Edexcel)',
    slug: 'a-level',
    description:
      'General Certificate of Education Advanced Level recognized worldwide for university matriculation.',
    countryId: 'country-gb',
    category: 'School Boards (K-12)',
    badge: '🇬🇧 British Curriculum',
    format: 'Written & Practical Papers',
    difficultyBadge: 'Hard',
    country: { id: 'country-gb', name: 'United Kingdom', code: 'GB', flagEmoji: '🇬🇧' },
    subjects: [
      {
        id: 'sub-al-math',
        name: 'Mathematics & Mechanics',
        slug: 'a-level-math',
        topics: [
          { id: 'top-alm-1', name: 'Pure Mathematics (Calculus, Trigonometry)', slug: 'pure-math' },
          { id: 'top-alm-2', name: 'Mechanics (Newton Laws, Vectors, Moments)', slug: 'mechanics' },
          { id: 'top-alm-3', name: 'Statistics & Probability Distributions', slug: 'stats' },
        ],
      },
      {
        id: 'sub-al-physics',
        name: 'Physics',
        slug: 'a-level-physics',
        topics: [
          { id: 'top-alp-1', name: 'Particles, Quantum & Waves', slug: 'quantum-waves' },
          { id: 'top-alp-2', name: 'Fields, Thermal & Nuclear Energy', slug: 'fields-nuclear' },
        ],
      },
      {
        id: 'sub-al-cs',
        name: 'Computer Science',
        slug: 'a-level-cs',
        topics: [
          { id: 'top-alc-1', name: 'Data Representation & Architecture', slug: 'architecture' },
          { id: 'top-alc-2', name: 'Algorithms, Data Structures & OOP', slug: 'algorithms-oop' },
        ],
      },
    ],
  },
  {
    id: 'exam-ielts-acad',
    name: 'IELTS Academic',
    slug: 'ielts-academic',
    description:
      'International English Language Testing System for higher education and global migration.',
    countryId: 'country-gb',
    category: 'Global & College Entrance',
    badge: '🌐 English Proficiency',
    format: 'Band Score 1 - 9',
    difficultyBadge: 'Moderate',
    country: { id: 'country-gb', name: 'United Kingdom', code: 'GB', flagEmoji: '🇬🇧' },
    subjects: [
      {
        id: 'sub-ielts-reading',
        name: 'Reading Academic',
        slug: 'ielts-reading',
        topics: [
          { id: 'top-ir-1', name: 'True/False/Not Given & Heading Matching', slug: 'heading-matching' },
          { id: 'top-ir-2', name: 'Skimming, Scanning & Summary Completion', slug: 'summary-completion' },
        ],
      },
      {
        id: 'sub-ielts-writing',
        name: 'Writing Task 1 & 2',
        slug: 'ielts-writing',
        topics: [
          { id: 'top-iw-1', name: 'Task 1: Describing Charts, Maps & Diagrams', slug: 'task-1-charts' },
          { id: 'top-iw-2', name: 'Task 2: Discursive Academic Essays', slug: 'task-2-essays' },
        ],
      },
      {
        id: 'sub-ielts-listening',
        name: 'Listening',
        slug: 'ielts-listening',
        topics: [
          { id: 'top-il-1', name: 'Conversations & Academic Lectures', slug: 'lectures-dialogues' },
        ],
      },
      {
        id: 'sub-ielts-speaking',
        name: 'Speaking',
        slug: 'ielts-speaking',
        topics: [
          { id: 'top-is-1', name: 'Cue Card Presentation & Discussion', slug: 'cue-card-discussion' },
        ],
      },
    ],
  },
  {
    id: 'exam-celpip',
    name: 'CELPIP General',
    slug: 'celpip-general',
    description:
      'Canadian English Language Proficiency Index Program for Canadian Permanent Residency and citizenship.',
    countryId: 'country-ca',
    category: 'Global & College Entrance',
    badge: '🇨🇦 Canada PR / Study',
    format: 'Computer-Delivered (CLB 1-12)',
    difficultyBadge: 'Moderate',
    country: { id: 'country-ca', name: 'Canada', code: 'CA', flagEmoji: '🇨🇦' },
    subjects: [
      {
        id: 'sub-celpip-read',
        name: 'Reading',
        slug: 'celpip-reading',
        topics: [
          { id: 'top-clr-1', name: 'Reading Correspondence & Applying Information', slug: 'reading-correspondence' },
          { id: 'top-clr-2', name: 'Reading for Viewpoints & Diagrams', slug: 'viewpoints' },
        ],
      },
      {
        id: 'sub-celpip-write',
        name: 'Writing',
        slug: 'celpip-writing',
        topics: [
          { id: 'top-clw-1', name: 'Task 1: Writing an Email', slug: 'email-writing' },
          { id: 'top-clw-2', name: 'Task 2: Responding to Survey Questions', slug: 'survey-response' },
        ],
      },
      {
        id: 'sub-celpip-listen',
        name: 'Listening & Speaking',
        slug: 'celpip-listen-speak',
        topics: [
          { id: 'top-cls-1', name: 'Daily Life Conversations & News Items', slug: 'conversations' },
        ],
      },
    ],
  },
  {
    id: 'exam-pte-acad',
    name: 'PTE Academic',
    slug: 'pte-academic',
    description:
      'Pearson Test of English Academic for study abroad and immigration in Australia, New Zealand & UK.',
    countryId: 'country-au',
    category: 'Global & College Entrance',
    badge: '🇦🇺 Australia / Global',
    format: 'Computer-Based AI Scoring',
    difficultyBadge: 'Moderate',
    country: { id: 'country-au', name: 'Australia', code: 'AU', flagEmoji: '🇦🇺' },
    subjects: [
      {
        id: 'sub-pte-sw',
        name: 'Speaking & Writing',
        slug: 'pte-speaking-writing',
        topics: [
          { id: 'top-psw-1', name: 'Read Aloud & Repeat Sentence', slug: 'read-aloud' },
          { id: 'top-psw-2', name: 'Describe Image & Retell Lecture', slug: 'describe-image' },
          { id: 'top-psw-3', name: 'Write Essay & Summarize Written Text', slug: 'write-essay' },
        ],
      },
      {
        id: 'sub-pte-reading',
        name: 'Reading',
        slug: 'pte-reading',
        topics: [
          { id: 'top-pr-1', name: 'Reading & Writing Fill in the Blanks', slug: 'rw-blanks' },
          { id: 'top-pr-2', name: 'Re-order Paragraphs & Multiple Choice', slug: 'reorder-paragraphs' },
        ],
      },
      {
        id: 'sub-pte-listening',
        name: 'Listening',
        slug: 'pte-listening',
        topics: [
          { id: 'top-pl-1', name: 'Summarize Spoken Text & Write from Dictation', slug: 'write-dictation' },
        ],
      },
    ],
  },
]

/**
 * Keyword-based classifier fallback for any custom exam
 */
export function getExamCategory(exam: { name: string; slug: string; category?: string }): string {
  if (exam.category && EXAM_CATEGORIES.includes(exam.category as ExamCategory)) {
    return exam.category
  }
  const text = `${exam.name} ${exam.slug}`.toLowerCase()

  if (
    text.includes('ssc') ||
    text.includes('upsc') ||
    text.includes('banking') ||
    text.includes('ibps') ||
    text.includes('rrb') ||
    text.includes('nda') ||
    text.includes('cds') ||
    text.includes('civil')
  ) {
    return 'Government & Civil Services'
  }

  if (text.includes('neet') || text.includes('mcat') || text.includes('medical') || text.includes('aiims')) {
    return 'Medical & Healthcare'
  }

  if (
    text.includes('jee') ||
    text.includes('gate') ||
    text.includes('bitsat') ||
    text.includes('viteee') ||
    text.includes('engineering')
  ) {
    return 'Engineering & Tech'
  }

  if (
    text.includes('dsa') ||
    text.includes('swe') ||
    text.includes('software') ||
    text.includes('fullstack') ||
    text.includes('ai') ||
    text.includes('machine learning') ||
    text.includes('developer')
  ) {
    return 'Software & Computer Science'
  }

  if (text.includes('cat') || text.includes('gmat') || text.includes('mba') || text.includes('management')) {
    return 'Management & MBA'
  }

  if (
    text.includes('sat') ||
    text.includes('act') ||
    text.includes('gre') ||
    text.includes('ielts') ||
    text.includes('celpip') ||
    text.includes('pte') ||
    text.includes('toefl')
  ) {
    return 'Global & College Entrance'
  }

  if (text.includes('cbse') || text.includes('icse') || text.includes('a-level') || text.includes('board') || text.includes('gcse')) {
    return 'School Boards (K-12)'
  }

  return 'Engineering & Tech'
}

/**
 * Quick fallback subject retriever
 */
export function getCuratedSubjectsForExam(examId: string, slug?: string): ActiveSubjectInfo[] {
  const match = DEFAULT_EXAMS.find(e => e.id === examId || (slug && e.slug === slug))
  if (match?.subjects && match.subjects.length > 0) {
    return match.subjects
  }

  // Generic fallback if exam is completely custom
  return [
    {
      id: `${examId}-sub-general`,
      name: 'Core Curriculum & Concepts',
      slug: `${slug || examId}-core-concepts`,
      topics: [
        { id: `${examId}-top-1`, name: 'Fundamental Principles & Theory', slug: 'fundamentals' },
        { id: `${examId}-top-2`, name: 'Practice Problem Sets & Applications', slug: 'practice-problems' },
        { id: `${examId}-top-3`, name: 'Comprehensive Review & Mock Drills', slug: 'mock-drills' },
      ],
    },
  ]
}
