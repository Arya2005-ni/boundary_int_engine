import React from 'react';
import type { CornerItem, DynamicCornerRisk } from '../types';
import { Compass } from 'lucide-react';

interface AustriaTrackMapProps {
  corners?: CornerItem[];
  selectedCornerId: string;
  onSelectCorner: (id: string) => void;
  dynamicCornerRisks?: DynamicCornerRisk[];
  driverNumber?: number;
}

export const AustriaTrackMap: React.FC<AustriaTrackMapProps> = ({
  selectedCornerId,
  onSelectCorner,
  dynamicCornerRisks = [],
  driverNumber = 31
}) => {
  // Red Bull Ring (Spielberg, Austria) 10 Corner Positions on 800x450 SVG Canvas
  const cornerPins = [
    { id: 'RBR-T1', name: 'T1 Niki Lauda', num: 1, x: 220, y: 340, defaultRisk: 12, severity: 'LOW' },
    { id: 'RBR-T2', name: 'Turn 2', num: 2, x: 440, y: 220, defaultRisk: 22, severity: 'LOW' },
    { id: 'RBR-T3', name: 'T3 Remus', num: 3, x: 670, y: 95, defaultRisk: 74, severity: 'CRITICAL' },
    { id: 'RBR-T4', name: 'T4 Schlossgold', num: 4, x: 685, y: 220, defaultRisk: 38, severity: 'MEDIUM' },
    { id: 'RBR-T5', name: 'Turn 5', num: 5, x: 620, y: 260, defaultRisk: 21, severity: 'LOW' },
    { id: 'RBR-T6', name: 'Turn 6', num: 6, x: 540, y: 300, defaultRisk: 16, severity: 'LOW' },
    { id: 'RBR-T7', name: 'Turn 7', num: 7, x: 450, y: 285, defaultRisk: 34, severity: 'MEDIUM' },
    { id: 'RBR-T8', name: 'Turn 8', num: 8, x: 380, y: 320, defaultRisk: 27, severity: 'MEDIUM' },
    { id: 'RBR-T9', name: 'Turn 9', num: 9, x: 320, y: 390, defaultRisk: 43, severity: 'MEDIUM' },
    { id: 'RBR-T10', name: 'T10 Jochen Rindt', num: 10, x: 190, y: 390, defaultRisk: 18, severity: 'LOW' }
  ];

  const getSeverityColor = (riskPct: number) => {
    if (riskPct > 70) return '#E10600'; // RED
    if (riskPct >= 50) return '#FF8700'; // ORANGE
    if (riskPct >= 25) return '#FFB800'; // YELLOW
    return '#00E676'; // GREEN
  };

  const driverLabel = driverNumber === 31 ? 'HAAS #31 OCO' : 'HAAS #87 BEA';

  return (
    <div className="f1-card p-5 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#232332] pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#E10600]" />
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Red Bull Ring — Spielberg, Austria (Circuit Layout & Spatial Risk Heatmap)
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">
              Length: 4.318 km • 10 Turns • 71 Laps • FIA Track Limits Profile: FIA_ALL_FOUR
            </span>
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-[#E10600]">
            <span className="w-2 h-2 rounded-full bg-[#E10600]" /> CRITICAL (&gt;70%)
          </span>
          <span className="flex items-center gap-1 text-[#FF8700]">
            <span className="w-2 h-2 rounded-full bg-[#FF8700]" /> HIGH (50-70%)
          </span>
          <span className="flex items-center gap-1 text-[#FFB800]">
            <span className="w-2 h-2 rounded-full bg-[#FFB800]" /> MEDIUM (25-50%)
          </span>
          <span className="flex items-center gap-1 text-[#00E676]">
            <span className="w-2 h-2 rounded-full bg-[#00E676]" /> LOW (≤25%)
          </span>
        </div>
      </div>

      {/* SVG Circuit Map */}
      <div className="relative w-full aspect-[16/9] bg-[#0c0c12] rounded-lg border border-[#20202e] overflow-hidden flex items-center justify-center p-2">
        <svg viewBox="0 0 800 450" className="w-full h-full">
          <defs>
            <filter id="trackGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00E5FF" floodOpacity="0.4" />
            </filter>
            <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2c2c3e" />
              <stop offset="50%" stopColor="#404058" />
              <stop offset="100%" stopColor="#2c2c3e" />
            </linearGradient>
          </defs>

          {/* Sector Labels */}
          <text x="140" y="320" fill="#555568" fontSize="10" fontFamily="monospace" fontWeight="bold">SECTOR 1 (Start/Finish Straight)</text>
          <text x="610" y="55" fill="#E10600" fontSize="10" fontFamily="monospace" fontWeight="bold">SECTOR 2 (Turn 3 Remus Uphill Hairpin)</text>
          <text x="360" y="430" fill="#555568" fontSize="10" fontFamily="monospace" fontWeight="bold">SECTOR 3 (Turn 9 & 10 Jochen Rindt)</text>

          {/* Main Circuit Track Outline (Red Bull Ring Shape) */}
          <path
            d="M 170 380 
               L 160 340 
               Q 160 310, 220 310 
               L 650 90 
               Q 690 80, 690 120 
               L 670 200 
               Q 670 240, 640 250 
               L 560 290 
               Q 510 320, 480 300 
               L 420 280 
               Q 370 280, 360 320 
               L 350 360 
               Q 340 400, 290 400 
               L 200 400 
               Q 160 400, 170 380 Z"
            fill="none"
            stroke="#1c1c28"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Inner Racing Line */}
          <path
            d="M 170 380 
               L 160 340 
               Q 160 310, 220 310 
               L 650 90 
               Q 690 80, 690 120 
               L 670 200 
               Q 670 240, 640 250 
               L 560 290 
               Q 510 320, 480 300 
               L 420 280 
               Q 370 280, 360 320 
               L 350 360 
               Q 340 400, 290 400 
               L 200 400 
               Q 160 400, 170 380 Z"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#trackGlow)"
          />

          {/* Highlight Turn 3 Remus Critical Danger Red Zone */}
          <path
            d="M 650 90 Q 690 80, 690 120 L 670 200"
            fill="none"
            stroke="#E10600"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Interactive Turn Pins (All 10 Turns) */}
          {cornerPins.map((pin) => {
            const isSelected = selectedCornerId === pin.id;
            const dynRisk = dynamicCornerRisks.find(c => c.number === pin.num);
            const riskVal = dynRisk ? dynRisk.risk : pin.defaultRisk;
            const color = getSeverityColor(riskVal);

            return (
              <g 
                key={pin.id} 
                onClick={() => onSelectCorner(pin.id)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                {/* Outer Ring */}
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={isSelected ? 16 : 11}
                  fill="#14141e"
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 1.5}
                />

                {/* Inner Turn Number */}
                <text
                  x={pin.x}
                  y={pin.y + 4}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={isSelected ? "11" : "9"}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {pin.num}
                </text>

                {/* Label Box */}
                <rect
                  x={pin.x - 45}
                  y={pin.y - 28}
                  width="90"
                  height="16"
                  rx="3"
                  fill="#0e0e15"
                  stroke={isSelected ? "#00E5FF" : "#28283a"}
                  strokeWidth="1"
                />
                <text
                  x={pin.x}
                  y={pin.y - 16}
                  textAnchor="middle"
                  fill={isSelected ? "#00E5FF" : "#d0d0e0"}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {pin.name} ({riskVal}%)
                </text>
              </g>
            );
          })}

          {/* TGR Haas VF-26 Animated Position Marker on Turn 3 Remus */}
          <g>
            <circle cx="670" cy="115" r="11" fill="#E10600" opacity="0.4" className="animate-ping" />
            <circle cx="670" cy="115" r="6" fill="#FFFFFF" stroke="#E10600" strokeWidth="2" />
            <rect x="625" y="132" width="90" height="15" rx="3" fill="#E10600" />
            <text x="670" y="143" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
              {driverLabel}
            </text>
          </g>
        </svg>
      </div>

      {/* 10 Corners Quick Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {cornerPins.map((c) => {
          const isSelected = selectedCornerId === c.id;
          const dynRisk = dynamicCornerRisks.find(r => r.number === c.num);
          const riskVal = dynRisk ? dynRisk.risk : c.defaultRisk;
          const color = getSeverityColor(riskVal);
          const severityText = riskVal > 70 ? 'CRITICAL' : riskVal >= 50 ? 'HIGH' : riskVal >= 25 ? 'MEDIUM' : 'LOW';

          return (
            <button
              key={c.id}
              onClick={() => onSelectCorner(c.id)}
              className={`p-2 rounded text-left transition-all border ${
                isSelected
                  ? 'bg-[#1a1a26] border-[#00E5FF] shadow-lg shadow-cyan-950/40'
                  : 'bg-[#101017] border-[#222230] hover:border-[#38384e]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white">
                  Turn {c.num}
                </span>
                <span 
                  className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
                  style={{ 
                    backgroundColor: `${color}20`,
                    color: color,
                    border: `1px solid ${color}40`
                  }}
                >
                  {severityText} ({riskVal}%)
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate mt-0.5 font-medium">
                {c.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
