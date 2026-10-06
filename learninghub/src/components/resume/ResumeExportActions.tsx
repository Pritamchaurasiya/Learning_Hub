import React, { useState } from 'react'
import { VerifiableResumePayload } from '../../types/resume'
import { resumeService } from '../../services/resumeService'
import { Download, FileText, Code, Printer, Copy, Check, Share2 } from 'lucide-react'

interface ResumeExportActionsProps {
  resume: VerifiableResumePayload
}

export const ResumeExportActions: React.FC<ResumeExportActionsProps> = ({ resume }) => {
  const [copiedMd, setCopiedMd] = useState<boolean>(false)
  const [copiedLink, setCopiedLink] = useState<boolean>(false)

  const handleDownloadATS = () => {
    resumeService.downloadATSPlainText(resume)
  }

  const handleDownloadJSON = () => {
    resumeService.downloadJSONResume(resume)
  }

  const handlePrintPDF = () => {
    window.print()
  }

  const handleCopyMarkdown = () => {
    let md = `# ${resume.profile.fullName}\n`
    md += `**${resume.roleTitle}** | ${resume.profile.email} | ${resume.profile.location}\n\n`
    md += `*W3C DID*: \`${resume.profile.didIdentifier}\`\n\n`
    md += `## Professional Summary\n${resume.summary}\n\n`
    md += `## Verified Technical Competencies\n`
    for (const h of resume.verifiedPlatformHighlights) {
      md += `- **[VERIFIED]** ${h}\n`
    }
    md += `\n## Core Technical Skills\n`
    md += `- **Languages**: ${resume.skillsMatrix.languages.join(', ')}\n`
    md += `- **Frameworks**: ${resume.skillsMatrix.frameworks.join(', ')}\n`
    md += `- **Cloud & Systems**: ${resume.skillsMatrix.systemsAndCloud.join(', ')}\n`
    md += `- **Algorithmic Competencies**: ${resume.skillsMatrix.algorithmicCompetencies.join(', ')}\n\n`
    md += `## Technical Projects\n`
    for (const p of resume.projects) {
      md += `### ${p.title} (${p.period})\n*Role: ${p.role}* | Technologies: ${p.technologies.join(', ')}\n`
      for (const bp of p.bulletPoints) {
        md += `- ${bp.text} *(Metric: ${bp.quantifiedMetric})*\n`
      }
      md += `\n`
    }

    navigator.clipboard.writeText(md)
    setCopiedMd(true)
    setTimeout(() => setCopiedMd(false), 2000)
  }

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/resume?proof=${resume.cryptographicProof.canonicalDigestSha256.substring(
      0,
      16
    )}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={handlePrintPDF}
        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-colors"
      >
        <Printer className="w-3.5 h-3.5" />
        Print / Save PDF
      </button>

      <button
        type="button"
        onClick={handleDownloadATS}
        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
      >
        <FileText className="w-3.5 h-3.5 text-emerald-400" />
        ATS Plain Text (.txt)
      </button>

      <button
        type="button"
        onClick={handleDownloadJSON}
        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
      >
        <Code className="w-3.5 h-3.5 text-teal-400" />
        JSON Resume (.json)
      </button>

      <button
        type="button"
        onClick={handleCopyMarkdown}
        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
      >
        {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        {copiedMd ? 'Markdown Copied' : 'Copy Markdown'}
      </button>

      <button
        type="button"
        onClick={handleCopyShareLink}
        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
      >
        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
        {copiedLink ? 'Link Copied' : 'Share Portfolio'}
      </button>
    </div>
  )
}
