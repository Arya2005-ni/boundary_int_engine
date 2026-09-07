"""
FastAPI Main Application for TrackShift 2026: Boundary Intelligence Engine
Enhanced for F1 Austrian Grand Prix (Red Bull Ring, Spielberg) & Haas F1 Team
"""
import os
import json
import asyncio
import base64
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, get_db_connection
from models import (
    TrackLimitState,
    IncidentStatus,
    WheelFootprint,
    ConfidenceBreakdown,
    TelemetryPoint,
    CornerCalibration,
    FrameAnalysisResult,
    Incident,
    SimulationRequest,
    StrategyRecommendation,
    CornerMarginDistribution
)
from engine.geometry import GeometryEngine
from engine.detector import VehicleDetector
from engine.tracker import SpatialTracker
from engine.telemetry import TelemetryEngine
from engine.confidence import ConfidenceEngine
from engine.strategy_simulation import StrategySimulationEngine
from engine.video_generator import VideoGenerator

# Initialize DB
init_db()

app = FastAPI(
    title="TrackShift 2026 - Boundary Intelligence Engine API",
    description="F1 Austrian GP (Red Bull Ring) Strategic Risk Mapping & Haas F1 Spatial Compliance Engine.",
    version="2.1.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global simulation & CV engines
strategy_engine = StrategySimulationEngine()
video_gen = VideoGenerator()
detector = VehicleDetector()


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "system": "TrackShift 2026 - Boundary Intelligence Engine",
        "version": "2.1.0",
        "circuit": "Red Bull Ring (Spielberg, Austria)",
        "team": "MoneyGram Haas F1 Team (VF-24)"
    }


# ==========================================
# CORNERS & CALIBRATION APIS
# ==========================================

@app.get("/api/corners")
def get_corners():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM corners ORDER BY turn_number ASC").fetchall()
    conn.close()
    
    result = []
    for r in rows:
        result.append({
            "corner_id": r["corner_id"],
            "track_id": r["track_id"],
            "track_name": r["track_name"],
            "corner_name": r["corner_name"],
            "turn_number": r["turn_number"],
            "speed_category": r["speed_category"],
            "danger_threshold_cm": r["danger_threshold_cm"],
            "calibration": json.loads(r["calibration_json"])
        })
    return result


@app.get("/api/corners/{corner_id}")
def get_corner(corner_id: str):
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM corners WHERE corner_id = ?", (corner_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Corner not found")
    return {
        "corner_id": row["corner_id"],
        "track_id": row["track_id"],
        "track_name": row["track_name"],
        "corner_name": row["corner_name"],
        "turn_number": row["turn_number"],
        "speed_category": row["speed_category"],
        "danger_threshold_cm": row["danger_threshold_cm"],
        "calibration": json.loads(row["calibration_json"])
    }


@app.post("/api/corners/{corner_id}/calibrate")
def update_calibration(corner_id: str, calibration: CornerCalibration):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE corners SET calibration_json = ?, danger_threshold_cm = ? WHERE corner_id = ?",
        (json.dumps(calibration.model_dump()), calibration.danger_zone_distance_cm, corner_id)
    )
    conn.commit()
    conn.close()
    return {"status": "success", "corner_id": corner_id, "message": "Calibration updated successfully"}


# ==========================================
# VEHICLES & PRACTICE SESSIONS APIS
# ==========================================

@app.get("/api/vehicles")
def get_vehicles():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM vehicles").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/practice-laps")
def get_practice_laps(corner_id: Optional[str] = "RBR-T9", vehicle_id: Optional[int] = 27):
    conn = get_db_connection()
    query = "SELECT * FROM practice_laps WHERE 1=1"
    params = []
    if corner_id:
        query += " AND corner_id = ?"
        params.append(corner_id)
    if vehicle_id:
        query += " AND vehicle_id = ?"
        params.append(vehicle_id)
    query += " ORDER BY lap_number ASC"
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ==========================================
# STRATEGIC RISK & WHAT-IF SIMULATION APIS
# ==========================================

