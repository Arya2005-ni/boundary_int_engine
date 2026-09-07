import React from 'react';
import type { ViewMode } from '../types';
import { 
  ShieldAlert, 
  Sliders, 
  Layers, 
  Radio,
  Upload
} from 'lucide-react';

interface HeaderNavProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  pendingIncidentsCount: number;
  isLiveStreaming: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentMode,
  onSelectMode,
  pendingIncidentsCount,
  isLiveStreaming
}) => {
  return (
    <header className="bg-[#101017] border-b border-[#222230] px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50">
      {/* Brand & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#E10600] to-[#800300] flex items-center justify-center shadow-lg shadow-red-900/40">
            <span className="font-black text-white text-lg tracking-tighter italic">TS</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider text-white uppercase italic">
                TrackShift <span className="text-[#E10600]">2026</span>
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e1e2d] text-[#00E5FF] font-mono font-semibold border border-[#00E5FF]/30">
                BIE v2.0
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">
              Boundary Intelligence Engine • Spatial Compliance & Strategic Risk
            </p>
          </div>
        </div>

        {/* Live System Indicator */}
        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[#262638]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141420] border border-[#2d2d42]">
            <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? 'bg-[#00E676] animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-[11px] font-mono text-gray-300">
              {isLiveStreaming ? 'LIVE TELEMETRY SYNC' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Modes */}
      <nav className="flex items-center gap-1.5 bg-[#161622] p-1 rounded-lg border border-[#2a2a3c]">
        <button
          onClick={() => onSelectMode('UPLOAD')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            currentMode === 'UPLOAD'
              ? 'bg-[#E10600] text-white shadow-md shadow-red-900/50'
              : 'text-gray-400 hover:text-white hover:bg-[#202030]'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Video Pipeline</span>
        </button>

        <button
          onClick={() => onSelectMode('STRATEGY')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            currentMode === 'STRATEGY'
              ? 'bg-[#E10600] text-white shadow-md shadow-red-900/50'
              : 'text-gray-400 hover:text-white hover:bg-[#202030]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Strategic Risk Mapping</span>
        </button>

        <button
          onClick={() => onSelectMode('LIVE_STEWARD')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            currentMode === 'LIVE_STEWARD'
              ? 'bg-[#E10600] text-white shadow-md shadow-red-900/50'
              : 'text-gray-400 hover:text-white hover:bg-[#202030]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Steward Live Vision</span>
        </button>

        <button
          onClick={() => onSelectMode('CALIBRATION')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            currentMode === 'CALIBRATION'
              ? 'bg-[#E10600] text-white shadow-md shadow-red-900/50'
              : 'text-gray-400 hover:text-white hover:bg-[#202030]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Track Calibration</span>
        </button>

        <button
          onClick={() => onSelectMode('INCIDENTS')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all relative ${
            currentMode === 'INCIDENTS'
              ? 'bg-[#E10600] text-white shadow-md shadow-red-900/50'
              : 'text-gray-400 hover:text-white hover:bg-[#202030]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Incidents</span>
          {pendingIncidentsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#FFB800] text-black text-[10px] font-bold">
              {pendingIncidentsCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
};
