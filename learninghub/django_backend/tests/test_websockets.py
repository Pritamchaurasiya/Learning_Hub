import pytest
import json
from channels.testing import WebsocketCommunicator
from learninghub_server.asgi import application

@pytest.mark.asyncio
async def test_live_collaboration_websocket():
    communicator = WebsocketCommunicator(application, '/ws/collab/room-dsa-101/')
    connected, _ = await communicator.connect()
    assert connected is True

    # Receive connection welcome message
    response = await communicator.receive_json_from()
    assert response['type'] == 'connection_established'
    assert response['room_id'] == 'room-dsa-101'

    # Send code change message
    await communicator.send_json_to({
        'action': 'code_change',
        'payload': {'code': 'def solve(): return True', 'cursor': {'line': 1, 'ch': 5}}
    })

    response2 = await communicator.receive_json_from()
    assert response2['type'] == 'code_change'
    assert response2['payload']['code'] == 'def solve(): return True'

    await communicator.disconnect()

@pytest.mark.asyncio
async def test_webrtc_signaling_websocket():
    # Peer 1 connects
    peer1 = WebsocketCommunicator(application, '/ws/webrtc/live-mentorship-1/')
    connected1, _ = await peer1.connect()
    assert connected1 is True

    # Peer 2 connects
    peer2 = WebsocketCommunicator(application, '/ws/webrtc/live-mentorship-1/')
    connected2, _ = await peer2.connect()
    assert connected2 is True

    # Peer 1 should receive peer_joined notification from Peer 2
    msg = await peer1.receive_json_from()
    assert msg['type'] == 'peer_joined'

    # Peer 1 sends SDP offer
    await peer1.send_json_to({
        'type': 'sdp_offer',
        'payload': {'sdp': 'v=0\r\no=peer1 12345 12345 IN IP4 0.0.0.0...'}
    })

    # Peer 2 receives the SDP offer
    offer_msg = await peer2.receive_json_from()
    assert offer_msg['type'] == 'sdp_offer'
    assert 'sdp' in offer_msg['payload']

    await peer1.disconnect()
    await peer2.disconnect()

@pytest.mark.asyncio
async def test_exam_monitoring_websocket():
    communicator = WebsocketCommunicator(application, '/ws/exam/att-unit-test-123/')
    connected, _ = await communicator.connect()
    assert connected is True

    init_msg = await communicator.receive_json_from()
    assert init_msg['type'] == 'proctor_session_active'
    assert init_msg['attempt_id'] == 'att-unit-test-123'

    # Send heartbeat
    await communicator.send_json_to({
        'event': 'heartbeat',
        'time_remaining_sec': 1800
    })

    ack_msg = await communicator.receive_json_from()
    assert ack_msg['type'] == 'heartbeat_ack'
    assert ack_msg['status'] == 'VALID'

    await communicator.disconnect()

@pytest.mark.asyncio
async def test_notification_websocket():
    communicator = WebsocketCommunicator(application, '/ws/notifications/')
    connected, _ = await communicator.connect()
    assert connected is True

    init_msg = await communicator.receive_json_from()
    assert init_msg['type'] == 'notifications_connected'

    await communicator.disconnect()