@app.get("/api/strategy/distribution/{corner_id}")
def get_corner_distribution(corner_id: str):
    conn = get_db_connection()
    c_row = conn.execute("SELECT corner_name FROM corners WHERE corner_id = ?", (corner_id,)).fetchone()
    if not c_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Corner not found")
    corner_name = c_row["corner_name"]

    rows = conn.execute("SELECT min_margin_cm FROM practice_laps WHERE corner_id = ?", (corner_id,)).fetchall()
    conn.close()

    samples = [r["min_margin_cm"] for r in rows] if rows else [18.2, 16.5, 14.2, 12.0, 9.5, 5.2, 1.4, -6.8]
    dist = strategy_engine.compute_margin_distribution(corner_id, corner_name, samples)
    return dist


@app.post("/api/strategy/simulate")
def simulate_strategy(req: SimulationRequest):
    # 1. Fetch baseline distribution for corner
    dist = get_corner_distribution(req.corner_id)
    
    # 2. Run What-If simulation
    rec, details = strategy_engine.run_what_if_simulation(dist, req)

    # Unique SIM ID with UUID
    sim_id = f"SIM-{uuid.uuid4().hex[:8]}"
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO simulations VALUES (?, ?, ?, ?, ?, ?)",
            (
                sim_id,
                req.corner_id,
                27,
                json.dumps(req.model_dump()),
                json.dumps({"recommendation": rec.model_dump(), "details": details}),
                datetime.now().isoformat()
            )
        )
        conn.commit()
    except Exception as e:
        print(f"Simulation save warning: {e}")
    finally:
        conn.close()

    return {
        "sim_id": sim_id,
        "recommendation": rec,
        "details": details
    }


# ==========================================
# STEWARD INCIDENT REVIEW APIS
# ==========================================

@app.get("/api/incidents")
def get_incidents():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM incidents ORDER BY timestamp_sec DESC").fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "incident_id": r["incident_id"],
            "timestamp_str": r["timestamp_str"],
            "timestamp_sec": r["timestamp_sec"],
            "vehicle_id": r["vehicle_id"],
            "corner_id": r["corner_id"],
            "lap": r["lap"],
            "violation_type": r["violation_type"],
            "side": r["side"],
            "wheels_out": r["wheels_out"],
            "min_margin_cm": r["min_margin_cm"],
            "consecutive_frames": r["consecutive_frames"],
            "confidence": json.loads(r["confidence_json"]),
            "status": r["status"],
            "steward_notes": r["steward_notes"],
            "reviewed_by": r["reviewed_by"],
            "review_timestamp": r["review_timestamp"],
            "telemetry": json.loads(r["telemetry_json"]) if r["telemetry_json"] else []
        })
    return result


@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str):
    conn = get_db_connection()
    r = conn.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,)).fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Incident not found")

    return {
        "incident_id": r["incident_id"],
        "timestamp_str": r["timestamp_str"],
        "timestamp_sec": r["timestamp_sec"],
        "vehicle_id": r["vehicle_id"],
        "corner_id": r["corner_id"],
        "lap": r["lap"],
        "violation_type": r["violation_type"],
        "side": r["side"],
        "wheels_out": r["wheels_out"],
        "min_margin_cm": r["min_margin_cm"],
        "consecutive_frames": r["consecutive_frames"],
        "confidence": json.loads(r["confidence_json"]),
        "status": r["status"],
        "steward_notes": r["steward_notes"],
        "reviewed_by": r["reviewed_by"],
        "review_timestamp": r["review_timestamp"],
        "telemetry": json.loads(r["telemetry_json"]) if r["telemetry_json"] else []
    }


@app.post("/api/incidents/{incident_id}/adjudicate")
def adjudicate_incident(
    incident_id: str,
    action: str = Body(..., embed=True),  # "CONFIRM" or "DISMISS"
    steward_name: str = Body("G. Connelly (FIA Lead Steward)", embed=True),
    notes: Optional[str] = Body(None, embed=True)
):
    conn = get_db_connection()
    status = "CONFIRMED" if action.upper() == "CONFIRM" else "DISMISSED"
    now_str = datetime.now().isoformat()
    
    conn.execute(
        """
        UPDATE incidents 
        SET status = ?, reviewed_by = ?, review_timestamp = ?, steward_notes = ?
        WHERE incident_id = ?
        """,
        (status, steward_name, now_str, notes, incident_id)
    )
    conn.commit()
    conn.close()

    return {
        "incident_id": incident_id,
        "status": status,
        "reviewed_by": steward_name,
        "review_timestamp": now_str
    }


