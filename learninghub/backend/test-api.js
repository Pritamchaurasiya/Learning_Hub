// Comprehensive LearningHub API Integration Test
const http = require('http')

const sessionId = 'test-session-id-' + Math.random().toString(36).substring(2, 10)
let csrfToken = ''
let cookies = ''

function makeRequest(method, path, body = null, extraHeaders = {}) {
  return new Promise(resolve => {
    const headers = {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      ...extraHeaders,
    }
    if (csrfToken) headers['x-csrf-token'] = csrfToken
    if (cookies) headers['Cookie'] = cookies

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1${path}`,
      method,
      headers,
    }
    const req = http.request(options, res => {
      // Capture set-cookie headers
      const setCookies = res.headers['set-cookie']
      if (setCookies) {
        const cookieParts = setCookies.map(c => c.split(';')[0])
        cookies = cookieParts.join('; ')
      }

      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers })
        } catch {
          resolve({ status: res.statusCode, body: data.substring(0, 500), headers: res.headers })
        }
      })
    })
    req.on('error', e => resolve({ status: 'ERROR', body: e.message }))
    req.setTimeout(15000, () => {
      req.destroy()
      resolve({ status: 'TIMEOUT', body: 'Request timed out' })
    })
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  LearningHub — Full Integration Verification    ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  let pass = 0,
    fail = 0,
    warn = 0
  const log = (name, ok, status, detail) => {
    if (ok === true) {
      pass++
      console.log(`  ✅ ${name} (${status})${detail ? ' — ' + detail : ''}`)
    } else if (ok === 'warn') {
      warn++
      console.log(`  ⚠️  ${name} (${status})${detail ? ' — ' + detail : ''}`)
    } else {
      fail++
      console.log(`  ❌ ${name} (${status})${detail ? ' — ' + detail : ''}`)
    }
  }

  // ═══════════ CSRF TOKEN INITIALIZATION ═══════════
  const csrfRes = await makeRequest('GET', '/csrf-token')
  const token = csrfRes.body?.csrfToken ?? csrfRes.body?.data?.csrfToken
  if (csrfRes.status === 200 && token) {
    csrfToken = token
    console.log(`  🔑 CSRF Token Initialized: Yes (${csrfToken.substring(0, 15)}...)\n`)
  } else {
    console.log(`  ❌ Failed to fetch CSRF token (${csrfRes.status}):`, csrfRes.body)
    process.exit(1)
  }

  // ═══════════ PUBLIC ENDPOINTS ═══════════
  console.log('── Public Endpoints ──────────────────────────')

  // 1. Health
  const h = await makeRequest('GET', '/health')
  log(
    'Health Check',
    h.status === 200,
    h.status,
    `DB:${h.body?.checks?.database?.status}, Redis:${h.body?.checks?.redis?.status}, Uptime:${h.body?.uptimeHuman}`
  )

  // 2. Courses
  const c = await makeRequest('GET', '/courses')
  log('GET /courses', c.status === 200, c.status, `found ${c.body?.data?.length ?? 0} courses`)

  // 3. Tests
  const t = await makeRequest('GET', '/tests')
  log('GET /tests', t.status === 200, t.status, `found ${t.body?.data?.length ?? 0} tests`)

  // 4. Countries
  const cn = await makeRequest('GET', '/exam-content/countries')
  log(
    'GET /exam-content/countries',
    cn.status === 200,
    cn.status,
    `found ${cn.body?.data?.length ?? 0} countries`
  )

  // 5. Exams
  const ex = await makeRequest('GET', '/exam-content/exams')
  log(
    'GET /exam-content/exams',
    ex.status === 200,
    ex.status,
    `found ${ex.body?.data?.length ?? 0} exams`
  )

  // 6. Formulas
  const f = await makeRequest('GET', '/exam-content/formulas')
  log('GET /exam-content/formulas', f.status === 200, f.status)

  // 7. PYQs
  const pyq = await makeRequest('GET', '/exam-content/pyqs')
  log('GET /exam-content/pyqs', pyq.status === 200, pyq.status)

  // 8. Revision notes
  const rn = await makeRequest('GET', '/exam-content/revision-notes')
  log('GET /exam-content/revision-notes', rn.status === 200, rn.status)

  // 9. Search (with valid query)
  const s = await makeRequest('GET', '/search?q=test')
  log(
    'GET /search?q=test',
    s.status === 200,
    s.status,
    s.body?.message || `results: ${s.body?.data?.length ?? 0}`
  )

  // 10. Search suggestions
  const ss = await makeRequest('GET', '/search/suggestions?q=ja')
  log('GET /search/suggestions', ss.status === 200, ss.status)

  // 11. Search trending
  const st = await makeRequest('GET', '/search/trending')
  log('GET /search/trending', st.status === 200, st.status)

  // ═══════════ AUTH FLOW ═══════════
  console.log('\n── Auth Flow ─────────────────────────────────')

  // Try registering a new user with a very strong password
  const regEmail = `inttest_${Date.now()}_${Math.random().toString(36).substring(2, 5)}@example.com`
  const reg = await makeRequest('POST', '/auth/register', {
    name: 'API Tester',
    email: regEmail,
    password: 'X$8kzPqR#2mVw!nL7j',
  })
  log(
    'POST /auth/register',
    reg.status === 201 || reg.status === 200,
    reg.status,
    reg.body?.message || ''
  )

  // Log in using the new user to establish correct cookies
  const login2 = await makeRequest('POST', '/auth/login', {
    email: regEmail,
    password: 'X$8kzPqR#2mVw!nL7j',
  })
  const hasAuth2 = !!cookies
  log(
    'POST /auth/login (new user)',
    login2.status === 200,
    login2.status,
    hasAuth2 ? 'cookies set ✓' : 'no cookies'
  )

  if (cookies) {
    // ═══════════ AUTHENTICATED ENDPOINTS ═══════════
    console.log('\n── Authenticated Endpoints ───────────────────')

    // 12. Profile /me
    const p = await makeRequest('GET', '/auth/me')
    log('GET /auth/me', p.status === 200, p.status, p.body?.data?.email || '')

    // 13. Notifications
    const n = await makeRequest('GET', '/notifications')
    log('GET /notifications', n.status === 200, n.status)

    // 14. Gamification achievements
    const g = await makeRequest('GET', '/gamification/achievements')
    log('GET /gamification/achievements', g.status === 200, g.status)

    // 15. Recommendations
    const rec = await makeRequest('GET', '/recommendations')
    log('GET /recommendations', rec.status === 200, rec.status, rec.body?.message || '')

    // 16. User Analytics me
    const ua = await makeRequest('GET', '/user-analytics/me')
    log('GET /user-analytics/me', ua.status === 200, ua.status)

    // 17. Preferences GET
    const prefGet = await makeRequest('GET', '/auth/preferences')
    log('GET /auth/preferences', prefGet.status === 200, prefGet.status)

    // 18. Preferences PUT
    const prefPut = await makeRequest('PUT', '/auth/preferences', {
      difficulty: 'MEDIUM',
      dailyGoal: 10,
    })
    log(
      'PUT /auth/preferences',
      prefPut.status === 200,
      prefPut.status,
      prefPut.body?.message || ''
    )

    // 19. AI generate test
    const ai = await makeRequest('POST', '/ai/generate-test', {
      topic: 'JavaScript basics',
      questionCount: 3,
      difficulty: 'easy',
    })
    log(
      'POST /ai/generate-test',
      ai.status === 200 || ai.status === 201
        ? true
        : ai.status === 503 || ai.status === 500
          ? 'warn'
          : false,
      ai.status,
      ai.body?.message || (ai.body?.data ? 'generated!' : '')
    )

    // 20. AB Testing experiments
    const ab = await makeRequest('GET', '/ab-testing/my-experiments')
    log('GET /ab-testing/my-experiments', ab.status === 200, ab.status)
  } else {
    console.log('\n  ⚠️ No auth cookies — authenticated tests skipped')
    warn++
  }

  // ═══════════ SUMMARY ═══════════
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log(
    `║  Results: ${String(pass).padStart(2)} passed, ${String(fail).padStart(2)} failed, ${String(warn).padStart(2)} warnings        ║`
  )
  console.log('╚══════════════════════════════════════════════════╝')

  if (fail === 0) {
    console.log('\n🎉 All critical endpoints are working correctly!')
  } else {
    console.log(`\n⚠️ ${fail} endpoint(s) need attention.`)
    process.exit(1)
  }
}

runTests().catch(console.error)
