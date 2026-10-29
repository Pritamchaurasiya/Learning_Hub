import { Request, Response } from 'express'
import { LtiService, LtiOidcLoginParams, LtiLaunchClaims } from '../services/LtiService'
import logger from '../utils/logger'

export class LtiController {
  /**
   * GET/POST /api/v1/lti/login
   * Initiates OIDC 3rd party login
   */
  public static async initiateLogin(req: Request, res: Response): Promise<void> {
    try {
      const data = req.method === 'POST' ? req.body : req.query
      const { iss, login_hint, target_link_uri, lti_message_hint, client_id, deployment_id } = data

      if (!iss || !login_hint) {
        res.status(400).json({
          success: false,
          error: 'Missing required OIDC login parameters: iss and login_hint are mandatory',
        })
        return
      }

      const params: LtiOidcLoginParams = {
        iss: String(iss),
        login_hint: String(login_hint),
        target_link_uri: String(target_link_uri || `${req.protocol}://${req.get('host')}/api/v1/lti/launch`),
        lti_message_hint: lti_message_hint ? String(lti_message_hint) : undefined,
        client_id: client_id ? String(client_id) : undefined,
        deployment_id: deployment_id ? String(deployment_id) : undefined,
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/v1/lti/launch`
      const auth = LtiService.initiateOidcLogin(params, redirectUri)

      if (req.accepts('html') && !req.xhr && req.headers['content-type'] !== 'application/json') {
        res.redirect(302, auth.redirectUrl)
        return
      }

      res.status(200).json({
        success: true,
        data: auth,
      })
    } catch (err: any) {
      logger.error('LTI initiateLogin error', err)
      res.status(400).json({ success: false, error: err.message })
    }
  }

  /**
   * POST /api/v1/lti/launch
   * Consumes LTI 1.3 Resource Link Request
   */
  public static async launch(req: Request, res: Response): Promise<void> {
    try {
      const { id_token, state } = req.body

      if (!state) {
        res.status(400).json({ success: false, error: 'Missing mandatory state parameter in LTI launch' })
        return
      }

      let claims: LtiLaunchClaims
      if (typeof id_token === 'string') {
        try {
          // If a raw JWT is provided, extract middle base64url payload
          const parts = id_token.split('.')
          if (parts.length === 3) {
            claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
          } else {
            claims = JSON.parse(id_token)
          }
        } catch {
          res.status(400).json({ success: false, error: 'Invalid or undecodable id_token provided' })
          return
        }
      } else if (typeof id_token === 'object' && id_token !== null) {
        claims = id_token
      } else {
        res.status(400).json({ success: false, error: 'id_token must be a valid JWT or claim object' })
        return
      }

      const session = LtiService.handleLtiLaunch(claims, String(state))

      res.status(200).json({
        success: true,
        data: {
          session,
          redirectUrl: `/institution-hub?session=${session.sessionId}`,
        },
      })
    } catch (err: any) {
      logger.error('LTI launch error', err)
      res.status(400).json({ success: false, error: err.message })
    }
  }

  /**
   * GET /api/v1/lti/jwks
   * Public JWKS key set for LMS signature verification
   */
  public static getJwks(_req: Request, res: Response): void {
    const jwks = LtiService.getPublicJwks()
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json(jwks)
  }

  /**
   * POST /api/v1/lti/grades/passback
   * Pushes grade score to LMS via LTI AGS
   */
  public static async passbackGrade(req: Request, res: Response): Promise<void> {
    try {
      const { institutionId, lineItemUrl, studentLtiUserId, scoreGiven, scoreMaximum, comment } = req.body

      if (!institutionId || !lineItemUrl || !studentLtiUserId || scoreGiven === undefined || scoreMaximum === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required passback fields: institutionId, lineItemUrl, studentLtiUserId, scoreGiven, scoreMaximum',
        })
        return
      }

      const result = LtiService.passbackGrade({
        institutionId,
        lineItemUrl,
        studentLtiUserId,
        scoreGiven: Number(scoreGiven),
        scoreMaximum: Number(scoreMaximum),
        comment,
      })

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (err: any) {
      logger.error('LTI passbackGrade error', err)
      res.status(400).json({ success: false, error: err.message })
    }
  }

  /**
   * GET /api/v1/lti/institutions
   */
  public static getInstitutions(_req: Request, res: Response): void {
    const list = LtiService.getAllInstitutions()
    res.status(200).json({
      success: true,
      data: list,
    })
  }

  /**
   * POST /api/v1/lti/institutions
   */
  public static registerInstitution(req: Request, res: Response): void {
    try {
      const created = LtiService.registerInstitution(req.body)
      res.status(201).json({
        success: true,
        data: created,
      })
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message })
    }
  }

  /**
   * GET /api/v1/lti/institutions/:id/analytics
   */
  public static getInstitutionAnalytics(req: Request, res: Response): void {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      const analytics = LtiService.getInstitutionAnalytics(id)
      res.status(200).json({
        success: true,
        data: analytics,
      })
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message })
    }
  }

  /**
   * POST /api/v1/lti/simulate-launch
   * Test endpoint allowing developers and admins to simulate an incoming LTI 1.3 launch
   */
  public static simulateLaunch(req: Request, res: Response): void {
    try {
      const { institutionId, role = 'Learner', userName = 'Student Tester', userEmail } = req.body
      const institution = LtiService.getInstitutionById(institutionId || 'inst_stanford_eng')

      if (!institution) {
        res.status(404).json({ success: false, error: 'Institution not found' })
        return
      }

      // Step 1: Initiate
      const auth = LtiService.initiateOidcLogin(
        {
          iss: institution.issuer,
          login_hint: 'simulated_user_01',
          target_link_uri: 'https://learninghub.io/lti/launch',
        },
        'https://learninghub.io/api/v1/lti/launch'
      )

      // Step 2: Build Claims
      const isInstructor = role.toLowerCase().includes('instructor') || role.toLowerCase().includes('admin')
      const claims: LtiLaunchClaims = {
        iss: institution.issuer,
        sub: `usr_sim_${Date.now()}`,
        aud: institution.clientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nonce: auth.nonce,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': institution.deploymentId,
        'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://learninghub.io/lti/launch',
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
          id: 'res_link_sim_cbt_01',
          title: `${institution.name} Advanced CBT Diagnostic`,
        },
        'https://purl.imsglobal.org/spec/lti/claim/roles': isInstructor
          ? ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor']
          : ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
        'https://purl.imsglobal.org/spec/lti/claim/context': {
          id: 'course_eng_401',
          title: 'Algorithmic Optimization & Distributed Architecture',
        },
        'https://purl.imsglobal.org/spec/lti/claim/ags/claim/endpoint': {
          scope: ['https://purl.imsglobal.org/spec/lti-ags/scope/score'],
          lineitem: `${institution.issuer}/api/v1/courses/401/line_items/101`,
        },
        name: userName,
        email: userEmail || `student@${institution.domain}`,
      }

      const session = LtiService.handleLtiLaunch(claims, auth.state)

      res.status(200).json({
        success: true,
        data: {
          session,
          message: 'LTI 1.3 launch simulated successfully',
        },
      })
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message })
    }
  }
}
