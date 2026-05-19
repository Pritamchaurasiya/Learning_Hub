#!/usr/bin/env node

/**
 * LearningHub Pre-Deployment Verification Script
 *
 * This script checks if everything is ready for deployment.
 * Run this before deploying to catch any issues early.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const CHECKS = {
  passed: 0,
  failed: 0,
  warnings: 0,
}

function success(msg) {
  console.log(`✅ ${msg}`)
  CHECKS.passed++
}

function error(msg) {
  console.log(`❌ ${msg}`)
  CHECKS.failed++
}

function warning(msg) {
  console.log(`⚠️  ${msg}`)
  CHECKS.warnings++
}

function info(msg) {
  console.log(`ℹ️  ${msg}`)
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    success(`${description} exists: ${filePath}`)
    return true
  } else {
    error(`${description} missing: ${filePath}`)
    return false
  }
}

function checkDirectoryExists(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    success(`${description} exists: ${dirPath}`)
    return true
  } else {
    error(`${description} missing: ${dirPath}`)
    return false
  }
}

console.log('🔍 LearningHub Pre-Deployment Verification\n')
console.log('='.repeat(50))

// Check 1: Backend files
console.log('\n📦 Checking Workers Backend...')
checkDirectoryExists('workers-backend/src', 'Workers source directory')
checkFileExists('workers-backend/src/index.ts', 'Main entry point')
checkFileExists('workers-backend/wrangler.toml', 'Wrangler config')
checkFileExists('workers-backend/package.json', 'Package.json')

// Check 2: Frontend files
console.log('\n🎨 Checking Frontend...')
checkDirectoryExists('learninghub/src', 'Frontend source directory')
checkFileExists('learninghub/package.json', 'Frontend package.json')
checkFileExists('learninghub/.env.production', 'Production environment file')
checkFileExists('learninghub/vite.config.ts', 'Vite config')

// Check 3: Database files
console.log('\n🗄️  Checking Database Setup...')
checkDirectoryExists('backend/prisma', 'Prisma directory')
checkFileExists('backend/prisma/schema.prisma', 'Prisma schema')
checkFileExists('backend/.env', 'Backend environment file')

// Check 4: Environment variables
console.log('\n⚙️  Checking Environment Configuration...')

// Check backend .env
if (fs.existsSync('backend/.env')) {
  const backendEnv = fs.readFileSync('backend/.env', 'utf8')
  if (backendEnv.includes('NEON_DATABASE_URL')) {
    success('Backend has NEON_DATABASE_URL configured')
  } else {
    error('Backend missing NEON_DATABASE_URL')
  }
} else {
  error('Backend .env file not found')
}

// Check frontend production env
if (fs.existsSync('learninghub/.env.production')) {
  const frontendEnv = fs.readFileSync('learninghub/.env.production', 'utf8')
  if (frontendEnv.includes('VITE_API_URL')) {
    const apiUrl = frontendEnv.match(/VITE_API_URL=(.+)/)
    if (apiUrl && apiUrl[1].includes('workers.dev')) {
      success('Frontend VITE_API_URL points to Workers domain')
    } else if (apiUrl && apiUrl[1].includes('localhost')) {
      warning('Frontend VITE_API_URL still points to localhost - update before production!')
    } else {
      info("Frontend VITE_API_URL is set (verify it's correct)")
    }
  } else {
    error('Frontend missing VITE_API_URL')
  }
} else {
  error('Frontend .env.production not found')
}

// Check 5: Dependencies
console.log('\n📦 Checking Dependencies...')

try {
  const workersPkg = JSON.parse(fs.readFileSync('workers-backend/package.json', 'utf8'))
  const hasNeon = workersPkg.dependencies['@neondatabase/serverless']
  const hasHono = workersPkg.dependencies.hono || workersPkg.devDependencies?.hono

  if (hasNeon) success('Workers has @neondatabase/serverless')
  else error('Workers missing @neondatabase/serverless')
} catch (e) {
  error('Could not parse workers package.json')
}

// Check 6: Wrangler configuration
console.log('\n🔧 Checking Wrangler Configuration...')

if (fs.existsSync('workers-backend/wrangler.toml')) {
  const wranglerConfig = fs.readFileSync('workers-backend/wrangler.toml', 'utf8')

  if (wranglerConfig.includes('DATABASE_URL')) {
    success('wrangler.toml references DATABASE_URL')
  } else {
    warning('wrangler.toml may need DATABASE_URL configuration')
  }

  if (wranglerConfig.includes('JWT_SECRET')) {
    success('wrangler.toml references JWT_SECRET')
  } else {
    warning('wrangler.toml may need JWT_SECRET configuration')
  }
} else {
  error('wrangler.toml not found')
}

// Check 7: TypeScript compilation (optional)
console.log('\n🔍 Optional: Checking TypeScript Compilation...')

try {
  info('Attempting TypeScript check on workers-backend...')
  execSync('cd workers-backend && npx tsc --noEmit', { stdio: 'pipe' })
  success('Workers TypeScript compiles successfully')
} catch (e) {
  warning('TypeScript check failed (may be expected if dependencies not installed)')
}

// Check 8: Documentation
console.log('\n📚 Checking Documentation...')
checkFileExists('DEPLOYMENT_GUIDE.md', 'Deployment guide')
checkFileExists('docs/DATABASE_MIGRATION_GUIDE.md', 'Database migration guide')
checkFileExists('docs/BACKEND_CONSOLIDATION_GUIDE.md', 'Backend consolidation guide')

// Final summary
console.log('\n' + '='.repeat(50))
console.log('📊 VERIFICATION SUMMARY\n')
console.log(`✅ Passed: ${CHECKS.passed}`)
console.log(`❌ Failed: ${CHECKS.failed}`)
console.log(`⚠️  Warnings: ${CHECKS.warnings}`)

if (CHECKS.failed === 0) {
  console.log('\n🎉 All critical checks passed!')
  console.log('\nNext steps:')
  console.log('  1. Run: cd backend && npm run db:setup')
  console.log('  2. Run: cd workers-backend && npx wrangler secret put DATABASE_URL')
  console.log('  3. Run: cd workers-backend && npx wrangler secret put JWT_SECRET')
  console.log('  4. Run: cd workers-backend && npx wrangler deploy --env production')
  console.log('  5. Follow DEPLOYMENT_GUIDE.md for full instructions')
  process.exit(0)
} else {
  console.log(`\n⚠️  ${CHECKS.failed} critical issue(s) found!`)
  console.log('Please fix the failed checks before deploying.')
  process.exit(1)
}
