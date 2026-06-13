#!/bin/bash

# Security Audit Script for LearningHub
# Run this before each production deployment

echo "🔒 Starting Security Audit..."
echo ""

# 1. Dependency Vulnerabilities
echo "📦 Checking dependencies for vulnerabilities..."
cd learninghub/backend
npm audit --production
AUDIT_EXIT=$?

if [ $AUDIT_EXIT -ne 0 ]; then
    echo "⚠️  Vulnerabilities found in dependencies!"
    echo "   Run: npm audit fix"
fi
echo ""

# 2. TypeScript Type Safety
echo "🔍 Running TypeScript type checks..."
npm run type-check 2>&1 | grep -i "error"
TS_EXIT=$?

if [ $TS_EXIT -eq 0 ]; then
    echo "❌ TypeScript errors found!"
else
    echo "✅ TypeScript checks passed"
fi
echo ""

# 3. Check for Secrets in Code
echo "🔑 Scanning for hardcoded secrets..."
SECRETS_FOUND=0

# Check for common secret patterns
grep -r "password.*=.*['\"]" src/ && SECRETS_FOUND=1
grep -r "api.*key.*=.*['\"]" src/ && SECRETS_FOUND=1
grep -r "secret.*=.*['\"]" src/ && SECRETS_FOUND=1

if [ $SECRETS_FOUND -eq 0 ]; then
    echo "✅ No hardcoded secrets found"
else
    echo "⚠️  Potential secrets found in code!"
fi
echo ""

# 4. Environment Variables Check
echo "⚙️  Verifying required environment variables..."
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET")
MISSING_VARS=0

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing: $var"
        MISSING_VARS=1
    fi
done

if [ $MISSING_VARS -eq 0 ]; then
    echo "✅ All required environment variables present"
fi
echo ""

# 5. Security Headers Check
echo "🛡️  Checking security headers configuration..."
if grep -q "helmet" src/server.ts; then
    echo "✅ Helmet security headers configured"
else
    echo "⚠️  Helmet not found in server.ts"
fi
echo ""

# Summary
echo "================================"
echo "Security Audit Summary"
echo "================================"

ISSUES=0
[ $AUDIT_EXIT -ne 0 ] && ISSUES=$((ISSUES+1))
[ $TS_EXIT -eq 0 ] && ISSUES=$((ISSUES+1))
[ $SECRETS_FOUND -eq 1 ] && ISSUES=$((ISSUES+1))
[ $MISSING_VARS -eq 1 ] && ISSUES=$((ISSUES+1))

if [ $ISSUES -eq 0 ]; then
    echo "✅ All security checks passed!"
    echo "   Safe to deploy to production"
    exit 0
else
    echo "⚠️  $ISSUES issue(s) found"
    echo "   Fix issues before deploying"
    exit 1
fi
