import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  Download,
  Share2,
  Copy,
  Check,
  Calendar,
  User,
  BookOpen,
  Hash,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { certificateService } from '../services/certificateService'
import { useStore } from '../stores/useStore'

export default function VerifyCertificatePage() {
  const { code: routeCode } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)

  const [inputCode, setInputCode] = useState(routeCode || '')
  const [activeCode, setActiveCode] = useState(routeCode || '')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (routeCode) {
      setInputCode(routeCode)
      setActiveCode(routeCode)
    }
  }, [routeCode])

  const {
    data: verificationData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['verifyCertificate', activeCode],
    queryFn: async () => {
      if (!activeCode.trim()) return null
      const res = await certificateService.verifyCertificate(activeCode.trim())
      return res.data
    },
    enabled: Boolean(activeCode.trim()),
    retry: 1,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputCode.trim()) return
    setActiveCode(inputCode.trim())
    navigate(`/verify-certificate/${encodeURIComponent(inputCode.trim())}`, { replace: true })
  }

  const handleCopy = (text: string, fieldName: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
    addToast({ message: `${fieldName} copied to clipboard`, type: 'success' })
  }

  const handleShare = () => {
    const url = window.location.href
    void navigator.clipboard.writeText(url)
    addToast({ message: 'Verification link copied to clipboard', type: 'success' })
  }

  return (
    <AnimatedPage>
      <SEO
        title="Verify Certificate | LearningHub Credential Registry"
        description="Publicly verify the authenticity, cryptographic signature, and issuance details of LearningHub certifications."
      />

      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold text-xs uppercase tracking-widest border border-primary-500/20 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              Official Credential Registry
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Academic Certificate Verification
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Verify the authenticity and integrity of LearningHub certificates, verified on-chain
              with cryptographic SHA-256 signatures.
            </p>
          </div>

          {/* Search Bar Card */}
          <Card className="p-4 sm:p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 shadow-xl rounded-3xl">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                  placeholder="Enter Certificate Code (e.g., LH-CERT-2026-DSA-001)..."
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 rounded-2xl text-sm sm:text-base text-gray-900 dark:text-white outline-none transition-all"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={!inputCode.trim() || isLoading}
                className="py-3.5 px-8 rounded-2xl text-sm font-bold shadow-lg shadow-primary-500/20"
              >
                {isLoading ? 'Verifying...' : 'Verify Credential'}
              </Button>
            </form>
          </Card>

          {/* Result Presentation */}
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 space-y-4"
              >
                <div className="w-14 h-14 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin shadow-lg" />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Validating cryptographic signature against ledger records...
                </p>
              </motion.div>
            )}

            {!isLoading && isError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="p-8 border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-black text-rose-900 dark:text-rose-200">
                    Certificate Verification Failed
                  </h2>
                  <p className="text-sm text-rose-700 dark:text-rose-300 max-w-md mx-auto">
                    {(error as Error)?.message ||
                      'The specified certificate code could not be verified in the registry. Please double check the ID.'}
                  </p>
                </Card>
              </motion.div>
            )}

            {!isLoading && verificationData && verificationData.valid && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Official Certificate Card */}
                <Card className="relative overflow-hidden p-6 sm:p-10 bg-gradient-to-br from-white via-white to-amber-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-amber-950/20 border-2 border-emerald-500/30 shadow-2xl rounded-3xl">
                  {/* Decorative Watermark Seal */}
                  <div className="absolute top-4 right-4 sm:top-8 sm:right-8 opacity-10 dark:opacity-15 pointer-events-none">
                    <Award className="w-48 h-48 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  {/* Verification Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Valid & Authentic
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                          Official Certificate of Completion
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleShare}
                        className="rounded-xl gap-1.5"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `https://certificates.learninghub.app/verify/${encodeURIComponent(verificationData.certificate_code)}.pdf`,
                            '_blank'
                          )
                        }
                        className="rounded-xl gap-1.5 shadow-md shadow-primary-500/20"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>

                  {/* Detailed Certificate Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <User className="w-3.5 h-3.5 text-primary-500" />
                        Recipient Scholar
                      </span>
                      <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                        {verificationData.student_name}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                        Curriculum / Exam Distinction
                      </span>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        {verificationData.course_title}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5 text-primary-500" />
                        Issued On
                      </span>
                      <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
                        {new Date(verificationData.issued_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <Hash className="w-3.5 h-3.5 text-primary-500" />
                        Certificate Code
                      </span>
                      <div className="flex items-center gap-2 font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
                        <span>{verificationData.certificate_code}</span>
                        <button
                          onClick={() =>
                            handleCopy(verificationData.certificate_code, 'Certificate Code')
                          }
                          className="p-1 text-gray-400 hover:text-primary-500 transition-colors"
                          title="Copy Code"
                        >
                          {copiedField === 'Certificate Code' ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cryptographic Ledger Proof Section */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        SHA-256 Cryptographic Signature
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Verified On-Chain
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      <code className="text-xs text-gray-700 dark:text-gray-300 font-mono break-all select-all">
                        {verificationData.signature}
                      </code>
                      <button
                        onClick={() => handleCopy(verificationData.signature, 'Signature')}
                        className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors flex-shrink-0"
                        title="Copy Signature"
                      >
                        {copiedField === 'Signature' ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      Signed & verified by:{' '}
                      <strong className="text-gray-700 dark:text-gray-300">
                        {verificationData.verified_by}
                      </strong>
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatedPage>
  )
}