# ==========================================
# WEBSOCKET REAL-TIME LIVE & SESSION FEED
# ==========================================

@app.websocket("/ws/session")
async def websocket_session_feed(websocket: WebSocket):
    """
    Real-time streaming websocket delivering processed video frames,
    bounding box detections, wheel contact patch status, state machine transitions,
    and synchronized telemetry gauges for Haas #27 at Austrian GP.
    """
    await websocket.accept()

    try:
        # Load corner calibration for Austria Turn 9
        conn = get_db_connection()
        c_row = conn.execute("SELECT calibration_json FROM corners WHERE corner_id = 'RBR-T9'").fetchone()
        conn.close()
        
        calib = json.loads(c_row["calibration_json"]) if c_row else {}
        legal_poly = calib.get("legal_polygon", [
            [120, 560], [320, 480], [580, 410], [840, 360], [1140, 320],
            [1220, 410], [960, 470], [690, 540], [390, 620], [140, 710]
        ])

        geom_engine = GeometryEngine(legal_poly, pixels_to_cm_scale=0.5)

        # Generate realistic Austrian GP sequence with Haas VF-24
        frames = video_gen.generate_austria_session_sequence(corner_id="RBR-T9", num_frames=90, incident_excursion=True)

        while True:
            for frame_item in frames:
                f_idx = frame_item["frame_index"]
                bbox = frame_item["bbox"]
                ts_sec = frame_item["timestamp_sec"]
                telem_dict = frame_item["telemetry"]
                telem_obj = TelemetryPoint(**telem_dict)

                # 1. Calculate wheel footprint
                footprint = geom_engine.calculate_wheel_footprint(bbox)
                
                # 2. Margin to boundary in cm
                margin_cm = geom_engine.calculate_margin_cm(footprint, bbox)

                # 3. State machine evaluation (SAFE -> BORDERLINE -> VIOLATION -> RECOVERED)
                state, consecutive_outside = geom_engine.evaluate_state_machine(27, footprint, margin_cm)

                # 4. Multi-factor Confidence breakdown
                confidence = ConfidenceEngine.calculate_confidence(
                    yolo_det_conf=0.98,
                    tracking_consistency=0.97,
                    margin_cm=margin_cm,
                    footprint=footprint,
                    consecutive_frames=consecutive_outside,
                    telemetry=telem_obj
                )

                # 5. Base64 JPEG frame for live canvas render
                b64_frame = base64.b64encode(frame_item["jpeg_bytes"]).decode('utf-8')

                payload = {
                    "type": "FRAME_ANALYSIS",
                    "frame_index": f_idx,
                    "timestamp_sec": ts_sec,
                    "timestamp_str": f"00:32:{17.4 + (f_idx*0.033):05.2f}",
                    "corner_id": "RBR-T9",
                    "corner_name": "Jochen Rindt (Turn 9, Austria)",
                    "vehicle_id": 27,
                    "driver_name": "Nico Hülkenberg",
                    "team_name": "MoneyGram Haas F1 Team",
                    "car_number": 27,
                    "bbox": bbox,
                    "center": frame_item["center"],
                    "footprint": footprint.model_dump(),
                    "margin_to_boundary_cm": margin_cm,
                    "state": state.value,
                    "consecutive_outside": consecutive_outside,
                    "confidence": confidence.model_dump(),
                    "telemetry": telem_dict,
                    "frame_b64": f"data:image/jpeg;base64,{b64_frame}",
                    "incident_flag": (state == TrackLimitState.VIOLATION and consecutive_outside >= 3)
                }

                await websocket.send_text(json.dumps(payload))
                await asyncio.sleep(0.04)  # ~25 fps streaming rate

            await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
