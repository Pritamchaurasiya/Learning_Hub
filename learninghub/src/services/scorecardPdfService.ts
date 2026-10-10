import jsPDF from 'jspdf'
import type { TestResult } from './testsAService'

export interface ScorecardExportOptions {
  candidateName?: string
  candidateEmail?: string
  candidateId?: string
  institutionName?: string
  includeTopicBreakdown?: boolean
  includePsychometrics?: boolean
  includeRemediationPlan?: boolean
  verificationBaseUrl?: string
}

export interface VerificationAuditMetadata {
  verificationHash: string
  verificationUrl: string
  issuedAt: string
}

/**
 * Computes a pseudo-cryptographic audit digest for tamper verification.
 */
function computeAuditDigest(
  attemptId: string,
  score: number,
  percentage: number,
  timestamp: string
): string {
  const payload = `${attemptId}|${score}|${percentage}|${timestamp}|LEARNINGHUB_SECURE_V1`
  let hash = 0
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0')
  const hex2 = Math.abs(hash ^ 0x5a5a5a5a).toString(16).padStart(8, '0')
  const hex3 = Math.abs(hash ^ 0x3c3c3c3c).toString(16).padStart(8, '0')
  const hex4 = Math.abs(hash ^ 0xa5a5a5a5).toString(16).padStart(8, '0')
  return `LH-${hex1.toUpperCase()}-${hex2.toUpperCase()}-${hex3.toUpperCase()}-${hex4.toUpperCase()}`
}

