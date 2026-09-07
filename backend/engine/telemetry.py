"""
Telemetry Stream & Synchronization Engine for TrackShift 2026
"""
from typing import List, Dict, Any, Optional
import math
import random
from models import TelemetryPoint


class TelemetryEngine:
    def __init__(self):
        pass

    @staticmethod
    def generate_corner_telemetry_frame(
        timestamp_sec: float,
        progress_ratio: float,  # 0.0 (entry) -> 0.5 (apex) -> 1.0 (exit)
        vehicle_id: int = 27,
        driver_name: str = "Nico Hülkenberg",
        corner_id: str = "RBR-T9",
        lap: int = 18,
        drift_wide: bool = False
    ) -> TelemetryPoint:
        """
        Generates realistic high-precision F1 telemetry snapshot for corner traversal.
        """
        # Entry (0.0): high speed ~260 km/h, braking, gearing down from 7 to 5
        # Apex (0.5): lowest speed ~216 km/h, peak lateral G ~4.2G, high steering angle
        # Exit (1.0): throttle 100%, accelerating to 245 km/h, lateral G decreasing, steering centering
        if progress_ratio < 0.35:
            # Entry / braking phase
            t = progress_ratio / 0.35
            speed = 265.0 - t * 45.0 + random.uniform(-1.0, 1.0)
            lat_g = 1.2 + t * 2.6
            steer = -2.0 - t * 13.0
            throttle = max(0.0, 100.0 - t * 90.0)
            brake = min(100.0, t * 65.0)
            gear = 6 if progress_ratio < 0.18 else 5
            rpm = int(11200 - t * 1800)
        elif progress_ratio <= 0.65:
            # Apex phase
            t = (progress_ratio - 0.35) / 0.30
            speed = 216.0 + t * 12.0 + random.uniform(-0.8, 0.8)
            lat_g = 3.9 + math.sin(t * math.pi) * 0.4
            steer = -15.5 + t * 4.0
            throttle = 25.0 + t * 55.0
            brake = 0.0
            gear = 5
            rpm = int(10400 + t * 1200)
        else:
            # Exit phase
            t = (progress_ratio - 0.65) / 0.35
            speed = 228.0 + t * 24.0 + random.uniform(-1.0, 1.0)
            lat_g = max(1.0, 3.8 - t * 2.4)
            steer = -11.5 + t * 10.0
            throttle = 100.0
            brake = 0.0
            gear = 5 if t < 0.5 else 6
            rpm = int(11600 + t * 1100)

        # If vehicle drifts wide beyond limits in exit phase
        if drift_wide and progress_ratio >= 0.6:
            lat_g = min(4.4, lat_g + 0.3)
            throttle = 100.0  # Full power causing understeer runout

        return TelemetryPoint(
            timestamp_sec=round(timestamp_sec, 3),
            vehicle_id=vehicle_id,
            driver_name=driver_name,
            speed_kmh=round(speed, 1),
            steering_deg=round(steer, 1),
            lateral_g=round(lat_g, 2),
            throttle_pct=round(throttle, 1),
            brake_pct=round(brake, 1),
            gear=gear,
            rpm=rpm,
            tyre_wear_pct=round(lap * 3.2, 1),
            fuel_load_kg=round(max(15.0, 105.0 - lap * 2.2), 1),
            lap=lap,
            sector=3,
            corner_id=corner_id
        )
