import React from 'react'
import { VisionTelemetryFrame } from '../../types/multimodal'
import {
  Camera,
  Eye,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react'

interface VisionTelemetryHUDProps {
  telemetry: VisionTelemetryFrame | null
  isCameraActive: boolean
  onToggleCamera: () => void
  onSimulateAnomaly?: (type: 'LOOKING_AWAY' | 'MULTI_FACE' | 'NORMAL') => void
}

export const VisionTelemetryHUD: React.FC<VisionTelemetryHUDProps> = ({
  telemetry,
  isCameraActive,
  onToggleCamera,
  onSimulateAnomaly,
}) => {
  const attentiveness = telemetry?.attentivenessScore ?? 98
  const gaze = telemetry?.gazeDirection ?? 'FOCUSED_CENTER'
  const faceState = telemetry?.faceState ?? 'SINGLE_FACE_FOCUSED'
  const isFlagged = telemetry?.isAttentionFlagged ?? false

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Vision AI Telemetry & Gaze HUD</h3>
            <p className="text-[11px] text-slate-400">Head posture, eye tracking & presence verification</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCamera}
          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            isCameraActive
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {isCameraActive ? 'Live Camera Feed' : 'Camera Paused'}
        </button>
      </div>

      {/* Camera / HUD Viewport */}
      <div className="relative w-full h-44 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
        {/* Simulated target crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-24 h-24 rounded-full border border-cyan-400/50 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border border-dashed border-cyan-400/80" />
          </div>
        </div>

        {/* Live Gaze Crosshair Indicator */}
        <div
          className={`absolute w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
            isFlagged
              ? 'border-rose-400 bg-rose-500/20 shadow-lg shadow-rose-500/50'
              : 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/50'
          }`}
          style={{
            transform: `translate(${
              gaze === 'LOOKING_LEFT' ? '-45px' : gaze === 'LOOKING_RIGHT' ? '45px' : '0px'
            }, ${gaze === 'LOOKING_DOWN' ? '30px' : gaze === 'LOOKING_AWAY' ? '-30px' : '0px'})`,
          }}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isFlagged ? 'bg-rose-400' : 'bg-emerald-400'}`} />
        </div>

        {/* HUD Overlay Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900/80 border border-slate-700 text-slate-300 flex items-center gap-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            {gaze}
          </span>
        </div>

        <div className="absolute top-2 right-2">
          {faceState === 'SINGLE_FACE_FOCUSED' ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> 1 Verified
            </span>
          ) : faceState === 'MULTIPLE_FACES_FLAGGED' ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-bounce">
              <Users className="w-3 h-3" /> Multi-Face Flag
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <UserX className="w-3 h-3" /> Face Missing
            </span>
          )}
        </div>

        <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 font-mono">
          FPS: 30 | 1080p WebRTC stream
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Attentiveness Index</div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                attentiveness >= 85
                  ? 'text-emerald-400'
                  : attentiveness >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {attentiveness}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Real-time Gaze</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                attentiveness >= 85
                  ? 'bg-emerald-400'
                  : attentiveness >= 60
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${attentiveness}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Session Integrity</div>
          <div className="flex items-center gap-1 text-sm font-bold text-white">
            {isFlagged ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400">Deviation Noted</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Pristine Invariant</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-slate-400">Audit Hash: HMAC-SHA256</div>
        </div>
      </div>

      {/* Simulators for manual verification & test suites */}
      {onSimulateAnomaly && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
          <span className="text-[10px] text-slate-500 font-mono">Test Telemetry:</span>
          <button
            type="button"
            onClick={() => onSimulateAnomaly('NORMAL')}
            className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Center Gaze
          </button>
          <button
            type="button"
            onClick={() => onSimulateAnomaly('LOOKING_AWAY')}
            className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
          >
            Look Away
          </button>
          <button
            type="button"
            onClick={() => onSimulateAnomaly('MULTI_FACE')}
            className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
          >
            Multi-Face
          </button>
        </div>
      )}
    </div>
  )
}