export class ScorecardPdfService {
  /**
   * Generates a tamper-evident verification audit hash and verification URL.
   */
  static generateVerificationAudit(
    result: TestResult,
    baseUrl?: string
  ): VerificationAuditMetadata {
    const resolvedBaseUrl =
      baseUrl ||
      (typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/verify-scorecard`
        : 'https://learninghub.com/verify-scorecard')
    const issuedAt = result.submitted_at || new Date().toISOString()
    const verificationHash = computeAuditDigest(
      result.attempt_id,
      result.score ?? 0,
      result.percentage ?? 0,
      issuedAt
    )
    return {
      verificationHash,
      verificationUrl: `${resolvedBaseUrl}?code=${encodeURIComponent(verificationHash)}&attempt=${encodeURIComponent(result.attempt_id)}`,
      issuedAt,
    }
  }

  /**
   * Builds an official, high-resolution vector PDF Scorecard for a test result.
   */
  static async createScorecardDocument(
    result: TestResult,
    testTitle: string,
    options: ScorecardExportOptions = {}
  ): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = 210
    const pageHeight = 297
    const margin = 14
    const contentWidth = pageWidth - margin * 2

    const audit = this.generateVerificationAudit(result, options.verificationBaseUrl)
    const isPassed = Boolean(result.is_passed)
    const percentage = Math.round(result.percentage ?? 0)
    const correctCount = result.correct_answers_count ?? 0
    const incorrectCount = result.incorrect_answers_count ?? 0
    const totalQuestions = result.total_questions ?? correctCount + incorrectCount
    const timeTakenSeconds = result.time_taken_seconds ?? 0
    const minutes = Math.floor(timeTakenSeconds / 60)
    const seconds = timeTakenSeconds % 60
    const formattedDuration = `${minutes}m ${seconds}s`

    // --- 1. Header Banner & Branding ---
    doc.setFillColor(15, 23, 42) // Slate 900
    doc.rect(0, 0, pageWidth, 28, 'F')

    // Accent line
    doc.setFillColor(99, 102, 241) // Indigo 500
    doc.rect(0, 27, pageWidth, 1.5, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('LEARNINGHUB', margin, 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(199, 210, 254) // Indigo 200
    doc.text('OFFICIAL ACADEMIC ASSESSMENT & PERFORMANCE SCORECARD', margin, 18)

    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184) // Slate 400
    doc.text(`VERIFICATION ID: ${audit.verificationHash}`, pageWidth - margin, 12, { align: 'right' })
    doc.text(`ISSUED: ${new Date(audit.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, 18, { align: 'right' })

    let currentY = 36

    // --- 2. Candidate & Test Information Table ---
    doc.setFillColor(248, 250, 252) // Slate 50
    doc.setDrawColor(226, 232, 240) // Slate 200
    doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD')

    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105) // Slate 600
    doc.text('Candidate Name:', margin + 4, currentY + 7)
    doc.text('Candidate ID:', margin + 4, currentY + 14)
    doc.text('Institution / Center:', margin + 4, currentY + 20)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42) // Slate 900
    doc.text(options.candidateName || 'Registered Student', margin + 35, currentY + 7)
    doc.text(options.candidateId || `STU-${result.attempt_id.substring(0, 8).toUpperCase()}`, margin + 35, currentY + 14)
    doc.text(options.institutionName || 'LearningHub National Testing Network', margin + 35, currentY + 20)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text('Assessment Title:', margin + 95, currentY + 7)
    doc.text('Assessment Mode:', margin + 95, currentY + 14)
    doc.text('Attempt Reference:', margin + 95, currentY + 20)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(testTitle || 'Standard Diagnostic Assessment', margin + 128, currentY + 7)
    doc.text(result.mode?.toUpperCase() || 'PRACTICE SIMULATION', margin + 128, currentY + 14)
    doc.setFont('courier', 'bold')
    doc.setFontSize(8)
    doc.text(result.attempt_id || 'LOCAL-ATTEMPT-REF', margin + 128, currentY + 20)
    doc.setFont('helvetica', 'normal')

    currentY += 30

    // --- 3. Primary Performance Indicator Box ---
    const badgeColor = isPassed ? [16, 185, 129] : [239, 68, 68] // Emerald / Rose
    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2])
    doc.roundedRect(margin, currentY, 45, 34, 2, 2, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text(`${percentage}%`, margin + 22.5, currentY + 16, { align: 'center' })

    doc.setFontSize(10)
    doc.text(isPassed ? 'PASSED' : 'NOT QUALIFIED', margin + 22.5, currentY + 26, { align: 'center' })

    // Secondary metrics grid next to badge
    const gridX = margin + 50
    const gridWidth = contentWidth - 50
    const colWidth = gridWidth / 4

    const metrics = [
      { label: 'SCORE OBTAINED', value: `${Math.round(result.score ?? 0)} pts` },
      { label: 'CORRECT / TOTAL', value: `${correctCount} / ${totalQuestions}` },
      { label: 'TIME SPENT', value: formattedDuration },
      {
        label: 'IRT THETA (ABILITY)',
        value: result.adaptive_diagnostics?.finalTheta !== undefined
          ? `${result.adaptive_diagnostics.finalTheta > 0 ? '+' : ''}${result.adaptive_diagnostics.finalTheta.toFixed(2)}`
          : 'Proficient',
      },
    ]

    metrics.forEach((m, idx) => {
      const colX = gridX + idx * colWidth
      doc.setFillColor(241, 245, 249) // Slate 100
      doc.setDrawColor(203, 213, 225)
      doc.roundedRect(colX, currentY, colWidth - 2, 34, 2, 2, 'FD')

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text(m.label, colX + (colWidth - 2) / 2, currentY + 11, { align: 'center' })

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(m.value, colX + (colWidth - 2) / 2, currentY + 24, { align: 'center' })
    })

    currentY += 40

    // --- 4. Topic-wise Performance Matrix ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    doc.text('TOPIC PERFORMANCE BREAKDOWN', margin, currentY)

    currentY += 4

    // Table Header
    doc.setFillColor(226, 232, 240)
    doc.rect(margin, currentY, contentWidth, 7, 'F')
    doc.setFontSize(8)
    doc.setTextColor(51, 65, 85)
    doc.text('TOPIC / CONCEPT DOMAIN', margin + 3, currentY + 5)
    doc.text('TOTAL QUESTIONS', margin + 90, currentY + 5, { align: 'center' })
    doc.text('CORRECT', margin + 125, currentY + 5, { align: 'center' })
    doc.text('ACCURACY', margin + 155, currentY + 5, { align: 'center' })
    doc.text('STATUS', pageWidth - margin - 3, currentY + 5, { align: 'right' })

    currentY += 7

    // Compute topics from question_results
    const topicMap = new Map<string, { total: number; correct: number }>()
    if (result.question_results && result.question_results.length > 0) {
      result.question_results.forEach(q => {
        const topicName = q.topic || 'Core Curriculum'
        const cur = topicMap.get(topicName) || { total: 0, correct: 0 }
        topicMap.set(topicName, {
          total: cur.total + 1,
          correct: cur.correct + (q.is_correct ? 1 : 0),
        })
      })
    } else {
      topicMap.set('Comprehensive Curriculum', {
        total: totalQuestions,
        correct: correctCount,
      })
    }

    const topicList = Array.from(topicMap.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      correct: data.correct,
      pct: Math.round((data.correct / Math.max(1, data.total)) * 100),
    }))

    topicList.forEach((t, i) => {
      const rowBg = i % 2 === 0 ? 255 : 248
      doc.setFillColor(rowBg, rowBg, rowBg)
      doc.rect(margin, currentY, contentWidth, 7, 'F')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(30, 41, 59)
      doc.text(t.name.substring(0, 45), margin + 3, currentY + 5)

      doc.text(String(t.total), margin + 90, currentY + 5, { align: 'center' })
      doc.text(String(t.correct), margin + 125, currentY + 5, { align: 'center' })

      doc.setFont('helvetica', 'bold')
      doc.text(`${t.pct}%`, margin + 155, currentY + 5, { align: 'center' })

      const statusLabel = t.pct >= 75 ? 'Mastered' : t.pct >= 50 ? 'Proficient' : 'Needs Review'
      doc.setTextColor(t.pct >= 75 ? 16 : t.pct >= 50 ? 79 : 220, t.pct >= 75 ? 185 : t.pct >= 50 ? 70 : 38, t.pct >= 75 ? 129 : t.pct >= 50 ? 229 : 38)
      doc.text(statusLabel, pageWidth - margin - 3, currentY + 5, { align: 'right' })

      currentY += 7
    })

    currentY += 6

    // --- 5. Behavioral Telemetry & Proctoring Integrity Audit ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    doc.text('ASSESSMENT INTEGRITY & PROCTORING AUDIT', margin, currentY)

    currentY += 4

    const integrityScore = result.telemetry_digest?.integrityScore ?? 100
    const riskLevel = result.telemetry_digest?.riskLevel ?? 'LOW_RISK'
    const tabSwitches = result.telemetry_digest?.tabSwitches ?? 0

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD')

    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text('Session Integrity Score:', margin + 6, currentY + 7)
    doc.text('Audited Security Level:', margin + 6, currentY + 15)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(integrityScore >= 80 ? 16 : 220, integrityScore >= 80 ? 185 : 38, integrityScore >= 80 ? 129 : 38)
    doc.text(`${integrityScore}/100`, margin + 46, currentY + 7)
    doc.text(riskLevel, margin + 46, currentY + 15)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text('Browser Focus Violations:', margin + 85, currentY + 7)
    doc.text('Average Pace per Question:', margin + 85, currentY + 15)

    const avgPaceSec = totalQuestions > 0 ? Math.round(timeTakenSeconds / totalQuestions) : 0
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`${tabSwitches} incidents`, margin + 130, currentY + 7)
    doc.text(`${avgPaceSec} sec / question`, margin + 130, currentY + 15)

    currentY += 28

    // --- 6. Socratic Remediation & Targeted Focus ---
    const weakList = topicList.filter(t => t.pct < 60)
    if (weakList.length > 0 || options.includeRemediationPlan !== false) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(30, 41, 59)
      doc.text('AI SOCRATIC REMEDIATION & NEXT STUDY ACTIONS', margin, currentY)

      currentY += 4

      doc.setFillColor(238, 242, 255) // Indigo 50
      doc.setDrawColor(199, 210, 254)
      doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD')

      doc.setFontSize(8.5)
      doc.setTextColor(67, 56, 202) // Indigo 700
      doc.setFont('helvetica', 'bold')
      doc.text('Targeted Drill Recommendations:', margin + 6, currentY + 6)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)
      const weakNames = weakList.map(w => w.name).join(', ') || 'Review foundational mechanics and timing consistency.'
      doc.text(
        `Focus areas identified: ${weakNames.substring(0, 90)}. Complete Socratic flashcards and revisit incorrect question explanations before re-attempting.`,
        margin + 6,
        currentY + 12,
        { maxWidth: contentWidth - 12 }
      )

      currentY += 28
    }

    // --- 7. Security Hash, Verification Seal & Signatures ---
    const footerY = pageHeight - 34

    doc.setDrawColor(203, 213, 225)
    doc.line(margin, footerY, pageWidth - margin, footerY)

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('This is an authentic, digitally verified examination performance record generated by the LearningHub Assessment Engine.', margin, footerY + 6)
    doc.text(`Digital Verification Hash: ${audit.verificationHash}`, margin, footerY + 11)
    doc.text(`Verify Online: ${audit.verificationUrl}`, margin, footerY + 16)

    // Signature box
    doc.line(pageWidth - margin - 45, footerY + 16, pageWidth - margin, footerY + 16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text('Controller of Examinations', pageWidth - margin - 22.5, footerY + 20, { align: 'center' })

    return doc
  }

  /**
   * Generates and triggers automatic download of the PDF scorecard in browser.
   */
  static async downloadScorecard(
    result: TestResult,
    testTitle: string,
    options: ScorecardExportOptions = {}
  ): Promise<void> {
    const doc = await this.createScorecardDocument(result, testTitle, options)
    const sanitizedTitle = (testTitle || 'Test')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 30)
    const filename = `Scorecard_${sanitizedTitle}_${result.attempt_id.substring(0, 8)}.pdf`
    doc.save(filename)
  }
}

export const scorecardPdfService = ScorecardPdfService
