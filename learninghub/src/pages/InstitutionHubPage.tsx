import React, { useState, useEffect } from 'react'
import { InstitutionService } from '../services/institutionService'
import { Institution, InstitutionAnalytics, LtiLaunchSession, GradePassbackResult } from '../types/institution'

export const InstitutionHubPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedInstId, setSelectedInstId] = useState<string>('inst_stanford_eng')
  const [analytics, setAnalytics] = useState<InstitutionAnalytics | null>(null)
  const [activeTab, setActiveTab] = useState<'gateway' | 'cohorts' | 'passback'>('gateway')
  const [loading, setLoading] = useState<boolean>(true)

  // Simulation form state
  const [simRole, setSimRole] = useState<'Learner' | 'Instructor'>('Learner')
  const [simName, setSimName] = useState<string>('Alex Mercer')
  const [simEmail, setSimEmail] = useState<string>('alex.mercer@cs.stanford.edu')
  const [simSession, setSimSession] = useState<LtiLaunchSession | null>(null)
  const [simMessage, setSimMessage] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)

  // Manual passback state
  const [testScore, setTestScore] = useState<number>(92)
  const [passbackStatus, setPassbackStatus] = useState<GradePassbackResult | null>(null)
  const [isPassingBack, setIsPassingBack] = useState<boolean>(false)

  useEffect(() => {
    loadInstitutions()
  }, [])

  useEffect(() => {
    if (selectedInstId) {
      loadAnalytics(selectedInstId)
    }
  }, [selectedInstId])

  const loadInstitutions = async () => {
    setLoading(true)
    const list = await InstitutionService.getInstitutions()
    setInstitutions(list)
    if (list.length > 0 && !selectedInstId) {
      setSelectedInstId(list[0].id)
    }
    setLoading(false)
  }

  const loadAnalytics = async (id: string) => {
    const data = await InstitutionService.getInstitutionAnalytics(id)
    setAnalytics(data)
  }

  const activeInst = institutions.find(i => i.id === selectedInstId) || institutions[0]

  const handleSimulateLaunch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSimulating(true)
    setSimMessage(null)
    try {
      const res = await InstitutionService.simulateLaunch({
        institutionId: selectedInstId,
        role: simRole,
        userName: simName,
        userEmail: simEmail,
      })
      setSimSession(res.session)
      setSimMessage(res.message)
    } catch (err: any) {
      setSimMessage(`Error: ${err.message}`)
    } finally {
      setIsSimulating(false)
    }
  }

  const handleTriggerPassback = async () => {
    setIsPassingBack(true)
    try {
      const res = await InstitutionService.passbackGrade({
        institutionId: selectedInstId,
        lineItemUrl: `${activeInst?.issuer || 'https://canvas.edu'}/api/v1/courses/401/line_items/101`,
        studentLtiUserId: simSession?.userId || 'usr_lti_live_sample',
        scoreGiven: testScore,
        scoreMaximum: 100,
        comment: 'Automated CBT Adaptive Evaluation passed with distinction.',
      })
      setPassbackStatus(res)
      loadAnalytics(selectedInstId) // Refresh passback history
    } catch (err: any) {
      alert(`Passback error: ${err.message}`)
    } finally {
      setIsPassingBack(false)
    }
  }

  if (loading && institutions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-cyan-400">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading Enterprise Institution Gateway...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/60 border border-cyan-700/50 rounded-full text-xs font-semibold text-cyan-400 tracking-wide uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              1EdTech LTI 1.3 Advantage & Multi-Tenant Hub
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Enterprise Institution Portal</h1>
            <p className="text-slate-400 text-sm mt-1">
              Seamless LMS SSO, OIDC Asymmetric JWKS Authentication, and Automated Grade Passback (AGS v2.0)
            </p>
          </div>

          {/* Tenant Switcher */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant:</label>
            <select
              value={selectedInstId}
              onChange={e => setSelectedInstId(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.domain})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Institution Banner */}
        {activeInst && (
          <div 
            className="p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden"
            style={{
              backgroundColor: '#0f172a',
              borderColor: activeInst.branding.primaryColor || '#334155',
            }}
          >
            <div className="flex items-center gap-5">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shrink-0"
                style={{ backgroundColor: activeInst.branding.primaryColor || '#0284c7' }}
              >
                {activeInst.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">{activeInst.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                    {activeInst.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-4">
                  <span>Domain: <strong className="text-slate-200">{activeInst.domain}</strong></span>
                  <span>LMS Issuer: <code className="text-cyan-400">{activeInst.issuer}</code></span>
                  <span>Client ID: <code className="text-slate-300">{activeInst.clientId}</code></span>
                  <span>Deployment: <code className="text-indigo-400">{activeInst.deploymentId}</code></span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-slate-400 block">Portal Title</span>
              <span className="text-sm font-semibold text-slate-200">{activeInst.branding.portalTitle}</span>
            </div>
          </div>
        )}

        {/* High-Level Telemetry Cards */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Active Learners</span>
              <span className="text-3xl font-black text-white mt-2 block">{analytics.totalLearners.toLocaleString()}</span>
              <span className="text-xs text-emerald-400 mt-1 block">Across {analytics.activeCohortsCount} cohorts</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Faculty & Instructors</span>
              <span className="text-3xl font-black text-white mt-2 block">{analytics.totalInstructors}</span>
              <span className="text-xs text-slate-400 mt-1 block">Full LTI Invigilator access</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Assessments Done</span>
              <span className="text-3xl font-black text-cyan-400 mt-2 block">{analytics.totalAssessmentsCompleted.toLocaleString()}</span>
              <span className="text-xs text-slate-400 mt-1 block">{analytics.totalLaunches.toLocaleString()} total launches</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Average Cohort Score</span>
              <span className="text-3xl font-black text-emerald-400 mt-2 block">{analytics.averageScorePercent}%</span>
              <span className="text-xs text-slate-400 mt-1 block">{analytics.passRatePercent}% pass rate</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('gateway')}
            className={`pb-3 px-1 border-b-2 transition-all ${
              activeTab === 'gateway'
                ? 'border-cyan-500 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔌 LTI 1.3 Gateway & Simulator
          </button>
          <button
            onClick={() => setActiveTab('cohorts')}
            className={`pb-3 px-1 border-b-2 transition-all ${
              activeTab === 'cohorts'
                ? 'border-cyan-500 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Cohort Exam Breakdown
          </button>
          <button
            onClick={() => setActiveTab('passback')}
            className={`pb-3 px-1 border-b-2 transition-all ${
              activeTab === 'passback'
                ? 'border-cyan-500 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Live Grade Passback (AGS) Log
          </button>
        </div>

        {/* TAB 1: LTI 1.3 Gateway & Simulator */}
        {activeTab === 'gateway' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LTI Credentials & Parameters */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔐</span> LMS Registration Endpoints (Canvas / Moodle)
              </h3>
              <p className="text-xs text-slate-400">
                Configure these endpoints inside your institutional LMS Developer Keys console to establish an LTI 1.3 Advantage tool registration.
              </p>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block font-sans font-semibold mb-1">Target Link URI (Launch URL)</span>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-cyan-400 break-all select-all">
                    https://learninghub.io/api/v1/lti/launch
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-sans font-semibold mb-1">OpenID Connect (OIDC) Initiation URL</span>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-cyan-400 break-all select-all">
                    https://learninghub.io/api/v1/lti/login
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-sans font-semibold mb-1">Public Keyset (JWKS) URL</span>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-indigo-400 break-all select-all">
                    https://learninghub.io/api/v1/lti/jwks
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-sans font-semibold mb-1">Assigned Client ID</span>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-200 select-all">
                    {activeInst?.clientId}
                  </div>
                </div>
              </div>
            </div>

            {/* 1-Click Interactive LTI Launch Simulator */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🚀</span> Interactive LTI 1.3 Launch Simulator
              </h3>
              <p className="text-xs text-slate-400">
                Simulate an incoming OIDC launch from {activeInst?.name}. Tests claim parsing, nonce replay protection, role provisioning, and session establishment.
              </p>

              <form onSubmit={handleSimulateLaunch} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Role</label>
                    <select
                      value={simRole}
                      onChange={e => setSimRole(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="Learner">Learner (Student)</option>
                      <option value="Instructor">Instructor (Faculty/Admin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Candidate Name</label>
                    <input
                      type="text"
                      value={simName}
                      onChange={e => setSimName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Institutional Email</label>
                  <input
                    type="email"
                    value={simEmail}
                    onChange={e => setSimEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSimulating}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  {isSimulating ? 'Establishing Secure Handshake...' : 'Simulate Incoming LTI 1.3 Launch'}
                </button>
              </form>

              {simMessage && (
                <div className="mt-3 p-2.5 rounded-lg bg-slate-800/80 text-xs text-slate-300 border border-slate-700">
                  {simMessage}
                </div>
              )}

              {/* Simulation Result HUD */}
              {simSession && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>✅ LTI Session Established</span>
                    <span className="font-mono text-[10px] text-slate-400">ID: {simSession.sessionId}</span>
                  </div>
                  <div className="text-slate-300 space-y-1">
                    <div><strong>User:</strong> {simSession.name} ({simSession.email})</div>
                    <div><strong>Role:</strong> {simSession.isInstructor ? '👨‍🏫 Faculty / Instructor' : '👨‍🎓 Student / Examinee'}</div>
                    <div><strong>Context:</strong> {simSession.contextTitle} ({simSession.contextId})</div>
                    <div><strong>Resource Link:</strong> {simSession.resourceLinkTitle}</div>
                    <div><strong>Session Token:</strong> <code className="text-cyan-400 break-all">{simSession.token.slice(0, 32)}...</code></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Cohort Analytics */}
        {activeTab === 'cohorts' && analytics && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Institutional Cohort Performance</h3>
              <p className="text-xs text-slate-400">Top-performing competitive exams and CBT benchmarks for this tenant.</p>
            </div>

            <div className="space-y-4">
              {analytics.topExams.map(exam => (
                <div key={exam.examId} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-white text-sm">{exam.examTitle}</h4>
                    <span className="text-xs text-slate-400">ID: <code className="text-cyan-400">{exam.examId}</code> &bull; Total Attempts: <strong>{exam.attempts}</strong></span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-36 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-2.5 rounded-full" 
                        style={{ width: `${exam.avgScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-emerald-400 min-w-[50px] text-right">{exam.avgScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Live Grade Passback Log */}
        {activeTab === 'passback' && analytics && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Assignment & Grade Services (AGS) Passback Telemetry</h3>
                <p className="text-xs text-slate-400">Cryptographically signed server-to-server scores synchronized back to LMS Gradebook.</p>
              </div>

              {/* Trigger Manual Test Passback */}
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={testScore}
                  onChange={e => setTestScore(Number(e.target.value))}
                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white text-center focus:outline-none"
                  placeholder="Score"
                />
                <button
                  onClick={handleTriggerPassback}
                  disabled={isPassingBack}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all"
                >
                  {isPassingBack ? 'Posting...' : 'Push Test Grade to LMS'}
                </button>
              </div>
            </div>

            {passbackStatus && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-xs space-y-1">
                <span className="font-bold text-emerald-400">✅ Score Synchronized to LMS!</span>
                <div className="text-slate-300">
                  Transaction: <code className="text-cyan-400">{passbackStatus.transactionId}</code> &bull; Normalized: <strong>{(passbackStatus.normalizedScore * 100).toFixed(1)}%</strong>
                </div>
                <div className="text-slate-400 font-mono text-[10px]">
                  Proof Digest: {passbackStatus.proofDigest}
                </div>
              </div>
            )}

            {/* Passback Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Transaction</th>
                    <th className="p-3">Candidate LTI ID</th>
                    <th className="p-3">Raw Score</th>
                    <th className="p-3">Normalized</th>
                    <th className="p-3">HMAC-SHA256 Proof</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {analytics.recentPassbacks.map(pb => (
                    <tr key={pb.transactionId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-cyan-400">{pb.transactionId}</td>
                      <td className="p-3 text-slate-200">{pb.studentLtiUserId}</td>
                      <td className="p-3 font-bold text-white">{pb.scoreGiven} / {pb.scoreMaximum}</td>
                      <td className="p-3 text-emerald-400 font-bold">{(pb.normalizedScore * 100).toFixed(1)}%</td>
                      <td className="p-3 text-slate-400 text-[10px] truncate max-w-[150px]">{pb.proofDigest}</td>
                      <td className="p-3 text-slate-400 text-[10px] font-sans">
                        {new Date(pb.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
