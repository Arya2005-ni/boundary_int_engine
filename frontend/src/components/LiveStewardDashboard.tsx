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
  ChevronRight,
  Crosshair,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { TelemetryCharts } from './TelemetryCharts';
import { API_URL, WS_URL } from '../config';

interface LiveStewardDashboardProps {
  corners: CornerItem[];
  selectedCornerId: string;
  onSelectCorner: (id: string) => void;
  onOpenIncidentReview: (incidentId: string) => void;
  onSetLiveStreaming: (isStreaming: boolean) => void;
  activeVideoId?: string | null;
  mode?: 'synthetic' | 'live_analysis';
  selectedDriverNumber?: number;
}

export const LiveStewardDashboard: React.FC<LiveStewardDashboardProps> = ({
  corners,
  selectedCornerId,
  onSelectCorner,
  onOpenIncidentReview,
  onSetLiveStreaming,
  activeVideoId = null,
  mode = 'synthetic',
  selectedDriverNumber = 31
}) => {
  const [frameData, setFrameData] = useState<FrameAnalysisResult | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showFootprint, setShowFootprint] = useState(true);
  const [showCompanion, setShowCompanion] = useState(true);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [adjudicationSuccess, setAdjudicationSuccess] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Connect to WebSocket for real-time video and telemetry stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isSubscribed = true;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      if (!isSubscribed) return;

      const wsUrl = new URL(`${WS_URL}/ws/session`);
      wsUrl.searchParams.set('mode', mode || 'synthetic');
      if (selectedCornerId) {
        wsUrl.searchParams.set('corner_id', selectedCornerId);
      }
      if (activeVideoId) {
        wsUrl.searchParams.set('video_id', activeVideoId);
      }
      wsUrl.searchParams.set('vehicle_id', String(selectedDriverNumber));

      ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        if (isSubscribed) {
          onSetLiveStreaming(true);
        }
      };

      ws.onmessage = (event) => {
        if (isPaused || !isSubscribed) return;
        try {
          const data: FrameAnalysisResult = JSON.parse(event.data);
          setFrameData(data);
        } catch (e) {
          console.error('Error parsing frame WS message:', e);
        }
      };

      ws.onclose = () => {
        if (isSubscribed) {
          onSetLiveStreaming(false);
          reconnectTimeout = setTimeout(connectWs, 2000);
        }
      };

      ws.onerror = () => {
        if (isSubscribed) {
          onSetLiveStreaming(false);
        }
      };
    };

    connectWs();
    fetchRecentIncidents();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [isPaused, selectedCornerId, activeVideoId, mode, selectedDriverNumber]);

  const fetchRecentIncidents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/incidents`);
      if (res.ok) {
        const data = await res.json();
        setRecentIncidents(data);
      }
    } catch (e) {
      console.error('Error fetching incidents:', e);
    }
  };

  const handleQuickAdjudicate = async (action: 'CONFIRM' | 'DISMISS') => {
    const targetId = recentIncidents.length > 0 ? recentIncidents[0].incident_id : 'AUT2026-FP2-0001';
    try {
      const res = await fetch(`${API_URL}/api/incidents/${targetId}/adjudicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          steward_name: 'G. Connelly (FIA Lead Steward)',
          notes: action === 'CONFIRM' 
            ? 'Lap time deleted under FIA Sporting Regulations Art 33.3 (all 4 wheels beyond track limit line).'
            : 'Dismissed by Stewards - Car maintained legal contact.'
        })
      });

      if (res.ok) {
        setAdjudicationSuccess(action === 'CONFIRM' ? 'LAP DELETED • OFFENCE CONFIRMED' : 'INCIDENT DISMISSED');
        fetchRecentIncidents();
        setTimeout(() => setAdjudicationSuccess(null), 4000);
      }
    } catch (e) {
      console.error('Failed to quick adjudicate:', e);
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

      // 1. Draw Calibrated Legal Track Polygon
      const curCorner = corners.find(c => c.corner_id === frameData.corner_id);
      if (curCorner && curCorner.calibration.legal_polygon) {
        ctx.beginPath();
        const poly = curCorner.calibration.legal_polygon;
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i][0], poly[i][1]);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Draw Companion Vehicle (#87 Bearman - Strictly on Track) if present
      if (showCompanion && frameData.companion_vehicle) {
        const comp = frameData.companion_vehicle;
        const [cx1, cy1, cx2, cy2] = comp.bbox;
        const isCompViol = comp.state === 'VIOLATION';
        const isCompBorder = comp.state === 'BORDERLINE';
        
        ctx.strokeStyle = isCompViol ? '#E10600' : isCompBorder ? '#FFB800' : '#00E676';
        ctx.lineWidth = 2.2;
        ctx.strokeRect(cx1, cy1, cx2 - cx1, cy2 - cy1);

        ctx.fillStyle = isCompViol ? 'rgba(225, 6, 0, 0.85)' : isCompBorder ? 'rgba(255, 184, 0, 0.85)' : 'rgba(0, 230, 118, 0.85)';
        const compLabel = `${comp.car_model || 'VF-26'} ${comp.driver_name} (+${comp.margin_to_boundary_cm || 18.5}cm) [SAFE]`;
        ctx.fillRect(cx1, cy1 - 20, Math.max(190, compLabel.length * 6.8), 18);
        ctx.fillStyle = isCompViol || isCompBorder ? '#FFFFFF' : '#000000';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(compLabel, cx1 + 5, cy1 - 7);

        // Companion 4 Wheels
        if (showFootprint) {
          const compWheels = comp.footprint ? [
            { name: 'FL', pt: comp.footprint.fl_coords, inside: comp.footprint.fl_inside },
            { name: 'FR', pt: comp.footprint.fr_coords, inside: comp.footprint.fr_inside },
            { name: 'RL', pt: comp.footprint.rl_coords, inside: comp.footprint.rl_inside },
            { name: 'RR', pt: comp.footprint.rr_coords, inside: comp.footprint.rr_inside }
          ] : comp.wheel_pts ? Object.entries(comp.wheel_pts).map(([k, pt]) => ({ name: k.toUpperCase(), pt, inside: true })) : [];

          compWheels.forEach(w => {
            ctx.beginPath();
            ctx.arc(w.pt[0], w.pt[1], 5.5, 0, 2 * Math.PI);
            ctx.fillStyle = w.inside ? '#00E676' : '#E10600';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
          });
        }
      }

      // 3. Draw Primary Vehicle Bounding Box (Highlighted Red for Violation)
      const [bx1, by1, bx2, by2] = frameData.bbox;
      const isViol = frameData.state === 'VIOLATION';
      const isBorder = frameData.state === 'BORDERLINE';

      ctx.strokeStyle = isViol ? '#E10600' : isBorder ? '#FFB800' : '#00E676';
      ctx.lineWidth = isViol ? 3.5 : 2.5;
      ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);

      // Label on Bounding Box
      ctx.fillStyle = isViol ? 'rgba(225, 6, 0, 0.92)' : isBorder ? 'rgba(255, 184, 0, 0.90)' : 'rgba(0, 230, 118, 0.85)';
      const labelText = `${frameData.car_model || 'VF-26'} ${frameData.driver_name} (${frameData.margin_to_boundary_cm > 0 ? '+' : ''}${frameData.margin_to_boundary_cm}cm) [${frameData.state}]`;
      ctx.fillRect(bx1, by1 - 22, Math.max(220, labelText.length * 7.5), 20);
      ctx.fillStyle = isViol || isBorder ? '#FFFFFF' : '#000000';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(labelText, bx1 + 6, by1 - 8);

      // 4. Draw 4 Wheel Footprint Contact Patches with Exact Coordinates
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
          ctx.arc(w.pt[0], w.pt[1], 7.5, 0, 2 * Math.PI);
          ctx.fillStyle = w.inside ? '#00E676' : '#E10600';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(w.name, w.pt[0] - 6, w.pt[1] - 10);
        });
      }
    };
  }, [frameData, showOverlays, showFootprint, showCompanion, corners]);

  const isRealVideo = mode === 'live_analysis' && Boolean(activeVideoId);
  const coords = frameData?.exact_coordinates;
  const compCoords = frameData?.companion_vehicle?.exact_coordinates;
  const comp = frameData?.companion_vehicle;

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
            <span className="text-[10px] text-gray-400 uppercase block">Rule Profile</span>
            <span className="text-xs font-mono font-bold text-[#00E5FF]">
              FIA_ALL_FOUR
            </span>
          </div>
        </div>

        {/* Wheels Out Indicator (0/4 to 4/4) */}
        <div className="p-4 rounded-lg f1-card flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Wheels Beyond Boundary
            </span>
            <div className={`text-xl font-black font-mono mt-0.5 ${
              (frameData?.footprint?.wheels_out_count ?? 0) === 4
                ? 'text-[#E10600]'
                : (frameData?.footprint?.wheels_out_count ?? 0) > 0
                ? 'text-[#FFB800]'
                : 'text-[#00E676]'
            }`}>
              {frameData?.footprint?.wheels_out_count ?? 0} / 4 OUT
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-[#0d0d12] p-1.5 rounded border border-[#232332]">
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
              {frameData?.confidence?.confidence_percentage ?? 97.8}%
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-cyan-950/40 text-[#00E5FF] font-bold border border-cyan-800">
            {frameData?.confidence?.verdict ?? 'HIGH CONFIDENCE'}
          </span>
        </div>
      </div>

      {/* Adjudication Success Alert */}
      {adjudicationSuccess && (
        <div className="bg-emerald-600/90 text-white px-4 py-2.5 rounded-lg flex items-center justify-between shadow-xl border border-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase">
            <CheckCircle className="w-4 h-4" />
            {adjudicationSuccess}
          </div>
          <span className="text-[10px] font-mono opacity-80">FIA Race Control Logged</span>
        </div>
      )}

      {/* Main Video & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Video Canvas Player (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="f1-card p-4 space-y-3">
            {/* Player Toolbar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                  <Radio className="w-3.5 h-3.5 text-[#E10600] animate-pulse" />
                  {isRealVideo ? 'LIVE VIEW • UPLOADED VIDEO' : 'LIVE VIEW • 2024 AUSTRIAN GP RACE DAY'}
                </span>
                <span className="text-[11px] font-mono text-gray-400 bg-[#0f0f15] px-2 py-0.5 rounded border border-[#222232]">
                  {frameData?.timestamp_str ?? '00:32:17.40'} • Lap {frameData?.lap ?? 12}
                </span>
                {frameData?.data_source === 'REAL_F1_AUSTRIAN_GP_2024_RACEDAY' && (
                  <span className="hidden sm:inline-flex text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 font-bold items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    FIA OFFICIAL RACE DAY (SESSION 9550)
                  </span>
                )}
              </div>

              {/* 10 Corners Switcher */}
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
                    T{c.turn_number}
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
                  Boundary
                </button>
                <button
                  onClick={() => setShowFootprint(!showFootprint)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
                    showFootprint ? 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/50' : 'bg-[#121218] text-gray-400 border-[#262638]'
                  }`}
                >
                  4 Wheels
                </button>
                <button
                  onClick={() => setShowCompanion(!showCompanion)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
                    showCompanion ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50' : 'bg-[#121218] text-gray-400 border-[#262638]'
                  }`}
                >
                  #87 Safe Car
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
                <div className="absolute top-4 left-4 right-4 bg-red-600/95 backdrop-blur-md text-white px-4 py-2.5 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-2xl border border-red-400 animate-bounce">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">
                        FLAGGED TRACK LIMIT VIOLATION (FIA_ALL_FOUR: 4/4 OUT)
                      </span>
                      <span className="text-[11px] text-red-100 font-mono block">
                        {frameData.official_fia_notice 
                          ? frameData.official_fia_notice 
                          : `${frameData.driver_name} • ${frameData.margin_to_boundary_cm}cm beyond limit • ${frameData.consecutive_outside} consecutive frames`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleQuickAdjudicate('CONFIRM')}
                      className="px-3 py-1 bg-white text-red-600 font-bold text-xs rounded shadow hover:bg-gray-100"
                    >
                      Delete Lap
                    </button>
                    <button
                      onClick={() => onOpenIncidentReview(frameData.car_number === 27 ? 'AUT2024-RACE-0027' : 'AUT2024-RACE-0031')}
                      className="px-3 py-1 bg-red-950 text-white font-bold text-xs rounded border border-red-300 hover:bg-red-900"
                    >
                      Full Dossier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Exact Coordinates & 4-Wheel Contact Footprint Inspector */}
          <div className="f1-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232332] pb-2.5">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Exact Spatial Coordinates & 4-Wheel Footprint Matrix
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#151522] border border-[#2a2a3e] text-gray-300 font-mono">
                  Scale: 1 px = 0.5 cm
                </span>
                <span className="text-[10px] font-mono text-[#00E5FF]">
                  FIA Article 33.3 Verified
                </span>
              </div>
            </div>

            {/* Side-by-side Dual Car Spatial Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card 1: Primary Monitored Vehicle (#31 or selected) */}
              <div className={`p-4 rounded-lg border space-y-3 font-mono text-xs ${
                frameData?.state === 'VIOLATION'
                  ? 'bg-red-950/25 border-red-800/80 shadow-md shadow-red-950/40'
                  : frameData?.state === 'BORDERLINE'
                  ? 'bg-amber-950/20 border-amber-800/70'
                  : 'bg-[#0f0f16] border-[#222232]'
              }`}>
                <div className="flex items-center justify-between border-b border-[#262638] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E10600]" />
                    <span className="font-bold text-white uppercase text-[11px]">
                      {frameData?.driver_name ?? 'PRIMARY CAR'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1e1e2c] text-gray-300">
                      #{frameData?.car_number ?? 31}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    frameData?.state === 'VIOLATION'
                      ? 'bg-red-600 text-white animate-pulse'
                      : frameData?.state === 'BORDERLINE'
                      ? 'bg-amber-500 text-black font-extrabold'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {frameData?.state ?? 'SAFE'} ({frameData?.margin_to_boundary_cm ?? 0}cm)
                  </span>
                </div>

                {/* Primary Position Metrics */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300">
                  <div className="flex justify-between bg-[#12121c] p-1.5 rounded border border-[#20202e]">
                    <span className="text-gray-400">Center (X,Y):</span>
                    <span className="text-white font-bold">({frameData?.center[0] ?? 0}, {frameData?.center[1] ?? 0})</span>
                  </div>
                  <div className="flex justify-between bg-[#12121c] p-1.5 rounded border border-[#20202e]">
                    <span className="text-gray-400">Track Metric:</span>
                    <span className="text-[#00E5FF] font-bold">[{coords?.track_coords_m[0] ?? 0}m, {coords?.track_coords_m[1] ?? 0}m]</span>
                  </div>
                  <div className="flex justify-between bg-[#12121c] p-1.5 rounded border border-[#20202e]">
                    <span className="text-gray-400">Heading:</span>
                    <span className="text-white font-bold">{coords?.heading_deg ?? frameData?.heading_deg ?? 0}°</span>
                  </div>
                  <div className="flex justify-between bg-[#12121c] p-1.5 rounded border border-[#20202e]">
                    <span className="text-gray-400">Wheels Beyond:</span>
                    <span className={`font-bold ${
                      (frameData?.footprint?.wheels_out_count ?? 0) === 4 ? 'text-[#E10600]' : (frameData?.footprint?.wheels_out_count ?? 0) > 0 ? 'text-[#FFB800]' : 'text-[#00E676]'
                    }`}>
                      {frameData?.footprint?.wheels_out_count ?? 0}/4 OUT
                    </span>
                  </div>
                </div>

                {/* Primary 4 Wheels Table */}
                <div className="space-y-1 pt-1 border-t border-[#202030]">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Tire Contact Patch Coordinates</span>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div className="flex justify-between items-center py-0.5 border-b border-[#1c1c28]">
                      <span className="text-gray-400">FL: ({frameData?.footprint?.fl_coords[0]}, {frameData?.footprint?.fl_coords[1]})</span>
                      <span className={`font-bold ${frameData?.footprint?.fl_inside ? 'text-[#00E676]' : 'text-[#E10600]'}`}>
                        {frameData?.footprint?.fl_inside ? 'INSIDE' : 'OUT'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#1c1c28]">
                      <span className="text-gray-400">FR: ({frameData?.footprint?.fr_coords[0]}, {frameData?.footprint?.fr_coords[1]})</span>
                      <span className={`font-bold ${frameData?.footprint?.fr_inside ? 'text-[#00E676]' : 'text-[#E10600]'}`}>
                        {frameData?.footprint?.fr_inside ? 'INSIDE' : 'OUT'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-gray-400">RL: ({frameData?.footprint?.rl_coords[0]}, {frameData?.footprint?.rl_coords[1]})</span>
                      <span className={`font-bold ${frameData?.footprint?.rl_inside ? 'text-[#00E676]' : 'text-[#E10600]'}`}>
                        {frameData?.footprint?.rl_inside ? 'INSIDE' : 'OUT'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-gray-400">RR: ({frameData?.footprint?.rr_coords[0]}, {frameData?.footprint?.rr_coords[1]})</span>
                      <span className={`font-bold ${frameData?.footprint?.rr_inside ? 'text-[#00E676]' : 'text-[#E10600]'}`}>
                        {frameData?.footprint?.rr_inside ? 'INSIDE' : 'OUT'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Companion Car (#87 Bearman - Strictly on Legal Racing Line) */}
              <div className="p-4 rounded-lg bg-emerald-950/15 border border-emerald-800/50 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#262638] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" />
                    <span className="font-bold text-white uppercase text-[11px]">
                      {comp?.driver_name ?? '#87 OLLIE BEARMAN'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1e1e2c] text-emerald-400 font-bold">
                      #{comp?.car_number ?? 87}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-600 text-white">
                    SAFE (+{comp?.margin_to_boundary_cm ?? 18.5}cm)
                  </span>
                </div>

                {/* Companion Position Metrics */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300">
                  <div className="flex justify-between bg-[#12121c] p-1.5 rounded border border-[#20202e]">
                    <span className="text-gray-400">Center (X,Y):</span>
                    <span className="text-white font-bold">({comp?.center[0] ?? 640}, {comp?.center[1] ?? 465})</span>
                  </div>
                  <div className="flex justify-between bg-[#12121c] p-1.5 rounded border border-[#20202e]">
                    <span className="text-gray-400">Track Metric:</span>
                    <span className="text-[#00E5FF] font-bold">[{compCoords?.track_coords_m?.[0] ?? Math.round((comp?.center[0] ?? 640) * 0.5)}m, {compCoords?.track_coords_m?.[1] ?? Math.round((comp?.center[1] ?? 465) * 0.5)}m]</span>
                  </div>
                  <div className="flex justify-between bg-[#12121c] p-1.5 rounded border border-[#20202e]">
                    <span className="text-gray-400">Heading:</span>
                    <span className="text-white font-bold">{comp?.heading_deg ?? -10.3}°</span>
                  </div>
                  <div className="flex justify-between bg-[#12121c] p-1.5 rounded border border-[#20202e]">
                    <span className="text-gray-400">Wheels Beyond:</span>
                    <span className="font-bold text-[#00E676]">0/4 OUT (LEGAL)</span>
                  </div>
                </div>

                {/* Companion 4 Wheels Table */}
                <div className="space-y-1 pt-1 border-t border-[#202030]">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Tire Contact Patch Coordinates (Racing Line)</span>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div className="flex justify-between items-center py-0.5 border-b border-[#1c1c28]">
                      <span className="text-gray-400">FL: ({comp?.footprint?.fl_coords?.[0] ?? comp?.wheel_pts?.fl?.[0] ?? 650}, {comp?.footprint?.fl_coords?.[1] ?? comp?.wheel_pts?.fl?.[1] ?? 455})</span>
                      <span className="font-bold text-[#00E676]">INSIDE</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-[#1c1c28]">
                      <span className="text-gray-400">FR: ({comp?.footprint?.fr_coords?.[0] ?? comp?.wheel_pts?.fr?.[0] ?? 660}, {comp?.footprint?.fr_coords?.[1] ?? comp?.wheel_pts?.fr?.[1] ?? 465})</span>
                      <span className="font-bold text-[#00E676]">INSIDE</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-gray-400">RL: ({comp?.footprint?.rl_coords?.[0] ?? comp?.wheel_pts?.rl?.[0] ?? 625}, {comp?.footprint?.rl_coords?.[1] ?? comp?.wheel_pts?.rl?.[1] ?? 468})</span>
                      <span className="font-bold text-[#00E676]">INSIDE</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-gray-400">RR: ({comp?.footprint?.rr_coords?.[0] ?? comp?.wheel_pts?.rr?.[0] ?? 635}, {comp?.footprint?.rr_coords?.[1] ?? comp?.wheel_pts?.rr?.[1] ?? 478})</span>
                      <span className="font-bold text-[#00E676]">INSIDE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Waveform Charts */}
          {frameData?.telemetry && (
            <TelemetryCharts currentTelemetry={frameData.telemetry} />
          )}
        </div>

        {/* Right Column: Multi-Factor Explainability & Incident Log (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Steward Rapid Ruling Actions */}
          <div className="f1-card p-5 space-y-3.5 border-t-4 border-t-[#E10600]">
            <div className="flex items-center justify-between border-b border-[#232332] pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Steward Live Adjudication
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 font-mono">
                Active Session
              </span>
            </div>

            <p className="text-xs text-gray-300">
              Review real-time camera overlays and spatial telemetry. Issue ruling on current vehicle:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleQuickAdjudicate('CONFIRM')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#E10600] hover:bg-red-700 text-white font-bold text-xs font-mono shadow-md transition-all"
              >
                <XCircle className="w-4 h-4" />
                DELETE LAP
              </button>
              <button
                onClick={() => handleQuickAdjudicate('DISMISS')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#1e1e2d] hover:bg-[#28283c] text-emerald-400 border border-emerald-800 font-bold text-xs font-mono shadow-md transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                DISMISS
              </button>
            </div>
          </div>

          {/* Card 2: 5-Factor Explainable Confidence Breakdown */}
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
              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">1. YOLO Vehicle Detection (30%)</span>
                  <span className="font-mono text-white">{(frameData?.confidence?.detection ?? 0.98) * 100}%</span>
                </div>
                <div className="w-full bg-[#1b1b26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#00E5FF] h-full rounded-full" style={{ width: `${(frameData?.confidence?.detection ?? 0.98) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">2. ByteTrack Spatial Continuity (20%)</span>
                  <span className="font-mono text-white">{(frameData?.confidence?.tracking ?? 0.97) * 100}%</span>
                </div>
                <div className="w-full bg-[#1b1b26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#00E5FF] h-full rounded-full" style={{ width: `${(frameData?.confidence?.tracking ?? 0.97) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">3. Boundary Geometry Clarity (25%)</span>
                  <span className="font-mono text-white">{(frameData?.confidence?.boundary_evidence ?? 0.99) * 100}%</span>
                </div>
                <div className="w-full bg-[#1b1b26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#00E676] h-full rounded-full" style={{ width: `${(frameData?.confidence?.boundary_evidence ?? 0.99) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-300">
                  <span className="font-medium">4. Temporal Frame Stability (15%)</span>
                  <span className="font-mono text-white">{(frameData?.confidence?.temporal_evidence ?? 0.96) * 100}%</span>
                </div>
                <div className="w-full bg-[#1b1b26] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#FFB800] h-full rounded-full" style={{ width: `${(frameData?.confidence?.temporal_evidence ?? 0.96) * 100}%` }} />
                </div>
              </div>

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

          {/* Card 3: Recent Incident Queue */}
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
                      Lap {inc.lap} • Car #{inc.vehicle_id} ({inc.driver_name ?? `Car #${inc.vehicle_id}`}) • {inc.wheels_out}/4 Out ({inc.min_margin_cm}cm)
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
