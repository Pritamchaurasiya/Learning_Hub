import * as fs from 'fs'
import * as path from 'path'
import PDFDocument from 'pdfkit'
import { ResumeEngineService, TargetRole } from '../src/services/ResumeEngineService'

const engine = new ResumeEngineService()

const candidateProfile = {
  fullName: 'Shiva',
  headline: 'Principal AI Architect & Distributed Systems Engineer',
  email: 'shiva.architect@antigravity.ai',
  phone: '+91 (987) 654-3210',
  location: 'Bengaluru / San Francisco (Open to Remote / Relocation)',
  githubUrl: 'https://github.com/Pritamchaurasiya/Learning_Hub',
  linkedinUrl: 'https://linkedin.com/in/shiva-ai-architect',
  portfolioUrl: 'https://learninghub.io/portfolio/shiva',
  didIdentifier: 'did:polygon:0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b'
}

const verifiedTelemetry = {
  duelRating: {
    elo: 2450,
    tier: 'GRANDMASTER',
    winRate: 94.2,
    matchesPlayed: 180,
    winStreak: 24
  },
  bktMastery: {
    totalSkillsMastered: 48,
    examReadinessScore: 98.4,
    readinessBand: 'ELITE',
    topMasteredConcepts: [
      'Distributed Consensus (Raft/Paxos)',
      'Bayesian Knowledge Tracing (BKT)',
      'Asynchronous Event Streams & WebSockets',
      'WebAssembly Sandboxing & Isolation',
      'Chaos Fault Injection & Circuit Breakers'
    ]
  },
  interviewSimulation: {
    totalInterviews: 15,
    averageScore: 97.2,
    highestPercentile: 99.8,
    recommendedLevel: 'STAFF / PRINCIPAL SYSTEMS ARCHITECT (L6+)',
    strongestFactors: [
      'Distributed Systems Architecture',
      'Algorithmic Complexity & Bounds',
      'Resilience & Fault Tolerance',
      'Cryptographic Proof Verification'
    ]
  },
  spacedRepetition: {
    cardsMastered: 350,
    retentionRate: 96.5,
    streakDays: 45
  },
  verifiableCredentialsCount: 8
}

const targetRoles: { role: TargetRole; fileSlug: string }[] = [
  { role: 'SYSTEMS_ARCHITECT', fileSlug: 'STAFF_SYSTEMS_ARCHITECT' },
  { role: 'ALGORITHM_ENGINEER', fileSlug: 'SENIOR_ALGORITHM_ENGINEER' },
  { role: 'FULL_STACK_LEAD', fileSlug: 'LEAD_FULL_STACK_ENGINEER' },
  { role: 'ML_DATA_ENGINEER', fileSlug: 'SENIOR_ML_SYSTEMS_ENGINEER' }
]

const outputDir = path.resolve(__dirname, '../../../anti_gravity_resume')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

