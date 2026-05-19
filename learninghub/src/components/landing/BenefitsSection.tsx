import { motion } from 'framer-motion'
import { GraduationCap, Users, UserCheck, CheckCircle } from 'lucide-react'

const benefits = [
  {
    icon: GraduationCap,
    title: 'For Students',
    audience: 'Students preparing for competitive exams',
    items: [
      'Practice anytime, anywhere - mobile-friendly',
      'Track your weak areas and improve faster',
      'Build exam confidence with real PYQs',
      'Save time with organized chapter-wise content',
      'Compete with peers on leaderboards',
      'Get personalized study recommendations',
    ],
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    icon: Users,
    title: 'For Parents',
    audience: "Parents tracking their child's progress",
    items: [
      'Monitor daily practice and consistency',
      'Get detailed performance reports',
      'Track improvement in weak subjects',
      'Ensure productive screen time',
      'Receive weekly progress summaries',
      'Build confidence before the big day',
    ],
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
  },
  {
    icon: UserCheck,
    title: 'For Teachers',
    audience: 'Coaching teachers and mentors',
    items: [
      'Class-wide performance analytics',
      'Identify common weak areas',
      'Track individual student progress',
      'Create custom tests for batches',
      'Get detailed topic-wise reports',
      'Provide targeted assistance',
    ],
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
  },
]

export function BenefitsSection() {
  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-4">
            Benefits for Everyone
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Built for <span className="text-blue-600">Students, Parents & Teachers</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            LearningHub is designed to support every stakeholder in the exam preparation journey.
          </p>
        </motion.div>

        {/* Benefits Cards */}
        <div className="grid lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className={`${benefit.bgColor} rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-all`}
            >
              {/* Icon */}
              <div
                className={`w-16 h-16 bg-gradient-to-r ${benefit.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
              >
                <benefit.icon className="w-8 h-8 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
              <p className="text-sm text-gray-500 mb-6">{benefit.audience}</p>

              {/* Benefits List */}
              <ul className="space-y-4">
                {benefit.items.map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Common Benefits Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white"
        >
          <h3 className="text-2xl font-bold mb-4">Why Choose LearningHub?</h3>
          <div className="grid md:grid-cols-4 gap-6 text-sm">
            {[
              'Premium Quality Content',
              'Detailed Explanations',
              'Smart Analytics',
              'Affordable Pricing',
            ].map(item => (
              <div key={item} className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-yellow-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default BenefitsSection
