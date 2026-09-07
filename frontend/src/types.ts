export type TrackLimitState = 'SAFE' | 'BORDERLINE' | 'VIOLATION' | 'RECOVERED';
export type IncidentStatus = 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'CONFIRMED' | 'DISMISSED';
export type ViewMode = 'STRATEGY' | 'LIVE_STEWARD' | 'CALIBRATION' | 'INCIDENTS';

export interface WheelFootprint {
  fl_inside: boolean;
  fr_inside: boolean;
  rl_inside: boolean;
  rr_inside: boolean;
  fl_coords: [number, number];
  fr_coords: [number, number];
  rl_coords: [number, number];
  rr_coords: [number, number];
  wheels_out_count: number;
}

export interface ConfidenceBreakdown {
  detection: number;
  tracking: number;
  boundary_evidence: number;
  temporal_evidence: number;
  telemetry_evidence: number;
  total_confidence: number;
  confidence_percentage: number;
  verdict: string;
}

export interface TelemetryPoint {
  timestamp_sec: number;
  vehicle_id: number;
  driver_name: string;
  speed_kmh: number;
  steering_deg: number;
  lateral_g: number;
  throttle_pct: number;
  brake_pct: number;
  gear: number;
  rpm: number;
  tyre_wear_pct: number;
  fuel_load_kg: number;
  lap: number;
  sector: number;
  corner_id?: string;
}

export interface CornerCalibration {
  track_id: string;
  corner_id: string;
  corner_name: string;
  legal_polygon: [number, number][];
  kerb_polygon?: [number, number][];
  runoff_polygon?: [number, number][];
  apex_point?: [number, number];
  racing_line?: [number, number][];
  danger_zone_distance_cm: number;
  image_width: number;
  image_height: number;
}

export interface CornerItem {
  corner_id: string;
  track_id: string;
  track_name: string;
  corner_name: string;
  turn_number: number;
  speed_category: string;
  danger_threshold_cm: number;
  calibration: CornerCalibration;
}

export interface FrameAnalysisResult {
  type: string;
  frame_index: number;
  timestamp_sec: number;
  timestamp_str: string;
  corner_id: string;
  corner_name: string;
  vehicle_id: number;
  driver_name: string;
  team_name: string;
  car_number: number;
  bbox: [number, number, number, number];
  center: [number, number];
  footprint: WheelFootprint;
  margin_to_boundary_cm: number;
  state: TrackLimitState;
  consecutive_outside: number;
  confidence: ConfidenceBreakdown;
  telemetry: TelemetryPoint;
  frame_b64: string;
  incident_flag: boolean;
}

export interface Incident {
  incident_id: string;
  timestamp_str: string;
  timestamp_sec: number;
  vehicle_id: number;
  driver_name?: string;
  corner_id: string;
  lap: number;
  violation_type: string;
  side: string;
  wheels_out: number;
  min_margin_cm: number;
  consecutive_frames: number;
  confidence: ConfidenceBreakdown;
  status: IncidentStatus;
  steward_notes?: string;
  reviewed_by?: string;
  review_timestamp?: string;
  telemetry?: Array<{
    time: number;
    speed: number;
    lat_g: number;
    steer: number;
    throttle: number;
    brake: number;
  }>;
}

export interface StrategyRecommendation {
  corner_id: string;
  corner_name: string;
  current_risk_pct: number;
  current_avg_margin_cm: number;
  projected_risk_pct: number;
  recommended_line_offset_cm: number;
  recommended_risk_pct: number;
  lap_time_delta_ms: number;
  rationale: string;
  tyre_deg_impact_pct: number;
  fuel_load_impact_pct: number;
  recommendation_level: 'CRITICAL' | 'ADVISORY' | 'OPTIMAL';
}

export interface CornerMarginDistribution {
  corner_id: string;
  corner_name: string;
  lap_count: number;
  samples: number[];
  mean_margin_cm: number;
  std_margin_cm: number;
  p10_margin_cm: number;
  p50_margin_cm: number;
  p90_margin_cm: number;
  violation_count: number;
  borderline_count: number;
  risk_score_pct: number;
}
