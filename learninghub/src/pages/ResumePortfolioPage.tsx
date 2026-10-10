import React, { useState, useEffect } from 'react'
import { TargetRole, VerifiableResumePayload } from '../types/resume'
import { resumeService } from '../services/resumeService'
import { ResumePreviewCard } from '../components/resume/ResumePreviewCard'
import { ResumeCustomizerPanel } from '../components/resume/ResumeCustomizerPanel'
import { VerifiablePortfolioBadge } from '../components/resume/VerifiablePortfolioBadge'
import { ResumeExportActions } from '../components/resume/ResumeExportActions'
import {
  FileText,
  Shield,
  Code,
  Sparkles,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export const ResumePortfolioPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<TargetRole>('FULL_STACK_LEAD')
  const [resume, setResume] = useState<VerifiableResumePayload | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'preview' | 'portfolio' | 'ats_text' | 'json_schema' | 'latex'>('preview')
  const [isAnchoring, setIsAnchoring] = useState<boolean>(false)
  const [anchorSuccess, setAnchorSuccess] = useState<string | null>(null)
  const [showLinkedInModal, setShowLinkedInModal] = useState<boolean>(false)
  const [linkedInInput, setLinkedInInput] = useState<string>('')

  const handleAnchorIPFS = async () => {
    if (!resume) return
    setIsAnchoring(true)
    try {
      const res = await resumeService.anchorResumeToChain(resume)
      setAnchorSuccess(res.ipfsCid)
    } catch {
      // fallback
    } finally {
      setIsAnchoring(false)
    }
  }

  const handleImportLinkedIn = async () => {
    if (!linkedInInput.trim() || !resume) return
    try {
      const result = await resumeService.importLinkedInProfile({ rawText: linkedInInput })
      if (result.importedSkills?.length) {
        setResume(prev => {
          if (!prev) return null
          return {
            ...prev,
            skillsMatrix: {
              ...prev.skillsMatrix,
              languages: Array.from(new Set([...prev.skillsMatrix.languages, ...result.importedSkills])),
            },
            verifiedPlatformHighlights: [
              ...prev.verifiedPlatformHighlights,
              ...result.importedHighlights,
            ],
          }
        })
      }
      setShowLinkedInModal(false)
      setLinkedInInput('')
    } catch {
      setShowLinkedInModal(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    resumeService
      .getTailoredResume({ targetRole: selectedRole })
      .then(res => {
        if (isMounted) {
          setResume(res)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedRole])

  if (isLoading || !resume) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">
            Synthesizing Anti-Gravity Verifiable AI Resume...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Milestone 12
            </span>
            <span className="text-xs text-slate-400 font-mono">Anti-Gravity AI Career Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Verifiable AI Resume & Career Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            ATS-optimized, cryptographically verifiable career credentials that automatically ingest
            your 1v1 Arena Duel Elo ratings, Bayesian Knowledge Tracing skills, and Mock Interview telemetry.
          </p>
        </div>

        {/* Global Export Actions & IPFS Anchor */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowLinkedInModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-500/30 shadow-sm transition-all"
            title="Import skills and profile from LinkedIn"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Import LinkedIn</span>
          </button>
          <button
            onClick={handleAnchorIPFS}
            disabled={isAnchoring}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-sm transition-all"
            title="Anchor cryptographic snapshot of your resume to IPFS"
          >
            {isAnchoring ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Anchoring...</span>
              </>
            ) : anchorSuccess ? (
              <span>✓ Anchored ({anchorSuccess.slice(0, 8)}...)</span>
            ) : (
              <span>Anchor to IPFS</span>
            )}
          </button>
          <ResumeExportActions resume={resume} />
        </div>
      </div>

      {/* Cryptographic Proof Anchor Banner */}
      <VerifiablePortfolioBadge
        didAnchor={resume.cryptographicProof.didAnchor}
        canonicalDigest={resume.cryptographicProof.canonicalDigestSha256}
        signatureHmac={resume.cryptographicProof.signatureHmac}
        verificationUrl={resume.cryptographicProof.verificationUrl}
      />

      {/* Main Grid: Customizer Sidebar + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Role Customizer & ATS Diagnostic Panel */}
        <div className="lg:col-span-4 space-y-6">
          <ResumeCustomizerPanel
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            atsScoring={resume.atsScoring}
          />

          {/* Quick Nav / Quick Actions Card */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-3">
            <span className="font-semibold text-slate-200 uppercase tracking-wider block text-[11px]">
              Platform Telemetry Sources
            </span>
            <div className="space-y-2">
              <Link
                to="/arena"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>1v1 Algorithm Duel Arena</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                to="/interview"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>AI Technical Interview Simulator</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                to="/analytics"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  <span>BKT Knowledge Graph & Readiness</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: View Switcher Tabs & Resume Display */}
        <div className="lg:col-span-8 space-y-4">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              ATS Resume Sheet
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('portfolio')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'portfolio'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Verifiable Credentials Portfolio
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ats_text')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'ats_text'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              ATS Plain Text
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('json_schema')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'json_schema'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              JSON Resume Schema
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('latex')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'latex'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              LaTeX Template (.tex)
            </button>
          </div>

          {/* Tab 1: ATS Resume Sheet */}
          {activeTab === 'preview' && (
            <div className="overflow-x-auto">
              <ResumePreviewCard resume={resume} />
            </div>
          )}

          {/* Tab 2: Verifiable Credentials Portfolio */}
          {activeTab === 'portfolio' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Decentralized Verifiable Credentials Portfolio (W3C DID)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tamper-proof verifiable credentials issued on Polygon PoS / Base L2 testnet with
                  SHA-256 Merkle tree inclusion proofs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resume.credentials.map(cred => (
                  <div
                    key={cred.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Award className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {cred.credentialType}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-white">{cred.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{cred.issuer}</p>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-slate-500">Issued: </span>
                        <span>{cred.issuanceDate}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500">Merkle Root: </span>
                        <span className="text-emerald-400">{cred.merkleRootHash}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500">Issuer DID: </span>
                        <span className="text-teal-400">{cred.issuerDid}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: ATS Plain Text */}
          {activeTab === 'ats_text' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Standard ATS Plain Text Stream (Workday / Greenhouse / Lever Compatible)
                </span>
                <button
                  type="button"
                  onClick={() => resumeService.downloadATSPlainText(resume)}
                  className="text-xs text-emerald-400 hover:underline font-medium"
                >
                  Download .txt
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs whitespace-pre-wrap max-h-[600px] overflow-y-auto select-all">
                {`ALEX MORGAN\n${resume.roleTitle.toUpperCase()}\n${resume.profile.email} | ${resume.profile.location}\n\nPROFESSIONAL SUMMARY\n${resume.summary}\n\nCORE SKILLS\n${resume.skillsMatrix.languages.join(', ')}\n\nPROJECTS\n${resume.projects.map(p => `${p.title}: ${p.bulletPoints.map(b => b.text).join(' ')}`).join('\n\n')}`}
              </pre>
            </div>
          )}

          {/* Tab 4: JSON Resume Schema */}
          {activeTab === 'json_schema' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Schema.org / JSON Resume Standard (v1.0.0)
                </span>
                <button
                  type="button"
                  onClick={() => resumeService.downloadJSONResume(resume)}
                  className="text-xs text-emerald-400 hover:underline font-medium"
                >
                  Download .json
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs whitespace-pre-wrap max-h-[600px] overflow-y-auto select-all">
                {JSON.stringify(
                  {
                    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
                    basics: {
                      name: resume.profile.fullName,
                      label: resume.roleTitle,
                      email: resume.profile.email,
                      summary: resume.summary,
                    },
                    skills: [
                      { name: 'Languages', keywords: resume.skillsMatrix.languages },
                      { name: 'Frameworks', keywords: resume.skillsMatrix.frameworks },
                    ],
                    work: resume.experiences.map(e => ({
                      company: e.company,
                      position: e.role,
                      summary: e.bulletPoints.map(b => b.text).join(' '),
                    })),
                    meta: {
                      canonicalDigest: resume.cryptographicProof.canonicalDigestSha256,
                      didAnchor: resume.cryptographicProof.didAnchor,
                      atsScore: resume.atsScoring.overallScore,
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {/* Tab 5: LaTeX Template (.tex) */}
          {activeTab === 'latex' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Compile-Ready LaTeX Document (.tex) — Jake's & Deedy Resume Architecture
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const code = resumeService.getLatexContent(resume)
                      navigator.clipboard.writeText(code)
                    }}
                    className="text-xs text-cyan-400 hover:underline font-medium"
                  >
                    Copy LaTeX
                  </button>
                  <button
                    type="button"
                    onClick={() => resumeService.downloadLatexResume(resume)}
                    className="text-xs text-emerald-400 hover:underline font-medium"
                  >
                    Download .tex
                  </button>
                </div>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs whitespace-pre-wrap max-h-[600px] overflow-y-auto select-all">
                {resumeService.getLatexContent(resume)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* LinkedIn Import Modal */}
      {showLinkedInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Import & Enrich from LinkedIn
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkedInModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste your raw LinkedIn profile export, about section, or summary text below. The AI
              parser will automatically extract technical skills, contact info, and experience.
            </p>

            <textarea
              value={linkedInInput}
              onChange={e => setLinkedInInput(e.target.value)}
              placeholder="Paste LinkedIn profile summary, skills, or JSON here..."
              rows={6}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkedInModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportLinkedIn}
                disabled={!linkedInInput.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold"
              >
                Parse & Integrate Skills
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default ResumePortfolioPage
