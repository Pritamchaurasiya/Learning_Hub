/**
 * Same-origin reverse proxy from Cloudflare Pages to the LearningHub Django API.
 *
 * Configure LEARNINGHUB_BACKEND_ORIGIN for both Pages Production and Preview
 * environments. It must contain only the Render HTTPS origin, without a path.
 */
export interface LearningHubProxyEnv {
  LEARNINGHUB_BACKEND_ORIGIN?: string
}

const jsonError = (status: number, code: string, message: string): Response =>
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

export async function proxyDjangoApi(request: Request, env: LearningHubProxyEnv): Promise<Response> {
  const configuredOrigin = env.LEARNINGHUB_BACKEND_ORIGIN?.trim()

  if (!configuredOrigin) {
    return jsonError(
      503,
      'BACKEND_NOT_CONFIGURED',
      'The LearningHub API is not configured for this environment.'
    )
  }

  let backendOrigin: URL
  try {
    backendOrigin = new URL(configuredOrigin)
  } catch {
    return jsonError(500, 'BACKEND_CONFIGURATION_INVALID', 'The API origin is invalid.')
  }

  // Accept only an HTTPS origin. No user-controlled path, credentials,
  // query string, or fragment can be introduced through this binding.
  if (
    backendOrigin.protocol !== 'https:' ||
    backendOrigin.pathname !== '/' ||
    backendOrigin.search !== '' ||
    backendOrigin.hash !== '' ||
    backendOrigin.username !== '' ||
    backendOrigin.password !== ''
  ) {
    return jsonError(
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
    const upstreamRequest = new Request(upstreamUrl.toString(), request)
    const headers = new Headers(upstreamRequest.headers)
    headers.delete('host')
    headers.set('x-forwarded-host', incomingUrl.host)
    headers.set('x-forwarded-proto', incomingUrl.protocol.slice(0, -1))

    const forwardedRequest = new Request(upstreamRequest, { headers })
    const upstreamResponse = await fetch(forwardedRequest, { redirect: 'manual' })

    // Django may issue absolute redirects using its Render hostname. Keep
    // redirects on the public Pages origin instead of leaking the upstream.
    const responseHeaders = new Headers(upstreamResponse.headers)
    const location = responseHeaders.get('location')
    if (location) {
      try {
        const redirectUrl = new URL(location, backendOrigin.origin)
        if (redirectUrl.origin === backendOrigin.origin) {
          responseHeaders.set(
            'location',
            `${incomingUrl.origin}${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
          )
        }
      } catch {
        // Leave a non-URL Location header untouched.
      }
    }

    // LearningHub API responses, authentication cookies, and CSRF material
    // must never be stored in a shared CDN cache.
    responseHeaders.set('Cache-Control', 'no-store')
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    })
  } catch {
    // Do not leak internal exception details, request headers, or credentials.
    return jsonError(
      502,
      'BACKEND_UPSTREAM_UNAVAILABLE',
      'The LearningHub API is temporarily unavailable.'
    )
  }
}
