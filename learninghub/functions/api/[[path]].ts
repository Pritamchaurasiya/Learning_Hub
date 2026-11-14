import { proxyDjangoApi, type LearningHubProxyEnv } from '../_shared/djangoProxy'

interface PagesContext {
  request: Request
  env: LearningHubProxyEnv
}

export const onRequest = ({ request, env }: PagesContext): Promise<Response> =>
  proxyDjangoApi(request, env)
