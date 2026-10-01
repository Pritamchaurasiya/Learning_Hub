import { Router, Request, Response } from 'express'
import { register } from '../utils/metrics'
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware'

const router = Router()

router.get('/metrics', async (req: Request, res: Response) => {
  const metricsKey = process.env.METRICS_AUTH_KEY
  const headerKey = req.headers['x-metrics-key']
  if (metricsKey && headerKey === metricsKey) {
    res.setHeader('Content-Type', register.contentType)
    const metrics = await register.metrics()
    return res.send(metrics)
  }

  return authenticate(req, res, () => {
    authorizeAdmin(req, res, async () => {
      res.setHeader('Content-Type', register.contentType)
      const metrics = await register.metrics()
      res.send(metrics)
    })
  })
})

export default router
