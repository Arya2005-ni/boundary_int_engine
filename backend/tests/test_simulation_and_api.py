"""
Unit Tests for Confidence Scoring, Strategic Simulation, and REST Endpoints
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from engine.confidence import ConfidenceEngine
from engine.strategy_simulation import StrategySimulationEngine
from models import WheelFootprint, TelemetryPoint, SimulationRequest


def test_confidence_scoring_weights():
    fp = WheelFootprint(
        fl_inside=False,
        fr_inside=False,
        rl_inside=False,
        rr_inside=False,
        wheels_out_count=4
    )
    telem = TelemetryPoint(
        timestamp_sec=1937.4,
        vehicle_id=27,
        driver_name="Nico Hülkenberg",
        speed_kmh=224.0,
        steering_deg=-12.0,
        lateral_g=3.85,
        throttle_pct=100.0,
        brake_pct=0.0,
        gear=5,
        rpm=11400
    )

    conf = ConfidenceEngine.calculate_confidence(
        yolo_det_conf=0.96,
        tracking_consistency=0.95,
        margin_cm=-18.4,
        footprint=fp,
        consecutive_frames=5,
        telemetry=telem
    )

    assert conf.confidence_percentage >= 90.0
    assert conf.verdict == "HIGH CONFIDENCE"
    assert 0.0 <= conf.total_confidence <= 1.0


def test_strategy_simulation_engine():
    engine = StrategySimulationEngine()
    samples = [18.5, 17.2, 14.8, 12.1, 9.4, 4.2, 0.8, -5.2, -14.1]
    dist = engine.compute_margin_distribution("RBR-T9", "Jochen Rindt (Turn 9)", samples)

    assert dist.lap_count == len(samples)
    assert dist.violation_count == 2
    assert dist.risk_score_pct > 0.0

    # Test What-If with tyre degradation and line offset
    req = SimulationRequest(
        corner_id="RBR-T9",
        tyre_compound="Medium",
        tyre_age_laps=25,
        fuel_load_kg=70.0,
        track_temperature_c=42.0,
        weather_condition="Dry",
        driving_line_offset_cm=14.0
    )

    rec, details = engine.run_what_if_simulation(dist, req)
    assert rec.projected_risk_pct >= 0.0
    assert len(details["tradeoff_curve"]) > 0
    assert rec.recommendation_level in ("CRITICAL", "ADVISORY", "OPTIMAL")


def test_fastapi_endpoints():
    client = TestClient(app)

    # Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "online"

    # Corners
    res_corners = client.get("/api/corners")
    assert res_corners.status_code == 200
    assert len(res_corners.json()) >= 2

    # Incidents
    res_inc = client.get("/api/incidents")
    assert res_inc.status_code == 200
    incidents = res_inc.json()
    assert len(incidents) > 0

    # Adjudicate Incident
    first_inc_id = incidents[0]["incident_id"]
    res_adj = client.post(
        f"/api/incidents/{first_inc_id}/adjudicate",
        json={"action": "CONFIRM", "steward_name": "Test Steward", "notes": "Test ruling"}
    )
    assert res_adj.status_code == 200
    assert res_adj.json()["status"] == "CONFIRMED"
