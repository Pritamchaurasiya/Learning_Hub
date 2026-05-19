import { motion } from 'framer-motion'
import {
  Atom,
  Microscope,
  Calculator,
  BookOpen,
  Target,
  Award,
  Shield,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'

const exams = [
  {
    id: 'jee-main',
    name: 'JEE Main',
    fullName: 'Joint Entrance Examination - Main',
    icon: Atom,
    color: 'from-blue-500 to-blue-600',
    questions: '45,000+',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    description: 'Gateway to NITs, IIITs, and GFTIs',
  },
  {
    id: 'jee-advanced',
    name: 'JEE Advanced',
    fullName: 'Joint Entrance Examination - Advanced',
    icon: Microscope,
    color: 'from-purple-500 to-purple-600',
    questions: '25,000+',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    description: "Path to IITs - India's premier institutes",
  },
  {
    id: 'neet',
    name: 'NEET',
    fullName: 'National Eligibility cum Entrance Test',
    icon: BookOpen,
    color: 'from-green-500 to-green-600',
    questions: '50,000+',
    subjects: ['Physics', 'Chemistry', 'Biology'],
    description: 'Medical and dental college entrance',
  },
  {
    id: 'bitsat',
    name: 'BITSAT',
    fullName: 'Birla Institute of Technology & Science Admission Test',
    icon: Calculator,
    color: 'from-orange-500 to-orange-600',
    questions: '20,000+',
    subjects: ['Physics', 'Chemistry', 'Math/ Biology'],
    description: 'BITS Pilani, Goa, Hyderabad campuses',
  },
  {
    id: 'wbjee',
    name: 'WBJEE',
    fullName: 'West Bengal Joint Entrance Examination',
    icon: Target,
    color: 'from-pink-500 to-pink-600',
    questions: '15,000+',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    description: 'West Bengal engineering colleges',
  },
  {
    id: 'mht-cet',
    name: 'MHT CET',
    fullName: 'Maharashtra Common Entrance Test',
    icon: Award,
    color: 'from-yellow-500 to-yellow-600',
    questions: '18,000+',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    description: 'Maharashtra engineering & pharmacy',
  },
  {
    id: 'nda',
    name: 'NDA',
    fullName: 'National Defence Academy',
    icon: Shield,
    color: 'from-red-500 to-red-600',
    questions: '12,000+',
    subjects: ['Mathematics', 'General Ability'],
    description: 'Join Indian Army, Navy, Air Force',
  },
  {
    id: 'kvpy',
    name: 'KVPY',
    fullName: 'Kishore Vaigyanik Protsahan Yojana',
    icon: GraduationCap,
    color: 'from-indigo-500 to-indigo-600',
    questions: '8,000+',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    description: 'Scholarship for science research',
  },
]

interface ExamCoverageProps {
  onSelectExam: (examId: string) => void
}

export function ExamCoverage({ onSelectExam }: ExamCoverageProps) {
  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Complete Coverage for <span className="text-blue-600">8 Major Exams</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Practice with chapter-wise previous year questions, detailed solutions, and smart
            analytics for every competitive exam in India.
          </p>
        </motion.div>

        {/* Exam Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {exams.map((exam, index) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              onClick={() => onSelectExam(exam.id)}
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              {/* Card Header with Gradient */}
              <div className={`bg-gradient-to-r ${exam.color} p-4`}>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <exam.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                    {exam.questions}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {exam.name}
                </h3>
                <p className="text-xs text-gray-500 mb-3">{exam.fullName}</p>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{exam.description}</p>

                {/* Subjects */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {exam.subjects.slice(0, 3).map(subject => (
                    <span
                      key={subject}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                    >
                      {subject}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex items-center text-blue-600 font-medium text-sm group-hover:gap-3 transition-all">
                  <span>Start Practicing</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-gray-600 mb-4">
            Don&apos;t see your exam? We&apos;re constantly adding more exams.
          </p>
          <button className="text-blue-600 font-medium hover:underline">Request your exam →</button>
        </motion.div>
      </div>
    </section>
  )
}

export default ExamCoverage
