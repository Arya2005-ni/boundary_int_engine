import React, { useState, useEffect, useRef } from 'react';
import type { 
  FrameAnalysisResult, 
  CornerItem, 
  Incident 
} from '../types';
import { 
  ShieldAlert, 
  Radio, 
  Play, 
  Pause, 
  Activity,
  ChevronRight
} from 'lucide-react';
import { TelemetryCharts } from './TelemetryCharts';

interface LiveStewardDashboardProps {
  corners: CornerItem[];
  selectedCornerId: string;
  onSelectCorner: (id: string) => void;
  onOpenIncidentReview: (incidentId: string) => void;
  onSetLiveStreaming: (isStreaming: boolean) => void;
}

export const LiveStewardDashboard: React.FC<LiveStewardDashboardProps> = ({
  corners,
  selectedCornerId,
  onSelectCorner,
  onOpenIncidentReview,
  onSetLiveStreaming
}) => {
  const [frameData, setFrameData] = useState<FrameAnalysisResult | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showFootprint, setShowFootprint] = useState(true);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Connect to WebSocket for real-time video and telemetry stream
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWs = () => {
      ws = new WebSocket('ws://localhost:8000/ws/session');
      wsRef.current = ws;

      ws.onopen = () => {
        onSetLiveStreaming(true);
      };

      ws.onmessage = (event) => {
        if (isPaused) return;
        try {
          const data: FrameAnalysisResult = JSON.parse(event.data);
          setFrameData(data);
        } catch (e) {
          console.error('Error parsing frame WS message:', e);
        }
      };

      ws.onclose = () => {
        onSetLiveStreaming(false);
        // Attempt reconnect after 2 seconds
        setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        onSetLiveStreaming(false);
      };
    };

    connectWs();
    fetchRecentIncidents();

    return () => {
      if (ws) ws.close();
    };
  }, [isPaused]);

  const fetchRecentIncidents = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/incidents');
      if (res.ok) {
        const data = await res.json();
        setRecentIncidents(data);
      }
    } catch (e) {
      console.error('Error fetching incidents:', e);
    }
  };

  // Render video frame and overlays on Canvas
  useEffect(() => {
    if (!frameData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = frameData.frame_b64;
    img.onload = () => {
      canvas.width = 1280;
      canvas.height = 720;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (!showOverlays) return;

      // 1. Draw Calibrated Legal Track Polygon (Subtle Cyan Outline)
      const curCorner = corners.find(c => c.corner_id === frameData.corner_id);
      if (curCorner && curCorner.calibration.legal_polygon) {
        ctx.beginPath();
        const poly = curCorner.calibration.legal_polygon;
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i][0], poly[i][1]);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Draw Vehicle Bounding Box
      const [bx1, by1, bx2, by2] = frameData.bbox;
      const isViol = frameData.state === 'VIOLATION';
      const isBorder = frameData.state === 'BORDERLINE';

      ctx.strokeStyle = isViol ? '#E10600' : isBorder ? '#FFB800' : '#00E676';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);

      // Label on Bounding Box
      ctx.fillStyle = isViol ? 'rgba(225, 6, 0, 0.85)' : isBorder ? 'rgba(255, 184, 0, 0.85)' : 'rgba(0, 230, 118, 0.85)';
      ctx.fillRect(bx1, by1 - 22, 160, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(`#${frameData.car_number} ${frameData.driver_name} (${frameData.margin_to_boundary_cm}cm)`, bx1 + 6, by1 - 8);

      // 3. Draw 4 Wheel Footprint Contact Patches
      if (showFootprint && frameData.footprint) {
        const fp = frameData.footprint;
        const wheels = [
          { name: 'FL', pt: fp.fl_coords, inside: fp.fl_inside },
          { name: 'FR', pt: fp.fr_coords, inside: fp.fr_inside },
          { name: 'RL', pt: fp.rl_coords, inside: fp.rl_inside },
          { name: 'RR', pt: fp.rr_coords, inside: fp.rr_inside }
        ];

        wheels.forEach(w => {
          ctx.beginPath();
          ctx.arc(w.pt[0], w.pt[1], 7, 0, 2 * Math.PI);
          ctx.fillStyle = w.inside ? '#00E676' : '#E10600';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          // Wheel label
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '9px monospace';
          ctx.fillText(w.name, w.pt[0] - 6, w.pt[1] - 9);
        });
      }
    };
  }, [frameData, showOverlays, showFootprint, corners]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Status Bar: Live State Machine Alert */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* State Machine Status */}
        <div className={`p-4 rounded-lg f1-card flex items-center justify-between border-l-4 ${
          frameData?.state === 'VIOLATION'
            ? 'border-l-[#E10600] f1-card-glow-red bg-red-950/20'
            : frameData?.state === 'BORDERLINE'
            ? 'border-l-[#FFB800] f1-card-glow-amber bg-amber-950/20'
            : frameData?.state === 'RECOVERED'
            ? 'border-l-[#00E5FF] f1-card-glow-cyan bg-cyan-950/20'
            : 'border-l-[#00E676] f1-card-glow-green bg-emerald-950/20'
        }`}>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Spatial Compliance State
            </span>
            <div className={`text-xl font-black italic tracking-wider mt-0.5 ${
              frameData?.state === 'VIOLATION'
                ? 'text-[#E10600] animate-pulse'
                : frameData?.state === 'BORDERLINE'
                ? 'text-[#FFB800]'
                : frameData?.state === 'RECOVERED'
                ? 'text-[#00E5FF]'
                : 'text-[#00E676]'
            }`}>
              {frameData?.state ?? 'SAFE'}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 uppercase block">Frames Out</span>
            <span className="text-sm font-mono font-bold text-white">
              {frameData?.consecutive_outside ?? 0} frames
            </span>
          </div>
        </div>

        {/* Wheels Out Indicator (0/4 to 4/4) */}
        <div className="p-4 rounded-lg f1-card flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Wheels Beyond Limit
            </span>
            <div className={`text-xl font-black font-mono mt-0.5 ${
              (frameData?.footprint?.wheels_out_count ?? 0) >= 3
                ? 'text-[#E10600]'
                : (frameData?.footprint?.wheels_out_count ?? 0) > 0
                ? 'text-[#FFB800]'
                : 'text-[#00E676]'
            }`}>
              {frameData?.footprint?.wheels_out_count ?? 0} / 4 OUT
            </div>
          </div>
          {/* Wheel 2x2 Grid mini icon */}
          <div className="grid grid-cols-2 gap-1 bg-[#0d0d12] p-1.5 rounded border border-[#232330]">
            <span className={`w-2.5 h-2.5 rounded-sm ${frameData?.footprint?.fl_inside ? 'bg-[#00E676]' : 'bg-[#E10600]'}`} title="FL" />
            <span className={`w-2.5 h-2.5 rounded-sm ${frameData?.footprint?.fr_inside ? 'bg-[#00E676]' : 'bg-[#E10600]'}`} title="FR" />
            <span className={`w-2.5 h-2.5 rounded-sm ${frameData?.footprint?.rl_inside ? 'bg-[#00E676]' : 'bg-[#E10600]'}`} title="RL" />
            <span className={`w-2.5 h-2.5 rounded-sm ${frameData?.footprint?.rr_inside ? 'bg-[#00E676]' : 'bg-[#E10600]'}`} title="RR" />
          </div>
        </div>

        {/* Margin to Boundary */}
        <div className="p-4 rounded-lg f1-card flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Boundary Margin
            </span>
            <div className={`text-xl font-black font-mono mt-0.5 ${
              (frameData?.margin_to_boundary_cm ?? 0) < 0
                ? 'text-[#E10600]'
                : (frameData?.margin_to_boundary_cm ?? 0) <= 15
                ? 'text-[#FFB800]'
                : 'text-[#00E676]'
            }`}>
              {(frameData?.margin_to_boundary_cm ?? 0) > 0 ? '+' : ''}
              {frameData?.margin_to_boundary_cm ?? 0} <span className="text-xs font-normal text-gray-400">cm</span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-[#101018] text-gray-300 font-mono border border-[#242436]">
            {(frameData?.margin_to_boundary_cm ?? 0) < 0 ? 'EXCURSION' : 'LEGAL TRACK'}
          </span>
        </div>

        {/* Overall Confidence Score */}
        <div className="p-4 rounded-lg f1-card flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              System Confidence
            </span>
            <div className="text-xl font-black font-mono text-[#00E5FF] mt-0.5">
              {frameData?.confidence?.confidence_percentage ?? 0}%
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-cyan-950/40 text-[#00E5FF] font-bold border border-cyan-800">
            {frameData?.confidence?.verdict ?? 'CALCULATING'}
          </span>
        </div>
      </div>

      {/* Main Center Area: Live Canvas Player + Multi-Factor Confidence Radar + Telemetry Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Video Canvas Player (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="f1-card p-4 space-y-3">
            {/* Player Toolbar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                  <Radio className="w-3.5 h-3.5 text-[#E10600] animate-pulse" />
                  LIVE CAMERA • AUSTRIA RED BULL RING
                </span>
                <span className="text-[11px] font-mono text-gray-400 bg-[#0f0f15] px-2 py-0.5 rounded border border-[#222232]">
                  {frameData?.timestamp_str ?? '00:32:17.40'}
                </span>
              </div>

              {/* Austrian GP Corner Camera Switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                {corners.map((c) => (
                  <button
                    key={c.corner_id}
                    onClick={() => onSelectCorner(c.corner_id)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all border ${
                      selectedCornerId === c.corner_id
                        ? 'bg-[#E10600] text-white border-red-500 shadow-sm shadow-red-900/40'
                        : 'bg-[#101016] text-gray-400 border-[#222230] hover:text-white'
                    }`}
                  >
                    T{c.turn_number} ({c.corner_name.split(' ')[0]})
                  </button>
                ))}
              </div>

              {/* Toggles & Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOverlays(!showOverlays)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
                    showOverlays ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50' : 'bg-[#121218] text-gray-400 border-[#262638]'
                  }`}
                >
                  Boundary Polygons
                </button>
                <button
                  onClick={() => setShowFootprint(!showFootprint)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
                    showFootprint ? 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/50' : 'bg-[#121218] text-gray-400 border-[#262638]'
                  }`}
                >
                  Wheel Patches
                </button>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-1.5 rounded bg-[#1e1e2c] text-white hover:bg-[#2c2c40] border border-[#32324a]"
                  title={isPaused ? 'Resume Stream' : 'Pause Stream'}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Video Canvas */}
            <div className="relative rounded-lg overflow-hidden border border-[#222230] bg-black aspect-video flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />

              {/* On-Canvas Incident Flag Banner */}
              {frameData?.state === 'VIOLATION' && (
                <div className="absolute top-4 left-4 right-4 bg-red-600/90 backdrop-blur-md text-white px-4 py-2.5 rounded-lg flex items-center justify-between shadow-2xl border border-red-400 animate-bounce">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5" />
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">
                        FLAGGED TRACK LIMIT VIOLATION
                      </span>
                      <span className="text-[11px] text-red-100 font-mono">
                        HAAS #27 ({frameData.driver_name}) • {frameData.margin_to_boundary_cm}cm beyond limit
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenIncidentReview('INC-2026-001')}
                    className="px-3 py-1 bg-white text-red-600 font-bold text-xs rounded shadow hover:bg-gray-100"
                  >
                    Review Incident
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Waveform Charts */}
          {frameData?.telemetry && (
            <TelemetryCharts currentTelemetry={frameData.telemetry} />
          )}
        </div>

        {/* Right Column: Multi-Factor Explainability & Incident Log (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: 5-Factor Explainable Confidence Breakdown */}
          <div className="f1-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232332] pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Explainable Confidence Signals
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#00E5FF]">
                Multi-Factor Model
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Factor 1: Detection */}
              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">1. YOLO Vehicle Detection (30%)</span>
                  <span className="font-mono text-white">{(frameData?.confidence?.detection ?? 0.96) * 100}%</span>
                </div>
                <div className="w-full bg-[#1b1b26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#00E5FF] h-full rounded-full" style={{ width: `${(frameData?.confidence?.detection ?? 0.96) * 100}%` }} />
                </div>
              </div>

              {/* Factor 2: Tracking */}
              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">2. ByteTrack Continuity (20%)</span>
                  <span className="font-mono text-white">{(frameData?.confidence?.tracking ?? 0.95) * 100}%</span>
                </div>
                <div className="w-full bg-[#1b1b26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#00E5FF] h-full rounded-full" style={{ width: `${(frameData?.confidence?.tracking ?? 0.95) * 100}%` }} />
                </div>
              </div>

              {/* Factor 3: Geometry Evidence */}
              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">3. Boundary Geometry Clarity (25%)</span>
                  <span className="font-mono text-white">{(frameData?.confidence?.boundary_evidence ?? 0.98) * 100}%</span>
                </div>
                <div className="w-full bg-[#1b1b26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#00E676] h-full rounded-full" style={{ width: `${(frameData?.confidence?.boundary_evidence ?? 0.98) * 100}%` }} />
                </div>
              </div>

              {/* Factor 4: Temporal Persistence */}
              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">4. Temporal Frame Stability (15%)</span>
                  <span className="font-mono text-white">{(frameData?.confidence?.temporal_evidence ?? 0.92) * 100}%</span>
                </div>
                <div className="w-full bg-[#1b1b26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#FFB800] h-full rounded-full" style={{ width: `${(frameData?.confidence?.temporal_evidence ?? 0.92) * 100}%` }} />
                </div>
              </div>

              {/* Factor 5: Telemetry Corroboration */}
              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">5. Telemetry Dynamics Fusion (10%)</span>
                  <span className="font-mono text-white">{(frameData?.confidence?.telemetry_evidence ?? 0.95) * 100}%</span>
                </div>
                <div className="w-full bg-[#1b1b26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#E10600] h-full rounded-full" style={{ width: `${(frameData?.confidence?.telemetry_evidence ?? 0.95) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Recent Incident Queue */}
          <div className="f1-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#232332] pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FFB800]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Incident Review Queue
                </h3>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 font-mono">
                {recentIncidents.filter(i => i.status === 'PENDING_REVIEW').length} Pending
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {recentIncidents.map((inc) => (
                <div
                  key={inc.incident_id}
                  onClick={() => onOpenIncidentReview(inc.incident_id)}
                  className="bg-[#0f0f16] hover:bg-[#181824] p-3 rounded border border-[#222232] cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">
                        {inc.incident_id}
                      </span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase ${
                        inc.status === 'CONFIRMED'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : inc.status === 'DISMISSED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {inc.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Lap {inc.lap} • Car #{inc.vehicle_id} ({inc.wheels_out}/4 Out, {inc.min_margin_cm}cm)
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 group-hover:text-white">
                    <span className="text-[11px] font-mono">{inc.confidence.confidence_percentage}%</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
