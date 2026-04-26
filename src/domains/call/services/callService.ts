import { db } from '@/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Call } from '@shared/types';

export const initiateCall = async (chatId: string, callerId: string, receiverId: string) => {
  const callRef = doc(db, 'calls', `${chatId}_${Date.now()}`);
  const callData: Call = {
    id: callRef.id,
    chatId,
    callerId,
    receiverId,
    status: 'ringing',
    type: 'audio',
    createdAt: serverTimestamp(),
  };
  await setDoc(callRef, callData);
  return callRef.id;
};

export const answerCall = async (callId: string, answer: any) => {
  const callRef = doc(db, 'calls', callId);
  await updateDoc(callRef, { status: 'connected', answer });
};

export const rejectCall = async (callId: string) => {
  const callRef = doc(db, 'calls', callId);
  await updateDoc(callRef, { status: 'rejected' });
};

export const setOffer = async (callId: string, offer: any) => {
  const callRef = doc(db, 'calls', callId);
  await updateDoc(callRef, { offer });
};

export const addIceCandidate = async (callId: string, candidate: any) => {
  const callRef = doc(db, 'calls', callId);
  await updateDoc(callRef, { iceCandidates: arrayUnion(candidate) });
};
