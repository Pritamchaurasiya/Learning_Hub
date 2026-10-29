import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Seeding comprehensive competitive exams, subjects, and topics...')

  // 1. Countries
  const india = await prisma.country.upsert({
    where: { code: 'IN' },
    update: { name: 'India', flagEmoji: '🇮🇳', isActive: true },
    create: { code: 'IN', name: 'India', flagEmoji: '🇮🇳', isActive: true },
  })

  const globalCountry = await prisma.country.upsert({
    where: { code: 'GLOBAL' },
    update: { name: 'Global / Tech', flagEmoji: '🌐', isActive: true },
    create: { code: 'GLOBAL', name: 'Global / Tech', flagEmoji: '🌐', isActive: true },
  })

  const us = await prisma.country.upsert({
    where: { code: 'US' },
    update: { name: 'United States', flagEmoji: '🇺🇸', isActive: true },
    create: { code: 'US', name: 'United States', flagEmoji: '🇺🇸', isActive: true },
  })

  const uk = await prisma.country.upsert({
    where: { code: 'GB' },
    update: { name: 'United Kingdom', flagEmoji: '🇬🇧', isActive: true },
    create: { code: 'GB', name: 'United Kingdom', flagEmoji: '🇬🇧', isActive: true },
  })

  console.log('✅ Countries verified: India, Global, US, UK')

  // 2. Exams Definition
  const examDefinitions = [
    {
      countryId: india.id,
      name: 'JEE Main',
      slug: 'jee-main',
      description: 'National Testing Agency (NTA) Computer Based Test for Engineering Admissions (NITs, IIITs, CFTIs)',
      subjects: [
        {
          name: 'Physics',
          slug: 'jee-main-physics',
          topics: [
            'Mechanics & Newton Laws',
            'Work, Energy & Power',
            'Rotational Dynamics',
            'Electrostatics & Capacitance',
            'Current Electricity & Magnetism',
            'Electromagnetic Induction & AC',
            'Optics (Ray & Wave)',
            'Thermodynamics & Kinetic Theory',
            'Modern Physics & Semiconductors',
          ],
        },
        {
          name: 'Chemistry',
          slug: 'jee-main-chemistry',
          topics: [
            'Atomic Structure & Periodic Properties',
            'Chemical Bonding & Molecular Structure',
            'Chemical & Ionic Equilibrium',
            'Chemical Thermodynamics',
            'Electrochemistry & Kinetics',
            'Organic Chemistry Basics & GOC',
            'Hydrocarbons & Haloalkanes',
            'Aldehydes, Ketones & Carboxylic Acids',
            'Coordination Compounds & p-Block',
          ],
        },
        {
          name: 'Mathematics',
          slug: 'jee-main-mathematics',
          topics: [
            'Calculus (Limits, Continuity & Derivatives)',
            'Integral Calculus (Definite & Indefinite)',
            'Differential Equations',
            'Coordinate Geometry (Conic Sections)',
            'Vectors & 3D Geometry',
            'Matrices & Determinants',
            'Probability & Statistics',
            'Complex Numbers & Quadratic Equations',
            'Binomial Theorem & Sequences',
          ],
        },
      ],
    },
    {
      countryId: india.id,
      name: 'JEE Advanced',
      slug: 'jee-advanced',
      description: 'Prestigious Entrance Exam for admission into the Indian Institutes of Technology (IITs)',
      subjects: [
        {
          name: 'Advanced Physics',
          slug: 'jee-adv-physics',
          topics: ['Rigid Body Mechanics', 'Wave Optics & Interference', 'Electromagnetism & Maxwell Equations', 'Thermal Physics'],
        },
        {
          name: 'Advanced Chemistry',
          slug: 'jee-adv-chemistry',
          topics: ['Organic Reaction Mechanisms', 'Thermodynamics & Thermochemistry', 'Coordination & Metallurgy'],
        },
        {
          name: 'Advanced Mathematics',
          slug: 'jee-adv-mathematics',
          topics: ['Definite Integrals & Areas', 'Vector Calculus & 3D Planes', 'Permutations, Combinations & Probability'],
        },
      ],
    },
    {
      countryId: india.id,
      name: 'NEET-UG',
      slug: 'neet-ug',
      description: 'National Eligibility cum Entrance Test for MBBS, BDS, and Premier Medical Admissions',
      subjects: [
        {
          name: 'Biology',
          slug: 'neet-biology',
          topics: [
            'Genetics & Molecular Basis of Inheritance',
            'Human Physiology (Circulation, Respiration, Excretion)',
            'Plant Physiology & Photosynthesis',
            'Ecology, Ecosystems & Biodiversity',
            'Cell Biology & Cell Cycle',
            'Reproduction in Organisms & Humans',
            'Biotechnology & Its Applications',
          ],
        },
        {
          name: 'Physics for NEET',
          slug: 'neet-physics',
          topics: [
            'Kinematics & Laws of Motion',
            'Gravitation & Properties of Bulk Matter',
            'Current Electricity & Ray Optics',
            'Dual Nature of Radiation & Atoms',
          ],
        },
        {
          name: 'Chemistry for NEET',
          slug: 'neet-chemistry',
          topics: [
            'Organic Chemistry & Biomolecules',
            'Solutions & Chemical Kinetics',
            'p-Block, d-Block & f-Block Elements',
            'Equilibrium & Redox Reactions',
          ],
        },
      ],
    },
    {
      countryId: india.id,
      name: 'BITSAT',
      slug: 'bitsat',
      description: 'Birla Institute of Technology and Science Admission Test for BITS Pilani, Goa & Hyderabad',
      subjects: [
        {
          name: 'Physics',
          slug: 'bitsat-physics',
          topics: ['Mechanics', 'Electrodynamics', 'Modern Physics'],
        },
        {
          name: 'Chemistry',
          slug: 'bitsat-chemistry',
          topics: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'],
        },
        {
          name: 'Mathematics',
          slug: 'bitsat-mathematics',
          topics: ['Calculus', 'Algebra', 'Coordinate Geometry'],
        },
        {
          name: 'English & Logical Reasoning',
          slug: 'bitsat-english-lr',
          topics: ['Reading Comprehension', 'Verbal Reasoning', 'Pattern Recognition', 'Non-Verbal Logic'],
        },
      ],
    },
    {
      countryId: globalCountry.id,
      name: 'Software Engineering & DSA',
      slug: 'dsa-software-engineering',
      description: 'High-Impact Data Structures, Algorithms, System Design, and FAANG/MAANG Technical Interviews',
      subjects: [
        {
          name: 'Data Structures & Algorithms',
          slug: 'dsa-core',
          topics: [
            'Arrays, Two Pointers & Sliding Window',
            'Binary Search & Monotonic Stacks',
            'Linked Lists, Stacks & Queues',
            'Binary Trees & Binary Search Trees',
            'Graph Algorithms (BFS, DFS, Dijkstra)',
            'Dynamic Programming (1D, 2D, Knapsack)',
            'Trie, Segment Trees & Heaps',
          ],
        },
        {
          name: 'System Design & Architecture',
          slug: 'system-design',
          topics: [
            'Horizontal vs Vertical Scaling & Load Balancers',
            'Database Sharding, Replication & CAP Theorem',
            'Caching Strategies (Redis, Memcached)',
            'Message Queues (Kafka, RabbitMQ)',
            'Microservices & API Gateway Design',
          ],
        },
        {
          name: 'Core Computer Science',
          slug: 'core-cs-fundamentals',
          topics: [
            'Operating Systems (Processes, Threads, Deadlocks)',
            'DBMS (ACID, Indexing, SQL Joins)',
            'Computer Networks (TCP/IP, HTTP/3, DNS)',
          ],
        },
      ],
    },
    {
      countryId: india.id,
      name: 'GATE Computer Science',
      slug: 'gate-cse',
      description: 'Graduate Aptitude Test in Engineering for M.Tech admissions in IITs, IISc & PSU Recruitments',
      subjects: [
        {
          name: 'Computer Science & IT',
          slug: 'gate-cs-it',
          topics: [
            'Discrete Mathematics & Linear Algebra',
            'Theory of Computation & Compiler Design',
            'Data Structures & Algorithms',
            'Computer Organization & Architecture',
            'Operating Systems & DBMS',
            'Computer Networks',
          ],
        },
      ],
    },
    {
      countryId: india.id,
      name: 'CBSE Class 12 Boards',
      slug: 'cbse-class-12',
      description: 'Class 12th Board Examinations for Science Stream with NCERT Exemplar & Proof Questions',
      subjects: [
        {
          name: 'Physics Class 12',
          slug: 'cbse-12-physics',
          topics: ['Electrostatics', 'Current Electricity', 'Optics', 'Semiconductors'],
        },
        {
          name: 'Chemistry Class 12',
          slug: 'cbse-12-chemistry',
          topics: ['Solutions', 'Electrochemistry', 'Haloalkanes', 'Biomolecules'],
        },
        {
          name: 'Mathematics Class 12',
          slug: 'cbse-12-mathematics',
          topics: ['Relations & Functions', 'Matrices', 'Integrals', 'Linear Programming'],
        },
      ],
    },
  ]

  for (const def of examDefinitions) {
    const exam = await prisma.exam.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        description: def.description,
        countryId: def.countryId,
        isActive: true,
      },
      create: {
        name: def.name,
        slug: def.slug,
        description: def.description,
        countryId: def.countryId,
        isActive: true,
      },
    })
    console.log(`📌 Upserted Exam: ${exam.name} (${exam.slug})`)

    for (const subDef of def.subjects) {
      const subject = await prisma.subject.upsert({
        where: { slug: subDef.slug },
        update: {
          name: subDef.name,
          examId: exam.id,
        },
        create: {
          name: subDef.name,
          slug: subDef.slug,
          examId: exam.id,
        },
      })

      for (let i = 0; i < subDef.topics.length; i++) {
        const topicName = subDef.topics[i]
        const topicSlug = `${subDef.slug}-${topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
        await prisma.topic.upsert({
          where: { slug: topicSlug },
          update: {
            name: topicName,
            order: i + 1,
            subjectId: subject.id,
          },
          create: {
            name: topicName,
            slug: topicSlug,
            order: i + 1,
            subjectId: subject.id,
          },
        })
      }
    }
  }

  // Seed sample PYQs for JEE Main & NEET
  const jeeMainExam = await prisma.exam.findUnique({ where: { slug: 'jee-main' } })
  const jeePhysicsSub = await prisma.subject.findUnique({ where: { slug: 'jee-main-physics' } })
  const neetExam = await prisma.exam.findUnique({ where: { slug: 'neet-ug' } })
  const neetBioSub = await prisma.subject.findUnique({ where: { slug: 'neet-biology' } })

  if (jeeMainExam && jeePhysicsSub) {
    const existingPYQ = await prisma.pYQ.findFirst({ where: { examId: jeeMainExam.id } })
    if (!existingPYQ) {
      await prisma.pYQ.createMany({
        data: [
          {
            examType: 'JEE_MAIN',
            examId: jeeMainExam.id,
            subjectId: jeePhysicsSub.id,
            year: 2024,
            paper: 'JEE Main 2024 Session 1 (27 Jan Morning)',
            subjectName: 'Physics',
            question: 'A body of mass 2 kg moving with velocity 4 m/s collides head on with a stationary body of mass 4 kg and sticks to it. The loss of kinetic energy is:',
            options: ['10.67 J', '5.33 J', '16 J', '8 J'],
            answer: '10.67 J',
            explanation: 'By conservation of momentum: m1*v1 = (m1+m2)*v => 2*4 = 6*v => v = 8/6 = 4/3 m/s. Initial KE = 0.5*2*16 = 16 J. Final KE = 0.5*6*(16/9) = 16/3 = 5.33 J. Loss in KE = 16 - 5.33 = 10.67 J.',
            difficulty: 'MEDIUM',
            marks: 4,
            negativeMarks: 1,
            tags: ['Collisions', 'Conservation of Momentum', 'Mechanics'],
          },
          {
            examType: 'JEE_MAIN',
            examId: jeeMainExam.id,
            subjectId: jeePhysicsSub.id,
            year: 2024,
            paper: 'JEE Main 2024 Session 1 (29 Jan Evening)',
            subjectName: 'Physics',
            question: 'In an ac circuit, the instantaneous values of emf and current are given by e = 100 sin(314 t) volt and i = 20 sin(314 t + pi/3) ampere. The average power consumed in the circuit is:',
            options: ['500 W', '1000 W', '250 W', '2000 W'],
            answer: '500 W',
            explanation: 'Average Power P_avg = V_rms * I_rms * cos(phi) = (100 / sqrt(2)) * (20 / sqrt(2)) * cos(pi/3) = (2000 / 2) * 0.5 = 500 W.',
            difficulty: 'MEDIUM',
            marks: 4,
            negativeMarks: 1,
            tags: ['Alternating Current', 'Power in AC', 'Electromagnetism'],
          },
        ],
      })
      console.log('✅ Seeded JEE Main PYQs')
    }
  }

  if (neetExam && neetBioSub) {
    const existingPYQ = await prisma.pYQ.findFirst({ where: { examId: neetExam.id } })
    if (!existingPYQ) {
      await prisma.pYQ.createMany({
        data: [
          {
            examType: 'NEET',
            examId: neetExam.id,
            subjectId: neetBioSub.id,
            year: 2024,
            paper: 'NEET 2024 National Paper (May)',
            subjectName: 'Biology',
            question: 'Which of the following is the correct order of phases during Mitosis in plant cells?',
            options: [
              'Prophase -> Metaphase -> Anaphase -> Telophase',
              'Metaphase -> Prophase -> Anaphase -> Telophase',
              'Prophase -> Anaphase -> Metaphase -> Telophase',
              'Telophase -> Anaphase -> Metaphase -> Prophase',
            ],
            answer: 'Prophase -> Metaphase -> Anaphase -> Telophase',
            explanation: 'Mitosis consists of four sequential stages: Prophase (chromatin condenses), Metaphase (chromosomes align at equatorial plate), Anaphase (sister chromatids separate), and Telophase (nuclear membrane reforms).',
            difficulty: 'EASY',
            marks: 4,
            negativeMarks: 1,
            tags: ['Cell Division', 'Mitosis', 'NCERT Biology'],
          },
        ],
      })
      console.log('✅ Seeded NEET-UG PYQs')
    }
  }

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch(e => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
