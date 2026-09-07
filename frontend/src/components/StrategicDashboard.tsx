import React, { useState, useEffect } from 'react';
import type { 
  CornerItem, 
  CornerMarginDistribution, 
  StrategyRecommendation 
} from '../types';
import { 
  TrendingUp, 
  Compass, 
  Activity,
  Layers,
  Zap
} from 'lucide-react';
import { AustriaTrackMap } from './AustriaTrackMap';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line, 
  ReferenceLine
} from 'recharts';

interface StrategicDashboardProps {
  corners: CornerItem[];
  selectedCornerId: string;
  onSelectCorner: (id: string) => void;
}

export const StrategicDashboard: React.FC<StrategicDashboardProps> = ({
  corners,
  selectedCornerId,
  onSelectCorner
}) => {
  const [distribution, setDistribution] = useState<CornerMarginDistribution | null>(null);
  const [recommendation, setRecommendation] = useState<StrategyRecommendation | null>(null);
  const [tradeoffCurve, setTradeoffCurve] = useState<any[]>([]);

  // Simulation Sliders State
  const [tyreCompound, setTyreCompound] = useState<'Soft' | 'Medium' | 'Hard'>('Medium');
  const [tyreAgeLaps, setTyreAgeLaps] = useState<number>(18);
  const [fuelLoadKg, setFuelLoadKg] = useState<number>(68);
  const [trackTempC, setTrackTempC] = useState<number>(38);
  const [weatherCondition, setWeatherCondition] = useState<string>('Dry');
  const [drivingLineOffsetCm, setDrivingLineOffsetCm] = useState<number>(0);

  // Fetch distribution and baseline simulation on corner select
  useEffect(() => {
    fetchCornerData(selectedCornerId);
  }, [selectedCornerId]);

  // Re-run simulation whenever parameters change
  useEffect(() => {
    runSimulation();
  }, [selectedCornerId, tyreCompound, tyreAgeLaps, fuelLoadKg, trackTempC, weatherCondition, drivingLineOffsetCm]);

  const fetchCornerData = async (cornerId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/strategy/distribution/${cornerId}`);
      if (res.ok) {
        const data = await res.json();
        setDistribution(data);
      }
    } catch (e) {
      console.error('Failed to load distribution:', e);
    }
  };

  const runSimulation = async () => {
    try {
      const payload = {
        corner_id: selectedCornerId,
        tyre_compound: tyreCompound,
        tyre_age_laps: tyreAgeLaps,
        fuel_load_kg: fuelLoadKg,
        track_temperature_c: trackTempC,
        weather_condition: weatherCondition,
        driving_line_offset_cm: drivingLineOffsetCm
      };

      const res = await fetch('http://localhost:8000/api/strategy/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.recommendation);
        setTradeoffCurve(data.details.tradeoff_curve || []);
      }
    } catch (e) {
      console.error('Failed to run simulation:', e);
    }
  };

  // Prepare chart data for margin distribution
  const marginChartData = distribution?.samples?.map((m, idx) => ({
    lap: `Lap ${idx + 1}`,
    margin: m,
    dangerLimit: 0,
    safeMargin: 15
  })) || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: Paradigm Quote from PDF */}
      <div className="bg-gradient-to-r from-[#171722] via-[#1e1e2c] to-[#171722] border-l-4 border-[#E10600] p-4 rounded-r-lg shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#E10600]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Strategic Risk & Pre-Race Intelligence Layer
            </h2>
          </div>
          <p className="text-xs text-gray-300 mt-1 italic">
            “Don’t tell stewards a violation happened. Tell race engineers, before the race, which corners are likely to produce violations — and what it costs in lap time to stay safely inside the limit.”
          </p>
        </div>

        {/* Corner Selection Tabs */}
        <div className="flex items-center gap-2 self-stretch md:self-auto">
          {corners.map((c) => (
            <button
              key={c.corner_id}
              onClick={() => onSelectCorner(c.corner_id)}
              className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all ${
                selectedCornerId === c.corner_id
                  ? 'bg-[#E10600] text-white shadow-md shadow-red-900/40'
                  : 'bg-[#12121a] text-gray-400 hover:text-white border border-[#272738]'
              }`}
            >
              {c.corner_name}
            </button>
          ))}
        </div>
      </div>

      {/* F1 Austrian GP Circuit Map */}
      <AustriaTrackMap
        corners={corners}
        selectedCornerId={selectedCornerId}
        onSelectCorner={onSelectCorner}
      />

      {/* Main Grid: Practice Risk Mapping (Left) & What-If Simulation Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Practice Margin Distribution & Risk Statistics (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Statistical Margin Breakdown */}
          <div className="f1-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232332] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Practice Session Margin Distribution
                </h3>
              </div>
              <span className="text-[11px] font-mono text-gray-400">
                Laps Analyzed: {distribution?.lap_count || 0}
              </span>
            </div>

            {/* Metric KPI Widgets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0f0f15] p-3 rounded border border-[#20202e]">
                <span className="text-[10px] text-gray-400 font-medium uppercase">Mean Margin</span>
                <div className="text-lg font-mono font-bold text-white mt-0.5">
                  {distribution?.mean_margin_cm ?? 0} <span className="text-xs font-normal text-gray-400">cm</span>
                </div>
                <span className="text-[10px] text-gray-400">Std Dev: ±{distribution?.std_margin_cm ?? 0}cm</span>
              </div>

              <div className="bg-[#0f0f15] p-3 rounded border border-[#20202e]">
                <span className="text-[10px] text-gray-400 font-medium uppercase">P10 (Tightest Margin)</span>
                <div className={`text-lg font-mono font-bold mt-0.5 ${
                  (distribution?.p10_margin_cm ?? 0) < 0 ? 'text-[#E10600]' : 'text-[#FFB800]'
                }`}>
                  {distribution?.p10_margin_cm ?? 0} <span className="text-xs font-normal text-gray-400">cm</span>
                </div>
                <span className="text-[10px] text-gray-400">P90: {distribution?.p90_margin_cm ?? 0}cm</span>
              </div>

              <div className="bg-[#0f0f15] p-3 rounded border border-[#20202e]">
                <span className="text-[10px] text-gray-400 font-medium uppercase">Excursions / Laps</span>
                <div className="text-lg font-mono font-bold text-[#E10600] mt-0.5">
                  {distribution?.violation_count ?? 0} <span className="text-xs font-normal text-gray-400">/ {distribution?.lap_count ?? 0}</span>
                </div>
                <span className="text-[10px] text-[#FFB800] font-mono">
                  {distribution?.borderline_count ?? 0} Borderline
                </span>
              </div>

              <div className="bg-[#0f0f15] p-3 rounded border border-[#20202e]">
                <span className="text-[10px] text-gray-400 font-medium uppercase">Baseline Corner Risk</span>
                <div className={`text-lg font-mono font-bold mt-0.5 ${
                  (distribution?.risk_score_pct ?? 0) > 50 ? 'text-[#E10600]' : 'text-[#00E676]'
                }`}>
                  {distribution?.risk_score_pct ?? 0}%
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Statistical Excursion Risk</span>
              </div>
            </div>

            {/* Practice Session Lap-by-Lap Margin Graph */}
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marginChartData}>
                  <defs>
                    <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1c28" />
                  <XAxis dataKey="lap" stroke="#606078" fontSize={10} tickLine={false} />
                  <YAxis stroke="#606078" fontSize={10} unit="cm" domain={[-25, 35]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#14141e', borderColor: '#2c2c40', fontSize: '11px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  {/* Zero boundary line */}
                  <ReferenceLine y={0} stroke="#E10600" strokeWidth={2} label={{ value: 'TRACK LIMIT (0cm)', fill: '#E10600', fontSize: 10 }} />
                  <ReferenceLine y={15} stroke="#FFB800" strokeDasharray="3 3" label={{ value: 'BORDERLINE ZONE', fill: '#FFB800', fontSize: 9 }} />
                  <Area 
                    type="monotone" 
                    dataKey="margin" 
                    stroke="#00E5FF" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#marginGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Risk vs Lap Time Trade-off Curve */}
          <div className="f1-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#232332] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FFB800]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Risk vs. Lap-Time Trade-Off Curve
                </h3>
              </div>
              <span className="text-[11px] text-gray-400 font-mono">
                Optimal Line Offset Optimization
              </span>
            </div>

            <p className="text-xs text-gray-300">
              Shows projected violation risk percentage against expected lap-time delta (ms) as the driver modifies entry line geometry.
            </p>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tradeoffCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1c28" />
                  <XAxis 
                    dataKey="offset_cm" 
                    stroke="#606078" 
                    fontSize={10} 
                    unit="cm" 
                    label={{ value: 'Apex Line Offset (cm inside track)', position: 'insideBottom', offset: -5, fill: '#888', fontSize: 10 }}
                  />
                  <YAxis yAxisId="left" stroke="#E10600" fontSize={10} unit="%" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#FFB800" fontSize={10} unit="ms" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#14141e', borderColor: '#2c2c40', fontSize: '11px' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="projected_risk_pct" name="Violation Risk (%)" stroke="#E10600" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="lap_time_delta_ms" name="Lap Time Delta (ms)" stroke="#FFB800" strokeWidth={2} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive What-If Scenario Simulator & Recommendations (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: AI Strategy Recommendation Card */}
          {recommendation && (
            <div className={`f1-card p-5 border-l-4 space-y-4 ${
              recommendation.recommendation_level === 'CRITICAL' 
                ? 'border-l-[#E10600] f1-card-glow-red' 
                : recommendation.recommendation_level === 'ADVISORY'
                ? 'border-l-[#FFB800] f1-card-glow-amber'
                : 'border-l-[#00E676] f1-card-glow-green'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${
                    recommendation.recommendation_level === 'CRITICAL' ? 'text-[#E10600]' : 'text-[#FFB800]'
                  }`} />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Race Strategy Recommendation
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  recommendation.recommendation_level === 'CRITICAL'
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : recommendation.recommendation_level === 'ADVISORY'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {recommendation.recommendation_level}
                </span>
              </div>

              {/* Rationale Quote */}
              <div className="bg-[#0f0f15] p-3.5 rounded border border-[#232332] text-xs text-gray-200 leading-relaxed font-medium">
                "{recommendation.rationale}"
              </div>

              {/* Comparison Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-[#12121a] p-2 rounded">
                  <span className="text-[10px] text-gray-400 block uppercase">Projected Risk</span>
                  <span className="text-base font-mono font-bold text-[#E10600]">
                    {recommendation.projected_risk_pct}%
                  </span>
                </div>

                <div className="bg-[#12121a] p-2 rounded">
                  <span className="text-[10px] text-gray-400 block uppercase">Rec. Line Shift</span>
                  <span className="text-base font-mono font-bold text-[#00E5FF]">
                    +{recommendation.recommended_line_offset_cm} <span className="text-[10px]">cm</span>
                  </span>
                </div>

                <div className="bg-[#12121a] p-2 rounded">
                  <span className="text-[10px] text-gray-400 block uppercase">Lap-Time Cost</span>
                  <span className="text-base font-mono font-bold text-[#FFB800]">
                    +{recommendation.lap_time_delta_ms} <span className="text-[10px]">ms</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Interactive Scenario Simulator Sliders */}
          <div className="f1-card p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#232332] pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Race-Day Scenario Simulation
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e1e2d] text-[#00E5FF] font-mono">
                HAAS #27
              </span>
            </div>

            {/* Control 1: Tyre Compound */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-medium flex items-center justify-between">
                <span>Tyre Compound</span>
                <span className="font-mono text-[#00E5FF]">{tyreCompound}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Soft', 'Medium', 'Hard'] as const).map((comp) => (
                  <button
                    key={comp}
                    onClick={() => setTyreCompound(comp)}
                    className={`py-1.5 rounded text-xs font-bold transition-all border ${
                      tyreCompound === comp
                        ? comp === 'Soft' 
                          ? 'bg-[#E10600] text-white border-red-600'
                          : comp === 'Medium'
                          ? 'bg-[#FFB800] text-black border-amber-500'
                          : 'bg-gray-200 text-black border-white'
                        : 'bg-[#101017] text-gray-400 border-[#262638] hover:text-white'
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 2: Tyre Age Laps */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">Tyre Stint Age</span>
                <span className="font-mono text-white font-bold">{tyreAgeLaps} Laps</span>
              </div>
              <input
                type="range"
                min={1}
                max={45}
                value={tyreAgeLaps}
                onChange={(e) => setTyreAgeLaps(Number(e.target.value))}
                className="w-full accent-[#E10600] bg-[#222230] h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>New (1 Lap)</span>
                <span>Stint Limit (45 Laps)</span>
              </div>
            </div>

            {/* Control 3: Fuel Load */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">Fuel Load Mass</span>
                <span className="font-mono text-white font-bold">{fuelLoadKg} kg</span>
              </div>
              <input
                type="range"
                min={10}
                max={110}
                value={fuelLoadKg}
                onChange={(e) => setFuelLoadKg(Number(e.target.value))}
                className="w-full accent-[#00E5FF] bg-[#222230] h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Low Fuel (10kg)</span>
                <span>Race Start (110kg)</span>
              </div>
            </div>

            {/* Control 4: Track Temperature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">Track Temperature</span>
                <span className="font-mono text-white font-bold">{trackTempC} °C</span>
              </div>
              <input
                type="range"
                min={15}
                max={55}
                value={trackTempC}
                onChange={(e) => setTrackTempC(Number(e.target.value))}
                className="w-full accent-[#FFB800] bg-[#222230] h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Cool (15°C)</span>
                <span>Extreme Heat (55°C)</span>
              </div>
            </div>

            {/* Control 5: Weather Condition */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-medium">Weather / Surface Grip</label>
              <div className="grid grid-cols-3 gap-2">
                {['Dry', 'Damp', 'Wet'].map((w) => (
                  <button
                    key={w}
                    onClick={() => setWeatherCondition(w)}
                    className={`py-1.5 rounded text-xs font-bold transition-all border ${
                      weatherCondition === w
                        ? 'bg-[#00E5FF] text-black border-cyan-400'
                        : 'bg-[#101017] text-gray-400 border-[#262638] hover:text-white'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 6: Driving Line Lateral Offset */}
            <div className="space-y-1.5 pt-2 border-t border-[#232332]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">Driving Line Shift (Apex Entry)</span>
                <span className={`font-mono font-bold ${drivingLineOffsetCm > 0 ? 'text-[#00E676]' : drivingLineOffsetCm < 0 ? 'text-[#E10600]' : 'text-gray-300'}`}>
                  {drivingLineOffsetCm > 0 ? `+${drivingLineOffsetCm}cm (Inside)` : drivingLineOffsetCm < 0 ? `${drivingLineOffsetCm}cm (Aggressive)` : '0cm (Baseline)'}
                </span>
              </div>
              <input
                type="range"
                min={-20}
                max={30}
                value={drivingLineOffsetCm}
                onChange={(e) => setDrivingLineOffsetCm(Number(e.target.value))}
                className="w-full accent-[#00E676] bg-[#222230] h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
