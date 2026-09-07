"""
Spatial Geometry Engine & State Machine for TrackShift 2026
Implements:
- Vehicle 4-point wheel contact footprint calculation
- Point-in-polygon track boundary containment
- Real-world scaled margin-to-boundary distance (cm)
- F1 Track Limit State Machine: SAFE -> BORDERLINE -> VIOLATION -> RECOVERED
"""
import math
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import Point, Polygon, LineString
from models import TrackLimitState, WheelFootprint


class GeometryEngine:
    def __init__(self, legal_polygon_coords: List[List[float]], pixels_to_cm_scale: float = 0.5):
        """
        :param legal_polygon_coords: List of [x, y] points defining the legal racing surface
        :param pixels_to_cm_scale: Real-world scale factor (cm per pixel)
        """
        self.legal_polygon = Polygon(legal_polygon_coords)
        self.boundary_linestring = LineString(self.legal_polygon.exterior.coords)
        self.scale = pixels_to_cm_scale  # e.g., 1 pixel = 0.5 cm
        
        # State machine tracking per vehicle
        self.vehicle_states: Dict[int, TrackLimitState] = {}
        self.consecutive_outside_counts: Dict[int, int] = {}
        self.consecutive_inside_counts: Dict[int, int] = {}

    def update_boundary(self, legal_polygon_coords: List[List[float]]):
        self.legal_polygon = Polygon(legal_polygon_coords)
        self.boundary_linestring = LineString(self.legal_polygon.exterior.coords)

    def calculate_wheel_footprint(
        self,
        bbox: List[float],
        heading_angle_deg: Optional[float] = None
    ) -> WheelFootprint:
        """
        Calculates 4 contact patch points (FL, FR, RL, RR) based on vehicle bounding box [x1, y1, x2, y2].
        """
        x1, y1, x2, y2 = bbox
        w = x2 - x1
        h = y2 - y1

        # Standard contact patch offsets relative to bounding box
        # FL: top-left corner inset, FR: top-right corner inset, RL: bottom-left, RR: bottom-right
        fl = (x1 + w * 0.15, y1 + h * 0.20)
        fr = (x2 - w * 0.15, y1 + h * 0.20)
        rl = (x1 + w * 0.15, y2 - h * 0.15)
        rr = (x2 - w * 0.15, y2 - h * 0.15)

        fl_pt = Point(fl)
        fr_pt = Point(fr)
        rl_pt = Point(rl)
        rr_pt = Point(rr)

        fl_in = self.legal_polygon.contains(fl_pt)
        fr_in = self.legal_polygon.contains(fr_pt)
        rl_in = self.legal_polygon.contains(rl_pt)
        rr_in = self.legal_polygon.contains(rr_pt)

        wheels_out = 0
        if not fl_in:
            wheels_out += 1
        if not fr_in:
            wheels_out += 1
        if not rl_in:
            wheels_out += 1
        if not rr_in:
            wheels_out += 1

        return WheelFootprint(
            fl_inside=fl_in,
            fr_inside=fr_in,
            rl_inside=rl_in,
            rr_inside=rr_in,
            fl_coords=fl,
            fr_coords=fr,
            rl_coords=rl,
            rr_coords=rr,
            wheels_out_count=wheels_out
        )

    def calculate_margin_cm(self, footprint: WheelFootprint, bbox: List[float]) -> float:
        """
        Calculates signed margin to boundary in centimeters:
        Positive (+) = Inside legal boundary (Safe)
        Negative (-) = Outside legal boundary (Violation)
        """
        points = [
            Point(footprint.fl_coords),
            Point(footprint.fr_coords),
            Point(footprint.rl_coords),
            Point(footprint.rr_coords)
        ]

        # Check vehicle center point
        x1, y1, x2, y2 = bbox
        center_pt = Point((x1 + x2) / 2.0, (y1 + y2) / 2.0)

        # Distance from points to boundary
        distances = [self.boundary_linestring.distance(pt) for pt in points]
        min_dist_px = min(distances)

        # If any wheel is outside, the margin is negative
        if footprint.wheels_out_count > 0:
            # Measure how far the furthest outside wheel has crossed the line
            outside_distances = []
            if not footprint.fl_inside:
                outside_distances.append(self.boundary_linestring.distance(Point(footprint.fl_coords)))
            if not footprint.fr_inside:
                outside_distances.append(self.boundary_linestring.distance(Point(footprint.fr_coords)))
            if not footprint.rl_inside:
                outside_distances.append(self.boundary_linestring.distance(Point(footprint.rl_coords)))
            if not footprint.rr_inside:
                outside_distances.append(self.boundary_linestring.distance(Point(footprint.rr_coords)))
            
            furthest_outside_px = max(outside_distances) if outside_distances else min_dist_px
            return -round(furthest_outside_px * self.scale, 2)
        else:
            # All wheels are inside: distance is positive
            return round(min_dist_px * self.scale, 2)

    def evaluate_state_machine(
        self,
        vehicle_id: int,
        footprint: WheelFootprint,
        margin_cm: float,
        min_consecutive_violation_frames: int = 3
    ) -> Tuple[TrackLimitState, int]:
        """
        Processes temporal state transition for vehicle:
        SAFE -> BORDERLINE -> VIOLATION -> RECOVERED
        
        Returns:
            Tuple of (CurrentState, ConsecutiveFramesOutside)
        """
        current_state = self.vehicle_states.get(vehicle_id, TrackLimitState.SAFE)
        outside_count = self.consecutive_outside_counts.get(vehicle_id, 0)
        inside_count = self.consecutive_inside_counts.get(vehicle_id, 0)

        # Determine instantaneous condition
        is_outside = (footprint.wheels_out_count >= 3) or (margin_cm < 0.0)
        is_borderline = (footprint.wheels_out_count in (1, 2)) or (0.0 <= margin_cm <= 15.0)

        if is_outside:
            outside_count += 1
            inside_count = 0
        else:
            inside_count += 1
            outside_count = 0

        self.consecutive_outside_counts[vehicle_id] = outside_count
        self.consecutive_inside_counts[vehicle_id] = inside_count

        # Transition Rules
        new_state = current_state

        if current_state == TrackLimitState.SAFE:
            if is_outside and outside_count >= min_consecutive_violation_frames:
                new_state = TrackLimitState.VIOLATION
            elif is_borderline or (is_outside and outside_count < min_consecutive_violation_frames):
                new_state = TrackLimitState.BORDERLINE

        elif current_state == TrackLimitState.BORDERLINE:
            if is_outside and outside_count >= min_consecutive_violation_frames:
                new_state = TrackLimitState.VIOLATION
            elif not is_outside and not is_borderline and inside_count >= 2:
                new_state = TrackLimitState.SAFE

        elif current_state == TrackLimitState.VIOLATION:
            if not is_outside and inside_count >= 2:
                new_state = TrackLimitState.RECOVERED

        elif current_state == TrackLimitState.RECOVERED:
            if not is_outside and inside_count >= 4:
                new_state = TrackLimitState.SAFE
            elif is_outside and outside_count >= min_consecutive_violation_frames:
                new_state = TrackLimitState.VIOLATION
            elif is_borderline:
                new_state = TrackLimitState.BORDERLINE

        self.vehicle_states[vehicle_id] = new_state
        return new_state, outside_count
