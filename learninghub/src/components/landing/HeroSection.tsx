import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import { Play, ArrowRight, Star, Users, BookOpen, Award } from 'lucide-react'

interface HeroSectionProps {
  onStartFree: () => void
  onViewDemo: () => void
}

export function HeroSection({ onStartFree, onViewDemo }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6"
            >
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white text-sm font-medium">Trusted by 1,00,000+ Students</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Master Your Exam with <span className="text-yellow-300">India&apos;s Best</span>{' '}
              Practice Platform
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-xl">
              Chapter-wise Previous Year Questions • Detailed Step-by-Step Solutions • Smart
              Analytics to Track Your Progress
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Button
                size="lg"
                onClick={onStartFree}
                className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8 py-4 text-lg shadow-xl"
              >
                Start Free Practice
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onViewDemo}
                className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                View Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>1L+ Questions</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>50K+ Daily Practice</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span>98% Success Rate</span>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Mock UI */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Main Card */}
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Physics - Mechanics</p>
                      <p className="text-sm text-gray-500">JEE Main 2023</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Easy
                  </span>
                </div>

                <p className="text-gray-700 mb-4">
                  A particle moves in a circular path of radius R. If the speed increases...
                </p>

                <div className="space-y-2 mb-4">
                  {['v²/R', '2v²/R', 'v²/2R', '4v²/R'].map((option, i) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        i === 1
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="font-medium text-gray-700">{option}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Award className="w-4 h-4" />
                    <span>+4 marks</span>
                  </div>
                  <button className="text-blue-600 font-medium text-sm hover:underline">
                    View Solution →
                  </button>
                </div>
              </div>

              {/* Floating Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">85%</p>
                    <p className="text-sm text-gray-500">Your Accuracy</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating Streak Card */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <div
                        key={day}
                        className={`w-3 h-8 mx-0.5 rounded-sm ${
                          day <= 5 ? 'bg-orange-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="ml-2">
                    <p className="text-lg font-bold text-gray-900">5 Day</p>
                    <p className="text-xs text-gray-500">Streak 🔥</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1.5 h-3 bg-white/60 rounded-full mt-2"
          />
        </div>
      </motion.div>
    </section>
  )
}

export default HeroSection
