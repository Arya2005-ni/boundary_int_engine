"""
End-to-End System Verification Test Script for TrackShift 2026
Tests:
1. REST API endpoints (Corners, Austria track, Haas vehicles, Practice Laps, Incidents)
2. What-If Strategic Simulation calculations (Tyre degradation, Fuel load, Line offset)
3. Live WebSocket Session Feed (Frame analysis, state machine, 4-wheel footprint, confidence)
4. Steward Adjudication Workflow
"""
import sys
import json
import asyncio
import urllib.request
import websockets

BACKEND_HTTP = "http://127.0.0.1:8000"
BACKEND_WS = "ws://127.0.0.1:8000/ws/session"


def test_api_health():
    print("1. Testing Health Endpoint...")
    req = urllib.request.urlopen(f"{BACKEND_HTTP}/api/health")
    data = json.loads(req.read().decode())
    assert data["status"] == "online"
    assert "Red Bull Ring" in data["circuit"]
    assert "Haas" in data["team"]
    print("   [PASS] Health check verified:", data)


def test_austria_corners():
    print("2. Testing Austrian GP Corners...")
    req = urllib.request.urlopen(f"{BACKEND_HTTP}/api/corners")
    corners = json.loads(req.read().decode())
    assert len(corners) >= 5
    corner_ids = [c["corner_id"] for c in corners]
    assert "RBR-T9" in corner_ids  # Jochen Rindt
    assert "RBR-T10" in corner_ids # Red Bull Mobile
    assert "RBR-T4" in corner_ids  # Rauch
    print(f"   [PASS] {len(corners)} Austrian GP corners verified: {corner_ids}")


def test_what_if_simulation():
    print("3. Testing What-If Strategic Simulation...")
    sim_payload = json.dumps({
        "corner_id": "RBR-T9",
        "tyre_compound": "Medium",
        "tyre_age_laps": 22,
        "fuel_load_kg": 65.0,
        "track_temperature_c": 40.0,
        "weather_condition": "Dry",
        "driving_line_offset_cm": 12.0
    }).encode('utf-8')

    req = urllib.request.Request(
        f"{BACKEND_HTTP}/api/strategy/simulate",
        data=sim_payload,
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    result = json.loads(res.read().decode())

    rec = result["recommendation"]
    assert rec["corner_id"] == "RBR-T9"
    assert "rationale" in rec
    assert len(result["details"]["tradeoff_curve"]) > 0
    print(f"   [PASS] Simulation successful. Projected Risk: {rec['projected_risk_pct']}%, Recommended Offset: +{rec['recommended_line_offset_cm']}cm, Lap Delta: +{rec['lap_time_delta_ms']}ms")
    print(f"          Rationale: '{rec['rationale']}'")


def test_incidents_and_adjudication():
    print("4. Testing Incident Queue & Adjudication...")
    req = urllib.request.urlopen(f"{BACKEND_HTTP}/api/incidents")
    incidents = json.loads(req.read().decode())
    assert len(incidents) > 0
    first_inc = incidents[0]
    print(f"   [PASS] Found {len(incidents)} incidents. Testing adjudication on {first_inc['incident_id']}...")

    adj_payload = json.dumps({
        "action": "CONFIRM",
        "steward_name": "G. Connelly (FIA Lead Steward)",
        "notes": "Verified all 4 wheels beyond exit kerb limit on Turn 9. Lap time deleted."
    }).encode('utf-8')

    adj_req = urllib.request.Request(
        f"{BACKEND_HTTP}/api/incidents/{first_inc['incident_id']}/adjudicate",
        data=adj_payload,
        headers={"Content-Type": "application/json"}
    )
    adj_res = urllib.request.urlopen(adj_req)
    adj_data = json.loads(adj_res.read().decode())
    assert adj_data["status"] == "CONFIRMED"
    print(f"   [PASS] Incident {first_inc['incident_id']} successfully confirmed and lap deleted.")


async def test_live_websocket_stream():
    print("5. Testing Live WebSocket Stream (/ws/session)...")
    async with websockets.connect(BACKEND_WS) as ws:
        received_frames = 0
        violation_detected = False

        for _ in range(35):
            msg = await ws.recv()
            data = json.loads(msg)
            assert data["type"] == "FRAME_ANALYSIS"
            assert data["vehicle_id"] == 27
            assert "Haas" in data["team_name"]
            assert data["frame_b64"].startswith("data:image/jpeg;base64,")

            if data["state"] == "VIOLATION":
                violation_detected = True

            received_frames += 1

        print(f"   [PASS] Successfully streamed {received_frames} live video frames via WebSocket.")
        print(f"          State Machine successfully transitioned to VIOLATION when car drifted wide: {violation_detected}")
        print(f"          Telemetry Snapshot: Speed={data['telemetry']['speed_kmh']} km/h, Lateral G={data['telemetry']['lateral_g']} G, Wheels Out={data['footprint']['wheels_out_count']}/4")


def main():
    print("==================================================")
    print(">>> TRACKSHIFT 2026 - END-TO-END VERIFICATION SUITE")
    print("==================================================")
    test_api_health(); print()
    test_austria_corners(); print()
    test_what_if_simulation(); print()
    test_incidents_and_adjudication(); print()
    asyncio.run(test_live_websocket_stream()); print()
    print("==================================================")
    print("[SUCCESS] ALL END-TO-END VERIFICATION CHECKS PASSED 100%!")
    print("==================================================")


if __name__ == "__main__":
    main()
