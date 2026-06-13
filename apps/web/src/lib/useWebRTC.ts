import { useCallback, useEffect, useRef, useState } from 'react';
import {
  STUN_SERVERS,
  SocketClientEvents,
  SocketServerEvents,
  type WebrtcPeer,
  type WebrtcSignalServerPayload,
} from '@toastup/shared';
import { connectSocket } from './socket';

export interface RemotePeer {
  socketId: string;
  name: string;
  stream: MediaStream;
}

interface UseWebRTC {
  inCall: boolean;
  connecting: boolean;
  error: string | null;
  localStream: MediaStream | null;
  remotePeers: RemotePeer[];
  micOn: boolean;
  camOn: boolean;
  join: () => Promise<void>;
  leave: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: STUN_SERVERS }],
};

/** Mesh WebRTC video calls with Socket.IO signaling. Good for small rooms. */
export function useWebRTC(roomId: string, displayName: string): UseWebRTC {
  const [inCall, setInCall] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const namesRef = useRef<Map<string, string>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const updateRemote = useCallback((socketId: string, stream: MediaStream) => {
    setRemotePeers((prev) => {
      const name = namesRef.current.get(socketId) ?? 'Guest';
      const others = prev.filter((p) => p.socketId !== socketId);
      return [...others, { socketId, name, stream }];
    });
  }, []);

  const removeRemote = useCallback((socketId: string) => {
    const pc = pcsRef.current.get(socketId);
    if (pc) {
      pc.close();
      pcsRef.current.delete(socketId);
    }
    setRemotePeers((prev) => prev.filter((p) => p.socketId !== socketId));
  }, []);

  const getOrCreatePc = useCallback(
    (socketId: string): RTCPeerConnection => {
      let pc = pcsRef.current.get(socketId);
      if (pc) return pc;

      pc = new RTCPeerConnection(rtcConfig);
      const socket = connectSocket();

      localStreamRef.current?.getTracks().forEach((track) => {
        pc!.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit(SocketClientEvents.WebrtcSignal, {
            to: socketId,
            data: { candidate: e.candidate },
          });
        }
      };
      pc.ontrack = (e) => {
        if (e.streams[0]) updateRemote(socketId, e.streams[0]);
      };
      pc.onconnectionstatechange = () => {
        if (pc!.connectionState === 'failed' || pc!.connectionState === 'closed') {
          removeRemote(socketId);
        }
      };

      pcsRef.current.set(socketId, pc);
      return pc;
    },
    [updateRemote, removeRemote],
  );

  const join = useCallback(async () => {
    if (inCall || connecting) return;
    setConnecting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMicOn(true);
      setCamOn(true);

      const socket = connectSocket();

      socket.on(SocketServerEvents.WebrtcPeers, async (payload: { peers: WebrtcPeer[] }) => {
        for (const peer of payload.peers) {
          namesRef.current.set(peer.socketId, peer.name);
          const pc = getOrCreatePc(peer.socketId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit(SocketClientEvents.WebrtcSignal, {
            to: peer.socketId,
            data: pc.localDescription,
          });
        }
      });

      socket.on(SocketServerEvents.WebrtcPeerJoined, (payload: { peer: WebrtcPeer }) => {
        namesRef.current.set(payload.peer.socketId, payload.peer.name);
      });

      socket.on(SocketServerEvents.WebrtcSignal, async (payload: WebrtcSignalServerPayload) => {
        const { from, data } = payload;
        const signal = data as { type?: string; sdp?: string; candidate?: RTCIceCandidateInit };
        const pc = getOrCreatePc(from);
        try {
          if (signal.type === 'offer') {
            await pc.setRemoteDescription(signal as RTCSessionDescriptionInit);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit(SocketClientEvents.WebrtcSignal, { to: from, data: pc.localDescription });
          } else if (signal.type === 'answer') {
            await pc.setRemoteDescription(signal as RTCSessionDescriptionInit);
          } else if (signal.candidate) {
            await pc.addIceCandidate(signal.candidate);
          }
        } catch (err) {
          console.warn('WebRTC signal error', err);
        }
      });

      socket.on(SocketServerEvents.WebrtcPeerLeft, (payload: { socketId: string }) => {
        removeRemote(payload.socketId);
      });

      socket.emit(SocketClientEvents.WebrtcJoin, { roomId, name: displayName });
      setInCall(true);
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Camera/microphone permission denied.'
          : 'Could not access camera/microphone on this device.',
      );
    } finally {
      setConnecting(false);
    }
  }, [inCall, connecting, roomId, displayName, getOrCreatePc, removeRemote]);

  const leave = useCallback(() => {
    const socket = connectSocket();
    socket.emit(SocketClientEvents.WebrtcLeave, { roomId });
    socket.off(SocketServerEvents.WebrtcPeers);
    socket.off(SocketServerEvents.WebrtcPeerJoined);
    socket.off(SocketServerEvents.WebrtcSignal);
    socket.off(SocketServerEvents.WebrtcPeerLeft);

    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    namesRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemotePeers([]);
    setInCall(false);
  }, [roomId]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  }, [camOn]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    inCall,
    connecting,
    error,
    localStream,
    remotePeers,
    micOn,
    camOn,
    join,
    leave,
    toggleMic,
    toggleCam,
  };
}
