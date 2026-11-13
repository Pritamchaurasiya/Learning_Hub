/**
 * Same-origin reverse proxy for the LearningHub API and Socket.IO.
 *
 * Browser requests stay on the Cloudflare Pages hostname. Cloudflare Pages
 * forwards the request to the Render Express service, so auth cookies are
 * first-party cookies for the Pages hostname rather than third-party cookies.
 *
 * Configure LEARNINGHUB_BACKEND_ORIGIN in both Pages Production and Preview
 * environments, for example:
 *   https://learninghub-express-api-staging-pr214.onrender.com
 */

export interface LearningHubProxyEnv {
  LEARNINGHUB_BACKEND_ORIGIN?: string
}

interface ProxyContext {
  request: Request
  env: LearningHubProxyEnv
}

const errorResponse = (status: number, code: string, message: string): Response =>
  Response.json(
    { status: 'error', code, message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  )

export const proxyLearningHubRequest = async ({
  request,
  env,
}: ProxyContext): Promise<Response> => {
  const configuredOrigin = env.LEARNINGHUB_BACKEND_ORIGIN?.trim()

  if (!configuredOrigin) {
    return errorResponse(
      503,
      'BACKEND_NOT_CONFIGURED',
      'The LearningHub API is not configured for this environment.'
    )
  }

  let backendOrigin: URL
  try {
    backendOrigin = new URL(configuredOrigin)
  } catch {
    return errorResponse(500, 'BACKEND_CONFIGURATION_INVALID', 'The API origin is invalid.')
  }

  // The binding must be an origin only. Do not allow arbitrary paths, query
  // strings, fragments, or non-TLS upstreams to be injected by configuration.
  if (
    backendOrigin.protocol !== 'https:' ||
    backendOrigin.pathname !== '/' ||
    backendOrigin.search !== '' ||
    backendOrigin.hash !== '' ||
    backendOrigin.username !== '' ||
    backendOrigin.password !== ''
  ) {
    return errorResponse(
      500,
      'BACKEND_CONFIGURATION_INVALID',
      'The API origin must be a plain HTTPS origin without credentials or a path.'
    )
  }

  const incomingUrl = new URL(request.url)
  const upstreamUrl = new URL(
    `${incomingUrl.pathname}${incomingUrl.search}`,
    backendOrigin.origin
  )

  try {
    // Re-target the original request without reading or buffering its body.
    // This preserves cookies, authorization headers, methods, query strings,
    // content type, and Socket.IO WebSocket upgrade headers.
    const upstreamRequest = new Request(upstreamUrl.toString(), request)
    const headers = new Headers(upstreamRequest.headers)
    headers.delete('host')
    headers.set('x-forwarded-host', incomingUrl.host)
    headers.set('x-forwarded-proto', incomingUrl.protocol.slice(0, -1))

    const forwardedRequest = new Request(upstreamRequest, { headers })
    return await fetch(forwardedRequest)
  } catch {
    // Do not expose upstream URLs, headers, cookies, or internal exception
    // details to the browser.
    return errorResponse(
      502,
      'BACKEND_UPSTREAM_UNAVAILABLE',
      'The LearningHub API is temporarily unavailable.'
    )
  }
}
