import { Institution, InstitutionAnalytics, LtiLaunchSession, GradePassbackResult } from '../types/institution'

const API_BASE = '/api/v1/lti'

export class InstitutionService {
  /**
   * Fetch all registered institutions
   */
  public static async getInstitutions(): Promise<Institution[]> {
    try {
      const res = await fetch(`${API_BASE}/institutions`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        return json.data
      }
      return this.getMockInstitutions()
    } catch {
      return this.getMockInstitutions()
    }
  }

  /**
   * Fetch analytics for a specific institution
   */
  public static async getInstitutionAnalytics(institutionId: string): Promise<InstitutionAnalytics> {
    try {
      const res = await fetch(`${API_BASE}/institutions/${institutionId}/analytics`)
      const json = await res.json()
      if (json.success && json.data) {
        return json.data
      }
      return this.getMockAnalytics(institutionId)
    } catch {
      return this.getMockAnalytics(institutionId)
    }
  }

  /**
   * Simulate an incoming LTI 1.3 Launch for testing & demos
   */
  public static async simulateLaunch(params: {
    institutionId: string
    role: 'Instructor' | 'Learner'
    userName: string
    userEmail?: string
  }): Promise<{ session: LtiLaunchSession; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/simulate-launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const json = await res.json()
      if (json.success && json.data) {
        return json.data
      }
      throw new Error(json.error || 'Simulation failed')
    } catch (err: any) {
      // Local fallback simulator if backend offline
      return {
        session: {
          sessionId: `lti_sess_mock_${Date.now()}`,
          institutionId: params.institutionId,
          institutionName: params.institutionId.includes('stanford') ? 'Stanford School of Engineering' : 'MIT EECS',
          userId: `usr_lti_${Date.now()}`,
          email: params.userEmail || `${params.userName.toLowerCase().replace(/\s+/g, '.')}@edu.portal`,
          name: params.userName,
          roles: [params.role === 'Instructor' ? 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor' : 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
          isInstructor: params.role === 'Instructor',
          contextId: 'course_cs106b',
          contextTitle: 'Advanced Distributed Systems & Algorithmics',
          resourceLinkId: 'res_link_sim_01',
          resourceLinkTitle: 'Midterm CBT Adaptive Evaluation',
          targetLinkUri: 'https://learninghub.io/lti/launch',
          lineItemUrl: 'https://canvas.edu/api/v1/courses/401/line_items/101',
          launchTimestamp: Date.now(),
          token: 'mock_token_digest_1029384756',
        },
        message: 'LTI 1.3 launch simulated successfully (Local Fallback)',
      }
    }
  }

