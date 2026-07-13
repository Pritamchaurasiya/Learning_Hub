import { memo } from 'react'
import { motion } from 'framer-motion'
import { Shield, FileText, Scale, Eye, Mail, AlertCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'

const sections = [
  {
    icon: FileText,
    title: '1. Acceptance of Terms',
    content:
      'By accessing or using LearningHub, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform. We reserve the right to update these terms at any time, and continued use constitutes acceptance of changes.',
  },
  {
    icon: Scale,
    title: '2. User Responsibilities',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree not to misuse the platform, including but not limited to: attempting unauthorized access, distributing malware, engaging in plagiarism, or violating any applicable laws.',
  },
  {
    icon: Eye,
    title: '3. Content Ownership',
    content:
      'You retain ownership of any content you submit to LearningHub. By submitting content, you grant us a non-exclusive, worldwide license to use, reproduce, and display such content solely for operating and improving the platform. We do not claim ownership of your learning materials.',
  },
  {
    icon: Mail,
    title: '4. Communication',
    content:
      'We may send you emails regarding platform updates, security notices, and promotional content. You can opt out of promotional emails at any time via your settings. Account-related communications are mandatory for platform operation.',
  },
  {
    icon: AlertCircle,
    title: '5. Limitation of Liability',
    content:
      'LearningHub is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the platform, including loss of data or learning progress. Our total liability shall not exceed the amount paid by you in the past 12 months.',
  },
]

const TermsPage = memo(() => {
  const navigate = useNavigate()

  return (
    <AnimatedPage className="min-h-screen">
      <SEO title="Terms of Service" />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-10"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Terms of Service</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Last updated: July 2026
              </p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
            Please read these terms carefully before using the LearningHub platform. By using our
            service, you agree to be bound by these terms.
          </p>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 sm:p-8 border-none shadow-lg" hover>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center shrink-0 mt-1">
                    <section.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {section.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-center"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If you have any questions about these terms, please{' '}
            <button
              onClick={() => navigate('/contact')}
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              contact our support team
            </button>
            .
          </p>
        </motion.div>
      </div>
    </AnimatedPage>
  )
})

export default TermsPage
