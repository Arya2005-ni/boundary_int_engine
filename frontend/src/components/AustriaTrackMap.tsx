import React from 'react';
import type { CornerItem } from '../types';
import { Compass } from 'lucide-react';

interface AustriaTrackMapProps {
  corners: CornerItem[];
  selectedCornerId: string;
  onSelectCorner: (id: string) => void;
  carProgressRatio?: number;
}

export const AustriaTrackMap: React.FC<AustriaTrackMapProps> = ({
  corners,
  selectedCornerId,
  onSelectCorner
}) => {
  // Red Bull Ring (Spielberg, Austria) Key Corner Coordinates on a 800x450 SVG Canvas
  const cornerPins = [
    { id: 'RBR-T1', name: 'T1 Niki Lauda', num: 1, x: 220, y: 340, risk: 'LOW', riskColor: '#00E676', speed: '155 km/h' },
    { id: 'RBR-T3', name: 'T3 Remus', num: 3, x: 680, y: 90, risk: 'MED', riskColor: '#FFB800', speed: '75 km/h' },
    { id: 'RBR-T4', name: 'T4 Rauch', num: 4, x: 690, y: 220, risk: 'HIGH', riskColor: '#FFB800', speed: '140 km/h' },
    { id: 'RBR-T6', name: 'T6 Gerhard Berger', num: 6, x: 540, y: 310, risk: 'MED', riskColor: '#FFB800', speed: '210 km/h' },
    { id: 'RBR-T7', name: 'T7 Würth', num: 7, x: 440, y: 290, risk: 'LOW', riskColor: '#00E676', speed: '195 km/h' },
    { id: 'RBR-T9', name: 'T9 Jochen Rindt', num: 9, x: 320, y: 390, risk: 'CRITICAL', riskColor: '#E10600', speed: '235 km/h' },
    { id: 'RBR-T10', name: 'T10 Red Bull Mobile', num: 10, x: 190, y: 390, risk: 'CRITICAL', riskColor: '#E10600', speed: '248 km/h' }
  ];

  return (
    <div className="f1-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#232332] pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#E10600]" />
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Red Bull Ring — Spielberg, Austria (Circuit Layout)
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">
              Length: 4.318 km • 10 Turns • 3 DRS Zones • FIA Track Limits Hotspots
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-[#E10600]">
            <span className="w-2 h-2 rounded-full bg-[#E10600]" /> Critical Limits (T9 & T10)
          </span>
          <span className="flex items-center gap-1 text-[#FFB800]">
            <span className="w-2 h-2 rounded-full bg-[#FFB800]" /> Moderate Risk (T4 & T6)
          </span>
          <span className="flex items-center gap-1 text-[#00E676]">
            <span className="w-2 h-2 rounded-full bg-[#00E676]" /> Compliant (T1)
          </span>
        </div>
      </div>

      {/* SVG Circuit Map */}
      <div className="relative w-full aspect-[16/9] bg-[#0c0c12] rounded-lg border border-[#20202e] overflow-hidden flex items-center justify-center p-2">
        <svg viewBox="0 0 800 450" className="w-full h-full">
          <defs>
            {/* Glow for track outline */}
            <filter id="trackGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00E5FF" floodOpacity="0.4" />
            </filter>
            <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2c2c3e" />
              <stop offset="50%" stopColor="#404058" />
              <stop offset="100%" stopColor="#2c2c3e" />
            </linearGradient>
          </defs>

          {/* Sector 1, 2, 3 Sector Shading */}
          <text x="140" y="320" fill="#555568" fontSize="10" fontFamily="monospace" fontWeight="bold">SECTOR 1 (Start/Finish)</text>
          <text x="640" y="60" fill="#555568" fontSize="10" fontFamily="monospace" fontWeight="bold">SECTOR 2 (Remus Uphill)</text>
          <text x="400" y="420" fill="#E10600" fontSize="10" fontFamily="monospace" fontWeight="bold">SECTOR 3 (T9/T10 Track Limits Zone)</text>

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

          {/* Highlighting T9 & T10 Track Limit Danger Red Zone */}
          <path
            d="M 350 360 Q 340 400, 290 400 L 200 400 Q 160 400, 170 380"
            fill="none"
            stroke="#E10600"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Interactive Turn Pins */}
          {cornerPins.map((pin) => {
            const isSelected = selectedCornerId === pin.id;
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
                  r={isSelected ? 16 : 12}
                  fill="#14141e"
                  stroke={pin.riskColor}
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
                  {pin.name}
                </text>
              </g>
            );
          })}

          {/* Haas F1 VF-24 Animated Beacon along Turn 9 */}
          <g>
            <circle cx="310" cy="390" r="10" fill="#E10600" opacity="0.4" className="animate-ping" />
            <circle cx="310" cy="390" r="6" fill="#FFFFFF" stroke="#E10600" strokeWidth="2" />
            <rect x="270" y="415" width="80" height="15" rx="3" fill="#E10600" />
            <text x="310" y="426" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
              HAAS #27 LIVE
            </text>
          </g>
        </svg>
      </div>

      {/* Austrian GP Corner Quick Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {corners.map((c) => (
          <button
            key={c.corner_id}
            onClick={() => onSelectCorner(c.corner_id)}
            className={`p-2.5 rounded text-left transition-all border ${
              selectedCornerId === c.corner_id
                ? 'bg-[#1a1a26] border-[#00E5FF] shadow-lg shadow-cyan-950/40'
                : 'bg-[#101017] border-[#222230] hover:border-[#38384e]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white">
                Turn {c.turn_number}
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                c.turn_number === 9 || c.turn_number === 10
                  ? 'bg-red-950 text-red-400'
                  : 'bg-emerald-950 text-emerald-400'
              }`}>
                {c.turn_number === 9 || c.turn_number === 10 ? 'High Risk' : 'Standard'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">
              {c.corner_name}
            </p>
            <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
              {c.speed_category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
