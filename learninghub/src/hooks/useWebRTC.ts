import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import { useStore } from '../stores/useStore'

interface WebRTCUserJoinedData {
  socketId: string
}

interface WebRTCOfferData {
  sender: string
  offer: RTCSessionDescriptionInit
}

interface WebRTCAnswerData {
  sender: string
  answer: RTCSessionDescriptionInit
}

interface WebRTCCandidateData {
  sender: string
  candidate: RTCIceCandidateInit
}

interface WebRTCUserLeftData {
  socketId: string
}

export function useWebRTC(roomId: string | null) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const { on, emit } = useWebSocket()
  const auth = useStore(state => state.auth)

  // Initialize Media Stream
  useEffect(() => {
    let stream: MediaStream | null = null

    const initMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setLocalStream(stream)
      } catch (err) {
        console.error('Failed to get local stream', err)
      }
    }

    if (roomId) {
      void initMedia()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [roomId])

  const createPeer = useCallback(
    (targetSocketId: string, initiator: boolean) => {
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          // Note: Add production TURN credentials here for symmetric NATs
          {
            urls: 'turn:turn.learninghub.com:3478',
            username: 'webrtc-user',
            credential: 'webrtc-password',
          },
        ],
      })

      // Add local tracks to the peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peer.addTrack(track, localStream)
        })
      }

      peer.onicecandidate = event => {
        if (event.candidate) {
          emit('webrtc-ice-candidate', {
            target: targetSocketId,
            candidate: event.candidate,
            roomId,
          })
        }
      }

      peer.ontrack = event => {
        setRemoteStreams(prev => {
          const newMap = new Map(prev)
          newMap.set(targetSocketId, event.streams[0])
          return newMap
        })
      }

      peer.oniceconnectionstatechange = () => {
        if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed') {
          peer.close()
          peersRef.current.delete(targetSocketId)
          setRemoteStreams(prev => {
            const newMap = new Map(prev)
            newMap.delete(targetSocketId)
            return newMap
          })
        }
      }

      if (initiator) {
        void peer.createOffer().then(offer => {
          void peer.setLocalDescription(offer)
          emit('webrtc-offer', {
            target: targetSocketId,
            offer,
            roomId,
          })
        })
      }

      peersRef.current.set(targetSocketId, peer)
      return peer
    },
    [localStream, emit, roomId]
  )

  useEffect(() => {
    if (!roomId || !localStream) return

    // Clean up existing event listeners if this runs multiple times
    const unsubscribeFns: Array<() => void> = []

    const handleUserJoined = (data: WebRTCUserJoinedData) => {
      // Create a peer connection and send an offer to the new user
      if (data.socketId !== auth.user?.id) {
        createPeer(data.socketId, true)
      }
    }

    const handleOffer = async (data: WebRTCOfferData) => {
      const peer = peersRef.current.get(data.sender) ?? createPeer(data.sender, false)
      await peer.setRemoteDescription(new RTCSessionDescription(data.offer))
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      emit('webrtc-answer', {
        target: data.sender,
        answer,
        roomId,
      })
    }

    const handleAnswer = async (data: WebRTCAnswerData) => {
      const peer = peersRef.current.get(data.sender)
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(data.answer))
      }
    }

    const handleCandidate = async (data: WebRTCCandidateData) => {
      const peer = peersRef.current.get(data.sender)
      if (peer) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(data.candidate))
        } catch (e) {
          console.error('Error adding ICE candidate', e)
        }
      }
    }

    const handleUserLeft = (data: WebRTCUserLeftData) => {
      const peer = peersRef.current.get(data.socketId)
      if (peer) {
        peer.close()
        peersRef.current.delete(data.socketId)
      }
      setRemoteStreams(prev => {
        const newMap = new Map(prev)
        const remoteStream = newMap.get(data.socketId)
        if (remoteStream) {
          remoteStream.getTracks().forEach(track => track.stop())
        }
        newMap.delete(data.socketId)
        return newMap
      })
    }

    unsubscribeFns.push(on('user-joined', handleUserJoined))
    unsubscribeFns.push(on('webrtc-offer', handleOffer))
    unsubscribeFns.push(on('webrtc-answer', handleAnswer))
    unsubscribeFns.push(on('webrtc-ice-candidate', handleCandidate))
    unsubscribeFns.push(on('user-left', handleUserLeft))

    return () => {
      unsubscribeFns.forEach(fn => fn())
    }
  }, [roomId, localStream, createPeer, auth.user?.id, on, emit])

  // Toggle methods
  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled
      })
      setIsAudioEnabled(!isAudioEnabled)
    }
  }, [localStream, isAudioEnabled])

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled
      })
      setIsVideoEnabled(!isVideoEnabled)
    }
  }, [localStream, isVideoEnabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peersRef.current.forEach(peer => peer.close())
      peersRef.current.clear()
      setRemoteStreams(prev => {
        prev.forEach(stream => stream.getTracks().forEach(track => track.stop()))
        return new Map()
      })
    }
  }, [])

  return {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
  }
}
