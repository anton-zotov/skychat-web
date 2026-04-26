import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import Peer from 'simple-peer';

import { db } from '@/firebase';
import {
  addIceCandidate,
  answerCall,
  rejectCall,
  setOffer,
} from '@domains/call/services/callService';
import { Call } from '@shared/types';
import { Button } from '@shared/ui/Button';

export const CallWindow = ({
  call: initialCall,
  onEndCall,
  onMute,
  isMuted,
  currentUserId,
}: {
  call: Call;
  onEndCall: () => void;
  onMute: () => void;
  isMuted: boolean;
  currentUserId: string;
}) => {
  const [call, setCall] = useState<Call>(initialCall);
  const [isAccepted, setIsAccepted] = useState(false);
  const peerRef = useRef<Peer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCaller = call.callerId === currentUserId;

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'calls', call.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() } as Call;
        setCall(data);
        if (data.status === 'rejected' || data.status === 'ended') {
          onEndCall();
        }
      } else {
        onEndCall();
      }
    });
    return () => unsubscribe();
  }, [call.id, onEndCall]);

  useEffect(() => {
    if (!isCaller && !isAccepted) return;

    const initPeer = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const peer = new Peer({
          initiator: isCaller,
          trickle: false,
          stream,
        });

        peer.on('signal', (data: any) => {
          if (data.type === 'offer') {
            setOffer(call.id, data);
          } else if (data.type === 'answer') {
            answerCall(call.id, data);
          } else if (data.candidate) {
            addIceCandidate(call.id, data.candidate);
          }
        });

        peer.on('stream', (remoteStream) => {
          const audio = new Audio();
          audio.srcObject = remoteStream;
          audio.play();
        });

        if (!isCaller && call.offer) {
          peer.signal(call.offer);
        } else if (isCaller && call.answer) {
          peer.signal(call.answer);
        }

        if (call.iceCandidates) {
          call.iceCandidates.forEach((candidate) => peer.signal(candidate));
        }

        peerRef.current = peer;
      } catch (error) {
        console.error('Failed to get media', error);
      }
    };

    initPeer();

    return () => {
      peerRef.current?.destroy();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [call.id, currentUserId, isCaller, isAccepted]);

  useEffect(() => {
    if (peerRef.current) {
      if (!isCaller && call.offer) {
        try {
          peerRef.current.signal(call.offer);
        } catch {}
      } else if (isCaller && call.answer) {
        try {
          peerRef.current.signal(call.answer);
        } catch {}
      }
      if (call.iceCandidates) {
        call.iceCandidates.forEach((candidate) => {
          try {
            peerRef.current?.signal(candidate);
          } catch {}
        });
      }
    }
  }, [call.offer, call.answer, call.iceCandidates, isCaller]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current
        .getAudioTracks()
        .forEach((track) => (track.enabled = !isMuted));
    }
  }, [isMuted]);

  const handleAccept = () => {
    setIsAccepted(true);
  };

  const handleReject = async () => {
    await rejectCall(call.id);
    onEndCall();
  };

  return (
    <div
      data-testid="call-window"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-6 backdrop-blur-sm dark:bg-slate-950/80"
    >
      <div className="w-full max-w-md space-y-8 rounded-[40px] border border-white/70 bg-white p-10 text-center shadow-2xl dark:border-white/10 dark:bg-[#020817] dark:shadow-[0_30px_90px_-42px_rgba(2,6,23,0.95)]">
        <div className="space-y-2">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/12 dark:text-sky-300">
            <Phone size={40} className="animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            {!isCaller && !isAccepted ? 'Входящий звонок' : 'Звонок...'}
          </h2>
          <p className="font-medium text-slate-500 dark:text-white/60">
            {isCaller
              ? 'Ожидание ответа...'
              : isAccepted
                ? 'Соединение...'
                : 'Вас вызывают'}
          </p>
        </div>

        <div className="flex justify-center gap-6">
          {!isCaller && !isAccepted ? (
            <>
              <Button
                data-testid="accept-call-button"
                onClick={handleAccept}
                className="h-16 w-16 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
              >
                <Phone size={28} className="text-white" />
              </Button>
              <Button
                data-testid="reject-call-button"
                onClick={handleReject}
                className="h-16 w-16 rounded-full bg-rose-500 shadow-lg shadow-rose-500/20 hover:bg-rose-600"
              >
                <PhoneOff size={28} className="text-white" />
              </Button>
            </>
          ) : (
            <>
              <Button
                data-testid="toggle-mute-button"
                onClick={onMute}
                variant={isMuted ? 'danger' : 'secondary'}
                className="h-16 w-16 rounded-full shadow-lg"
              >
                {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
              </Button>
              <Button
                data-testid="end-call-button"
                onClick={handleReject}
                className="h-16 w-16 rounded-full bg-rose-500 shadow-lg shadow-rose-500/20 hover:bg-rose-600"
              >
                <PhoneOff size={28} className="text-white" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
