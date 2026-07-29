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

// Resolve paths relative to working directory or project root
const inSubdir = fs.existsSync('src') && fs.existsSync('backend')
const prefix = (p) => inSubdir ? p.replace(/^learninghub\//, '') : p

// Check 1: Backend files
console.log('\n📦 Checking Backend...')
checkDirectoryExists(prefix('backend/src'), 'Backend source directory')
checkFileExists(prefix('backend/src/server.ts'), 'Main entry point')
checkFileExists(prefix('backend/package.json'), 'Backend Package.json')

// Check 2: Frontend files
console.log('\n🎨 Checking Frontend...')
checkDirectoryExists(prefix('learninghub/src'), 'Frontend source directory')
checkFileExists(prefix('learninghub/package.json'), 'Frontend package.json')
checkFileExists(prefix('learninghub/.env.production'), 'Production environment file')
checkFileExists(prefix('learninghub/vite.config.ts'), 'Vite config')

// Check 3: Database files
console.log('\n🗄️  Checking Database Setup...')
checkDirectoryExists(prefix('backend/prisma'), 'Prisma directory')
checkFileExists(prefix('backend/prisma/schema.prisma'), 'Prisma schema')
checkFileExists(prefix('backend/.env'), 'Backend environment file')

// Check 4: Environment variables
console.log('\n⚙️  Checking Environment Configuration...')

const backendEnvPath = prefix('backend/.env')
if (fs.existsSync(backendEnvPath)) {
  const backendEnv = fs.readFileSync(backendEnvPath, 'utf8')
  if (backendEnv.includes('DATABASE_URL') || backendEnv.includes('NEON_DATABASE_URL')) {
    success('Backend has database URL configured')
  } else {
    error('Backend missing DATABASE_URL')
  }
} else {
  error('Backend .env file not found')
}

const frontendEnvPath = prefix('learninghub/.env.production')
if (fs.existsSync(frontendEnvPath)) {
  const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf8')
  if (frontendEnv.includes('VITE_API_URL')) {
    success('Frontend VITE_API_URL is configured')
  } else {
    error('Frontend missing VITE_API_URL')
  }
} else {
  error('Frontend .env.production not found')
}

// Check 5: Dependencies
console.log('\n📦 Checking Dependencies...')

try {
  const backendPkg = JSON.parse(fs.readFileSync(prefix('backend/package.json'), 'utf8'))
  const hasPrisma = backendPkg.dependencies['@prisma/client']

  if (hasPrisma) success('Backend has @prisma/client')
  else error('Backend missing @prisma/client')
} catch (e) {
  error('Could not parse backend package.json')
}

// Check 6: Documentation
console.log('\n📚 Checking Documentation...')
checkFileExists(prefix('DEPLOYMENT_GUIDE.md'), 'Deployment guide')
checkFileExists(prefix('docs/DATABASE_MIGRATION_GUIDE.md'), 'Database migration guide')
checkFileExists(prefix('docs/BACKEND_CONSOLIDATION_GUIDE.md'), 'Backend consolidation guide')

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
