import { motion } from 'framer-motion'
import {
  BookOpen,
  Lightbulb,
  FileEdit,
  Gamepad2,
  Calculator,
  StickyNote,
  Bookmark,
  Target,
  TrendingUp,
  BrainCircuit,
  CheckCircle,
  Clock,
} from 'lucide-react'

const features = [
  {
    icon: BookOpen,
    title: 'Chapter-wise PYQs',
    description:
      'Practice previous year questions organized by chapter and topic. Filter by year, difficulty, and question type.',
    color: 'bg-blue-500',
    benefits: ['15+ years of PYQs', 'Detailed solutions', 'Difficulty filtering'],
  },
  {
    icon: Lightbulb,
    title: 'Step-by-Step Solutions',
    description:
      'Every question comes with detailed explanations, concept breakdowns, and shortcut methods where applicable.',
    color: 'bg-yellow-500',
    benefits: ['Video solutions', 'Multiple approaches', 'Concept clarity'],
  },
  {
    icon: FileEdit,
    title: 'Custom Test Creation',
    description:
      'Create personalized tests by selecting chapters, topics, difficulty levels, and time limits.',
    color: 'bg-green-500',
    benefits: ['Flexible selection', 'Timed tests', 'Instant results'],
  },
  {
    icon: Gamepad2,
    title: 'Quiz Mode Practice',
    description:
      'Quick practice sessions with gamified elements. Track your speed and accuracy in real-time.',
    color: 'bg-purple-500',
    benefits: ['Timed challenges', 'Leaderboard', 'Speed tracking'],
  },
  {
    icon: Calculator,
    title: 'Formula Cards',
    description:
      'Quick-reference formula cards for every chapter. Memorize and revise important formulas efficiently.',
    color: 'bg-orange-500',
    benefits: ['Chapter-wise', 'Quick revision', 'Printable'],
  },
  {
    icon: StickyNote,
    title: 'Revision Notes',
    description:
      'Concise revision notes covering key concepts, important points, and quick formulas for each topic.',
    color: 'bg-pink-500',
    benefits: ['Key concepts', 'Quick review', 'Exam-focused'],
  },
  {
    icon: Bookmark,
    title: 'Smart Bookmarking',
    description:
      'Bookmark important questions for quick revision. Add personal notes and organize by custom tags.',
    color: 'bg-indigo-500',
    benefits: ['Personal notes', 'Custom tags', 'Quick access'],
  },
  {
    icon: Target,
    title: 'Daily Goals & Streaks',
    description:
      'Set daily practice targets and maintain your streak. Build consistent study habits with gamified tracking.',
    color: 'bg-red-500',
    benefits: ['Goal setting', 'Streak tracking', 'Motivation'],
  },
  {
    icon: TrendingUp,
    title: 'Weak Area Analysis',
    description:
      'AI-powered analysis identifies your weak topics and recommends targeted practice sessions.',
    color: 'bg-teal-500',
    benefits: ['Smart analysis', 'Targeted practice', 'Improvement tracking'],
  },
  {
    icon: BrainCircuit,
    title: 'Progress Analytics',
    description:
      'Comprehensive analytics dashboard showing your performance trends, accuracy, and improvement over time.',
    color: 'bg-cyan-500',
    benefits: ['Visual graphs', 'Performance trends', 'Peer comparison'],
  },
]

export function FeaturesGrid() {
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
          <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
            Powerful Learning Tools
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need to <span className="text-blue-600">Ace Your Exam</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From practice questions to detailed analytics, we provide all the tools you need for
            effective exam preparation.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="group bg-gray-50 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              {/* Icon */}
              <div
                className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{feature.description}</p>

              {/* Benefits */}
              <ul className="space-y-2">
                {feature.benefits.map(benefit => (
                  <li key={benefit} className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { icon: BookOpen, value: '1,00,000+', label: 'Practice Questions' },
            { icon: Clock, value: '15+ Years', label: 'PYQ Archives' },
            { icon: Target, value: '500+ Chapters', label: 'Covered' },
            { icon: TrendingUp, value: '98%', label: 'Success Rate' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <stat.icon className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default FeaturesGrid