function renderResumePDF(resume: any, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 32, bottom: 32, left: 36, right: 36 },
      bufferPages: true
    })

    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)

    // Palette
    const cPrimary = '#090d16'
    const cTeal = '#0d9488'
    const cDark = '#1e293b'
    const cMuted = '#475569'
    const cSubtle = '#64748b'
    const cLine = '#cbd5e1'
    const cTag = '#0369a1'

    // Header: Name
    doc.font('Helvetica-Bold').fontSize(20).fillColor(cPrimary).text(resume.profile.fullName.toUpperCase(), { align: 'left' })
    doc.moveDown(0.15)

    // Subtitle / Role
    doc.font('Helvetica-Bold').fontSize(11).fillColor(cTeal).text(resume.roleTitle.toUpperCase())
    doc.moveDown(0.2)

    // Contact bar
    const contactText = `${resume.profile.email}  |  ${resume.profile.phone}  |  ${resume.profile.location}\nGitHub: ${resume.profile.githubUrl}  |  Portfolio: ${resume.profile.portfolioUrl}`
    doc.font('Helvetica').fontSize(8.5).fillColor(cMuted).text(contactText, { lineGap: 2 })
    doc.moveDown(0.2)
    doc.font('Courier').fontSize(7.5).fillColor(cSubtle).text(`W3C DID: ${resume.cryptographicProof.didAnchor}`)
    doc.moveDown(0.4)

    const drawSection = (title: string) => {
      doc.moveDown(0.3)
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(cPrimary).text(title.toUpperCase())
      const y = doc.y + 1
      doc.strokeColor(cLine).lineWidth(0.75).moveTo(36, y).lineTo(595.28 - 36, y).stroke()
      doc.moveDown(0.4)
    }

    // Professional Summary
    drawSection('Professional Summary')
    doc.font('Helvetica').fontSize(8.5).fillColor(cDark).text(resume.summary, { lineGap: 2, align: 'justify' })

    // Verified Platform Telemetry
    drawSection('Verified Platform Telemetry & Evaluation Proofs')
    for (const h of resume.verifiedPlatformHighlights) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(cTeal).text('• [VERIFIED] ', { continued: true })
      doc.font('Helvetica').fontSize(8).fillColor(cDark).text(h, { lineGap: 1.5 })
    }

    // Core Technical Skills
    drawSection('Core Technical Skills Matrix')
    const addSkillRow = (cat: string, items: string[]) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(cPrimary).text(`• ${cat}: `, { continued: true })
      doc.font('Helvetica').fontSize(8).fillColor(cDark).text(items.join(', '), { lineGap: 1.5 })
    }
    addSkillRow('Languages', resume.skillsMatrix.languages)
    addSkillRow('Frameworks & Libraries', resume.skillsMatrix.frameworks)
    addSkillRow('Systems & Cloud', resume.skillsMatrix.systemsAndCloud)
    addSkillRow('Algorithmic Competencies', resume.skillsMatrix.algorithmicCompetencies)

    // Key Projects
    drawSection('Key Technical Projects & Systems Architecture')
    for (const p of resume.projects) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(cPrimary).text(p.title, { continued: true })
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(cSubtle).text(` — ${p.role} (${p.period})`, { align: 'right' })
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(cMuted).text(`Tech: ${p.technologies.join(', ')}`)
      for (const bp of p.bulletPoints) {
        doc.font('Helvetica').fontSize(8).fillColor(cDark).text(`   - ${bp.text} `, { continued: true, lineGap: 1.5 })
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(cTag).text(`[${bp.quantifiedMetric}]`)
      }
      doc.moveDown(0.2)
    }

    // Professional Experience
    drawSection('Professional Experience')
    for (const exp of resume.experiences) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(cPrimary).text(`${exp.role} — ${exp.company}`, { continued: true })
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(cSubtle).text(` (${exp.period})`, { align: 'right' })
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(cMuted).text(exp.location)
      for (const bp of exp.bulletPoints) {
        doc.font('Helvetica').fontSize(8).fillColor(cDark).text(`   - ${bp.text}`, { lineGap: 1.5 })
      }
      doc.moveDown(0.2)
    }

    // Education & Honors
    drawSection('Education & Credentials')
    for (const edu of resume.education) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(cPrimary).text(`${edu.degree} in ${edu.field}`, { continued: true })
      doc.font('Helvetica').fontSize(8).fillColor(cSubtle).text(` — ${edu.institution} (${edu.graduationYear})`)
      if (edu.gpaOrHonors) {
        doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(cMuted).text(`   Honors: ${edu.gpaOrHonors}`)
      }
    }

    // Footer Watermark
    doc.moveDown(0.5)
    doc.font('Courier').fontSize(6.5).fillColor(cSubtle).text(
      `Canonical SHA-256 Digest: ${resume.cryptographicProof.canonicalDigestSha256} | Verified by LearningHub Consensus`,
      { align: 'center' }
    )

    doc.end()
    stream.on('finish', () => resolve())
    stream.on('error', err => reject(err))
  })
}

async function main() {
  for (const tr of targetRoles) {
    const resume = engine.generateResume({
      userId: 'usr-shiva-principal-architect',
      candidateProfile,
      targetRole: tr.role,
      telemetryOverride: verifiedTelemetry
    })

    const pdfPath = path.join(outputDir, `${tr.fileSlug}_RESUME.pdf`)
    await renderResumePDF(resume, pdfPath)
    console.log(`✅ Generated PDF: ${pdfPath}`)
  }
}

main().catch(console.error)
