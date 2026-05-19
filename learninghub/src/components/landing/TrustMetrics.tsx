import { motion } from 'framer-motion'
import { BookOpen, Users, Award, Star, TrendingUp, Clock } from 'lucide-react'

const metrics = [
  {
    icon: BookOpen,
    value: '1,00,000+',
    label: 'Practice Questions',
    description: 'From 15+ years of previous year papers',
  },
  {
    icon: Users,
    value: '50,000+',
    label: 'Daily Active Students',
    description: 'Practicing every single day',
  },
  {
    icon: Award,
    value: '500+',
    label: 'Chapters Covered',
    description: 'Across all major subjects',
  },
  {
    icon: Star,
    value: '98%',
    label: 'Success Rate',
    description: 'Students report improvement',
  },
  {
    icon: TrendingUp,
    value: '4.9/5',
    label: 'App Rating',
    description: 'Based on 10,000+ reviews',
  },
  {
    icon: Clock,
    value: '24/7',
    label: 'Support Available',
    description: 'Round the clock assistance',
  },
]

const testimonials = [
  {
    name: 'Rahul Sharma',
    exam: 'JEE Advanced 2023',
    rank: 'AIR 247',
    quote:
      'LearningHub helped me identify my weak areas in Physics. The chapter-wise PYQs and detailed solutions were game-changers for my preparation.',
    avatar: 'RS',
  },
  {
    name: 'Priya Patel',
    exam: 'NEET 2023',
    score: 'Score: 685/720',
    quote:
      'The daily streak feature kept me consistent. Practicing 50 questions every day for 6 months made Biology my strongest subject.',
    avatar: 'PP',
  },
  {
    name: 'Arjun Kumar',
    exam: 'BITSAT 2023',
    score: 'Score: 380/390',
    quote:
      'Custom test creation helped me practice time management. The analytics showed exactly where I was losing marks.',
    avatar: 'AK',
  },
]

export function TrustMetrics() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
            Trusted by Aspiring Achievers
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Numbers That <span className="text-yellow-400">Speak Success</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Join thousands of students who have transformed their exam preparation with LearningHub.
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-20">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <metric.icon className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-white mb-1">{metric.value}</p>
              <p className="text-lg font-semibold text-gray-300 mb-2">{metric.label}</p>
              <p className="text-sm text-gray-400">{metric.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h3 className="text-2xl font-bold mb-2">What Our Students Say</h3>
          <p className="text-gray-400">Success stories from toppers</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
            >
              {/* Quote */}
              <div className="mb-4">
                <svg className="w-8 h-8 text-yellow-400/50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.312 6.465-11.723 1.29-1.082 2.341-1.953 2.341-3.023 0-.637-.484-1.071-1.138-1.071-1.191 0-3.374 1.162-5.187 2.747-2.088 1.834-3.596 4.08-3.596 7.096v11.365h1.115zm-9.995 0v-7.391c0-5.704 3.731-9.312 6.465-11.723 1.29-1.082 2.341-1.953 2.341-3.023 0-.637-.484-1.071-1.138-1.071-1.191 0-3.374 1.162-5.187 2.747-2.088 1.834-3.596 4.08-3.596 7.096v11.365h1.115z" />
                </svg>
              </div>

              <p className="text-gray-300 mb-6 leading-relaxed">&quot;{testimonial.quote}&quot;</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">{testimonial.exam}</p>
                  {testimonial.rank && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded font-medium">
                      {testimonial.rank}
                    </span>
                  )}
                  {testimonial.score && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-medium">
                      {testimonial.score}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-400 mb-6 text-sm uppercase tracking-wider">
            Trusted by students from
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500">
            {['IITs', 'AIIMS', 'NITs', 'BITS', 'Top Medical Colleges', 'IISc'].map(institute => (
              <span
                key={institute}
                className="text-lg font-semibold opacity-60 hover:opacity-100 transition-opacity"
              >
                {institute}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default TrustMetrics
