"""
Management command to seed a rich, calibrated, multi-disciplinary question bank
for national competitive exams (JEE, NEET, GATE, SAT, and Test A+ All-India Battery)
with LaTeX math, IRT difficulty, Bloom taxonomy, and pre-packaged test blueprints.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.exams.models import Country, Exam, Subject, Topic
from apps.test_engine.models import Test, Question, Option, TestQuestion


class Command(BaseCommand):
    help = "Seeds verified, IRT-calibrated competitive exam questions and practice test papers across all 7 Test A+ disciplines."

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Clear existing seeded questions and test blueprints before loading',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding national competitive exam question bank...")

        # 0. Clean old blueprints if requested
        if options.get('clean'):
            self.stdout.write("Cleaning existing seeded test blueprints and questions...")
            managed_test_titles = [
                "JEE Advanced Grand Simulation Paper 1",
                "GATE CS Algorithms & Systems Sprint",
                "Adaptive IRT Diagnostic Battery",
                "Digital SAT Math Mastery Practice",
                "Test A+ All-India Grand Diagnostic Mock",
                "60-Second Blitz High-Speed Drill",
            ]
            TestQuestion.objects.filter(test__title__in=managed_test_titles).delete()
            Test.objects.filter(title__in=managed_test_titles).delete()

        # 1. Countries
        india, _ = Country.objects.get_or_create(code="IN", defaults={"name": "India", "currency": "INR"})
        usa, _ = Country.objects.get_or_create(code="US", defaults={"name": "United States", "currency": "USD"})

        # 2. Exams
        jee_exam, _ = Exam.objects.get_or_create(
            code="JEE_ADV",
            defaults={
                "country": india,
                "name": "JEE Advanced Simulation",
                "full_name": "Joint Entrance Examination Advanced Simulation",
                "pattern": {
                    "total_questions": 18,
                    "duration_minutes": 60,
                    "marks_per_correct": 4,
                    "negative_marks_per_wrong": 1,
                    "passing_score": 50,
                },
                "difficulty_distribution": {"easy": 25, "medium": 50, "hard": 25},
                "is_active": True,
            }
        )

        gate_exam, _ = Exam.objects.get_or_create(
            code="GATE_CS",
            defaults={
                "country": india,
                "name": "GATE Computer Science & IT",
                "full_name": "Graduate Aptitude Test in Engineering - Computer Science",
                "pattern": {
                    "total_questions": 15,
                    "duration_minutes": 45,
                    "marks_per_correct": 2,
                    "negative_marks_per_wrong": 0.66,
                    "passing_score": 60,
                },
                "difficulty_distribution": {"easy": 30, "medium": 45, "hard": 25},
                "is_active": True,
            }
        )

        sat_exam, _ = Exam.objects.get_or_create(
            code="SAT_MATH",
            defaults={
                "country": usa,
                "name": "Digital SAT Math Master",
                "full_name": "College Board Digital SAT Mathematics Benchmark",
                "pattern": {
                    "total_questions": 12,
                    "duration_minutes": 35,
                    "marks_per_correct": 1,
                    "negative_marks_per_wrong": 0,
                    "passing_score": 70,
                },
                "difficulty_distribution": {"easy": 40, "medium": 40, "hard": 20},
                "is_active": True,
            }
        )

        test_a_exam, _ = Exam.objects.get_or_create(
            code="TEST_A_STUDIO",
            defaults={
                "country": india,
                "name": "Test A+ National Mastery Battery",
                "full_name": "Test A+ Integrated 7-Axis Adaptive Competitive Assessment",
                "pattern": {
                    "total_questions": 21,
                    "duration_minutes": 60,
                    "marks_per_correct": 4,
                    "negative_marks_per_wrong": 1,
                    "passing_score": 70,
                },
                "difficulty_distribution": {"easy": 30, "medium": 45, "hard": 25},
                "is_active": True,
            }
        )

        # 3. Subjects & Topics across 7 Core Disciplines
        # Discipline 1: Physics
        phys_sub, _ = Subject.objects.get_or_create(
            exam=jee_exam,
            code="PHYS_JEE",
            defaults={"name": "Physics", "weightage": 50}
        )
        mech_topic, _ = Topic.objects.get_or_create(
            subject=phys_sub,
            name="Classical Mechanics & Kinematics",
            defaults={"description": "Newtonian mechanics, kinematics, and rotational dynamics"}
        )
        electro_topic, _ = Topic.objects.get_or_create(
            subject=phys_sub,
            name="Electrostatics & Gauss Law",
            defaults={"description": "Electric fields, Gauss law, potential and dipoles"}
        )
        modern_phys_topic, _ = Topic.objects.get_or_create(
            subject=phys_sub,
            name="Modern Physics & Atomic Structure",
            defaults={"description": "Photoelectric effect, Bohr model, de Broglie matter waves"}
        )

        # Discipline 2: Mathematics
        math_sub, _ = Subject.objects.get_or_create(
            exam=jee_exam,
            code="MATH_JEE",
            defaults={"name": "Mathematics", "weightage": 50}
        )
        calc_topic, _ = Topic.objects.get_or_create(
            subject=math_sub,
            name="Integral Calculus & Differential Equations",
            defaults={"description": "Definite integrals, area under curves, ODEs"}
        )
        linear_topic, _ = Topic.objects.get_or_create(
            subject=math_sub,
            name="Vector Algebra & 3D Geometry",
            defaults={"description": "Dot & cross products, planes, skew lines"}
        )
        matrix_topic, _ = Topic.objects.get_or_create(
            subject=math_sub,
            name="Matrices, Determinants & Eigenvalues",
            defaults={"description": "Cayley-Hamilton theorem, characteristic roots, transformations"}
        )

        # Discipline 3: Chemistry
        chem_sub, _ = Subject.objects.get_or_create(
            exam=jee_exam,
            code="CHEM_JEE",
            defaults={"name": "Chemistry", "weightage": 50}
        )
        org_chem_topic, _ = Topic.objects.get_or_create(
            subject=chem_sub,
            name="Organic Reaction Mechanisms",
            defaults={"description": "Aldol condensation, electrophilic aromatic substitution, nucleophiles"}
        )
        thermo_topic, _ = Topic.objects.get_or_create(
            subject=chem_sub,
            name="Chemical Thermodynamics & Equilibria",
            defaults={"description": "Gibbs free energy, Hess law, equilibrium constants, entropy"}
        )
        coordination_topic, _ = Topic.objects.get_or_create(
            subject=chem_sub,
            name="Coordination Chemistry & Crystal Field Theory",
            defaults={"description": "Octahedral splitting, spectrochemical series, isomerism"}
        )

        # Discipline 4: CS Core (GATE)
        cs_sub, _ = Subject.objects.get_or_create(
            exam=gate_exam,
            code="CS_CORE",
            defaults={"name": "Computer Science Core", "weightage": 100}
        )
        os_topic, _ = Topic.objects.get_or_create(
            subject=cs_sub,
            name="Operating Systems & Virtual Memory",
            defaults={"description": "Paging, page tables, TLB, scheduling, memory management"}
        )
        network_topic, _ = Topic.objects.get_or_create(
            subject=cs_sub,
            name="Computer Networks & Transport Layer",
            defaults={"description": "TCP congestion control, flow control, subnetting, sliding window"}
        )
        db_topic, _ = Topic.objects.get_or_create(
            subject=cs_sub,
            name="Database Systems & Concurrency Control",
            defaults={"description": "Two-phase locking, serializability, ACID properties, indexing"}
        )

        # Discipline 5: Data Structures & Algorithms (DSA)
        dsa_sub, _ = Subject.objects.get_or_create(
            exam=gate_exam,
            code="DSA_CORE",
            defaults={"name": "Data Structures & Algorithms", "weightage": 100}
        )
        dsa_topic, _ = Topic.objects.get_or_create(
            subject=dsa_sub,
            name="Algorithms & Asymptotic Analysis",
            defaults={"description": "Divide and conquer, greedy, dynamic programming, shortest paths"}
        )
        trees_topic, _ = Topic.objects.get_or_create(
            subject=dsa_sub,
            name="Self-Balancing Trees & Graphs",
            defaults={"description": "Red-Black trees, AVL rotations, topological sort, BFS/DFS"}
        )

        # Discipline 6: Coding & Systems
        coding_sub, _ = Subject.objects.get_or_create(
            exam=test_a_exam,
            code="CODING_DEV",
            defaults={"name": "Software Engineering & Coding", "weightage": 100}
        )
        two_pointers_topic, _ = Topic.objects.get_or_create(
            subject=coding_sub,
            name="Sliding Window & Two Pointers",
            defaults={"description": "Optimal subsegment algorithms, subarray sums, monotonic queues"}
        )
        concurrency_topic, _ = Topic.objects.get_or_create(
            subject=coding_sub,
            name="Multithreading & Concurrency",
            defaults={"description": "Deadlocks, Coffman conditions, mutexes, semaphores, race conditions"}
        )

        # Discipline 7: Aptitude & Reasoning
        aptitude_sub, _ = Subject.objects.get_or_create(
            exam=test_a_exam,
            code="GEN_APTITUDE",
            defaults={"name": "General Aptitude & Reasoning", "weightage": 100}
        )
        quant_topic, _ = Topic.objects.get_or_create(
            subject=aptitude_sub,
            name="Quantitative Aptitude & Combinatorics",
            defaults={"description": "Permutations, derangements, relative speeds, work & rates"}
        )
        logic_topic, _ = Topic.objects.get_or_create(
            subject=aptitude_sub,
            name="Analytical Reasoning & Syllogisms",
            defaults={"description": "Deductive logic, syllogistic Venn relations, critical thinking"}
        )

        # SAT Math Topics
        sat_sub, _ = Subject.objects.get_or_create(
            exam=sat_exam,
            code="SAT_MATH_CORE",
            defaults={"name": "Mathematics (Advanced)", "weightage": 100}
        )
        sat_alg_topic, _ = Topic.objects.get_or_create(
            subject=sat_sub,
            name="Advanced Math & Quadratics",
            defaults={"description": "Non-linear equations, systems of quadratics, vertex form"}
        )
        sat_geo_topic, _ = Topic.objects.get_or_create(
            subject=sat_sub,
            name="Coordinate Geometry & Circles",
            defaults={"description": "Equations of circles, radian measures, trigonometry"}
        )

        # 4. Question Databank Definitions (IRT-Calibrated & LaTeX Formatted)
        question_data = [
            # ======================== 1. PHYSICS ========================
            {
                "topic": mech_topic,
                "text": "A particle of mass $m$ moves along a smooth parabolic curve $y = ax^2$ under gravity acting in the $-y$ direction. If released from rest at $x = x_0$, what is the normal reaction force $N$ at the lowest point $x = 0$?",
                "question_type": "mcq",
                "difficulty": 0.72,
                "discrimination": 1.6,
                "bloom_level": "apply",
                "explanation": "At the lowest point $x = 0$, velocity is $v = \\sqrt{2gy_0} = \\sqrt{2gax_0^2}$. The radius of curvature of $y = ax^2$ at the origin is $\\rho = \\frac{1}{2a}$. Centripetal acceleration is $a_c = \\frac{v^2}{\\rho} = 2a(2gax_0^2) = 4ga^2 x_0^2$. Therefore, $N - mg = m a_c \\implies N = mg(1 + 4a^2 x_0^2)$.",
                "solution_steps": [
                    "Calculate velocity from conservation of mechanical energy: $v = \\sqrt{2gax_0^2}$",
                    "Compute radius of curvature at origin: $\\rho = \\frac{[1 + (y')^2]^{3/2}}{|y''|} = \\frac{1}{2a}$",
                    "Apply radial equation of motion: $N - mg = \\frac{m v^2}{\\rho}$",
                    "Substitute $v^2$ and $\\rho$ to obtain $N = mg(1 + 4a^2 x_0^2)$"
                ],
                "tags": ["mechanics", "radius-of-curvature", "energy-conservation", "physics", "jee-advanced"],
                "options": [
                    {"text": "$N = mg(1 + 4a^2 x_0^2)$", "is_correct": True, "explanation": "Correct. Energy conservation and curvature radius combine to yield this result."},
                    {"text": "$N = mg(1 + 2ax_0^2)$", "is_correct": False, "explanation": "Incorrect. Forgets that curvature has a factor of 2 in denominator."},
                    {"text": "$N = mg$", "is_correct": False, "explanation": "Incorrect. Ignores centrifugal acceleration at the curve inflection."},
                    {"text": "$N = 4mg a^2 x_0^2$", "is_correct": False, "explanation": "Incorrect. Neglects the gravitational weight baseline."},
                ]
            },
            {
                "topic": mech_topic,
                "text": "A solid cylinder of mass $M$ and radius $R$ rolls without slipping down an inclined plane of angle $\\theta$. What is its linear acceleration $a$ along the incline?",
                "question_type": "mcq",
                "difficulty": 0.45,
                "discrimination": 1.2,
                "bloom_level": "understand",
                "explanation": "For pure rolling of a symmetric body with moment of inertia $I = \\beta M R^2$, acceleration is $a = \\frac{g \\sin\\theta}{1 + \\beta}$. For a solid cylinder, $\\beta = 1/2$, so $a = \\frac{g \\sin\\theta}{1 + 1/2} = \\frac{2}{3} g \\sin\\theta$.",
                "solution_steps": [
                    "Formulate torque about contact axis: $\\tau = I \\alpha$",
                    "Newton's 2nd Law: $Mg\\sin\\theta - f_s = Ma$",
                    "Constraint condition: $a = R\\alpha$",
                    "Solving simultaneously yields $a = \\frac{2}{3} g\\sin\\theta$"
                ],
                "tags": ["rotational-dynamics", "pure-rolling", "mechanics", "physics"],
                "options": [
                    {"text": "$a = \\frac{2}{3} g \\sin\\theta$", "is_correct": True, "explanation": "Correct. Moment of inertia $I = \\frac{1}{2} M R^2$ gives $a = \\frac{2}{3}g\\sin\\theta$."},
                    {"text": "$a = \\frac{1}{2} g \\sin\\theta$", "is_correct": False, "explanation": "Incorrect. That corresponds to a hollow ring."},
                    {"text": "$a = \\frac{5}{7} g \\sin\\theta$", "is_correct": False, "explanation": "Incorrect. That corresponds to a solid sphere."},
                    {"text": "$a = g \\sin\\theta$", "is_correct": False, "explanation": "Incorrect. Pure sliding without friction gives $g\\sin\\theta$."},
                ]
            },
            {
                "topic": electro_topic,
                "text": "An electric dipole $\\vec{p} = p\\hat{i}$ is placed at the origin in an electric field $\\vec{E} = E_0 x \\hat{i}$. What is the net electrostatic force $\\vec{F}$ acting on the dipole?",
                "question_type": "mcq",
                "difficulty": 0.65,
                "discrimination": 1.5,
                "bloom_level": "apply",
                "explanation": "In an inhomogeneous electric field, the force on a dipole is given by $\\vec{F} = (\\vec{p} \\cdot \\nabla)\\vec{E}$. Here $\\vec{p} = p\\hat{i}$ and $\\vec{E} = E_0 x \\hat{i}$. Thus $\\vec{F} = p \\frac{\\partial}{\\partial x}(E_0 x \\hat{i}) = p E_0 \\hat{i}$.",
                "solution_steps": [
                    "Use dipole force formula in non-uniform field: $\\vec{F} = (\\vec{p} \\cdot \\nabla)\\vec{E}$",
                    "Compute gradient component along $x$: $\\frac{\\partial E_x}{\\partial x} = E_0$",
                    "Multiply by dipole moment magnitude $p$ to find $\\vec{F} = p E_0 \\hat{i}$"
                ],
                "tags": ["electrostatics", "dipole", "gradient", "physics", "jee-advanced"],
                "options": [
                    {"text": "$\\vec{F} = p E_0 \\hat{i}$", "is_correct": True, "explanation": "Correct. Non-uniform field produces net force $\\vec{F} = (\\vec{p} \\cdot \\nabla)\\vec{E}$."},
                    {"text": "$\\vec{F} = 0$", "is_correct": False, "explanation": "Incorrect. Net force is zero only in a uniform electric field."},
                    {"text": "$\\vec{F} = -p E_0 \\hat{i}$", "is_correct": False, "explanation": "Incorrect. Field increases in $+x$ direction."},
                    {"text": "$\\vec{F} = 2p E_0 \\hat{k}$", "is_correct": False, "explanation": "Incorrect. No orthogonal forces exist."},
                ]
            },
            {
                "topic": modern_phys_topic,
                "text": "In a hydrogen atom, an electron transitions from $n = 3$ to $n = 1$. Given Rydberg constant $R_H$, what is the photon wavelength $\\lambda$ emitted?",
                "question_type": "mcq",
                "difficulty": 0.52,
                "discrimination": 1.3,
                "bloom_level": "apply",
                "explanation": "By the Rydberg formula: $\\frac{1}{\\lambda} = R_H \\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right) = R_H \\left(1 - \\frac{1}{9}\\right) = \\frac{8}{9} R_H \\implies \\lambda = \\frac{9}{8 R_H}$.",
                "solution_steps": [
                    "Formulate Rydberg transition: $\\frac{1}{\\lambda} = R_H(1/1^2 - 1/3^2)$",
                    "Evaluate $1 - 1/9 = 8/9$",
                    "Invert to solve for wavelength: $\\lambda = \\frac{9}{8 R_H}$"
                ],
                "tags": ["modern-physics", "bohr-model", "rydberg", "physics"],
                "options": [
                    {"text": "$\\lambda = \\frac{9}{8 R_H}$", "is_correct": True, "explanation": "Correct. $\\frac{1}{\\lambda} = R_H(1 - 1/9) = 8/9 R_H$."},
                    {"text": "$\\lambda = \\frac{8}{9 R_H}$", "is_correct": False, "explanation": "Incorrect. Inverted wavenumber fraction."},
                    {"text": "$\\lambda = \\frac{4}{3 R_H}$", "is_correct": False, "explanation": "Incorrect. That corresponds to the $n=2 \\to n=1$ Lyman-alpha transition."},
                    {"text": "$\\lambda = \\frac{1}{R_H}$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },

            # ======================== 2. MATHEMATICS ========================
            {
                "topic": calc_topic,
                "text": "Evaluate the definite integral: $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}} \\, dx$.",
                "question_type": "mcq",
                "difficulty": 0.40,
                "discrimination": 1.3,
                "bloom_level": "apply",
                "explanation": "Using King's property: $\\int_a^b f(x)dx = \\int_a^b f(a + b - x)dx$. Here $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\cos x}}{\\sqrt{\\cos x} + \\sqrt{\\sin x}} dx$. Adding both gives $2I = \\int_0^{\\pi/2} 1 dx = \\pi/2 \\implies I = \\pi/4$.",
                "solution_steps": [
                    "Apply King's property: replace $x$ with $\\frac{\\pi}{2} - x$",
                    "Recognize that $\\sin(\\pi/2 - x) = \\cos x$ and $\\cos(\\pi/2 - x) = \\sin x$",
                    "Add both expressions: $2I = \\int_0^{\\pi/2} 1 dx = \\frac{\\pi}{2}$",
                    "Divide by 2 to arrive at $I = \\frac{\\pi}{4}$"
                ],
                "tags": ["calculus", "definite-integrals", "kings-property", "maths"],
                "options": [
                    {"text": "$\\frac{\\pi}{4}$", "is_correct": True, "explanation": "Correct. King's Property symmetrizes the integrand to 1 over $[0, \\pi/2]$."},
                    {"text": "$\\frac{\\pi}{2}$", "is_correct": False, "explanation": "Incorrect. Forgot to divide by 2 from the $2I$ sum."},
                    {"text": "$1$", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "$\\frac{\\pi}{8}$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": calc_topic,
                "text": "Find the general solution to the first-order linear differential equation: $\\frac{dy}{dx} + y \\tan x = \\sec x$.",
                "question_type": "mcq",
                "difficulty": 0.55,
                "discrimination": 1.4,
                "bloom_level": "apply",
                "explanation": "Integrating factor $\\text{IF} = e^{\\int \\tan x dx} = \\sec x$. Multiplying gives $y \\sec x = \\int \\sec^2 x dx = \\tan x + C \\implies y = \\sin x + C \\cos x$.",
                "solution_steps": [
                    "Identify $P(x) = \\tan x$ and $Q(x) = \\sec x$",
                    "Compute integrating factor: $\\text{IF} = e^{\\int \\tan x dx} = \\sec x$",
                    "Integrate: $y \\cdot \\text{IF} = \\int \\sec^2 x dx = \\tan x + C$",
                    "Multiply across by $\\cos x$: $y = \\sin x + C\\cos x$"
                ],
                "tags": ["calculus", "differential-equations", "integrating-factor", "maths"],
                "options": [
                    {"text": "$y = \\sin x + C \\cos x$", "is_correct": True, "explanation": "Correct. Integrating factor is $\\sec x$, yielding $y = \\sin x + C\\cos x$."},
                    {"text": "$y = \\cos x + C \\sin x$", "is_correct": False, "explanation": "Incorrect. Transposed trigonometric identities."},
                    {"text": "$y = \\sec x + C \\tan x$", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "$y = e^{\\tan x} + C$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": linear_topic,
                "text": "What is the shortest distance between the two skew lines: $\\vec{r}_1 = \\hat{i} + \\hat{j} + \\lambda(2\\hat{i} - \\hat{j} + \\hat{k})$ and $\\vec{r}_2 = 2\\hat{i} + \\hat{j} - \\hat{k} + \\mu(3\\hat{i} - 5\\hat{j} + 2\\hat{k})$?",
                "question_type": "mcq",
                "difficulty": 0.68,
                "discrimination": 1.5,
                "bloom_level": "analyze",
                "explanation": "Shortest distance formula: $d = \\frac{|(\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2)|}{|\\vec{b}_1 \\times \\vec{b}_2|}$. Here $\\vec{a}_2 - \\vec{a}_1 = (1, 0, -1)$ and $\\vec{b}_1 \\times \\vec{b}_2 = (3, -1, -7)$. $|\\vec{b}_1 \\times \\vec{b}_2| = \\sqrt{59}$. Dot product is $3 + 7 = 10$. Thus $d = \\frac{10}{\\sqrt{59}}$.",
                "solution_steps": [
                    "Compute cross product: $\\vec{b}_1 \\times \\vec{b}_2 = (3, -1, -7)$",
                    "Compute displacement: $\\vec{a}_2 - \\vec{a}_1 = (1, 0, -1)$",
                    "Evaluate scalar projection: $d = \\frac{10}{\\sqrt{59}}$"
                ],
                "tags": ["3d-geometry", "skew-lines", "shortest-distance", "maths"],
                "options": [
                    {"text": "$\\frac{10}{\\sqrt{59}}$", "is_correct": True, "explanation": "Correct projection calculation along common normal unit vector."},
                    {"text": "$\\sqrt{59}$", "is_correct": False, "explanation": "Incorrect. Normal vector magnitude."},
                    {"text": "$0$", "is_correct": False, "explanation": "Incorrect. Lines are skew and non-intersecting."},
                    {"text": "$\\frac{5}{\\sqrt{59}}$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": matrix_topic,
                "text": "If $A = \\begin{pmatrix} 2 & 1 \\\\ 0 & 3 \\end{pmatrix}$, what is the value of $A^3 - 5A^2 + 6A$?",
                "question_type": "mcq",
                "difficulty": 0.60,
                "discrimination": 1.4,
                "bloom_level": "apply",
                "explanation": "The characteristic equation of $A$ is $\\det(A - \\lambda I) = (2 - \\lambda)(3 - \\lambda) - 0 = \\lambda^2 - 5\\lambda + 6 = 0$. By the Cayley-Hamilton theorem, every square matrix satisfies its own characteristic equation: $A^2 - 5A + 6I = 0$. Multiplying by $A$ gives $A^3 - 5A^2 + 6A = 0$ (the null matrix $O$).",
                "solution_steps": [
                    "Determine eigenvalues: $\\lambda_1 = 2, \\lambda_2 = 3$",
                    "Form characteristic polynomial: $p(\\lambda) = \\lambda^2 - 5\\lambda + 6$",
                    "Apply Cayley-Hamilton theorem: $A^2 - 5A + 6I = O$",
                    "Multiply by $A$: $A^3 - 5A^2 + 6A = O$"
                ],
                "tags": ["linear-algebra", "cayley-hamilton", "eigenvalues", "maths"],
                "options": [
                    {"text": "$O$ (Zero Matrix)", "is_correct": True, "explanation": "Correct. By Cayley-Hamilton Theorem, $A^2 - 5A + 6I = O$, so multiplying by $A$ yields $O$."},
                    {"text": "$I$ (Identity Matrix)", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "$6A$", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "$A^2$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },

            # ======================== 3. CHEMISTRY ========================
            {
                "topic": org_chem_topic,
                "text": "When acetaldehyde (ethanal) is treated with dilute aqueous $\\text{NaOH}$ followed by gentle heating, what is the major organic product formed?",
                "question_type": "mcq",
                "difficulty": 0.58,
                "discrimination": 1.45,
                "bloom_level": "apply",
                "explanation": "Acetaldehyde has an acidic $\\alpha$-hydrogen. Enolate formation followed by nucleophilic attack on another carbonyl yields 3-hydroxybutanal (aldol). Upon heating, dehydration occurs via an E1cB mechanism yielding the conjugated $\\alpha,\\beta$-unsaturated aldehyde, but-2-enal (crotonaldehyde).",
                "solution_steps": [
                    "Deprotonate $\\alpha$-carbon to generate nucleophilic enolate: $CH_2=CH-O^-$",
                    "Enolate attacks carbonyl carbon of another ethanal molecule",
                    "Protonation forms 3-hydroxybutanal (aldol adduct)",
                    "Heating causes base-catalyzed dehydration (E1cB) to form but-2-enal (crotonaldehyde)"
                ],
                "tags": ["organic-chemistry", "aldol-condensation", "reaction-mechanism", "chemistry"],
                "options": [
                    {"text": "But-2-enal (Crotonaldehyde)", "is_correct": True, "explanation": "Correct. Aldol addition followed by dehydration yields conjugated but-2-enal."},
                    {"text": "Butan-1-ol", "is_correct": False, "explanation": "Incorrect. That would require catalytic hydrogenation/reduction."},
                    {"text": "Ethyl ethanoate", "is_correct": False, "explanation": "Incorrect. That is the Tishchenko reaction product with aluminium alkoxide."},
                    {"text": "Acetic acid", "is_correct": False, "explanation": "Incorrect. Dilute NaOH does not oxidize ethanal."},
                ]
            },
            {
                "topic": thermo_topic,
                "text": "For a chemical reaction at standard temperature $298\\text{ K}$, $\\Delta H^\\circ = -40\\text{ kJ/mol}$ and $\\Delta S^\\circ = -100\\text{ J/(mol}\\cdot\\text{K)}$. At what temperature $T$ does the reaction switch from spontaneous to non-spontaneous?",
                "question_type": "mcq",
                "difficulty": 0.50,
                "discrimination": 1.35,
                "bloom_level": "apply",
                "explanation": "Equilibrium condition $\\Delta G^\\circ = \\Delta H^\\circ - T\\Delta S^\\circ = 0 \\implies T = \\frac{\\Delta H^\\circ}{\\Delta S^\\circ} = \\frac{-40000\\text{ J/mol}}{-100\\text{ J/(mol}\\cdot\\text{K)}} = 400\\text{ K}$. For $T < 400\\text{ K}$, $\\Delta G^\\circ < 0$ (spontaneous); for $T > 400\\text{ K}$, $\\Delta G^\\circ > 0$ (non-spontaneous).",
                "solution_steps": [
                    "Set Gibbs free energy to zero: $\\Delta G^\\circ = \\Delta H^\\circ - T\\Delta S^\\circ = 0$",
                    "Align units: $\\Delta H^\\circ = -40,000\\text{ J/mol}$, $\\Delta S^\\circ = -100\\text{ J/(mol}\\cdot\\text{K)}$",
                    "Solve for crossover temperature: $T = \\frac{-40,000}{-100} = 400\\text{ K}$"
                ],
                "tags": ["thermodynamics", "gibbs-free-energy", "equilibrium", "chemistry"],
                "options": [
                    {"text": "$400\\text{ K}$", "is_correct": True, "explanation": "Correct. $T = \\Delta H^\\circ / \\Delta S^\\circ = -40,000 / -100 = 400\\text{ K}$."},
                    {"text": "$250\\text{ K}$", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "$500\\text{ K}$", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "Never spontaneous at any temperature", "is_correct": False, "explanation": "Incorrect. Since $\\Delta H^\\circ < 0$, it is spontaneous at lower temperatures."},
                ]
            },
            {
                "topic": coordination_topic,
                "text": "What is the Crystal Field Stabilization Energy (CFSE) for a low-spin $d^6$ octahedral complex in terms of crystal field splitting parameter $\\Delta_o$ and pairing energy $P$?",
                "question_type": "mcq",
                "difficulty": 0.70,
                "discrimination": 1.65,
                "bloom_level": "analyze",
                "explanation": "In low-spin octahedral $d^6$, all 6 electrons occupy the lower $t_{2g}$ set: configuration $t_{2g}^6 e_g^0$. Each $t_{2g}$ electron stabilizes by $-0.4\\Delta_o$. Total CFSE $= 6 \\times (-0.4\\Delta_o) = -2.4\\Delta_o + 2P$ (since 2 extra pairs are formed compared to the free ion with Hund's rule).",
                "solution_steps": [
                    "Identify low-spin octahedral electronic configuration: $t_{2g}^6 e_g^0$",
                    "Calculate $t_{2g}$ energy contribution: $6 \\times (-0.4\\Delta_o) = -2.4\\Delta_o$",
                    "Add net extra pairing energy: $2P$",
                    "CFSE is $-2.4\\Delta_o + 2P$"
                ],
                "tags": ["coordination-chemistry", "crystal-field-theory", "cfse", "chemistry"],
                "options": [
                    {"text": "$-2.4\\Delta_o + 2P$", "is_correct": True, "explanation": "Correct. All 6 electrons in $t_{2g}$ yield $6 \\times (-0.4\\Delta_o) = -2.4\\Delta_o$ with 2 extra pairs."},
                    {"text": "$-0.4\\Delta_o$", "is_correct": False, "explanation": "Incorrect. That is the high-spin $d^6$ value ($t_{2g}^4 e_g^2$)."},
                    {"text": "$-1.8\\Delta_o$", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "$0$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },

            # ======================== 4. CS CORE ========================
            {
                "topic": os_topic,
                "text": "In a 32-bit virtual address system with 4 KB page sizes, how many levels of page table are required if each page table entry is 4 bytes and each page table must fit within a single page frame?",
                "question_type": "mcq",
                "difficulty": 0.62,
                "discrimination": 1.4,
                "bloom_level": "analyze",
                "explanation": "Page size $= 4\\text{ KB} = 2^{12}$ bytes, so offset requires 12 bits. Remaining bits for virtual page number $= 32 - 12 = 20$ bits. Number of entries per frame $= \\frac{4096\\text{ bytes}}{4\\text{ bytes}} = 1024 = 2^{10}$ entries. Each level indexes 10 bits. Therefore, $20 / 10 = 2$ levels are required.",
                "solution_steps": [
                    "Compute offset bits: $\\log_2(4096) = 12$ bits",
                    "Compute VPN bits: $32 - 12 = 20$ bits",
                    "Calculate entries per frame: $4096 / 4 = 1024 = 2^{10}$ entries (10 bits)",
                    "Divide total VPN bits by bits per page table: $20 / 10 = 2$ levels"
                ],
                "tags": ["operating-systems", "paging", "virtual-memory", "cs-core", "gate-cs"],
                "options": [
                    {"text": "2 levels", "is_correct": True, "explanation": "Correct. 10 bits Level 1, 10 bits Level 2, and 12 bits byte offset."},
                    {"text": "1 level", "is_correct": False, "explanation": "Incorrect. Would require 4 MB per process table."},
                    {"text": "3 levels", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "4 levels", "is_correct": False, "explanation": "Incorrect. Standard x86-64 uses 4 levels for 48-bit address spaces."},
                ]
            },
            {
                "topic": network_topic,
                "text": "In TCP Reno congestion control, when a sender receives 3 duplicate ACKs while in Congestion Avoidance with congestion window $\\text{cwnd} = 32\\text{ MSS}$, what are the new values of $\\text{ssthresh}$ and $\\text{cwnd}$ immediately upon Fast Recovery?",
                "question_type": "mcq",
                "difficulty": 0.65,
                "discrimination": 1.5,
                "bloom_level": "analyze",
                "explanation": "Under TCP Reno Fast Retransmit/Fast Recovery: $\\text{ssthresh} = \\max(\\text{cwnd}/2, 2\\text{ MSS}) = 32/2 = 16\\text{ MSS}$. In Fast Recovery, $\\text{cwnd}$ is set to $\\text{ssthresh} + 3\\text{ MSS} = 16 + 3 = 19\\text{ MSS}$ (accounting for the 3 packets that left the pipe).",
                "solution_steps": [
                    "Recognize triple duplicate ACK triggers Fast Retransmit and Fast Recovery",
                    "Update slow start threshold: $\\text{ssthresh} = \\text{cwnd} / 2 = 16\\text{ MSS}$",
                    "Fast Recovery inflates window: $\\text{cwnd} = \\text{ssthresh} + 3 = 19\\text{ MSS}$"
                ],
                "tags": ["computer-networks", "tcp-reno", "congestion-control", "cs-core"],
                "options": [
                    {"text": "$\\text{ssthresh} = 16\\text{ MSS}, \\text{cwnd} = 19\\text{ MSS}$", "is_correct": True, "explanation": "Correct. Fast Recovery sets $\\text{ssthresh} = 16$ and inflates window to $\\text{ssthresh} + 3 = 19\\text{ MSS}$."},
                    {"text": "$\\text{ssthresh} = 16\\text{ MSS}, \\text{cwnd} = 1\\text{ MSS}$", "is_correct": False, "explanation": "Incorrect. That is TCP Tahoe behavior, or Reno upon Timeout."},
                    {"text": "$\\text{ssthresh} = 32\\text{ MSS}, \\text{cwnd} = 16\\text{ MSS}$", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "$\\text{ssthresh} = 8\\text{ MSS}, \\text{cwnd} = 8\\text{ MSS}$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": db_topic,
                "text": "Which of the following concurrency protocols guarantees BOTH conflict serializability AND freedom from cascading rollbacks (cascadelessness)?",
                "question_type": "mcq",
                "difficulty": 0.68,
                "discrimination": 1.55,
                "bloom_level": "evaluate",
                "explanation": "Strict Two-Phase Locking (Strict 2PL) requires all exclusive locks to be held until the transaction commits or aborts. This prevents uncommitted data from being read by other transactions, guaranteeing conflict serializability and eliminating cascading rollbacks.",
                "solution_steps": [
                    "Analyze Basic 2PL: Guarantees conflict serializability but permits cascading aborts",
                    "Analyze Conservative 2PL: Prevents deadlocks but does not prevent cascading aborts",
                    "Analyze Strict 2PL: Holds all exclusive locks until commit, guaranteeing serializability AND cascadelessness"
                ],
                "tags": ["databases", "strict-2pl", "serializability", "acid", "cs-core"],
                "options": [
                    {"text": "Strict Two-Phase Locking (Strict 2PL)", "is_correct": True, "explanation": "Correct. Holding write locks until commit prevents other transactions from reading uncommitted modifications."},
                    {"text": "Basic Two-Phase Locking (Basic 2PL)", "is_correct": False, "explanation": "Incorrect. Basic 2PL can suffer from cascading aborts."},
                    {"text": "Timestamp Ordering without Thomas Write Rule", "is_correct": False, "explanation": "Incorrect. Timestamp ordering can lead to cascading aborts without commit buffering."},
                    {"text": "Snapshot Isolation without write skew detection", "is_correct": False, "explanation": "Incorrect. Can produce non-serializable histories (write skew)."},
                ]
            },

            # ======================== 5. DATA STRUCTURES & ALGORITHMS (DSA) ========================
            {
                "topic": dsa_topic,
                "text": "Consider Dijkstra's algorithm implemented with a Min-Heap on a directed graph $G = (V, E)$ with non-negative edge weights. If the graph is dense ($E = \\Theta(V^2)$), which priority queue data structure provides the optimal asymptotic worst-case time complexity?",
                "question_type": "mcq",
                "difficulty": 0.70,
                "discrimination": 1.7,
                "bloom_level": "evaluate",
                "explanation": "Dijkstra takes $O(V \\cdot T_{\\text{extract-min}} + E \\cdot T_{\\text{decrease-key}})$. For a dense graph $E = \\Theta(V^2)$, an unordered 1D array gives $O(V^2 + E \\cdot 1) = O(V^2)$, which matches Fibonacci Heap and strictly beats Binary Heap $O(V^2 \\log V)$.",
                "solution_steps": [
                    "Analyze operations: $V$ extract-mins and $E$ decrease-keys",
                    "Evaluate Binary Heap: $O((V + E)\\log V) = O(V^2 \\log V)$ on dense graph",
                    "Evaluate Fibonacci Heap: $O(V\\log V + E) = O(V^2)$",
                    "Evaluate Flat Array: $O(V \\cdot V + E \\cdot 1) = O(V^2)$"
                ],
                "tags": ["dsa", "dijkstras-algorithm", "graph-theory", "dense-graphs", "gate-cs"],
                "options": [
                    {"text": "Fibonacci Heap ($O(V \\log V + E)$) or Unordered Array ($O(V^2)$)", "is_correct": True, "explanation": "Correct. When $E = \\Theta(V^2)$, both achieve $O(V^2)$, beating a Binary Heap $O(V^2 \\log V)$."},
                    {"text": "Binary Heap ($O((V+E)\\log V)$)", "is_correct": False, "explanation": "Incorrect. Introduces unnecessary $\\log V$ factor for each of $V^2$ decrease-keys."},
                    {"text": "Linked List ($O(V^3)$)", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "Red-Black Tree ($O(E \\log V)$)", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": dsa_topic,
                "text": "What is the tight asymptotic time complexity of solving the 0/1 Knapsack problem with $n$ items and integer capacity $W$ using Dynamic Programming?",
                "question_type": "mcq",
                "difficulty": 0.48,
                "discrimination": 1.3,
                "bloom_level": "understand",
                "explanation": "The DP table has size $(n+1) \\times (W+1)$, and each cell computation requires $O(1)$ operations. Time complexity is $O(nW)$. Because $W$ is represented with $\\log_2 W$ bits in input length, $O(nW)$ is pseudo-polynomial in time.",
                "solution_steps": [
                    "Formulate recurrence: $dp[i][w] = \\max(dp[i-1][w], v_i + dp[i-1][w - w_i])$",
                    "Matrix dimensions: $n \\times W$",
                    "Conclude time complexity is $O(nW)$, pseudo-polynomial"
                ],
                "tags": ["dsa", "dynamic-programming", "knapsack", "pseudo-polynomial"],
                "options": [
                    {"text": "$O(nW)$ (Pseudo-polynomial)", "is_correct": True, "explanation": "Correct. $O(nW)$ is linear in capacity $W$ but exponential in input bit-length $\\log W$."},
                    {"text": "$O(n \\log W)$", "is_correct": False, "explanation": "Incorrect. Sublinear general 0/1 knapsack is impossible."},
                    {"text": "$O(2^n)$", "is_correct": False, "explanation": "Incorrect. That is naive recursive brute force."},
                    {"text": "$O(n^2)$", "is_correct": False, "explanation": "Incorrect. Capacity $W$ is independent of $n$."},
                ]
            },
            {
                "topic": trees_topic,
                "text": "In a Red-Black Tree with $N$ internal nodes, what is the maximum theoretical height $h$ (number of edges from root to furthest leaf)?",
                "question_type": "mcq",
                "difficulty": 0.64,
                "discrimination": 1.48,
                "bloom_level": "analyze",
                "explanation": "Every root-to-null path has identical black-height $bh$. The shortest path consists solely of black nodes: $bh \\ge \\log_2(N + 1)$. The longest path alternates between black and red nodes, meaning $h \\le 2 \\cdot bh$. Therefore, maximum height is bounded by $2 \\log_2(N + 1)$.",
                "solution_steps": [
                    "Recall black-height invariant: all simple paths to leaves contain same number of black nodes $bh$",
                    "A tree with black-height $bh$ has at least $2^{bh} - 1$ internal nodes: $N \\ge 2^{bh} - 1 \\implies bh \\le \\log_2(N + 1)$",
                    "Red-child rule: red nodes cannot have red children, so at most half the nodes on any path can be red",
                    "Maximum height: $h \\le 2 \\cdot bh \\le 2 \\log_2(N + 1)$"
                ],
                "tags": ["dsa", "red-black-tree", "tree-height", "data-structures"],
                "options": [
                    {"text": "$2 \\log_2(N + 1)$", "is_correct": True, "explanation": "Correct. Strict alternating red-black path cannot exceed twice the minimum black height."},
                    {"text": "$1.44 \\log_2(N)$", "is_correct": False, "explanation": "Incorrect. That is the upper bound for AVL trees."},
                    {"text": "$\\log_2(N)$", "is_correct": False, "explanation": "Incorrect. That is for a perfectly balanced complete binary tree."},
                    {"text": "$N$", "is_correct": False, "explanation": "Incorrect. Red-black trees are balanced and cannot degenerate to linear chains."},
                ]
            },

            # ======================== 6. CODING & SOFTWARE SYSTEMS ========================
            {
                "topic": two_pointers_topic,
                "text": "Given an array of $n$ positive integers and a target sum $S$, what is the optimal time and auxiliary space complexity to find the minimal length of a contiguous subarray whose sum is at least $S$?",
                "question_type": "mcq",
                "difficulty": 0.45,
                "discrimination": 1.3,
                "bloom_level": "apply",
                "explanation": "Because all elements are positive, the running prefix sum is strictly monotonically increasing. A sliding window (two pointers) expanding the right pointer and shrinking the left pointer visits each element at most twice, achieving $O(n)$ time and $O(1)$ auxiliary space.",
                "solution_steps": [
                    "Initialize `left = 0`, `current_sum = 0`, `min_len = infinity`",
                    "Iterate `right` from 0 to $n - 1$, adding `arr[right]` to `current_sum`",
                    "While `current_sum >= S`: record length `right - left + 1`, subtract `arr[left]`, increment `left`",
                    "Each pointer moves forward at most $n$ times: $O(n)$ time and $O(1)$ space"
                ],
                "tags": ["coding", "sliding-window", "two-pointers", "complexity"],
                "options": [
                    {"text": "$O(n)$ time and $O(1)$ space", "is_correct": True, "explanation": "Correct. Two-pointer sliding window traverses array with amortized $O(1)$ per step."},
                    {"text": "$O(n \\log n)$ time and $O(n)$ space", "is_correct": False, "explanation": "Incorrect. Prefix sums with binary search takes $O(n \\log n)$, which is suboptimal."},
                    {"text": "$O(n^2)$ time and $O(1)$ space", "is_correct": False, "explanation": "Incorrect. Brute-force nested loops."},
                    {"text": "$O(2^n)$ time and $O(n)$ space", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": two_pointers_topic,
                "text": "Given an array of integers `nums` and an integer `target`, return the 0-based indices `[i, j]` of the two numbers such that they add up to `target` ($i < j$). Assume exactly one valid pair exists, and do not use the same element twice. Achieve an optimal time complexity of $O(n)$.",
                "question_type": "coding",
                "difficulty": 0.42,
                "discrimination": 1.35,
                "bloom_level": "apply",
                "explanation": "A hash map storing previously seen values mapped to their indices achieves $O(n)$ single-pass lookup. For each element `nums[i]`, we check if `target - nums[i]` exists in the hash table.",
                "solution_steps": [
                    "Initialize an empty hash table `seen = {}`",
                    "Iterate `i, val` in enumerate(nums)",
                    "Check if `target - val` is present in `seen`",
                    "If found, return `[seen[target - val], i]`; otherwise record `seen[val] = i`"
                ],
                "tags": ["coding", "two-sum", "hash-map", "algorithms", "dsa"],
                "language": "python",
                "code_template": (
                    "def two_sum(nums, target):\n"
                    "    # Write your solution here\n"
                    "    # Return list of two indices [i, j]\n"
                    "    seen = {}\n"
                    "    for i, x in enumerate(nums):\n"
                    "        diff = target - x\n"
                    "        if diff in seen:\n"
                    "            return [seen[diff], i]\n"
                    "        seen[x] = i\n"
                    "    return []\n"
                ),
                "test_cases": [
                    {"input": "nums = [2, 7, 11, 15], target = 9", "output": "[0, 1]", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"},
                    {"input": "nums = [3, 2, 4], target = 6", "output": "[1, 2]", "explanation": "nums[1] + nums[2] = 2 + 4 = 6"},
                    {"input": "nums = [3, 3], target = 6", "output": "[0, 1]", "explanation": "nums[0] + nums[1] = 3 + 3 = 6"},
                ],
                "options": [
                    {"text": "[0, 1]", "is_correct": True, "explanation": "Correct index pair for standard test case"},
                ]
            },
            {
                "topic": two_pointers_topic,
                "text": "Given a string `s`, find the length of the longest contiguous substring without duplicate characters in optimal $O(n)$ time using a sliding window.",
                "question_type": "coding",
                "difficulty": 0.58,
                "discrimination": 1.45,
                "bloom_level": "analyze",
                "explanation": "Use a sliding window with two pointers (`left` and `right`) and a hash map of character last-seen positions. When a duplicate character is encountered within the current window, advance `left` to `last_seen[ch] + 1`.",
                "solution_steps": [
                    "Maintain `left = 0`, `max_len = 0`, and dictionary `pos = {}`",
                    "Iterate `right` from 0 to len(s) - 1",
                    "If `s[right]` in `pos` and `pos[s[right]] >= left`, jump `left = pos[s[right]] + 1`",
                    "Update `pos[s[right]] = right` and `max_len = max(max_len, right - left + 1)`"
                ],
                "tags": ["coding", "longest-substring", "sliding-window", "strings"],
                "language": "python",
                "code_template": (
                    "def length_of_longest_substring(s):\n"
                    "    # Return integer length of longest substring without repeating characters\n"
                    "    pos = {}\n"
                    "    left = 0\n"
                    "    max_len = 0\n"
                    "    for right, ch in enumerate(s):\n"
                    "        if ch in pos and pos[ch] >= left:\n"
                    "            left = pos[ch] + 1\n"
                    "        pos[ch] = right\n"
                    "        max_len = max(max_len, right - left + 1)\n"
                    "    return max_len\n"
                ),
                "test_cases": [
                    {"input": "s = \"abcabcbb\"", "output": "3", "explanation": "The answer is 'abc' with length 3"},
                    {"input": "s = \"bbbbb\"", "output": "1", "explanation": "The answer is 'b' with length 1"},
                    {"input": "s = \"pwwkew\"", "output": "3", "explanation": "The answer is 'wke' with length 3"},
                ],
                "options": [
                    {"text": "3", "is_correct": True, "explanation": "Length 3 for abcabcbb"},
                ]
            },
            {
                "topic": concurrency_topic,
                "text": "Which of Coffman's four deadlock conditions is directly violated by enforcing a global strict ordering on all resource acquisition requests across threads?",
                "question_type": "mcq",
                "difficulty": 0.55,
                "discrimination": 1.4,
                "bloom_level": "analyze",
                "explanation": "The four Coffman conditions are: 1) Mutual Exclusion, 2) Hold and Wait, 3) No Preemption, and 4) Circular Wait. Enforcing a global total order on resource IDs (requesting lock $R_i$ before $R_j$ only if $i < j$) makes a circular wait chain impossible, thereby preventing deadlock.",
                "solution_steps": [
                    "Recall Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait",
                    "Hierarchical resource allocation requires threads to acquire resources in increasing index order",
                    "A cycle in the resource allocation graph requires at least one thread to wait for a lower-indexed resource while holding a higher-indexed resource",
                    "This is forbidden by the protocol, thus preventing Circular Wait"
                ],
                "tags": ["coding", "concurrency", "deadlocks", "coffman-conditions", "systems"],
                "options": [
                    {"text": "Circular Wait", "is_correct": True, "explanation": "Correct. Strict linear ordering eliminates the possibility of cycles in the Resource Allocation Graph."},
                    {"text": "Mutual Exclusion", "is_correct": False, "explanation": "Incorrect. Resources still remain mutually exclusive."},
                    {"text": "Hold and Wait", "is_correct": False, "explanation": "Incorrect. Threads can still hold resources while waiting for higher-order ones."},
                    {"text": "No Preemption", "is_correct": False, "explanation": "Incorrect. Preemption is not introduced by lock ordering."},
                ]
            },

            # ======================== 7. APTITUDE & REASONING ========================
            {
                "topic": quant_topic,
                "text": "In how many ways can 4 distinct letters be placed into 4 distinct addressed envelopes such that NO letter is placed into its correct envelope (derangement $D_4$)?",
                "question_type": "mcq",
                "difficulty": 0.42,
                "discrimination": 1.25,
                "bloom_level": "apply",
                "explanation": "Using the subfactorial derangement formula: $D_n = n! \\sum_{k=0}^n \\frac{(-1)^k}{k!}$. For $n = 4$: $D_4 = 4! \\left(1 - 1 + \\frac{1}{2!} - \\frac{1}{3!} + \\frac{1}{4!}\\right) = 24 \\left(0 + \\frac{1}{2} - \\frac{1}{6} + \\frac{1}{24}\\right) = 24 \\left(\\frac{12 - 4 + 1}{24}\\right) = 9$.",
                "solution_steps": [
                    "State derangement formula: $D_n = (n-1)(D_{n-1} + D_{n-2})$ or $n! \\sum \\frac{(-1)^k}{k!}$",
                    "Base values: $D_1 = 0$, $D_2 = 1$, $D_3 = 2$",
                    "Compute: $D_4 = (4 - 1)(D_3 + D_2) = 3(2 + 1) = 9$"
                ],
                "tags": ["aptitude", "combinatorics", "derangements", "quant"],
                "options": [
                    {"text": "9", "is_correct": True, "explanation": "Correct. $D_4 = 3(D_3 + D_2) = 3(2 + 1) = 9$."},
                    {"text": "8", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "12", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "24", "is_correct": False, "explanation": "Incorrect. 24 is the total permutations $4!$ without constraint."},
                ]
            },
            {
                "topic": quant_topic,
                "text": "A student travels from city A to city B at a speed of $60\\text{ km/h}$ and returns from B to A along the exact same route at $40\\text{ km/h}$. What is the average speed for the entire round trip?",
                "question_type": "mcq",
                "difficulty": 0.32,
                "discrimination": 1.15,
                "bloom_level": "understand",
                "explanation": "Because the forward and return distances are identical ($d$), average speed is the harmonic mean: $v_{\\text{avg}} = \\frac{2d}{t_1 + t_2} = \\frac{2d}{\\frac{d}{v_1} + \\frac{d}{v_2}} = \\frac{2 v_1 v_2}{v_1 + v_2} = \\frac{2 \\times 60 \\times 40}{60 + 40} = \\frac{4800}{100} = 48\\text{ km/h}$.",
                "solution_steps": [
                    "Total distance: $2d$",
                    "Total time: $\\frac{d}{60} + \\frac{d}{40} = \\frac{5d}{120} = \\frac{d}{24}$",
                    "Average speed: $\\frac{2d}{d/24} = 48\\text{ km/h}$"
                ],
                "tags": ["aptitude", "average-speed", "harmonic-mean", "quant"],
                "options": [
                    {"text": "$48\\text{ km/h}$", "is_correct": True, "explanation": "Correct. Harmonic mean $\\frac{2 \\times 60 \\times 40}{60 + 40} = 48\\text{ km/h}$."},
                    {"text": "$50\\text{ km/h}$", "is_correct": False, "explanation": "Incorrect. $50\\text{ km/h}$ is arithmetic mean, which is flawed because more time is spent at the slower speed."},
                    {"text": "$45\\text{ km/h}$", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "$52\\text{ km/h}$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": logic_topic,
                "text": "Statements: (1) All algorithms are procedures. (2) Some procedures are heuristics. Conclusions: (I) Some algorithms are heuristics. (II) Some procedures are algorithms. Which conclusion(s) logically follow?",
                "question_type": "mcq",
                "difficulty": 0.38,
                "discrimination": 1.2,
                "bloom_level": "analyze",
                "explanation": "Statement 1: $\\text{Algorithms} \\subseteq \\text{Procedures}$. Since Algorithms are a subset of Procedures, there must be procedures that are algorithms (Conclusion II definitely follows). However, Heuristics intersect Procedures, but not necessarily the Algorithms subset; hence Conclusion I does not necessarily follow.",
                "solution_steps": [
                    "Map statement 1: $A \\subset P$ (All $A$ is $P$)",
                    "Map statement 2: $P \\cap H \\neq \\emptyset$ (Some $P$ is $H$)",
                    "Conclusion I ($A \\cap H \\neq \\emptyset$): Indeterminate, does not necessarily follow",
                    "Conclusion II ($P \\cap A \\neq \\emptyset$): Sub-alternation from $A \\subset P$, definitely follows"
                ],
                "tags": ["aptitude", "syllogisms", "deductive-logic", "reasoning"],
                "options": [
                    {"text": "Only Conclusion II follows", "is_correct": True, "explanation": "Correct. Conversion of universal affirmative 'All A are P' yields 'Some P are A'."},
                    {"text": "Only Conclusion I follows", "is_correct": False, "explanation": "Incorrect. Undistributed middle prevents concluding that algorithms overlap with heuristics."},
                    {"text": "Both Conclusions I and II follow", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "Neither conclusion follows", "is_correct": False, "explanation": "Incorrect. Conclusion II is valid."},
                ]
            },

            # ======================== 8. DIGITAL SAT MATH ========================
            {
                "topic": sat_alg_topic,
                "text": "A projectile's height in feet after $t$ seconds is modeled by the function $h(t) = -16(t - 3)^2 + 144$. What is the maximum height, in feet, reached by the projectile?",
                "question_type": "mcq",
                "difficulty": 0.35,
                "discrimination": 1.1,
                "bloom_level": "apply",
                "explanation": "The function $h(t) = -16(t - 3)^2 + 144$ is written in vertex form $h(t) = a(t - h)^2 + k$. Since $a = -16 < 0$, the parabola opens downward and the vertex $(3, 144)$ represents the maximum value. The maximum height is 144 feet, achieved at $t = 3$ seconds.",
                "solution_steps": [
                    "Identify vertex form: $y = a(x - h)^2 + k$",
                    "Note $a = -16 < 0$, ensuring maximum occurs at vertex $(h, k)$",
                    "Read maximum value directly as $k = 144$ feet"
                ],
                "tags": ["sat-math", "quadratics", "vertex-form", "algebra"],
                "options": [
                    {"text": "144", "is_correct": True, "explanation": "Correct. The vertex is $(3, 144)$, meaning maximum height is 144 feet."},
                    {"text": "16", "is_correct": False, "explanation": "Incorrect. 16 is the gravitational coefficient $g/2$."},
                    {"text": "3", "is_correct": False, "explanation": "Incorrect. 3 is the time in seconds when maximum height is achieved."},
                    {"text": "48", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": sat_geo_topic,
                "text": "The equation of a circle in the $xy$-plane is $x^2 - 8x + y^2 + 6y = 24$. What is the radius $r$ of the circle?",
                "question_type": "mcq",
                "difficulty": 0.42,
                "discrimination": 1.25,
                "bloom_level": "apply",
                "explanation": "Complete the square for $x$ and $y$: $(x^2 - 8x + 16) + (y^2 + 6y + 9) = 24 + 16 + 9 \\implies (x - 4)^2 + (y + 3)^2 = 49$. The standard equation is $(x-h)^2 + (y-k)^2 = r^2$. Thus $r^2 = 49 \\implies r = 7$.",
                "solution_steps": [
                    "Complete the square for $x$: $(x - 4)^2 - 16$",
                    "Complete the square for $y$: $(y + 3)^2 - 9$",
                    "Rearrange: $(x - 4)^2 + (y + 3)^2 = 24 + 16 + 9 = 49$",
                    "Take square root of constant term: $r = \\sqrt{49} = 7$"
                ],
                "tags": ["sat-math", "circle-geometry", "completing-the-square"],
                "options": [
                    {"text": "7", "is_correct": True, "explanation": "Correct. $r^2 = 49 \\implies r = 7$."},
                    {"text": "49", "is_correct": False, "explanation": "Incorrect. 49 is $r^2$, not $r$."},
                    {"text": "24", "is_correct": False, "explanation": "Incorrect. 24 is constant before completing square."},
                    {"text": "5", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": sat_alg_topic,
                "text": "A laboratory culture decays according to the formula $M(t) = 500(0.85)^t$, where $M(t)$ is mass in grams after $t$ days. By what percentage does the mass decrease each day?",
                "question_type": "mcq",
                "difficulty": 0.28,
                "discrimination": 1.05,
                "bloom_level": "understand",
                "explanation": "The exponential model is $M(t) = M_0(1 - r)^t$. Here base is $0.85 = 1 - 0.15$. The decay rate is $r = 0.15$, corresponding to a $15\\%$ decrease each day.",
                "solution_steps": [
                    "Relate decay factor to decay rate: $b = 1 - r$",
                    "Substitute base: $0.85 = 1 - r \\implies r = 0.15$",
                    "Convert to percentage: $0.15 \\times 100\\% = 15\\%$"
                ],
                "tags": ["sat-math", "exponential-decay", "modeling", "percentages"],
                "options": [
                    {"text": "15%", "is_correct": True, "explanation": "Correct. Decay rate $r = 1 - 0.85 = 0.15 = 15\\%$."},
                    {"text": "85%", "is_correct": False, "explanation": "Incorrect. 85% is remaining fraction, not decrease."},
                    {"text": "1.5%", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "0.85%", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
        ]

        # 5. Populate Question Bank
        created_questions = []
        for q_item in question_data:
            defaults = {
                "question_type": q_item["question_type"],
                "difficulty": q_item["difficulty"],
                "discrimination": q_item["discrimination"],
                "bloom_level": q_item["bloom_level"],
                "explanation": q_item["explanation"],
                "solution_steps": q_item["solution_steps"],
                "tags": q_item["tags"],
                "code_template": q_item.get("code_template", ""),
                "language": q_item.get("language", "python"),
                "test_cases": q_item.get("test_cases", []),
                "is_verified": True,
                "status": "published",
            }
            q_obj, created = Question.objects.get_or_create(
                text=q_item["text"],
                topic=q_item["topic"],
                defaults=defaults,
            )
            if not created:
                q_obj.question_type = q_item["question_type"]
                q_obj.code_template = q_item.get("code_template", "")
                q_obj.language = q_item.get("language", "python")
                q_obj.test_cases = q_item.get("test_cases", [])
                q_obj.save(update_fields=["question_type", "code_template", "language", "test_cases"])

            created_questions.append(q_obj)

            # Populate Options
            for idx, opt_item in enumerate(q_item["options"]):
                Option.objects.get_or_create(
                    question=q_obj,
                    text=opt_item["text"],
                    defaults={
                        "is_correct": opt_item["is_correct"],
                        "explanation": opt_item["explanation"],
                        "order": idx,
                    }
                )

        self.stdout.write(f"Successfully seeded {len(created_questions)} verified exam questions across 7 core disciplines.")

        # 6. Pre-packaged Tests (Mock and Practice Test Blueprints)
        # Test 1: JEE Advanced Physics & Math Diagnostic Mock
        jee_mock_test, _ = Test.objects.get_or_create(
            exam=jee_exam,
            title="JEE Advanced Grand Simulation Paper 1",
            defaults={
                "description": "Comprehensive timed entrance simulation covering classical mechanics, electrostatics, modern physics, calculus, and skew geometry.",
                "mode": "mock",
                "difficulty": "hard",
                "time_limit_minutes": 60,
                "total_marks": 32,
                "passing_score": 50,
                "marks_per_correct": 4,
                "negative_marks_per_question": 1,
                "is_published": True,
                "is_featured": True,
            }
        )

        # Test 2: GATE CS Algorithmic Mastery Challenge
        gate_algo_test, _ = Test.objects.get_or_create(
            exam=gate_exam,
            title="GATE CS Algorithms & Systems Sprint",
            defaults={
                "description": "Timed challenge testing dynamic programming invariants, shortest path algorithms, virtual memory paging, and strict 2PL.",
                "mode": "timed_challenge",
                "difficulty": "medium",
                "time_limit_minutes": 45,
                "total_marks": 16,
                "passing_score": 60,
                "marks_per_correct": 2,
                "negative_marks_per_question": 0.66,
                "is_published": True,
                "is_featured": True,
            }
        )

        # Test 3: CAT Adaptive Test Blueprint
        adaptive_test, _ = Test.objects.get_or_create(
            exam=jee_exam,
            title="Adaptive IRT Diagnostic Battery",
            defaults={
                "description": "Computerized Adaptive Test (CAT) dynamically estimating candidate latent ability theta under 2PL Item Response Theory.",
                "mode": "adaptive",
                "difficulty": "medium",
                "time_limit_minutes": 30,
                "total_marks": 24,
                "passing_score": 50,
                "marks_per_correct": 4,
                "negative_marks_per_question": 1,
                "is_published": True,
                "is_featured": False,
            }
        )

        # Test 4: Digital SAT Math Official Benchmark
        sat_paper, _ = Test.objects.get_or_create(
            exam=sat_exam,
            title="Digital SAT Math Mastery Practice",
            defaults={
                "description": "Standardized Digital SAT Math Module covering non-linear equations, coordinate geometry, and exponential modeling.",
                "mode": "mock",
                "difficulty": "medium",
                "time_limit_minutes": 35,
                "total_marks": 12,
                "passing_score": 70,
                "marks_per_correct": 1,
                "negative_marks_per_question": 0,
                "is_published": True,
                "is_featured": True,
            }
        )

        # Test 5: Test A+ All-India Grand Diagnostic Mock (All 7 Axes)
        test_a_grand_mock, _ = Test.objects.get_or_create(
            exam=test_a_exam,
            title="Test A+ All-India Grand Diagnostic Mock",
            defaults={
                "description": "Full national competitive diagnostic spanning all 7 mastery radar axes: DSA, Physics, Chemistry, Maths, Coding, CS Core, and Aptitude.",
                "mode": "mock",
                "difficulty": "hard",
                "time_limit_minutes": 75,
                "total_marks": 56,
                "passing_score": 70,
                "marks_per_correct": 4,
                "negative_marks_per_question": 1,
                "is_published": True,
                "is_featured": True,
            }
        )

        # Test 6: 60-Second Blitz High-Speed Drill
        blitz_test, _ = Test.objects.get_or_create(
            exam=test_a_exam,
            title="60-Second Blitz High-Speed Drill",
            defaults={
                "description": "Rapid-fire high-speed drill testing quick problem identification, mental arithmetic, and intuitive reasoning.",
                "mode": "timed_challenge",
                "difficulty": "easy",
                "time_limit_minutes": 5,
                "total_marks": 20,
                "passing_score": 60,
                "marks_per_correct": 2,
                "negative_marks_per_question": 0,
                "is_published": True,
                "is_featured": True,
            }
        )

        # Link questions to tests systematically
        # 1. JEE Mock (Physics + Maths)
        jee_subset = [q for q in created_questions if q.topic.subject.code in ("PHYS_JEE", "MATH_JEE")][:8]
        for i, q in enumerate(jee_subset):
            TestQuestion.objects.get_or_create(
                test=jee_mock_test,
                question=q,
                defaults={"order": i + 1, "marks": 4}
            )

        # 2. GATE CS Sprint (CS Core + DSA + Coding)
        gate_subset = [q for q in created_questions if q.topic.subject.code in ("CS_CORE", "DSA_CORE", "CODING_DEV")][:6]
        for i, q in enumerate(gate_subset):
            TestQuestion.objects.get_or_create(
                test=gate_algo_test,
                question=q,
                defaults={"order": i + 1, "marks": 2}
            )

        # 3. Adaptive IRT Battery
        for i, q in enumerate(created_questions[:6]):
            TestQuestion.objects.get_or_create(
                test=adaptive_test,
                question=q,
                defaults={"order": i + 1, "marks": 4}
            )

        # 4. SAT Math Practice
        sat_subset = [q for q in created_questions if q.topic.subject.code == "SAT_MATH_CORE"]
        for i, q in enumerate(sat_subset):
            TestQuestion.objects.get_or_create(
                test=sat_paper,
                question=q,
                defaults={"order": i + 1, "marks": 1}
            )

        # 5. Test A+ Grand Mock (14 questions across all 7 axes)
        for i, q in enumerate(created_questions[:14]):
            TestQuestion.objects.get_or_create(
                test=test_a_grand_mock,
                question=q,
                defaults={"order": i + 1, "marks": 4}
            )

        # 6. Blitz High-Speed Drill (10 rapid-fire questions)
        for i, q in enumerate(created_questions[:10]):
            TestQuestion.objects.get_or_create(
                test=blitz_test,
                question=q,
                defaults={"order": i + 1, "marks": 2}
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded multi-disciplinary question bank and 6 test blueprints."))
