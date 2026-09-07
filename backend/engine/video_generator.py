"""
High-Fidelity Realistic Race Video & Frame Sequence Generator for TrackShift 2026
Features:
- Official F1 Austrian Grand Prix (Red Bull Ring - Spielberg, Austria) Track Layout
- MoneyGram Haas F1 Team (VF-24) Car Model with realistic livery, Halo, and Pirelli tyres
- Dynamic tire smoke, skid marks, trackside FIA digital light panels, and curb vibration
"""
import os
import math
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from engine.telemetry import TelemetryEngine
from models import TelemetryPoint

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "videos")
os.makedirs(OUTPUT_DIR, exist_ok=True)


class VideoGenerator:
    def __init__(self, width: int = 1280, height: int = 720, fps: int = 30):
        self.width = width
        self.height = height
        self.fps = fps

    def render_austria_track_background(self, corner_id: str = "RBR-T9") -> np.ndarray:
        """
        Renders the realistic Red Bull Ring (Austria) circuit environment:
        Styrian hills backdrop, asphalt with tire rubbering, Austrian red/white sawtooth kerbs,
        yellow sausage kerbs, green runoff, gravel trap, and FIA marshal light panel.
        """
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        # 1. Austrian Alpine Backdrop (Dark green hills & overcast mountain horizon)
        for y in range(0, 180):
            grad = y / 180.0
            # Mountain forest gradient
            b = int(25 + grad * 15)
            g = int(45 + grad * 20)
            r = int(20 + grad * 15)
            frame[y, :] = (b, g, r)

        # 2. Trackside Red Bull Ring Grandstand & Armco Barriers
        cv2.rectangle(frame, (0, 180), (self.width, 240), (70, 75, 80), -1)  # Armco metal barrier
        cv2.line(frame, (0, 195), (self.width, 195), (140, 145, 150), 2)
        cv2.line(frame, (0, 215), (self.width, 215), (140, 145, 150), 2)
        
        # Red Bull Ring Sponsor Banner on Barrier
        cv2.rectangle(frame, (100, 188), (340, 222), (20, 20, 140), -1)
        cv2.putText(frame, "RED BULL RING", (115, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)

        cv2.rectangle(frame, (700, 188), (960, 222), (200, 10, 10), -1)
        cv2.putText(frame, "SPIELBERG - AUSTRIA", (715, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA)

        # 3. Gravel Trap with realistic stippled pebble texture
        frame[240:, :] = (55, 65, 75)  # Base gravel tone
        # Add subtle noise for gravel texture
        np.random.seed(101)
        noise = np.random.randint(-12, 12, (self.height - 240, self.width, 3))
        frame[240:, :] = np.clip(frame[240:, :] + noise, 0, 255).astype(np.uint8)

        # 4. Green Astroturf / Runoff Beyond Track Limits
        runoff_poly = np.array([
            [520, 420],
            [820, 350],
            [1180, 290],
            [1260, 260],
            [1140, 310],
            [520, 420]
        ], dtype=np.int32)
        cv2.fillPoly(frame, [runoff_poly], (25, 95, 45))  # Vivid Austrian GP green runoff

        # 5. Main Asphalt Racing Surface (Dark textured asphalt)
        track_poly = np.array([
            [120, 560],
            [320, 480],
            [580, 410],
            [840, 360],
            [1140, 320],
            [1240, 390],
            [980, 470],
            [690, 540],
            [390, 620],
            [140, 710]
        ], dtype=np.int32)
        cv2.fillPoly(frame, [track_poly], (42, 45, 48))  # Dark asphalt

        # Rubbered-in Racing Line / Dark Tire Groove
        groove_line = np.array([
            [160, 650], [420, 540], [740, 425], [990, 400], [1200, 360]
        ], dtype=np.int32)
        cv2.polylines(frame, [groove_line], False, (28, 30, 32), 48, cv2.LINE_AA)

        # 6. Austrian Red & White Alternating Exit Kerbs (Turn 9 / Turn 10 Jochen Rindt)
        kerb_points = [
            (560, 415), (630, 395), (710, 375), (790, 355),
            (870, 340), (950, 328), (1040, 318), (1140, 308), (1220, 300)
        ]
        for i in range(len(kerb_points) - 1):
            p1 = kerb_points[i]
            p2 = kerb_points[i + 1]
            color = (255, 255, 255) if i % 2 == 0 else (20, 20, 225)  # Austrian Red & White
            cv2.line(frame, p1, p2, color, 16, cv2.LINE_AA)

        # Yellow Sausage Kerb (Deterrent kerb on outside)
        sausage_points = [
            (880, 325), (960, 315), (1050, 305), (1130, 298)
        ]
        for i in range(len(sausage_points) - 1):
            cv2.line(frame, sausage_points[i], sausage_points[i + 1], (0, 215, 255), 8, cv2.LINE_AA)

        # 7. Crisp White Track Limit Boundary Line (Outer & Inner)
        outer_line = np.array([
            [120, 560], [320, 480], [580, 410], [840, 360], [1140, 320]
        ], dtype=np.int32)
        cv2.polylines(frame, [outer_line], False, (255, 255, 255), 5, cv2.LINE_AA)

        inner_line = np.array([
            [140, 710], [390, 620], [690, 540], [980, 470], [1240, 390]
        ], dtype=np.int32)
        cv2.polylines(frame, [inner_line], False, (240, 240, 240), 5, cv2.LINE_AA)

        # 8. Inner Apex Kerb (Turn 9 Apex)
        apex_kerb = [(690, 540), (760, 515), (840, 495), (920, 480), (980, 470)]
        for i in range(len(apex_kerb) - 1):
            p1 = apex_kerb[i]
            p2 = apex_kerb[i + 1]
            color = (255, 255, 255) if i % 2 == 0 else (20, 20, 225)
            cv2.line(frame, p1, p2, color, 14, cv2.LINE_AA)

        # 9. FIA Digital Trackside Marshal Light Board
        # Positioned top-right overlooking Turn 9 exit
        cv2.rectangle(frame, (1080, 195), (1180, 245), (10, 10, 15), -1)
        cv2.rectangle(frame, (1080, 195), (1180, 245), (60, 60, 75), 2)
        # Green flag LED matrix by default
        cv2.circle(frame, (1130, 220), 14, (0, 230, 80), -1, cv2.LINE_AA)
        cv2.putText(frame, "FIA MP-9", (1085, 242), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (180, 180, 180), 1, cv2.LINE_AA)

        # Corner Label HUD
        # Corner Label HUD (Simulation Framing)
        cv2.putText(frame, "SIMULATED TRACK VIEW • TGR HAAS F1 TEAM (VF-26)", (30, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(frame, "SIMULATED — NOT RACE FOOTAGE • RED BULL RING (AUSTRIA 2026)", (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (0, 229, 255), 1, cv2.LINE_AA)

        return frame

    def draw_haas_f1_car(
        self,
        frame: np.ndarray,
        center_x: float,
        center_y: float,
        heading_rad: float,
        car_number: int = 31,
        driver_name: str = "E. OCON",
        is_excursion: bool = False
    ) -> Tuple[List[float], Dict[str, Tuple[float, float]]]:
        """
        Renders the TGR Haas F1 Team VF-26 with authentic matte black carbon chassis,
        white livery sidepod highlights, Haas red endplates, Halo structure, and Pirelli P-Zero tires.
        """
        car_len = 115.0
        car_w = 48.0

        cos_a = math.cos(heading_rad)
        sin_a = math.sin(heading_rad)

        def rotate_pt(dx, dy):
            rx = center_x + dx * cos_a - dy * sin_a
            ry = center_y + dx * sin_a + dy * cos_a
            return (rx, ry)

        # 4 Tyre Patches (FL, FR, RL, RR)
        fl_c = rotate_pt(car_len * 0.38, -car_w * 0.48)
        fr_c = rotate_pt(car_len * 0.38, car_w * 0.48)
        rl_c = rotate_pt(-car_len * 0.38, -car_w * 0.48)
        rr_c = rotate_pt(-car_len * 0.38, car_w * 0.48)

        # Tire Smoke / Skid Trail if in high lateral excursion
        if is_excursion:
            smoke_pts = [rl_c, rr_c]
            for sp in smoke_pts:
                cv2.circle(frame, (int(sp[0] - cos_a * 25), int(sp[1] - sin_a * 25)), 12, (180, 185, 190), -1, cv2.LINE_AA)
                cv2.circle(frame, (int(sp[0] - cos_a * 45), int(sp[1] - sin_a * 45)), 18, (150, 155, 160), -1, cv2.LINE_AA)

        # Draw Pirelli P-Zero Tyres (Black rubber with Pirelli Yellow Medium stripe)
        for pt in [fl_c, fr_c, rl_c, rr_c]:
            # Outer tyre tread
            cv2.circle(frame, (int(pt[0]), int(pt[1])), 9, (15, 15, 18), -1, cv2.LINE_AA)
            # Pirelli Yellow compound ring (Medium C3)
            cv2.circle(frame, (int(pt[0]), int(pt[1])), 8, (0, 200, 255), 2, cv2.LINE_AA)
            # Black wheel rim center
            cv2.circle(frame, (int(pt[0]), int(pt[1])), 4, (40, 40, 45), -1, cv2.LINE_AA)

        # Front Wing Assembly (TGR Haas White & Red)
        fl_wing = rotate_pt(car_len * 0.50, -car_w * 0.54)
        fr_wing = rotate_pt(car_len * 0.50, car_w * 0.54)
        nose_tip = rotate_pt(car_len * 0.54, 0)
        
        # Front wing main plane
        cv2.line(frame, (int(fl_wing[0]), int(fl_wing[1])), (int(fr_wing[0]), int(fr_wing[1])), (240, 240, 245), 5, cv2.LINE_AA)
        # Red Endplates
        cv2.circle(frame, (int(fl_wing[0]), int(fl_wing[1])), 4, (0, 0, 225), -1, cv2.LINE_AA)
        cv2.circle(frame, (int(fr_wing[0]), int(fr_wing[1])), 4, (0, 0, 225), -1, cv2.LINE_AA)

        # Main Chassis Body Shell (TGR Haas Matte Carbon + White Highlights)
        rl_corner = rotate_pt(-car_len * 0.48, -car_w * 0.36)
        rr_corner = rotate_pt(-car_len * 0.48, car_w * 0.36)

        chassis_poly = np.array([
            nose_tip,
            rotate_pt(car_len * 0.28, -car_w * 0.24),
            rotate_pt(-car_len * 0.15, -car_w * 0.34),
            rl_corner,
            rr_corner,
            rotate_pt(-car_len * 0.15, car_w * 0.34),
            rotate_pt(car_len * 0.28, car_w * 0.24)
        ], dtype=np.int32)
        
        # Carbon Black Body
        cv2.fillPoly(frame, [chassis_poly], (20, 20, 24))
        # Haas Red Trim Outline
        cv2.polylines(frame, [chassis_poly], True, (0, 0, 225), 2, cv2.LINE_AA)

        # White Engine Cover / Sidepod Highlight
        sidepod_white = np.array([
            rotate_pt(car_len * 0.15, -car_w * 0.18),
            rotate_pt(-car_len * 0.20, -car_w * 0.28),
            rotate_pt(-car_len * 0.20, car_w * 0.28),
            rotate_pt(car_len * 0.15, car_w * 0.18)
        ], dtype=np.int32)
        cv2.fillPoly(frame, [sidepod_white], (245, 245, 250))

        # Cockpit, Halo & Driver Helmet
        cockpit_c = rotate_pt(car_len * 0.08, 0)
        # Black cockpit opening
        cv2.circle(frame, (int(cockpit_c[0]), int(cockpit_c[1])), 8, (10, 10, 12), -1, cv2.LINE_AA)
        # Driver Helmet (Esteban Ocon red/blue / Ollie Bearman red/yellow)
        helmet_color = (255, 100, 0) if car_number == 31 else (0, 200, 255)
        cv2.circle(frame, (int(cockpit_c[0] - cos_a * 2), int(cockpit_c[1] - sin_a * 2)), 5, helmet_color, -1, cv2.LINE_AA)
        # Titanium Halo structure
        halo_front = rotate_pt(car_len * 0.16, 0)
        cv2.line(frame, (int(halo_front[0]), int(halo_front[1])), (int(cockpit_c[0]), int(cockpit_c[1])), (0, 0, 225), 3, cv2.LINE_AA)

        # Rear Wing & DRS Flap (Haas Red)
        rear_l = rotate_pt(-car_len * 0.50, -car_w * 0.48)
        rear_r = rotate_pt(-car_len * 0.50, car_w * 0.48)
        cv2.line(frame, (int(rear_l[0]), int(rear_l[1])), (int(rear_r[0]), int(rear_r[1])), (0, 0, 225), 6, cv2.LINE_AA)
        cv2.line(frame, (int(rear_l[0]), int(rear_l[1])), (int(rear_r[0]), int(rear_r[1])), (250, 250, 250), 2, cv2.LINE_AA)

        # FIA Rear Rain / ERS LED Light (Blinking Red)
        rear_light = rotate_pt(-car_len * 0.52, 0)
        cv2.circle(frame, (int(rear_light[0]), int(rear_light[1])), 3, (0, 0, 255), -1, cv2.LINE_AA)

        # Driver Car Number (#31 or #87) on Nose
        num_pos = rotate_pt(car_len * 0.32, -4)
        cv2.putText(frame, str(car_number), (int(num_pos[0]), int(num_pos[1])), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

        # Bounding Box Computation
        all_x = [fl_c[0], fr_c[0], rl_c[0], rr_c[0], fl_wing[0], fr_wing[0], rear_l[0], rear_r[0]]
        all_y = [fl_c[1], fr_c[1], rl_c[1], rr_c[1], fl_wing[1], fr_wing[1], rear_l[1], rear_r[1]]
        x1, y1 = max(0, min(all_x) - 4), max(0, min(all_y) - 4)
        x2, y2 = min(self.width, max(all_x) + 4), min(self.height, max(all_y) + 4)

        footprint_pts = {
            "fl": fl_c,
            "fr": fr_c,
            "rl": rl_c,
            "rr": rr_c
        }

        return [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)], footprint_pts

    def generate_austria_session_sequence(
        self,
        corner_id: str = "RBR-T9",
        num_frames: int = 90,
        incident_excursion: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Generates realistic frame-by-frame data of MoneyGram Haas #27 traversing Austria Turn 9 / Turn 10.
        """
        bg = self.render_austria_track_background(corner_id)
        frames_data = []

        # Waypoints calibrated for Austria Turn 9 (Jochen Rindt)
        if incident_excursion:
            # Trajectory pushes wide on exit onto and over Austrian exit kerb
            waypoints = [
                (180, 640),
                (380, 520),
                (600, 430),
                (760, 380),
                (920, 335),   # Apex exit pushing onto line
                (1040, 305),  # Beyond track boundary (4 wheels out)
                (1160, 295),  # Deep excursion on exit
                (1240, 340)   # Recovery
            ]
        else:
            # Safe racing line hugging apex and staying within white line
            waypoints = [
                (180, 640),
                (380, 540),
                (620, 450),
                (780, 410),
                (940, 380),
                (1060, 360),
                (1200, 345)
            ]

        t_arr = np.linspace(0, 1, num_frames)
        wp_x = [p[0] for p in waypoints]
        wp_y = [p[1] for p in waypoints]
        
        poly_order = min(4, len(waypoints) - 1)
        px = np.poly1d(np.polyfit(np.linspace(0, 1, len(waypoints)), wp_x, poly_order))
        py = np.poly1d(np.polyfit(np.linspace(0, 1, len(waypoints)), wp_y, poly_order))

        for idx in range(num_frames):
            t = t_arr[idx]
            cx = float(px(t))
            cy = float(py(t))

            # Heading calculation
            if idx < num_frames - 1:
                next_t = t_arr[idx + 1]
                dx = float(px(next_t)) - cx
                dy = float(py(next_t)) - cy
                heading = math.atan2(dy, dx)
            else:
                heading = math.atan2(cy - float(py(t_arr[idx - 1])), cx - float(px(t_arr[idx - 1])))

            # Render frame
            frame = bg.copy()
            is_outside = incident_excursion and (0.55 <= t <= 0.85)
            
            # If outside, light up FIA digital marshal light panel with track limits amber/yellow warning
            if is_outside:
                cv2.circle(frame, (1130, 220), 14, (0, 165, 255), -1, cv2.LINE_AA)  # Amber warning
                cv2.putText(frame, "TRACK LIMIT VIOLATION", (980, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 2, cv2.LINE_AA)

            bbox, wheel_pts = self.draw_haas_f1_car(
                frame, 
                cx, 
                cy, 
                heading, 
                car_number=27, 
                driver_name="N. HÜLKENBERG",
                is_excursion=is_outside
            )

            # Telemetry snapshot for this frame
            timestamp_sec = 1935.0 + (idx / float(self.fps))
            telem = TelemetryEngine.generate_corner_telemetry_frame(
                timestamp_sec=timestamp_sec,
                progress_ratio=t,
                vehicle_id=27,
                driver_name="Nico Hülkenberg",
                corner_id=corner_id,
                lap=18,
                drift_wide=incident_excursion
            )

            # Encode frame as JPEG for streaming
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            jpeg_bytes = buffer.tobytes()

            frames_data.append({
                "frame_index": idx,
                "timestamp_sec": round(timestamp_sec, 3),
                "bbox": bbox,
                "center": [round(cx, 1), round(cy, 1)],
                "heading_deg": round(math.degrees(heading), 1),
                "wheel_pts": {k: [round(v[0], 1), round(v[1], 1)] for k, v in wheel_pts.items()},
                "telemetry": telem.model_dump(),
                "jpeg_bytes": jpeg_bytes
            })

        return frames_data


if __name__ == "__main__":
    gen = VideoGenerator()
    frames = gen.generate_austria_session_sequence(corner_id="RBR-T9", num_frames=90, incident_excursion=True)
    print(f"Generated {len(frames)} Austrian GP Haas VF-24 frames successfully.")
