# 🏎️ TrackShift 2026 — Boundary Intelligence Engine (BIE)
> **Pre-Race Strategic Risk Mapping & Spatial Compliance Intelligence for Motorsport**  
> *"Don’t tell stewards a violation happened. Tell race engineers, before the race, which corners are likely to produce violations — and what it costs in lap time to stay safely inside the limit."*

---

## 🌟 Key Innovations & Architecture

TrackShift 2026 transcends traditional reactive refereeing by fusing **Computer Vision**, **High-Frequency Telemetry**, **Geometric Spatial Containment**, and **Predictive Race-Condition Simulation**:

```text
Practice Session Video + Telemetry
                ↓
    YOLO Vehicle Detection (30%)
                ↓
    ByteTrack Spatial Tracking (20%)
                ↓
    Track Boundary Geometry Engine (25%)
    (4-Wheel Contact Footprint vs Legal Surface)
                ↓
    State Machine (SAFE → BORDERLINE → VIOLATION → RECOVERED)
                ↓
    Temporal Verification (15%) + Telemetry Fusion (10%)
                ↓
      ┌───────────────────────────┴───────────────────────────┐
      ↓                                                       ↓
STRATEGIC INTELLIGENCE (Race Engineer)           STEWARD LIVE VISION (FIA Adjudication)
- Practice margin distribution per corner        - Real-time frame & boundary overlay stream
- What-If Simulation (Tyre, Fuel, Weather)      - Multi-factor explainable confidence meter
- Risk vs. Lap-Time Trade-off curves             - Human-in-the-Loop Confirm / Dismiss dossier
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Computer Vision** | OpenCV, YOLO, ByteTrack Spatial Tracking, Shapely Geometric Polygons |
| **Backend & APIs** | FastAPI, WebSockets, Python 3.11, Pydantic v2, NumPy, SciPy, SQLite |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, HTML5 Canvas |
| **Design System** | Haas F1 Dark/Carbon aesthetic (`#E10600`, `#00E5FF`, `#FFB800`, `#00E676`) |

---

## 🚀 Quick Start Guide

### 1. Start the Backend API & WebSocket Server
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`
- WebSocket Feed: `ws://localhost:8000/ws/session`

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Automated Test Suite
```bash
cd backend
python -m pytest tests/
```

---

## 📊 Modules & Capabilities

### 1. 📈 Strategic Risk & Simulation Layer
- **Practice Session Margin Distribution**: Analyzes lap data for Turn 9 (Jochen Rindt), Turn 4 (Rauch), and Copse to compute mean margin, std deviation, P10, and baseline risk.
- **Race-Day What-If Simulator**: Interactive sliders for Tyre Compound (Soft/Medium/Hard), Stint Age (1-45 laps), Fuel Load (10-110 kg), Track Temp, and Weather Grip.
- **Risk vs. Lap-Time Optimization**: Computes exact delta (e.g. `+14cm wider line reduces risk to 8.2% at +0.058s lap-time cost`).

### 2. 🛡️ Steward Live Vision & Incident Review
- Real-time video player with canvas overlays (calibrated track limits, bounding box, 4 wheel contact patches).
- **Spatial State Machine**: Transitions smoothly across `SAFE` ➔ `BORDERLINE` ➔ `VIOLATION` ➔ `RECOVERED`.
- **Explainable 5-Factor Confidence Score**: Detailed breakdown of visual and physical evidence.
- **Human-in-the-Loop Adjudication**: One-click FIA ruling with steward regulatory notes.

### 3. 📐 Interactive Track Calibration Tool
- Canvas polygon editor for engineers and stewards to customize corner track limits, kerb boundaries, and apex reference points.
