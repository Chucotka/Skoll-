import { useEffect, useRef } from 'react';
import { useWebRTC } from '../lib/useWebRTC';
import { haptic } from '../lib/telegram';

interface Props {
  roomId: string;
  displayName: string;
  visible: boolean;
}

function VideoTile({
  stream,
  label,
  muted,
  camOff,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  camOff?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-800 ring-1 ring-white/10">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover ${camOff ? 'opacity-0' : ''}`}
      />
      {camOff && (
        <div className="absolute inset-0 flex items-center justify-center text-3xl">📷🚫</div>
      )}
      <span className="absolute bottom-1 left-1 rounded-md bg-black/50 px-2 py-0.5 text-xs">
        {label}
      </span>
    </div>
  );
}

export default function VideoCall({ roomId, displayName, visible }: Props) {
  const {
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
  } = useWebRTC(roomId, displayName);

  return (
    <div className={`border-b border-white/5 bg-ink-800/40 ${visible ? '' : 'hidden'}`}>
      <div className="p-3">
        {!inCall ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <p className="text-sm text-white/60">
              📹 Start a video call so everyone can see each other around the table.
            </p>
            <button className="btn-primary" disabled={connecting} onClick={() => { haptic(); void join(); }}>
              {connecting ? 'Connecting…' : 'Join Video Call'}
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <VideoTile stream={localStream} label={`${displayName} (you)`} muted camOff={!camOn} />
              {remotePeers.map((p) => (
                <VideoTile key={p.socketId} stream={p.stream} label={p.name} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                className={`chip py-2 ${micOn ? 'bg-white/10' : 'bg-red-500/20 text-red-300'}`}
                onClick={toggleMic}
              >
                {micOn ? '🎤 Mic' : '🔇 Muted'}
              </button>
              <button
                className={`chip py-2 ${camOn ? 'bg-white/10' : 'bg-red-500/20 text-red-300'}`}
                onClick={toggleCam}
              >
                {camOn ? '📹 Camera' : '📷 Off'}
              </button>
              <button className="chip py-2 bg-red-500/20 text-red-300" onClick={leave}>
                ✖ Leave call
              </button>
            </div>
            <p className="text-center text-xs text-white/30">
              {remotePeers.length + 1} on the call
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
