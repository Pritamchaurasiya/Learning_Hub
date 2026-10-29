import { LtiService, LtiLaunchClaims, LtiOidcLoginParams } from '../../services/LtiService'

describe('LtiService — Enterprise Multi-Tenant Institution Hub & LTI 1.3 Engine', () => {
  beforeEach(() => {
    LtiService.resetState()
  })

  describe('1. OIDC Third-Party Login Initiation', () => {
    it('should successfully initiate OIDC login for a registered Stanford Canvas issuer', () => {
      const loginParams: LtiOidcLoginParams = {
        iss: 'https://canvas.stanford.edu',
        login_hint: 'user_stanford_9942',
        target_link_uri: 'https://learninghub.io/lti/launch',
        client_id: 'stanford_canvas_client_9942',
      }

      const result = LtiService.initiateOidcLogin(loginParams, 'https://learninghub.io/api/v1/lti/launch')
      expect(result).toBeDefined()
      expect(result.redirectUrl).toContain('https://canvas.stanford.edu/api/lti/authorize_redirect')
      expect(result.redirectUrl).toContain('response_type=id_token')
      expect(result.redirectUrl).toContain('state=')
      expect(result.redirectUrl).toContain('nonce=')
      expect(result.state).toBeDefined()
      expect(result.nonce).toBeDefined()
    })

    it('should throw an error if issuer is unknown or unregistered', () => {
      const loginParams: LtiOidcLoginParams = {
        iss: 'https://unauthorized-lms.malicious.org',
        login_hint: 'hacker_01',
        target_link_uri: 'https://learninghub.io/lti/launch',
      }

      expect(() => {
        LtiService.initiateOidcLogin(loginParams, 'https://learninghub.io/api/v1/lti/launch')
      }).toThrow('Unauthorized or unregistered LTI issuer')
    })
  })

  describe('2. LTI 1.3 Launch & Nonce Replay Protection', () => {
    it('should validate claims, provision a session, and reject replay attacks', () => {
      // 1. Initiate login to get valid state & nonce
      const loginParams: LtiOidcLoginParams = {
        iss: 'https://canvas.stanford.edu',
        login_hint: 'student_99',
        target_link_uri: 'https://learninghub.io/lti/launch',
        client_id: 'stanford_canvas_client_9942',
      }
      const auth = LtiService.initiateOidcLogin(loginParams, 'https://learninghub.io/api/v1/lti/launch')

      // 2. Build LTI 1.3 launch claims
      const claims: LtiLaunchClaims = {
        iss: 'https://canvas.stanford.edu',
        sub: 'usr_stanford_stud_99',
        aud: 'stanford_canvas_client_9942',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nonce: auth.nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'dep_stanford_eng_01',
        'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://learninghub.io/lti/launch',
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
          id: 'res_link_exam_gate_cs_44',
          title: 'GATE CS Mock Exam 2026',
        },
        'https://purl.imsglobal.org/spec/lti/claim/roles': [
          'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
        ],
        'https://purl.imsglobal.org/spec/lti/claim/context': {
          id: 'course_cs106b',
          title: 'CS106B Programming Abstractions',
        },
        'https://purl.imsglobal.org/spec/lti/claim/ags/claim/endpoint': {
          scope: ['https://purl.imsglobal.org/spec/lti-ags/scope/score'],
          lineitem: 'https://canvas.stanford.edu/api/v1/courses/401/line_items/102',
        },
        name: 'Alex Mercer',
        email: 'alex.mercer@cs.stanford.edu',
      }

      // 3. Launch first time -> SUCCESS
      const session = LtiService.handleLtiLaunch(claims, auth.state)
      expect(session).toBeDefined()
      expect(session.institutionId).toBe('inst_stanford_eng')
      expect(session.isInstructor).toBe(false)
      expect(session.email).toBe('alex.mercer@cs.stanford.edu')
      expect(session.lineItemUrl).toBe('https://canvas.stanford.edu/api/v1/courses/401/line_items/102')
      expect(session.token).toBeDefined()

      // 4. Replay attack with same nonce -> MUST FAIL
      expect(() => {
        LtiService.handleLtiLaunch(claims, auth.state)
      }).toThrow('Invalid or expired LTI launch nonce (Replay protection triggered)')
    })

    it('should correctly identify Instructor and Admin roles', () => {
      const loginParams: LtiOidcLoginParams = {
        iss: 'https://canvas.mit.edu',
        login_hint: 'prof_eecs_01',
        target_link_uri: 'https://learninghub.io/lti/launch',
      }
      const auth = LtiService.initiateOidcLogin(loginParams, 'https://learninghub.io/api/v1/lti/launch')

      const claims: LtiLaunchClaims = {
        iss: 'https://canvas.mit.edu',
        sub: 'usr_mit_prof_01',
        aud: 'mit_canvas_client_5831',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nonce: auth.nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'dep_mit_eecs_04',
        'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://learninghub.io/lti/launch',
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
          id: 'res_link_mit_6004',
        },
        'https://purl.imsglobal.org/spec/lti/claim/roles': [
          'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
        ],
        name: 'Prof. Gerald Sussman',
        email: 'sussman@mit.edu',
      }

      const session = LtiService.handleLtiLaunch(claims, auth.state)
      expect(session.isInstructor).toBe(true)
      expect(session.institutionName).toContain('MIT')
    })
  })

  describe('3. Assignment & Grade Services (AGS) Grade Passback', () => {
    it('should calculate normalized score and generate cryptographic proof digest', () => {
      const result = LtiService.passbackGrade({
        institutionId: 'inst_stanford_eng',
        lineItemUrl: 'https://canvas.stanford.edu/api/v1/courses/401/line_items/102',
        studentLtiUserId: 'usr_stanford_stud_99',
        scoreGiven: 88,
        scoreMaximum: 100,
        comment: 'Mastery achieved across Dynamic Programming and Graph Theory',
      })

      expect(result.success).toBe(true)
      expect(result.normalizedScore).toBe(0.88)
      expect(result.transactionId).toMatch(/^tx_ags_/)
      expect(result.proofDigest).toHaveLength(64) // SHA-256 hex string
      expect(result.activityProgress).toBe('Completed')
      expect(result.gradingProgress).toBe('FullyGraded')
    })

    it('should reject invalid or negative score ranges', () => {
      expect(() => {
        LtiService.passbackGrade({
          institutionId: 'inst_stanford_eng',
          lineItemUrl: 'https://canvas.stanford.edu/api/v1/courses/401/line_items/102',
          studentLtiUserId: 'usr_99',
          scoreGiven: -5,
          scoreMaximum: 100,
        })
      }).toThrow('Invalid score values')
    })
  })

  describe('4. Multi-Tenant Institution Registry & Analytics', () => {
    it('should list seeded institutions and retrieve analytics', () => {
      const institutions = LtiService.getAllInstitutions()
      expect(institutions.length).toBeGreaterThanOrEqual(3)

      const stanford = LtiService.getInstitutionById('inst_stanford_eng')
      expect(stanford).toBeDefined()
      expect(stanford?.domain).toBe('stanford.edu')

      const analytics = LtiService.getInstitutionAnalytics('inst_stanford_eng')
      expect(analytics.institutionId).toBe('inst_stanford_eng')
      expect(analytics.totalLearners).toBeGreaterThan(1000)
      expect(analytics.averageScorePercent).toBeGreaterThan(80)
      expect(analytics.topExams.length).toBeGreaterThan(0)
    })

    it('should register a new enterprise institution', () => {
      const newInst = LtiService.registerInstitution({
        name: 'Harvard John A. Paulson School of Engineering',
        domain: 'seas.harvard.edu',
        subdomain: 'harvard',
        issuer: 'https://canvas.harvard.edu',
        clientId: 'harvard_client_3301',
        deploymentId: 'dep_harvard_seas_01',
        authLoginUrl: 'https://canvas.harvard.edu/api/lti/authorize_redirect',
        authTokensUrl: 'https://canvas.harvard.edu/login/oauth2/token',
        keySetUrl: 'https://canvas.harvard.edu/api/lti/security/jwks',
        status: 'ACTIVE',
        branding: {
          primaryColor: '#A51C30',
          logoUrl: 'https://www.harvard.edu/logo.png',
          portalTitle: 'Harvard SEAS Learning Hub',
        },
      })

      expect(newInst.id).toContain('inst_harvard_')
      expect(LtiService.getInstitutionBySubdomain('harvard')?.name).toBe(newInst.name)
    })
  })

  describe('5. Public JWKS Endpoint', () => {
    it('should return valid JWKS RSA public key set', () => {
      const jwks = LtiService.getPublicJwks()
      expect(jwks.keys).toBeDefined()
      expect(jwks.keys.length).toBeGreaterThan(0)
      expect(jwks.keys[0].kty).toBe('RSA')
      expect(jwks.keys[0].alg).toBe('RS256')
      expect(jwks.keys[0].kid).toBe('learninghub-lti-2026-key-01')
    })
  })
})
