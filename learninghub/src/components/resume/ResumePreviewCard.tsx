import React from 'react'
import { VerifiableResumePayload } from '../../types/resume'
import {
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Award,
  Zap,
} from 'lucide-react'

interface ResumePreviewCardProps {
  resume: VerifiableResumePayload
}

export const ResumePreviewCard: React.FC<ResumePreviewCardProps> = ({ resume }) => {
  return (
    <div
      id="printable-resume"
      className="bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-200 font-sans max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:m-0"
    >
      {/* Header */}
      <header className="border-b border-slate-300 pb-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 uppercase font-serif">
              {resume.profile.fullName}
            </h1>
            <p className="text-base sm:text-lg font-semibold text-emerald-700 mt-1">
              {resume.roleTitle}
            </p>
          </div>

          <div className="text-xs text-slate-600 space-y-1 sm:text-right">
            <div className="flex items-center sm:justify-end gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <a href={`mailto:${resume.profile.email}`} className="hover:text-emerald-700">
                {resume.profile.email}
              </a>
            </div>
            {resume.profile.phone && (
              <div className="flex items-center sm:justify-end gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{resume.profile.phone}</span>
              </div>
            )}
            <div className="flex items-center sm:justify-end gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{resume.profile.location}</span>
            </div>
            <div className="flex items-center sm:justify-end gap-2 pt-1 font-medium text-slate-700">
              <a
                href={resume.profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-700 flex items-center gap-1"
              >
                <Github className="w-3.5 h-3.5" /> GitHub
              </a>
              <span>•</span>
              <a
                href={resume.profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-700 flex items-center gap-1"
              >
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Verifiable DID metadata header pill */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
          <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">Cryptographically Anchored W3C DID:</span>
            <span className="truncate max-w-xs">{resume.profile.didIdentifier}</span>
          </div>
          <span className="text-slate-400 font-sans">
            ATS Compatibility: {resume.atsScoring.overallScore}/100 (Grade {resume.atsScoring.grade})
          </span>
        </div>
      </header>

      {/* Professional Summary */}
      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b-2 border-emerald-700 pb-1 mb-2.5">
          Professional Summary
        </h2>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
          {resume.summary}
        </p>
      </section>

      {/* Verified Platform Telemetry & Competencies */}
      <section className="mb-6">
        <div className="flex items-center justify-between border-b-2 border-emerald-700 pb-1 mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            Verified Technical Competencies & Platform Telemetry
          </h2>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            100% Tamper-Proof Invariants
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
          {resume.verifiedPlatformHighlights.map((highlight, index) => (
            <div
              key={index}
              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{highlight}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Core Technical Skills */}
      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b-2 border-emerald-700 pb-1 mb-2.5">
          Core Technical Skills Matrix
        </h2>
        <div className="space-y-1.5 text-xs text-slate-800">
          <div>
            <span className="font-bold text-slate-950">Languages: </span>
            <span className="text-slate-700">{resume.skillsMatrix.languages.join(' • ')}</span>
          </div>
          <div>
            <span className="font-bold text-slate-950">Frameworks & Libraries: </span>
            <span className="text-slate-700">{resume.skillsMatrix.frameworks.join(' • ')}</span>
          </div>
          <div>
            <span className="font-bold text-slate-950">Distributed Systems & Cloud: </span>
            <span className="text-slate-700">{resume.skillsMatrix.systemsAndCloud.join(' • ')}</span>
          </div>
          <div>
            <span className="font-bold text-slate-950">Algorithmic Competencies: </span>
            <span className="text-slate-700">{resume.skillsMatrix.algorithmicCompetencies.join(' • ')}</span>
          </div>
        </div>
      </section>

      {/* Technical Projects & Systems Architecture */}
      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b-2 border-emerald-700 pb-1 mb-3">
          Technical Projects & Systems Architecture
        </h2>
        <div className="space-y-4">
          {resume.projects.map(proj => (
            <div key={proj.id} className="text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-950 text-sm">{proj.title}</h3>
                  {proj.liveUrl && (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline inline-flex items-center gap-0.5 print:hidden"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <span className="text-slate-500 font-medium">{proj.period}</span>
              </div>
              <div className="text-slate-600 font-medium mb-1.5">
                <span className="text-emerald-800 font-semibold">{proj.role}</span> | Technologies:{' '}
                {proj.technologies.join(', ')}
              </div>
              <ul className="list-disc list-outside pl-4 space-y-1 text-slate-700 leading-relaxed">
                {proj.bulletPoints.map(bp => (
                  <li key={bp.id}>
                    {bp.text}{' '}
                    <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 font-mono text-[10px] border border-slate-300">
                      {bp.quantifiedMetric}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Professional Experience */}
      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b-2 border-emerald-700 pb-1 mb-3">
          Professional Experience
        </h2>
        <div className="space-y-4">
          {resume.experiences.map(exp => (
            <div key={exp.id} className="text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="font-bold text-slate-950 text-sm">
                  {exp.role} — <span className="font-semibold text-emerald-800">{exp.company}</span>
                </h3>
                <span className="text-slate-500 font-medium">
                  {exp.location} | {exp.period}
                </span>
              </div>
              <ul className="list-disc list-outside pl-4 mt-1.5 space-y-1 text-slate-700 leading-relaxed">
                {exp.bulletPoints.map(bp => (
                  <li key={bp.id}>{bp.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b-2 border-emerald-700 pb-1 mb-2.5">
          Education & Honors
        </h2>
        <div className="space-y-2 text-xs">
          {resume.education.map((edu, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-950">
                  {edu.degree} in {edu.field}
                </h3>
                <p className="text-slate-600">
                  {edu.institution} {edu.gpaOrHonors && `• ${edu.gpaOrHonors}`}
                </p>
              </div>
              <span className="text-slate-500 font-medium">{edu.graduationYear}</span>
            </div>
          ))}
        </div>
      </section>

      {/* W3C Verifiable Credentials */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b-2 border-emerald-700 pb-1 mb-2.5 flex items-center justify-between">
          <span>W3C Verifiable Credentials & On-Chain Proofs</span>
          <Award className="w-3.5 h-3.5 text-emerald-700" />
        </h2>
        <div className="space-y-2 text-xs text-slate-700">
          {resume.credentials.map(cred => (
            <div
              key={cred.id}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <span className="font-bold text-slate-950 block">{cred.title}</span>
                <span className="text-[11px] text-slate-500">
                  Issued by {cred.issuer} • Merkle Root:{' '}
                  <span className="font-mono">{cred.merkleRootHash.substring(0, 16)}...</span>
                </span>
              </div>
              <span className="text-emerald-700 font-medium text-[11px] shrink-0 font-mono">
                {cred.issuanceDate}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
