"""
Database Manager and Seed Initializer for TrackShift 2026 (SQLite)
Enhanced with complete F1 Austrian Grand Prix (Red Bull Ring, Spielberg) Track Limits Dataset
"""
import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "trackshift.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Drop existing tables to refresh with full Austria Red Bull Ring data
    cursor.execute("DROP TABLE IF EXISTS corners")
    cursor.execute("DROP TABLE IF EXISTS vehicles")
    cursor.execute("DROP TABLE IF EXISTS practice_laps")
    cursor.execute("DROP TABLE IF EXISTS incidents")
    cursor.execute("DROP TABLE IF EXISTS simulations")

    # Tracks & Corners Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS corners (
        corner_id TEXT PRIMARY KEY,
        track_id TEXT NOT NULL,
        track_name TEXT NOT NULL,
        corner_name TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        speed_category TEXT NOT NULL, -- High, Medium, Low
        danger_threshold_cm REAL DEFAULT 15.0,
        calibration_json TEXT NOT NULL
    )
    """)

    # Vehicles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        vehicle_id INTEGER PRIMARY KEY,
        car_number INTEGER NOT NULL,
        driver_name TEXT NOT NULL,
        team_name TEXT NOT NULL,
        color_hex TEXT NOT NULL
    )
    """)

    # Practice Lap Telemetry & Margin Stats Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS practice_laps (
        lap_id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        corner_id TEXT NOT NULL,
        lap_number INTEGER NOT NULL,
        entry_speed_kmh REAL NOT NULL,
        apex_speed_kmh REAL NOT NULL,
        exit_speed_kmh REAL NOT NULL,
        min_margin_cm REAL NOT NULL,
        lateral_g REAL NOT NULL,
        tyre_compound TEXT NOT NULL,
        tyre_age_laps INTEGER NOT NULL,
        fuel_kg REAL NOT NULL,
        status TEXT NOT NULL, -- SAFE, BORDERLINE, VIOLATION
        confidence_score REAL NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # Incidents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        incident_id TEXT PRIMARY KEY,
        timestamp_str TEXT NOT NULL,
        timestamp_sec REAL NOT NULL,
        vehicle_id INTEGER NOT NULL,
        corner_id TEXT NOT NULL,
        lap INTEGER NOT NULL,
        violation_type TEXT NOT NULL,
        side TEXT NOT NULL,
        wheels_out INTEGER NOT NULL,
        min_margin_cm REAL NOT NULL,
        consecutive_frames INTEGER NOT NULL,
        confidence_json TEXT NOT NULL,
        status TEXT NOT NULL, -- PENDING_REVIEW, UNDER_REVIEW, CONFIRMED, DISMISSED
        steward_notes TEXT,
        reviewed_by TEXT,
        review_timestamp TEXT,
        telemetry_json TEXT
    )
    """)

    # Simulations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS simulations (
        sim_id TEXT PRIMARY KEY,
        corner_id TEXT NOT NULL,
        vehicle_id INTEGER NOT NULL,
        params_json TEXT NOT NULL,
        results_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()


def seed_initial_data(conn: sqlite3.Connection):
    cursor = conn.cursor()

    # 1. Seed Austrian Grand Prix (Red Bull Ring, Spielberg) Corners
    # Austria is world-famous for Turn 9 & Turn 10 track limits
    austria_corners_data = [
        {
            "corner_id": "RBR-T9",
            "track_id": "RBR",
            "track_name": "Red Bull Ring (Spielberg, Austria)",
            "corner_name": "Jochen Rindt (Turn 9)",
            "turn_number": 9,
            "speed_category": "High (235 km/h)",
            "danger_threshold_cm": 15.0,
            "calibration": {
                "track_id": "RBR",
                "corner_id": "RBR-T9",
                "corner_name": "Jochen Rindt (Turn 9)",
                "legal_polygon": [
                    [120, 560],
                    [320, 480],
                    [580, 410],
                    [840, 360],
                    [1140, 320],
                    [1220, 410],
                    [960, 470],
                    [690, 540],
                    [390, 620],
                    [140, 710]
                ],
                "kerb_polygon": [
                    [580, 395],
                    [840, 345],
                    [1140, 305],
                    [1140, 320],
                    [840, 360],
                    [580, 410]
                ],
                "runoff_polygon": [
                    [580, 350],
                    [840, 290],
                    [1180, 250],
                    [1140, 305],
                    [580, 395]
                ],
                "apex_point": [760, 385],
                "racing_line": [
                    [160, 660],
                    [420, 540],
                    [740, 420],
                    [990, 400],
                    [1200, 360]
                ],
                "danger_zone_distance_cm": 15.0,
                "image_width": 1280,
                "image_height": 720
            }
        },
        {
            "corner_id": "RBR-T10",
            "track_id": "RBR",
            "track_name": "Red Bull Ring (Spielberg, Austria)",
            "corner_name": "Red Bull Mobile (Turn 10)",
            "turn_number": 10,
            "speed_category": "High Speed Exit (248 km/h)",
            "danger_threshold_cm": 14.0,
            "calibration": {
                "track_id": "RBR",
                "corner_id": "RBR-T10",
                "corner_name": "Red Bull Mobile (Turn 10)",
                "legal_polygon": [
                    [150, 580],
                    [360, 490],
                    [620, 420],
                    [890, 370],
                    [1180, 330],
                    [1240, 420],
                    [980, 480],
                    [710, 550],
                    [410, 630],
                    [160, 720]
                ],
                "kerb_polygon": [
                    [620, 405],
                    [890, 355],
                    [1180, 315],
                    [1180, 330],
                    [890, 370],
                    [620, 420]
                ],
                "runoff_polygon": [
                    [620, 360],
                    [890, 300],
                    [1200, 260],
                    [1180, 315],
                    [620, 405]
                ],
                "apex_point": [780, 395],
                "danger_zone_distance_cm": 14.0,
                "image_width": 1280,
                "image_height": 720
            }
        },
        {
            "corner_id": "RBR-T4",
            "track_id": "RBR",
            "track_name": "Red Bull Ring (Spielberg, Austria)",
            "corner_name": "Rauch Corner (Turn 4)",
            "turn_number": 4,
            "speed_category": "Downhill Heavy Braking (140 km/h)",
            "danger_threshold_cm": 18.0,
            "calibration": {
                "track_id": "RBR",
                "corner_id": "RBR-T4",
                "corner_name": "Rauch Corner (Turn 4)",
                "legal_polygon": [
                    [180, 620],
                    [440, 490],
                    [720, 410],
                    [1020, 350],
                    [1200, 390],
                    [980, 460],
                    [680, 540],
                    [400, 630],
                    [200, 710]
                ],
                "kerb_polygon": [
                    [720, 395],
                    [1020, 335],
                    [1020, 350],
                    [720, 410]
                ],
                "runoff_polygon": [
                    [720, 340],
                    [1020, 280],
                    [1020, 335],
                    [720, 395]
                ],
                "apex_point": [840, 390],
                "danger_zone_distance_cm": 18.0,
                "image_width": 1280,
                "image_height": 720
            }
        },
        {
            "corner_id": "RBR-T1",
            "track_id": "RBR",
            "track_name": "Red Bull Ring (Spielberg, Austria)",
            "corner_name": "Niki Lauda Kurve (Turn 1)",
            "turn_number": 1,
            "speed_category": "Uphill Medium-Speed (155 km/h)",
            "danger_threshold_cm": 16.0,
            "calibration": {
                "track_id": "RBR",
                "corner_id": "RBR-T1",
                "corner_name": "Niki Lauda Kurve (Turn 1)",
                "legal_polygon": [
                    [140, 600],
                    [380, 480],
                    [660, 400],
                    [960, 345],
                    [1200, 310],
                    [1230, 400],
                    [970, 460],
                    [680, 530],
                    [390, 620],
                    [150, 710]
                ],
                "apex_point": [800, 380],
                "danger_zone_distance_cm": 16.0,
                "image_width": 1280,
                "image_height": 720
            }
        },
        {
            "corner_id": "RBR-T6",
            "track_id": "RBR",
            "track_name": "Red Bull Ring (Spielberg, Austria)",
            "corner_name": "Gerhard Berger Kurve (Turn 6)",
            "turn_number": 6,
            "speed_category": "Fast Left Hand Sweep (210 km/h)",
            "danger_threshold_cm": 15.0,
            "calibration": {
                "track_id": "RBR",
                "corner_id": "RBR-T6",
                "corner_name": "Gerhard Berger Kurve (Turn 6)",
                "legal_polygon": [
                    [160, 590],
                    [400, 470],
                    [690, 390],
                    [990, 340],
                    [1210, 315],
                    [1240, 405],
                    [980, 465],
                    [700, 535],
                    [410, 625],
                    [170, 715]
                ],
                "apex_point": [810, 375],
                "danger_zone_distance_cm": 15.0,
                "image_width": 1280,
                "image_height": 720
            }
        }
    ]

    for c in austria_corners_data:
        cursor.execute(
            "INSERT INTO corners VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                c["corner_id"],
                c["track_id"],
                c["track_name"],
                c["corner_name"],
                c["turn_number"],
                c["speed_category"],
                c["danger_threshold_cm"],
                json.dumps(c["calibration"])
            )
        )

    # 2. Seed F1 Vehicles emphasizing MoneyGram Haas F1 Team (VF-24)
    vehicles_data = [
        (27, 27, "Nico Hülkenberg", "MoneyGram Haas F1 Team", "#E10600"),
        (20, 20, "Kevin Magnussen", "MoneyGram Haas F1 Team", "#E10600"),
        (1, 1, "Max Verstappen", "Red Bull Racing", "#1E41FF"),
        (16, 16, "Charles Leclerc", "Scuderia Ferrari", "#FF1801"),
        (44, 44, "Lewis Hamilton", "Mercedes-AMG Petronas", "#00D2BE"),
        (4, 4, "Lando Norris", "McLaren F1 Team", "#FF8700")
    ]
    cursor.executemany("INSERT INTO vehicles VALUES (?, ?, ?, ?, ?)", vehicles_data)

    # 3. Seed Practice Laps for Haas #27 & #20 on Austria RBR Corners (FP1 & FP2 telemetry)
    practice_laps = []
    import random
    random.seed(42)

    for corner in ["RBR-T9", "RBR-T10", "RBR-T4", "RBR-T6", "RBR-T1"]:
        base_apex = 222.0 if "T9" in corner or "T10" in corner else (142.0 if "T4" in corner else 198.0)
        base_lat_g = 4.1 if "T9" in corner or "T10" in corner else 3.2
        
        for lap in range(1, 26):
            tyre_wear = min(85.0, lap * 3.2)
            fuel_kg = max(20.0, 105.0 - lap * 2.2)
            
            apex_speed = base_apex + random.uniform(-3.5, 4.2)
            entry_speed = apex_speed + random.uniform(32.0, 42.0)
            exit_speed = apex_speed + random.uniform(18.0, 28.0)
            lateral_g = base_lat_g + random.uniform(-0.25, 0.35)

            # Turn 9 & Turn 10 have tighter exit margins in late stints
            margin_noise = random.gauss(0, 4.5)
            drift_factor = (lap / 25.0) * -18.0 if "T9" in corner or "T10" in corner else (lap / 25.0) * -10.0
            margin_cm = 18.5 + drift_factor + margin_noise

            if margin_cm > 12.0:
                status = "SAFE"
                conf = 0.96 + random.uniform(0.01, 0.03)
            elif margin_cm >= 0.0:
                status = "BORDERLINE"
                conf = 0.94 + random.uniform(0.01, 0.04)
            else:
                status = "VIOLATION"
                conf = 0.97 + random.uniform(0.01, 0.02)

            practice_laps.append((
                None,
                27,  # Haas #27
                corner,
                lap,
                round(entry_speed, 1),
                round(apex_speed, 1),
                round(exit_speed, 1),
                round(margin_cm, 2),
                round(lateral_g, 2),
                "Medium" if lap <= 18 else "Soft",
                lap,
                round(fuel_kg, 1),
                status,
                round(conf, 3),
                datetime.now().isoformat()
            ))

    cursor.executemany(
        """
        INSERT INTO practice_laps 
        (lap_id, vehicle_id, corner_id, lap_number, entry_speed_kmh, apex_speed_kmh, exit_speed_kmh, min_margin_cm, lateral_g, tyre_compound, tyre_age_laps, fuel_kg, status, confidence_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        practice_laps
    )

    # 4. Seed Historical Austrian GP Incidents for Haas and Rivals
    confidence_haas1 = {
        "detection": 0.985,
        "tracking": 0.978,
        "boundary_evidence": 0.992,
        "temporal_evidence": 0.965,
        "telemetry_evidence": 0.958,
        "total_confidence": 0.978,
        "confidence_percentage": 97.8,
        "verdict": "HIGH CONFIDENCE"
    }

    confidence_haas2 = {
        "detection": 0.964,
        "tracking": 0.952,
        "boundary_evidence": 0.971,
        "temporal_evidence": 0.930,
        "telemetry_evidence": 0.945,
        "total_confidence": 0.954,
        "confidence_percentage": 95.4,
        "verdict": "HIGH CONFIDENCE"
    }

    confidence_ferrari = {
        "detection": 0.970,
        "tracking": 0.960,
        "boundary_evidence": 0.940,
        "temporal_evidence": 0.920,
        "telemetry_evidence": 0.910,
        "total_confidence": 0.943,
        "confidence_percentage": 94.3,
        "verdict": "HIGH CONFIDENCE"
    }

    incidents_data = [
        (
            "INC-AUT-001",
            "00:32:17.420",
            1937.42,
            27,  # Haas #27
            "RBR-T9",
            18,
            "Track Limit Excursion",
            "Exit Left",
            4,
            -18.4,
            7,
            json.dumps(confidence_haas1),
            "PENDING_REVIEW",
            "MoneyGram Haas VF-24 #27 exceeded track limits at exit of Jochen Rindt (Turn 9) on Lap 18. All 4 wheels fully beyond outer white boundary line onto exit kerb.",
            None,
            None,
            json.dumps([
                {"time": 1937.0, "speed": 224.4, "lat_g": 4.12, "steer": -14.2, "throttle": 94.0, "brake": 0.0},
                {"time": 1937.2, "speed": 228.0, "lat_g": 3.98, "steer": -11.5, "throttle": 98.0, "brake": 0.0},
                {"time": 1937.4, "speed": 232.2, "lat_g": 3.81, "steer": -8.0, "throttle": 100.0, "brake": 0.0},
                {"time": 1937.6, "speed": 236.1, "lat_g": 3.52, "steer": -4.2, "throttle": 100.0, "brake": 0.0}
            ])
        ),
        (
            "INC-AUT-002",
            "00:48:12.180",
            2892.18,
            20,  # Haas #20
            "RBR-T10",
            27,
            "Track Limit Excursion",
            "Exit Left",
            4,
            -15.2,
            6,
            json.dumps(confidence_haas2),
            "CONFIRMED",
            "MoneyGram Haas VF-24 #20 exceeded track limits at final exit Turn 10. Lap time deleted under FIA Sporting Regulations Art 33.3.",
            "G. Connelly (FIA Lead Steward)",
            "2026-09-07T14:15:30Z",
            json.dumps([
                {"time": 2891.8, "speed": 238.1, "lat_g": 4.25, "steer": -16.2, "throttle": 90.0, "brake": 0.0},
                {"time": 2892.1, "speed": 244.5, "lat_g": 3.95, "steer": -10.0, "throttle": 100.0, "brake": 0.0}
            ])
        ),
        (
            "INC-AUT-003",
            "00:19:04.110",
            1144.11,
            16,  # Ferrari #16
            "RBR-T9",
            11,
            "Track Limit Excursion",
            "Exit Left",
            4,
            -12.8,
            5,
            json.dumps(confidence_ferrari),
            "CONFIRMED",
            "Lap time deleted under Article 33.3 of FIA Sporting Regulations.",
            "G. Connelly (FIA Lead Steward)",
            "2026-09-07T14:24:10Z",
            json.dumps([
                {"time": 1143.8, "speed": 222.1, "lat_g": 4.10, "steer": -15.1, "throttle": 88.0, "brake": 0.0},
                {"time": 1144.1, "speed": 226.5, "lat_g": 3.88, "steer": -10.2, "throttle": 100.0, "brake": 0.0}
            ])
        )
    ]

    cursor.executemany(
        """
        INSERT INTO incidents 
        (incident_id, timestamp_str, timestamp_sec, vehicle_id, corner_id, lap, violation_type, side, wheels_out, min_margin_cm, consecutive_frames, confidence_json, status, steward_notes, reviewed_by, review_timestamp, telemetry_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        incidents_data
    )

    conn.commit()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully with Austria Red Bull Ring data at:", DB_PATH)
