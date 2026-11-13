import {
  proxyLearningHubRequest,
  type LearningHubProxyEnv,
} from '../_shared/proxy'

interface PagesRequestContext {
  request: Request
  env: LearningHubProxyEnv
}

export const onRequest = ({ request, env }: PagesRequestContext): Promise<Response> =>
  proxyLearningHubRequest({ request, env })
