import { memo } from 'react'
import { motion } from 'framer-motion'
import { Shield, Database, Cookie, Eye, Trash2, ArrowLeft, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'

const sections = [
  {
    icon: Database,
    title: '1. Information We Collect',
    content:
      'We collect information you provide when creating an account, including your name, email address, and profile details. We also collect usage data such as course progress, quiz results, and interactions with learning materials to improve your experience.',
  },
  {
    icon: Cookie,
    title: '2. Cookies',
    content:
      'We use essential cookies for platform functionality and analytics cookies to understand usage patterns. You can control cookie preferences through our cookie banner. Essential cookies cannot be disabled as they are necessary for the platform to function.',
  },
  {
    icon: Eye,
    title: '3. How We Use Your Data',
    content:
      'Your data is used to personalize your learning experience, track progress, provide recommendations, and improve our platform. We do not sell your personal information to third parties. Analytics data is aggregated and anonymized where possible.',
  },
  {
    icon: Lock,
    title: '4. Data Security',
    content:
      'We implement industry-standard security measures including encryption at rest and in transit, regular security audits, and strict access controls. Passwords are hashed using bcrypt. Despite these measures, no system is 100% secure.',
  },
  {
    icon: Trash2,
    title: '5. Data Retention & Deletion',
    content:
      'We retain your data for as long as your account is active. You can request account deletion at any time through your settings. Upon deletion, your personal data is permanently removed within 30 days, though anonymized aggregate data may be retained for analytics.',
  },
]

const PrivacyPage = memo(() => {
  const navigate = useNavigate()

  return (
    <AnimatedPage className="min-h-screen">
      <SEO title="Privacy Policy" />

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
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Privacy Policy</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Last updated: July 2026
              </p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
            Your privacy is important to us. This policy outlines how LearningHub collects, uses,
            and protects your personal information.
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
            For privacy-related inquiries, please contact our support team.
          </p>
        </motion.div>
      </div>
    </AnimatedPage>
  )
})

export default PrivacyPage
