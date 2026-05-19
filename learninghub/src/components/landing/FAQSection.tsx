import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'

const faqs = [
  {
    question: 'Which exams does LearningHub cover?',
    answer:
      'LearningHub covers all major competitive exams in India including JEE Main, JEE Advanced, NEET, BITSAT, WBJEE, MHT CET, NDA, and KVPY. We provide chapter-wise previous year questions, detailed solutions, and practice materials for each of these exams.',
  },
  {
    question: 'How are the questions organized?',
    answer:
      'Questions are organized by exam, subject, and chapter. You can filter by year (2010-2024), difficulty level (Easy, Medium, Hard), and question type. Each question comes with a detailed step-by-step solution and concept explanation.',
  },
  {
    question: 'Can I create custom tests?',
    answer:
      'Yes! Our custom test creator allows you to select specific chapters, topics, difficulty levels, and number of questions. You can also set time limits and get instant results with detailed analytics on your performance.',
  },
  {
    question: 'Is there a mobile app available?',
    answer:
      'LearningHub is fully responsive and works seamlessly on mobile browsers. We are also developing native Android and iOS apps which will be released soon. The mobile experience includes offline mode for practicing without internet.',
  },
  {
    question: 'How does the weak area analysis work?',
    answer:
      'Our AI-powered system tracks your performance across all chapters and identifies topics where your accuracy is below 60%. It then recommends targeted practice sessions and provides personalized study plans to help you improve in those areas.',
  },
  {
    question: 'What is the daily streak feature?',
    answer:
      'The daily streak feature encourages consistent practice. Set your daily goal (default is 20 questions), and maintain your streak by practicing every day. Earn badges for 7-day, 30-day, and 100-day streaks!',
  },
  {
    question: 'Are the solutions detailed enough?',
    answer:
      'Absolutely! Every solution includes: 1) Step-by-step working, 2) Concept explanation, 3) Shortcut methods where applicable, 4) Common mistakes to avoid, 5) Related concepts for revision. Video solutions are also available for complex problems.',
  },
  {
    question: 'Can I bookmark questions for later?',
    answer:
      'Yes! You can bookmark any question and add personal notes to it. Bookmarked questions are organized by tags you create, making revision before exams quick and efficient. Access your bookmarks from the dedicated bookmarks page.',
  },
  {
    question: 'Is LearningHub free to use?',
    answer:
      'LearningHub offers a free tier with access to basic features and limited questions. For full access to all PYQs, detailed analytics, custom tests, and advanced features, we offer affordable subscription plans starting at ₹99/month.',
  },
  {
    question: 'How can parents track progress?',
    answer:
      "Parents can link their account to monitor their child's daily practice, accuracy trends, weak areas, and overall progress. Weekly email reports and a dedicated parent dashboard make it easy to stay involved in the preparation journey.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
            <HelpCircle className="w-4 h-4" />
            Got Questions?
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked <span className="text-blue-600">Questions</span>
          </h2>
          <p className="text-lg text-gray-600">Everything you need to know about LearningHub</p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-5">
                      <div className="h-px bg-gray-100 mb-4" />
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Still Have Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center bg-blue-600 rounded-2xl p-8 text-white"
        >
          <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
          <p className="text-blue-100 mb-6">
            Can&apos;t find the answer you&apos;re looking for? Please chat with our friendly team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors">
              Contact Support
            </button>
            <button className="border-2 border-white/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">
              Email Us
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default FAQSection
