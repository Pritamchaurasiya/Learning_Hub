#!/usr/bin/env node

/**
 * LearningHub Neon PostgreSQL Database Setup Script
 *
 * This script helps set up the Neon PostgreSQL database for production.
 * Run this after updating your .env file with Neon credentials.
 *
 * Usage:
 *   node scripts/setup-neon-db.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 LearningHub Neon PostgreSQL Setup\n')

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env')
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!')
  console.log('Please create a .env file from .env.example')
  console.log('  cp .env.example .env')
  process.exit(1)
}

// Check for Neon environment variables
require('dotenv').config({ path: envPath })

if (!process.env.NEON_DATABASE_URL) {
  console.error('❌ NEON_DATABASE_URL not found in .env file!')
  console.log('Please add your Neon connection string to .env:')
  console.log(
    '  NEON_DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"'
  )
  process.exit(1)
}

console.log('✅ Environment variables found\n')

const steps = [
  {
    name: 'Validate Prisma Schema',
    command: 'npx prisma validate',
    description: 'Checking schema.prisma syntax...',
  },
  {
    name: 'Generate Prisma Client',
    command: 'npx prisma generate',
    description: 'Generating Prisma client for PostgreSQL...',
  },
  {
    name: 'Deploy Migrations',
    command: 'npx prisma migrate deploy',
    description: 'Deploying database migrations...',
  },
  {
    name: 'Seed Database',
    command: 'npx prisma db seed',
    description: 'Seeding database with demo data...',
    optional: true,
  },
]

async function runSetup() {
  for (const step of steps) {
    console.log(`\n📦 ${step.name}`)
    console.log(`   ${step.description}`)

    try {
      const output = execSync(step.command, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        stdio: 'pipe',
      })
      console.log('   ✅ Success')
      if (output) console.log(output.slice(0, 500))
    } catch (error) {
      if (step.optional) {
        console.log('   ⚠️  Optional step failed, continuing...')
      } else {
        console.error('   ❌ Failed:', error.message)
        process.exit(1)
      }
    }
  }

  console.log('\n🎉 Database setup complete!')
  console.log('\nNext steps:')
  console.log('  1. Update your Workers backend wrangler.toml with NEON_DATABASE_URL secret')
  console.log('  2. Deploy the backend: wrangler deploy --env production')
  console.log('  3. Test the connection with: npx prisma studio\n')
}

runSetup().catch(console.error)
