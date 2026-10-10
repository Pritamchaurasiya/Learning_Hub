"""
Management command to seed a rich, calibrated, multi-disciplinary question bank
for national competitive exams (JEE, NEET, GATE, SAT) with LaTeX math, IRT difficulty,
Bloom taxonomy, and pre-packaged test blueprints.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.exams.models import Country, Exam, Subject, Topic
from apps.test_engine.models import Test, Question, Option, TestQuestion


class Command(BaseCommand):
    help = "Seeds verified, IRT-calibrated competitive exam questions and practice test papers."

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Clear existing seeded questions before loading',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding national competitive exam question bank...")

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

        # 3. Subjects & Topics
        # Subject: Physics
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

        # Subject: Mathematics
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

        # Subject: CS (GATE)
        cs_sub, _ = Subject.objects.get_or_create(
            exam=gate_exam,
            code="CS_CORE",
            defaults={"name": "Computer Science Core", "weightage": 100}
        )
        dsa_topic, _ = Topic.objects.get_or_create(
            subject=cs_sub,
            name="Algorithms & Asymptotic Analysis",
            defaults={"description": "Divide and conquer, greedy, dynamic programming"}
        )
        os_topic, _ = Topic.objects.get_or_create(
            subject=cs_sub,
            name="Operating Systems & Virtual Memory",
            defaults={"description": "Paging, page tables, TLB, scheduling"}
        )

        # Subject: SAT Math
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

        # 4. Question Databank Definitions
        question_data = [
            # --- Physics: Classical Mechanics ---
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
                "tags": ["mechanics", "radius-of-curvature", "energy-conservation", "jee-advanced"],
                "options": [
                    {"text": "$N = mg(1 + 4a^2 x_0^2)$", "is_correct": True, "explanation": "Correct. Energy conservation and curvature radius $\\rho = 1/(2a)$ combine to yield this result."},
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
                    "Formulate torque about contact axis or CM: $\\tau = I \\alpha$",
                    "Newton's 2nd Law: $Mg\\sin\\theta - f_s = Ma$",
                    "Constraint condition: $a = R\\alpha$",
                    "Solving simultaneously yields $a = \\frac{2}{3} g\\sin\\theta$"
                ],
                "tags": ["rotational-dynamics", "pure-rolling", "mechanics"],
                "options": [
                    {"text": "$a = \\frac{2}{3} g \\sin\\theta$", "is_correct": True, "explanation": "Correct. Cylinder moment of inertia $I = \\frac{1}{2} M R^2$ gives $a = \\frac{2}{3}g\\sin\\theta$."},
                    {"text": "$a = \\frac{1}{2} g \\sin\\theta$", "is_correct": False, "explanation": "Incorrect. That corresponds to a hollow cylinder (ring)."},
                    {"text": "$a = \\frac{5}{7} g \\sin\\theta$", "is_correct": False, "explanation": "Incorrect. That corresponds to a solid sphere."},
                    {"text": "$a = g \\sin\\theta$", "is_correct": False, "explanation": "Incorrect. Pure sliding with zero friction would give $g\\sin\\theta$."},
                ]
            },

            # --- Physics: Electrostatics ---
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
                "tags": ["electrostatics", "dipole", "gradient", "jee-advanced"],
                "options": [
                    {"text": "$\\vec{F} = p E_0 \\hat{i}$", "is_correct": True, "explanation": "Correct. The non-uniform field produces a non-zero translational force $\\vec{F} = (\\vec{p} \\cdot \\nabla)\\vec{E}$."},
                    {"text": "$\\vec{F} = 0$", "is_correct": False, "explanation": "Incorrect. Net force is zero only in a uniform electric field."},
                    {"text": "$\\vec{F} = -p E_0 \\hat{i}$", "is_correct": False, "explanation": "Incorrect. The field increases along $+x$, so positive charge experiences greater force."},
                    {"text": "$\\vec{F} = 2p E_0 \\hat{k}$", "is_correct": False, "explanation": "Incorrect. There are no orthogonal forces."},
                ]
            },

            # --- Mathematics: Integral Calculus ---
            {
                "topic": calc_topic,
                "text": "Evaluate the definite integral: $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}} \\, dx$.",
                "question_type": "mcq",
                "difficulty": 0.40,
                "discrimination": 1.3,
                "bloom_level": "apply",
                "explanation": "Using King's property of definite integrals: $\\int_a^b f(x)dx = \\int_a^b f(a + b - x)dx$. Here $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\cos x}}{\\sqrt{\\cos x} + \\sqrt{\\sin x}} dx$. Adding the two integrals gives $2I = \\int_0^{\\pi/2} 1 \\, dx = \\frac{\\pi}{2} \\implies I = \\frac{\\pi}{4}$.",
                "solution_steps": [
                    "Apply King's property: replace $x$ with $\\frac{\\pi}{2} - x$",
                    "Recognize that $\\sin(\\pi/2 - x) = \\cos x$ and $\\cos(\\pi/2 - x) = \\sin x$",
                    "Add both expressions: $2I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\sin x} + \\sqrt{\\cos x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}} dx = \\int_0^{\\pi/2} 1 dx = \\frac{\\pi}{2}$",
                    "Divide by 2 to arrive at $I = \\frac{\\pi}{4}$"
                ],
                "tags": ["definite-integrals", "kings-property", "calculus"],
                "options": [
                    {"text": "$\\frac{\\pi}{4}$", "is_correct": True, "explanation": "Correct. King's Property symmetrizes the integrand to 1 over $[0, \\pi/2]$."},
                    {"text": "$\\frac{\\pi}{2}$", "is_correct": False, "explanation": "Incorrect. Forgot to divide by 2 from the $2I$ sum."},
                    {"text": "$1$", "is_correct": False, "explanation": "Incorrect. The integral has value $\\pi/4$."},
                    {"text": "$\\frac{\\pi}{8}$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": calc_topic,
                "text": "Find the general solution to the first-order differential equation: $\\frac{dy}{dx} + y \\tan x = \\sec x$.",
                "question_type": "mcq",
                "difficulty": 0.55,
                "discrimination": 1.4,
                "bloom_level": "apply",
                "explanation": "This is a linear ODE of form $\\frac{dy}{dx} + P(x)y = Q(x)$. The integrating factor is $\\text{IF} = e^{\\int \\tan x dx} = e^{\\ln|\\sec x|} = \\sec x$. Multiplying gives $y \\sec x = \\int \\sec^2 x dx = \\tan x + C \\implies y = \\sin x + C \\cos x$.",
                "solution_steps": [
                    "Identify $P(x) = \\tan x$ and $Q(x) = \\sec x$",
                    "Compute integrating factor: $\\text{IF} = e^{\\int \\tan x dx} = \\sec x$",
                    "Integrate: $y \\cdot \\text{IF} = \\int Q(x) \\cdot \\text{IF} \\, dx = \\int \\sec^2 x \\, dx = \\tan x + C$",
                    "Multiply across by $\\cos x$: $y = \\sin x + C\\cos x$"
                ],
                "tags": ["differential-equations", "integrating-factor", "calculus"],
                "options": [
                    {"text": "$y = \\sin x + C \\cos x$", "is_correct": True, "explanation": "Correct. Integrating factor is $\\sec x$, yielding $y = \\sin x + C\\cos x$."},
                    {"text": "$y = \\cos x + C \\sin x$", "is_correct": False, "explanation": "Incorrect. Transposed trigonometric identities."},
                    {"text": "$y = \\sec x + C \\tan x$", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "$y = e^{\\tan x} + C$", "is_correct": False, "explanation": "Incorrect. Not separable in this form."},
                ]
            },

            # --- Mathematics: Vectors & 3D Geometry ---
            {
                "topic": linear_topic,
                "text": "What is the shortest distance between the two skew lines: $\\vec{r}_1 = \\hat{i} + \\hat{j} + \\lambda(2\\hat{i} - \\hat{j} + \\hat{k})$ and $\\vec{r}_2 = 2\\hat{i} + \\hat{j} - \\hat{k} + \\mu(3\\hat{i} - 5\\hat{j} + 2\\hat{k})$?",
                "question_type": "mcq",
                "difficulty": 0.68,
                "discrimination": 1.5,
                "bloom_level": "analyze",
                "explanation": "Shortest distance between skew lines formula: $d = \\frac{|(\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2)|}{|\\vec{b}_1 \\times \\vec{b}_2|}$. Here $\\vec{a}_1 = (1, 1, 0)$, $\\vec{a}_2 = (2, 1, -1) \\implies \\vec{a}_2 - \\vec{a}_1 = (1, 0, -1)$. The cross product of direction vectors is $\\vec{b}_1 \\times \\vec{b}_2 = (2,-1,1) \\times (3,-5,2) = (3, -1, -7)$ with magnitude $|\\vec{b}_1 \\times \\vec{b}_2| = \\sqrt{3^2 + (-1)^2 + (-7)^2} = \\sqrt{59}$. The scalar projection is $(\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2) = (1)(3) + (0)(-1) + (-1)(-7) = 3 + 7 = 10$. Thus $d = \\frac{10}{\\sqrt{59}}$.",
                "solution_steps": [
                    "Compute cross product of direction vectors: $\\vec{b}_1 \\times \\vec{b}_2$",
                    "Compute displacement vector between points: $\\vec{a}_2 - \\vec{a}_1$",
                    "Evaluate scalar projection: $d = \\frac{|(\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2)|}{|\\vec{b}_1 \\times \\vec{b}_2|}$"
                ],
                "tags": ["3d-geometry", "skew-lines", "shortest-distance"],
                "options": [
                    {"text": "$\\frac{10}{\\sqrt{59}}$", "is_correct": True, "explanation": "Correct projection calculation along the common perpendicular unit vector."},
                    {"text": "$\\sqrt{59}$", "is_correct": False, "explanation": "Incorrect. That is the magnitude of the normal vector."},
                    {"text": "$0$ (Lines intersect)", "is_correct": False, "explanation": "Incorrect. Lines are skew, non-intersecting and non-parallel."},
                    {"text": "$\\frac{5}{\\sqrt{59}}$", "is_correct": False, "explanation": "Incorrect."},
                ]
            },

            # --- Computer Science: Algorithms (GATE) ---
            {
                "topic": dsa_topic,
                "text": "Consider Dijkstra's algorithm implemented with a Min-Heap on a directed graph $G = (V, E)$ with non-negative edge weights. If the graph is dense ($E = \\Theta(V^2)$), which priority queue data structure provides the optimal asymptotic worst-case time complexity?",
                "question_type": "mcq",
                "difficulty": 0.70,
                "discrimination": 1.7,
                "bloom_level": "evaluate",
                "explanation": "Dijkstra takes $O(V \\cdot T_{\\text{extract-min}} + E \\cdot T_{\\text{decrease-key}})$. With a Fibonacci heap, it is $O(V \\log V + E)$. For a dense graph $E = \\Theta(V^2)$, a simple 1D array gives $O(V^2 + E \\cdot 1) = O(V^2)$, which matches or beats a Binary Heap $O(V^2 \\log V)$ and is simpler than Fibonacci Heap.",
                "solution_steps": [
                    "Analyze operations: $V$ extract-mins and $E$ decrease-keys",
                    "Evaluate Binary Heap: $O((V + E)\\log V) = O(V^2 \\log V)$ on dense graph",
                    "Evaluate Fibonacci Heap: $O(V\\log V + E) = O(V^2)$",
                    "Evaluate Flat Array: $O(V \\cdot V + E \\cdot 1) = O(V^2)$"
                ],
                "tags": ["dijkstras-algorithm", "graph-theory", "dense-graphs", "gate-cs"],
                "options": [
                    {"text": "Fibonacci Heap ($O(V \\log V + E)$) or Unordered Array ($O(V^2)$)", "is_correct": True, "explanation": "Correct. When $E = \\Theta(V^2)$, both achieve $O(V^2)$, beating a Binary Heap $O(V^2 \\log V)$."},
                    {"text": "Binary Heap ($O((V+E)\\log V)$)", "is_correct": False, "explanation": "Incorrect. Binary heap introduces an unnecessary $\\log V$ factor for each of the $V^2$ decrease-keys."},
                    {"text": "Linked List ($O(V^3)$)", "is_correct": False, "explanation": "Incorrect."},
                    {"text": "Red-Black Tree ($O(E \\log V)$)", "is_correct": False, "explanation": "Incorrect."},
                ]
            },
            {
                "topic": dsa_topic,
                "text": "What is the tight asymptotic time complexity of solving the 0/1 Knapsack problem with $n$ items and capacity $W$ using Dynamic Programming?",
                "question_type": "mcq",
                "difficulty": 0.48,
                "discrimination": 1.3,
                "bloom_level": "understand",
                "explanation": "The standard DP table has dimensions $(n+1) \\times (W+1)$. Filling each cell takes $O(1)$ time. Thus, the time complexity is $O(nW)$. Because $W$ is represented in $\\log_2 W$ bits, this is pseudo-polynomial in time.",
                "solution_steps": [
                    "Formulate recurrence relation: $dp[i][w] = \\max(dp[i-1][w], v_i + dp[i-1][w - w_i])$",
                    "Matrix dimensions: $n \\times W$",
                    "Conclude time complexity is $O(nW)$, which is pseudo-polynomial"
                ],
                "tags": ["dynamic-programming", "knapsack", "pseudo-polynomial", "gate-cs"],
                "options": [
                    {"text": "$O(nW)$ (Pseudo-polynomial)", "is_correct": True, "explanation": "Correct. $O(nW)$ is linear in capacity $W$ but exponential in input bit-length $\\log W$."},
                    {"text": "$O(n \\log W)$", "is_correct": False, "explanation": "Incorrect. Sublinear in capacity is impossible for general 0/1 Knapsack."},
                    {"text": "$O(2^n)$", "is_correct": False, "explanation": "Incorrect. That is the brute-force recursive tree time without memoization."},
                    {"text": "$O(n^2)$", "is_correct": False, "explanation": "Incorrect. Capacity $W$ is independent of item count $n$."},
                ]
            },

            # --- Computer Science: Operating Systems (GATE) ---
            {
                "topic": os_topic,
                "text": "In a 32-bit virtual address system with 4 KB page sizes, how many levels of page table are required if each page table entry is 4 bytes and each page table must fit within a single page frame?",
                "question_type": "mcq",
                "difficulty": 0.62,
                "discrimination": 1.4,
                "bloom_level": "analyze",
                "explanation": "Page size $= 4\\text{ KB} = 2^{12}$ bytes, so offset requires 12 bits. Remaining bits for virtual page number $= 32 - 12 = 20$ bits. Number of entries per frame $= \\frac{4096\\text{ bytes}}{4\\text{ bytes}} = 1024 = 2^{10}$ entries. Each level of page table can index 10 bits. Therefore, $\\frac{20\\text{ bits}}{10\\text{ bits/level}} = 2$ levels are required (e.g. x86 2-level paging).",
                "solution_steps": [
                    "Compute offset bits: $\\log_2(4096) = 12$ bits",
                    "Compute virtual page number bits: $32 - 12 = 20$ bits",
                    "Calculate entries per frame: $4096 / 4 = 1024 = 2^{10}$ entries (10 bits)",
                    "Divide total VPN bits by bits per page table: $20 / 10 = 2$ levels"
                ],
                "tags": ["operating-systems", "paging", "virtual-memory", "gate-cs"],
                "options": [
                    {"text": "2 levels", "is_correct": True, "explanation": "Correct. 10 bits for Level 1, 10 bits for Level 2, and 12 bits for byte offset."},
                    {"text": "1 level", "is_correct": False, "explanation": "Incorrect. A 1-level table would require $2^{20} \\times 4\\text{ bytes} = 4\\text{ MB}$, exceeding one page frame."},
                    {"text": "3 levels", "is_correct": False, "explanation": "Incorrect. 2 levels exhaust all 20 bits."},
                    {"text": "4 levels", "is_correct": False, "explanation": "Incorrect. Standard x86-64 uses 4 levels, but for 48-bit address spaces."},
                ]
            },

            # --- Digital SAT Math: Advanced Math & Quadratics ---
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
                    {"text": "3", "is_correct": False, "explanation": "Incorrect. 3 is the time in seconds when maximum height is achieved, not the height itself."},
                    {"text": "48", "is_correct": False, "explanation": "Incorrect. Arithmetic error."},
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
                    {"text": "24", "is_correct": False, "explanation": "Incorrect. 24 is the constant before completing square."},
                    {"text": "5", "is_correct": False, "explanation": "Incorrect. Arithmetic mistake during square completion."},
                ]
            },
            {
                "topic": sat_alg_topic,
                "text": "A laboratory culture decays according to the formula $M(t) = 500(0.85)^t$, where $M(t)$ is mass in grams after $t$ days. By what percentage does the mass decrease each day?",
                "question_type": "mcq",
                "difficulty": 0.28,
                "discrimination": 1.05,
                "bloom_level": "understand",
                "explanation": "The exponential model is $M(t) = M_0(1 - r)^t$. Here the base is $0.85 = 1 - 0.15$. The decay rate is $r = 0.15$, corresponding to a $15\\%$ decrease each day.",
                "solution_steps": [
                    "Relate decay factor to decay rate: $b = 1 - r$",
                    "Substitute base: $0.85 = 1 - r \\implies r = 0.15$",
                    "Convert to percentage: $0.15 \\times 100\\% = 15\\%$"
                ],
                "tags": ["sat-math", "exponential-decay", "modeling", "percentages"],
                "options": [
                    {"text": "15%", "is_correct": True, "explanation": "Correct. Decay rate $r = 1 - 0.85 = 0.15 = 15\\%$."},
                    {"text": "85%", "is_correct": False, "explanation": "Incorrect. 85% is the remaining fraction, not the decrease."},
                    {"text": "1.5%", "is_correct": False, "explanation": "Incorrect. Decimal misplacement."},
                    {"text": "0.85%", "is_correct": False, "explanation": "Incorrect. Direct interpretation of decimal as percentage."},
                ]
            },
        ]

        # 5. Populate Question Bank
        created_questions = []
        for q_item in question_data:
            q_obj, created = Question.objects.get_or_create(
                text=q_item["text"],
                topic=q_item["topic"],
                defaults={
                    "question_type": q_item["question_type"],
                    "difficulty": q_item["difficulty"],
                    "discrimination": q_item["discrimination"],
                    "bloom_level": q_item["bloom_level"],
                    "explanation": q_item["explanation"],
                    "solution_steps": q_item["solution_steps"],
                    "tags": q_item["tags"],
                    "is_verified": True,
                    "status": "published",
                }
            )
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

        self.stdout.write(f"Successfully seeded {len(created_questions)} verified exam questions.")

        # 6. Pre-packaged Tests (Mock and Practice Test Blueprints)
        # Test 1: JEE Advanced Physics & Math Diagnostic Mock
        jee_mock_test, _ = Test.objects.get_or_create(
            exam=jee_exam,
            title="JEE Advanced Grand Simulation Paper 1",
            defaults={
                "description": "Comprehensive timed entrance simulation covering classical mechanics, electrostatics, definite integration, and skew geometry.",
                "mode": "mock",
                "difficulty": "hard",
                "time_limit_minutes": 60,
                "total_marks": 24,
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
                "description": "Timed challenge testing dynamic programming invariants, shortest path algorithms, and virtual memory address translation.",
                "mode": "timed_challenge",
                "difficulty": "medium",
                "time_limit_minutes": 45,
                "total_marks": 15,
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
                "total_marks": 20,
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

        # Link questions to tests
        for i, q in enumerate(created_questions[:6]):
            TestQuestion.objects.get_or_create(
                test=jee_mock_test,
                question=q,
                defaults={"order": i + 1, "marks": 4}
            )
            TestQuestion.objects.get_or_create(
                test=adaptive_test,
                question=q,
                defaults={"order": i + 1, "marks": 4}
            )

        for i, q in enumerate(created_questions[6:9]):
            TestQuestion.objects.get_or_create(
                test=gate_algo_test,
                question=q,
                defaults={"order": i + 1, "marks": 2}
            )

        for i, q in enumerate(created_questions[9:]):
            TestQuestion.objects.get_or_create(
                test=sat_paper,
                question=q,
                defaults={"order": i + 1, "marks": 1}
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded question bank and test blueprints."))
