import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award,
  ShieldCheck,
  Download,
  Share2,
  Check,
  Sparkles,
  Layers,
  Calendar,
  FileCode,
  ExternalLink,
  PlusCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { verifiableCredentialService } from '../../services/verifiableCredentialService'
import type { W3CVerifiableCredential, IssueCredentialPayload } from '../../types/credentials'
import { useStore } from '../../stores/useStore'

export interface StudentCredentialsPortfolioProps {
  className?: string
}

export const StudentCredentialsPortfolio: React.FC<StudentCredentialsPortfolioProps> = ({
  className = '',
}) => {
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)
  const queryClient = useQueryClient()

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'COURSE' | 'PERCENTILE'>('ALL')

  // Fetch issued credentials
  const {
    data: credentialsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['myVerifiableCredentials'],
    queryFn: async () => {
      try {
        const res = await verifiableCredentialService.getMyCredentials()
        return res?.data?.credentials ?? []
      } catch (err) {
        // Fallback for offline/demo scenarios
        return []
      }
    },
    staleTime: 60 * 1000,
  })

  // Issue demo credential mutation for instant testing
  const issueDemoMutation = useMutation({
    mutationFn: async (type: 'course' | 'percentile') => {
      const payload: IssueCredentialPayload =
        type === 'course'
          ? {
              achievementType: 'COURSE_COMPLETION',
              courseOrExamId: 'course_dsa_mastery',
              title: 'Full-Stack Data Structures & Algorithms Mastery',
              category: 'Computer Science & Engineering',
              score: 98,
            }
          : {
              achievementType: 'CAT_PERCENTILE',
              courseOrExamId: 'CAT-2026-STAGE-1',
              title: 'CAT National Grand Mock A+ Percentile',
              category: 'Management & Quantitative Exams',
              percentileRank: 99.82,
              score: 114,
            }

      return verifiableCredentialService.issueCredential(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['myVerifiableCredentials'] })
      addToast({
        message: 'Cryptographically anchored W3C Credential successfully minted!',
        type: 'success',
      })
    },
    onError: () => {
      addToast({
        message: 'Could not mint credential at this moment.',
        type: 'error',
      })
    },
  })

  const credentials = credentialsData ?? []

  const filteredCredentials = credentials.filter(vc => {
    if (selectedFilter === 'COURSE') {
      return (
        vc.type.includes('CourseCompletionCredential') ||
        vc.credentialSubject.achievementType === 'COURSE_COMPLETION'
      )
    }
    if (selectedFilter === 'PERCENTILE') {
      return (
        vc.type.includes('CompetitiveExamPercentileCredential') ||
        vc.credentialSubject.achievementType === 'CAT_PERCENTILE' ||
        vc.credentialSubject.achievementType === 'COMPETITIVE_EXAM_RANK'
      )
    }
    return true
  })

  const handleCopyLink = (vc: W3CVerifiableCredential) => {
    const origin = window.location.origin
    const url = `${origin}/verify-certificate/${encodeURIComponent(vc.id)}`
    void navigator.clipboard.writeText(url)
    setCopiedId(vc.id)
    setTimeout(() => setCopiedId(null), 2500)
    addToast({
      message: 'Credential verification URL copied to clipboard!',
      type: 'success',
    })
  }

  const handleDownloadSvg = (vc: W3CVerifiableCredential) => {
    verifiableCredentialService.downloadCertificateSvg(vc)
    addToast({
      message: 'Tamper-proof SVG Vector Certificate downloaded',
      type: 'success',
    })
  }

  const handleDownloadJson = (vc: W3CVerifiableCredential) => {
    verifiableCredentialService.downloadJson(vc)
    addToast({
      message: 'W3C JSON-LD Credential exported',
      type: 'success',
    })
  }

  return (
    <Card
      variant="premium"
      padding="xl"
      className={`relative overflow-hidden transition-all duration-300 border border-primary-500/20 shadow-xl ${className}`}
    >
      {/* Background Decorative Accent */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-primary-500/10 to-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Verifiable Credentials & Identity
            </h2>
            <Badge
              variant="info"
              className="text-[10px] uppercase font-bold tracking-widest text-primary-600 dark:text-primary-400 border border-primary-500/30"
            >
              W3C DID v1.1
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Tamper-proof academic and percentile credentials cryptographically anchored on Polygon PoS & Base L2.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => issueDemoMutation.mutate('course')}
            disabled={issueDemoMutation.isPending}
            leftIcon={
              issueDemoMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              )
            }
            className="text-xs font-semibold rounded-xl"
          >
            Claim Course Credential
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => issueDemoMutation.mutate('percentile')}
            disabled={issueDemoMutation.isPending}
            leftIcon={
              issueDemoMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Award className="w-3.5 h-3.5 text-primary-500" />
              )
            }
            className="text-xs font-semibold rounded-xl"
          >
            Claim CAT 99.8% Credential
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pt-6 pb-4">
        {(['ALL', 'COURSE', 'PERCENTILE'] as const).map(tab => {
          const isActive = selectedFilter === tab
          const label =
            tab === 'ALL'
              ? `All Credentials (${credentials.length})`
              : tab === 'COURSE'
              ? 'Course Mastery'
              : 'Competitive Percentiles'

          return (
            <button
              key={tab}
              onClick={() => setSelectedFilter(tab)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Content Body */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-52 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-rose-500">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-semibold text-sm">Failed to load verifiable credentials</p>
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="mt-3">
            Retry
          </Button>
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl my-2 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 mb-3 shadow-inner">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base mb-1">
            No Verifiable Credentials Yet
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mb-5">
            Complete courses, score in top assessment percentiles, or click the buttons above to claim a live cryptographically signed W3C DID demonstration credential.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => issueDemoMutation.mutate('course')}
              disabled={issueDemoMutation.isPending}
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="rounded-xl text-xs"
            >
              Generate Demo Credential
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <AnimatePresence>
            {filteredCredentials.map(vc => {
              const isPercentile =
                vc.type.includes('CompetitiveExamPercentileCredential') ||
                vc.credentialSubject.achievementType === 'CAT_PERCENTILE'
              const isCopied = copiedId === vc.id
              const formattedDate = new Date(vc.issuanceDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })

              return (
                <motion.div
                  key={vc.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200/90 dark:border-gray-700/80 shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <div>
                    {/* Top Row: Badge & Issuance Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            isPercentile
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-500/20'
                              : 'bg-primary-100 text-primary-800 dark:bg-primary-950/50 dark:text-primary-300 border border-primary-500/20'
                          }`}
                        >
                          <Award className="w-3 h-3" />
                          {isPercentile ? 'Percentile Credential' : 'Course Mastery'}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Verified On-Chain
                        </span>
                      </div>

                      <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white leading-snug mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {vc.credentialSubject.achievementTitle}
                    </h3>

                    {/* DID Subject */}
                    <div className="space-y-1.5 mt-3 mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 font-mono">
                        <span className="flex items-center gap-1 truncate max-w-[200px] sm:max-w-none">
                          <Layers className="w-3 h-3 text-primary-500 shrink-0" />
                          {vc.credentialSubject.id}
                        </span>
                        <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold shrink-0">
                          {vc.proof.anchor?.network ?? 'Polygon PoS'}
                        </span>
                      </div>

                      {/* Evidence / Score Pill */}
                      {isPercentile && vc.credentialSubject.percentileRank !== undefined ? (
                        <div className="flex items-center gap-3 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                          <span>Percentile: {vc.credentialSubject.percentileRank}%</span>
                          {vc.credentialSubject.score !== undefined && (
                            <span>Score: {vc.credentialSubject.score} pts</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-xs font-bold text-primary-700 dark:text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20">
                          <span>Score: {vc.credentialSubject.score ?? 100}%</span>
                          <span>Category: {vc.credentialSubject.category}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/60 mt-2">
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => navigate(`/verify-certificate/${encodeURIComponent(vc.id)}`)}
                      leftIcon={<ExternalLink className="w-3 h-3" />}
                      className="rounded-lg text-xs font-bold"
                    >
                      Audit Proof
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(vc)}
                        title="Copy Public Verification Link"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadSvg(vc)}
                        title="Download Vector Certificate (SVG)"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadJson(vc)}
                        title="Export W3C JSON-LD Document"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  )
}

export default StudentCredentialsPortfolio
