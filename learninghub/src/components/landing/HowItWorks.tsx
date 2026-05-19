import { motion } from 'framer-motion'
import { MousePointer, BookOpen, Brain, TrendingUp } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: MousePointer,
    title: 'Choose Your Exam',
    description:
      'Select from JEE, NEET, BITSAT, or any other competitive exam. We cover all major entrance tests.',
    color: 'bg-blue-500',
  },
  {
    number: '02',
    icon: BookOpen,
    title: 'Select Chapter & Topic',
    description:
      'Browse our organized question bank. Filter by chapter, year, difficulty, or question type.',
    color: 'bg-purple-500',
  },
  {
    number: '03',
    icon: Brain,
    title: 'Practice Questions',
    description:
      'Solve previous year questions with timer. Get instant feedback and detailed solutions.',
    color: 'bg-green-500',
  },
  {
    number: '04',
    icon: TrendingUp,
    title: 'Track Progress',
    description: 'Monitor your accuracy, speed, and weak areas. Get personalized recommendations.',
    color: 'bg-orange-500',
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
            Simple 4-Step Process
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            How <span className="text-blue-600">LearningHub</span> Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start your exam preparation journey in minutes. Our intuitive platform makes learning
            effective and engaging.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
                className="relative"
              >
                {/* Card */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow relative z-10">
                  {/* Number Badge */}
                  <div
                    className={`w-14 h-14 ${step.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <step.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Step Number */}
                  <span className="absolute -top-3 -right-3 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center font-bold text-gray-400">
                    {step.number}
                  </span>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow (Desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-gray-600 mb-4">Ready to start your preparation?</p>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg">
            Get Started Now →
          </button>
        </motion.div>
      </div>
    </section>
  )
}

export default HowItWorks