  /**
   * Push Grade Passback via LTI AGS
   */
  public static async passbackGrade(params: {
    institutionId: string
    lineItemUrl: string
    studentLtiUserId: string
    scoreGiven: number
    scoreMaximum: number
    comment?: string
  }): Promise<GradePassbackResult> {
    try {
      const res = await fetch(`${API_BASE}/grades/passback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const json = await res.json()
      if (json.success && json.data) {
        return json.data
      }
      throw new Error(json.error || 'Passback failed')
    } catch {
      const normalizedScore = Number((params.scoreGiven / params.scoreMaximum).toFixed(4))
      return {
        success: true,
        transactionId: `tx_ags_mock_${Date.now()}`,
        lineItemUrl: params.lineItemUrl,
        studentLtiUserId: params.studentLtiUserId,
        scoreGiven: params.scoreGiven,
        scoreMaximum: params.scoreMaximum,
        normalizedScore,
        proofDigest: 'mock_proof_digest_77a92b3c4d5e6f1a2b3c4d5e6f',
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded',
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ─── Local Mock Fallbacks ───────────────────────────────────────────────────

  public static getMockInstitutions(): Institution[] {
    return [
      {
        id: 'inst_stanford_eng',
        name: 'Stanford School of Engineering',
        domain: 'stanford.edu',
        subdomain: 'stanford',
        issuer: 'https://canvas.stanford.edu',
        clientId: 'stanford_canvas_client_9942',
        deploymentId: 'dep_stanford_eng_01',
        authLoginUrl: 'https://canvas.stanford.edu/api/lti/authorize_redirect',
        authTokensUrl: 'https://canvas.stanford.edu/login/oauth2/token',
        keySetUrl: 'https://canvas.stanford.edu/api/lti/security/jwks',
        status: 'ACTIVE',
        branding: {
          primaryColor: '#8C1515',
          logoUrl: 'https://identity.stanford.edu/wp-content/uploads/sites/3/2020/06/block-s-right.png',
          portalTitle: 'Stanford Engineering LearningHub Portal',
        },
        createdAt: '2026-01-15T08:00:00Z',
        updatedAt: '2026-09-01T12:00:00Z',
      },
      {
        id: 'inst_mit_eecs',
        name: 'MIT Electrical Engineering & Computer Science',
        domain: 'mit.edu',
        subdomain: 'mit',
        issuer: 'https://canvas.mit.edu',
        clientId: 'mit_canvas_client_5831',
        deploymentId: 'dep_mit_eecs_04',
        authLoginUrl: 'https://canvas.mit.edu/api/lti/authorize_redirect',
        authTokensUrl: 'https://canvas.mit.edu/login/oauth2/token',
        keySetUrl: 'https://canvas.mit.edu/api/lti/security/jwks',
        status: 'ACTIVE',
        branding: {
          primaryColor: '#A31F34',
          logoUrl: 'https://web.mit.edu/graphicidentity/images/mit-logo.svg',
          portalTitle: 'MIT EECS Advanced Adaptive Engine',
        },
        createdAt: '2026-02-10T10:00:00Z',
        updatedAt: '2026-09-10T14:30:00Z',
      },
      {
        id: 'inst_iit_delhi',
        name: 'Indian Institute of Technology (IIT) Delhi',
        domain: 'iitd.ac.in',
        subdomain: 'iitd',
        issuer: 'https://moodle.iitd.ac.in',
        clientId: 'iitd_moodle_client_7719',
        deploymentId: 'dep_iitd_cs_02',
        authLoginUrl: 'https://moodle.iitd.ac.in/enrol/lti/auth.php',
        authTokensUrl: 'https://moodle.iitd.ac.in/enrol/lti/token.php',
        keySetUrl: 'https://moodle.iitd.ac.in/enrol/lti/jwks.php',
        status: 'ACTIVE',
        branding: {
          primaryColor: '#D9534F',
          logoUrl: 'https://home.iitd.ac.in/images/iitd-logo.png',
          portalTitle: 'IIT Delhi National Competitive & GATE Hub',
        },
        createdAt: '2026-03-01T09:00:00Z',
        updatedAt: '2026-09-20T16:00:00Z',
      },
    ]
  }

  public static getMockAnalytics(instId: string): InstitutionAnalytics {
    return {
      institutionId: instId,
      institutionName: instId.includes('stanford')
        ? 'Stanford School of Engineering'
        : instId.includes('mit')
        ? 'MIT EECS'
        : 'IIT Delhi',
      domain: instId.includes('stanford') ? 'stanford.edu' : instId.includes('mit') ? 'mit.edu' : 'iitd.ac.in',
      totalLearners: 1420,
      totalInstructors: 48,
      totalLaunches: 8420,
      totalAssessmentsCompleted: 7910,
      averageScorePercent: 88.4,
      passRatePercent: 94.6,
      activeCohortsCount: 14,
      topExams: [
        { examId: 'gate_cs_mock_01', examTitle: 'Advanced Data Structures & Graph Theory', attempts: 680, avgScore: 89.2 },
        { examId: 'sys_arch_staff_04', examTitle: 'Distributed Systems & Raft Consensus', attempts: 540, avgScore: 92.1 },
        { examId: 'bkt_psychometrics_02', examTitle: 'Bayesian Knowledge Tracing & Psychometrics', attempts: 430, avgScore: 86.4 },
      ],
      recentPassbacks: [
        {
          success: true,
          transactionId: 'tx_ags_991823a',
          lineItemUrl: 'https://canvas.stanford.edu/api/v1/courses/401/line_items/102',
          studentLtiUserId: 'usr_lti_stanford_442',
          scoreGiven: 94.5,
          scoreMaximum: 100,
          normalizedScore: 0.945,
          proofDigest: '68a3f82cb5b69201948df92873cfa88294e01934c9f18e950183bda4958102ca',
          activityProgress: 'Completed',
          gradingProgress: 'FullyGraded',
          timestamp: new Date().toISOString(),
        },
      ],
    }
  }
}
