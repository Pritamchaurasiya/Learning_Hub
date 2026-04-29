import asyncio
import websockets
import json
import ssl

async def test_websocket_connection(uri, name):
    print(f"Testing {name} at {uri}...")
    try:
        # Bypass SSL verification for local dev if needed, or use ws:// logic
        # Assuming ws:// for local
        async with websockets.connect(uri) as websocket:
            print(f"✅ Connected to {name}")
            
            # Send a ping or init message if expected (Protocols vary, but connection is key here)
            # Just holding connection for a moment
            await asyncio.sleep(0.5)
            
            # Close
            await websocket.close()
            print(f"✅ Closed {name}")
            return True
    except Exception as e:
        print(f"❌ Failed to connect to {name}: {e}")
        return False

async def main():
    base_url = "ws://127.0.0.1:8000"
    
    endpoints = [
        # ("/ws/notifications/", "Notifications"), # Requires auth usually
        ("/ws/ai/assist/", "AI Hint"),
        ("/ws/progress/", "Learning Progress"),
        ("/ws/social/", "Social Gamification Feed"),
        # Room/ID specific
        ("/ws/chat/test_room_1/", "Chat Room"),
        ("/ws/live/test_session_1/", "Live Session"),
    ]
    
    print("--- Starting WebSocket Verification ---")
    results = []
    for path, name in endpoints:
        uri = f"{base_url}{path}"
        success = await test_websocket_connection(uri, name)
        results.append((name, success))
        
    print("\n--- Summary ---")
    all_pass = True
    for name, success in results:
        status = "PASS" if success else "FAIL"
        print(f"{name}: {status}")
        if not success:
            all_pass = False
            
    if all_pass:
        print("\n✅ All WebSocket endpoints reachable (Unified Routing Working)")
    else:
        print("\n❌ Some endpoints failed connectivity check")

if __name__ == "__main__":
    asyncio.run(main())
