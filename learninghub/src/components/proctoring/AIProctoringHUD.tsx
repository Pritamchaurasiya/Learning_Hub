import React, { useState, useEffect } from 'react'
import { FrameTelemetryPayload, ProctoringSession, ProctorIncident } from '../../types/proctoring'
import { proctoringService } from '../../services/proctoringService'
import {
  ShieldCheck,
  Eye,
  Mic,
  AlertTriangle,
  Camera,
  FileCheck,
} from 'lucide-react'

interface AIProctoringHUDProps {
  session: ProctoringSession
  onSessionUpdate?: (updated: ProctoringSession) => void
  onOpenReportModal?: () => void
}

export const AIProctoringHUD: React.FC<AIProctoringHUDProps> = ({
  session,
  onSessionUpdate,
  onOpenReportModal,
}) => {
  const [currentScore, setCurrentScore] = useState<number>(session.integrityScore)
  const [recentIncidents, setRecentIncidents] = useState<ProctorIncident[]>(session.incidents)
  const [telemetry, setTelemetry] = useState<FrameTelemetryPayload>({
    facesDetectedCount: 1,
    primaryFaceConfidence: 0.98,
    headPose: { yaw: 2, pitch: -1, roll: 0 },
    gazeDeviationScore: 0.08,
    audioNoiseDecibels: 32,
    isSpeechDetected: false,
    tabBlurred: false,
  })

  // Telemetry emission cycle
  useEffect(() => {
    const interval = setInterval(async () => {
      // Small natural micro-deviations
      const randomYaw = Math.sin(Date.now() / 2000) * 8
      const randomPitch = Math.cos(Date.now() / 3000) * 4
      const randomNoise = 28 + Math.random() * 8

      const frame: FrameTelemetryPayload = {
        facesDetectedCount: 1,
        primaryFaceConfidence: 0.98,
        headPose: { yaw: randomYaw, pitch: randomPitch, roll: 0 },
        gazeDeviationScore: Math.abs(randomYaw) / 60,
        audioNoiseDecibels: randomNoise,
        isSpeechDetected: randomNoise > 50,
        tabBlurred: document.hidden,
      }

      setTelemetry(frame)

      try {
        const res = await proctoringService.sendTelemetry(session.sessionId, frame)
        setCurrentScore(res.updatedScore)
        if (res.incidentsTriggered.length > 0) {
          setRecentIncidents(prev => [...prev, ...res.incidentsTriggered])
        }
        if (onSessionUpdate) {
          onSessionUpdate({
            ...session,
            integrityScore: res.updatedScore,
            status: res.status,
          })
        }
      } catch {
        // Suppress background polling error
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [session.sessionId])

  const getScoreColor = () => {
    if (currentScore >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    if (currentScore >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10'
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 text-slate-200">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="font-bold text-sm text-white">AI Vision & Audio Proctor HUD</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getScoreColor()}`}>
            Integrity: {currentScore}%
          </span>
          {onOpenReportModal && (
            <button
              onClick={onOpenReportModal}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 border border-slate-700"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Simulated Camera Viewport */}
      <div className="relative aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
        {/* Silhouette / Viewport Elements */}
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-500/40 flex items-center justify-center relative">
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50" />
          {/* Gaze Vector Line */}
          <div
            className="absolute w-8 h-0.5 bg-emerald-400/80 origin-left"
            style={{
              transform: `rotate(${telemetry.headPose.yaw * 2}deg)`,
              left: '50%',
            }}
          />
        </div>

        {/* Viewport Live Overlays */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>FACE TRACKING ACTIVE (1 Face)</span>
        </div>

        <div className="absolute bottom-2 left-2 flex items-center gap-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-mono text-slate-300">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-sky-400" />
            <span>Gaze: {((1 - telemetry.gazeDeviationScore) * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-amber-400" />
            <span>Noise: {telemetry.audioNoiseDecibels.toFixed(0)} dB</span>
          </div>
        </div>
      </div>

      {/* Recent Incident Log */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
          <span>Active Incident Register</span>
          <span className="text-[10px] font-mono text-slate-500">
            {recentIncidents.length} events logged
          </span>
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
          {recentIncidents.length === 0 ? (
            <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/80 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero infractions recorded. Candidate is fully compliant.</span>
            </div>
          ) : (
            recentIncidents.slice(-3).map(inc => (
              <div
                key={inc.id}
                className={`p-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
                  inc.severity === 'CRITICAL'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    : inc.severity === 'HIGH'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{inc.description}</span>
                </div>
                <span className="text-[9px] uppercase font-bold opacity-75 ml-2 flex-shrink-0">
                  {inc.severity}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
