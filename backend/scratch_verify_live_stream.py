import asyncio
import json
import websockets
import sys

async def verify_stream():
    uri = "ws://127.0.0.1:8000/ws/session?vehicle_id=31&corner_id=RBR-T9"
    print(f"Connecting to WebSocket stream at {uri}...")
    
    async with websockets.connect(uri) as websocket:
        print("Connected successfully. Listening to frames...")
        
        frame_count = 0
        states_seen = set()
        violations_seen = 0
        primary_wheels_out_max = 0
        companion_wheels_out_max = 0
        
        while frame_count < 95:
            message = await websocket.recv()
            data = json.loads(message)
            
            f_idx = data.get("frame_index")
            state = data.get("state")
            margin = data.get("margin_to_boundary_cm")
            driver = data.get("driver_name")
            exact_coords = data.get("exact_coordinates", {})
            comp = data.get("companion_vehicle")
            
            states_seen.add(state)
            if state == "VIOLATION":
                violations_seen += 1
            
            prim_wo = exact_coords.get("wheels_out_count", 0)
            primary_wheels_out_max = max(primary_wheels_out_max, prim_wo)
            
            if comp:
                comp_wo = comp.get("exact_coordinates", {}).get("wheels_out_count", 0)
                companion_wheels_out_max = max(companion_wheels_out_max, comp_wo)
            
            if f_idx in [10, 35, 60, 62, 75, 88]:
                print(f"\n--- Frame #{f_idx} (Timestamp: {data.get('timestamp_str')}) ---")
                print(f"  [Primary Car] {driver}: State={state}, Margin={margin}cm, Wheels Out={prim_wo}/4")
                print(f"    Center: {exact_coords.get('center_px')}, Heading: {exact_coords.get('heading_deg')} deg")
                print(f"    FL: {exact_coords.get('fl', {}).get('coords')} (Inside={exact_coords.get('fl', {}).get('inside')})")
                print(f"    FR: {exact_coords.get('fr', {}).get('coords')} (Inside={exact_coords.get('fr', {}).get('inside')})")
                print(f"    RL: {exact_coords.get('rl', {}).get('coords')} (Inside={exact_coords.get('rl', {}).get('inside')})")
                print(f"    RR: {exact_coords.get('rr', {}).get('coords')} (Inside={exact_coords.get('rr', {}).get('inside')})")
                if comp:
                    comp_exact = comp.get("exact_coordinates", {})
                    print(f"  [Companion Car] {comp.get('driver_name')}: State={comp.get('state')}, Margin={comp.get('margin_to_boundary_cm')}cm, Wheels Out={comp_wo}/4")
                    print(f"    Center: {comp_exact.get('center_px')}, Heading: {comp_exact.get('heading_deg')} deg")
                    print(f"    FL: {comp_exact.get('fl', {}).get('coords')} (Inside={comp_exact.get('fl', {}).get('inside')})")
                    print(f"    FR: {comp_exact.get('fr', {}).get('coords')} (Inside={comp_exact.get('fr', {}).get('inside')})")
                    print(f"    RL: {comp_exact.get('rl', {}).get('coords')} (Inside={comp_exact.get('rl', {}).get('inside')})")
                    print(f"    RR: {comp_exact.get('rr', {}).get('coords')} (Inside={comp_exact.get('rr', {}).get('inside')})")

            frame_count += 1

        print("\n" + "="*60)
        print("VERIFICATION SUMMARY:")
        print(f"Total Frames Received: {frame_count}")
        print(f"States Observed: {sorted(list(states_seen))}")
        print(f"Violation Frames: {violations_seen}")
        print(f"Primary Car Max Wheels Out: {primary_wheels_out_max}/4")
        print(f"Companion Car Max Wheels Out: {companion_wheels_out_max}/4 (Expected: 0)")
        print("="*60)

        assert "SAFE" in states_seen, "Primary car did not have SAFE states"
        assert "VIOLATION" in states_seen, "Primary car did not reach VIOLATION state"
        assert companion_wheels_out_max == 0, f"Companion car exceeded legal track limits: {companion_wheels_out_max} wheels out"
        print("ALL PHYSICAL INTEGRITY & SPATIAL VERIFICATION CHECKS PASSED!")

if __name__ == "__main__":
    asyncio.run(verify_stream())
