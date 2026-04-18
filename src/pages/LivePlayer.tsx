import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, updateDoc, increment, collection, addDoc, query, orderBy, limit, setDoc } from 'firebase/firestore';
import { Live } from '../types';
import { Users, Send, Heart, Flame, Gem, Crown, Bomb, X, Camera, Mic, Volume2, Plus, Power, Zap, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import ReportModal from '../components/ReportModal';

export default function LivePlayer() {
  const { user } = useAuth();
  const liveId = window.location.pathname.split('/').pop() || '';
  const [live, setLive] = useState<Live | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [celebration, setCelebration] = useState<{ type: string; id: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hostVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const isHost = live && user && live.hostId === user.id;

  useEffect(() => {
    // If the user is the host and the live is active, start the camera
    if (isHost && live.status === 'live') {
      if (localStreamRef.current) return; // Already running

      const startCamera = async () => {
        const constraints = [
          { 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: true 
          },
          { 
            video: true, 
            audio: true 
          },
          { 
            video: true, 
            audio: false 
          }
        ];

        let lastError: any = null;

        for (const constraint of constraints) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia(constraint);
            localStreamRef.current = stream;
            if (hostVideoRef.current) {
              hostVideoRef.current.srcObject = stream;
            }
            setIsCameraReady(true);
            return; // Success
          } catch (err) {
            lastError = err;
            console.warn(`Failed with constraint:`, constraint, err);
          }
        }

        if (lastError) {
          console.error('Final error accessing camera:', lastError);
          const errorMsg = lastError.name === 'NotFoundError' || lastError.name === 'DevicesNotFoundError' 
            ? 'Câmera ou Microfone não encontrados. Certifique-se de que estão conectados.' 
            : 'Erro ao acessar câmera: Verifique as permissões do navegador.';
          toast.error(errorMsg);
        }
      };

      startCamera();

      return () => {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
      };
    }
  }, [isHost, live?.status]);

  useEffect(() => {
    if (!liveId) return;

    // Fetch Live details
    const unsubscribeLive = onSnapshot(doc(db, 'lives', liveId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'ended') {
          toast.error('Esta live já foi encerrada.');
          window.history.pushState({}, '', '/feed');
          window.dispatchEvent(new Event('pushstate'));
          return;
        }
        setLive({ id: docSnap.id, ...data } as Live);
      } else {
        toast.error('Live não encontrada');
        window.history.pushState({}, '', '/feed');
        window.dispatchEvent(new Event('pushstate'));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `lives/${liveId}`);
    });

    // Fetch Chat messages
    const messagesRef = collection(db, 'lives', liveId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsubscribeChat = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setChatMessages(messages);

      // Trigger celebration for the latest gift if it's new
      const latestMessage = messages[messages.length - 1];
      if (latestMessage?.type === 'gift' && latestMessage.createdAt > Date.now() - 5000) {
        setCelebration({ type: latestMessage.giftType, id: latestMessage.id });
        setTimeout(() => setCelebration(null), 4000);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `lives/${liveId}/messages`);
    });

    return () => {
      unsubscribeLive();
      unsubscribeChat();
    };
  }, [liveId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    try {
      await addDoc(collection(db, 'lives', liveId, 'messages'), {
        userId: user.id,
        userName: user.name,
        text: newMessage,
        createdAt: Date.now(),
      });
      setNewMessage('');
    } catch (err) {
       handleFirestoreError(err, OperationType.CREATE, `lives/${liveId}/messages`);
    }
  };

  const sendGift = async (type: string, cost: number) => {
    if (!user || !live) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (user.coins < cost) {
      toast.error('Saldo de moedas insuficiente');
      return;
    }

    try {
      // 1. Debit user
      await updateDoc(doc(db, 'users', user.id), {
        coins: increment(-cost)
      });

      // 1.1 Credit host
      await updateDoc(doc(db, 'users', live.hostId), {
        coins: increment(cost),
        totalEarnings: increment(cost)
      });

      // 2. Log transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: 'gift',
        amount: -cost,
        description: `Presente ${type} para ${live.hostName}`,
        liveId: live.id,
        toUserId: live.hostId,
        createdAt: Date.now()
      });

      // 3. Add to chat as system message
      await addDoc(collection(db, 'lives', liveId, 'messages'), {
        type: 'gift',
        giftType: type,
        userName: user.name,
        cost,
        createdAt: Date.now()
      });

      toast.success(`Você enviou um ${type}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lives/${liveId}/gifts`);
    }
  };

  const joinSlot = async () => {
    if (!user || !live) return;
    if (user.coins < live.slotCost) {
      toast.error(`Você precisa de ◈ ${live.slotCost} para entrar na janela`);
      return;
    }

    try {
      toast.loading('Solicitando acesso...', { id: 'camera-request' });
      
      let stream: MediaStream | null = null;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
      } catch (e) {
        // Fallback to video only
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      if (!stream) throw new Error('No stream obtained');
      
      // For now we just show a success message 
      // In a real app we would send this stream to a signaling server
      toast.success('Câmera conectada! Você está na fila para entrar no ar.', { id: 'camera-request' });
      
      // Debit coins simulation
      await updateDoc(doc(db, 'users', user.id), {
        coins: increment(-live.slotCost)
      });

      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: 'slot_fee',
        amount: -live.slotCost,
        description: `Entrada em janela na live de ${live.hostName}`,
        liveId: live.id,
        createdAt: Date.now()
      });

    } catch (err) {
      console.error('Camera access error:', err);
      toast.error('Não foi possível acessar a câmera. Verifique as permissões do seu navegador.', { id: 'camera-request' });
    }
  };

  const navigateToHost = (hostId: string) => {
    const href = `/host/${hostId}`;
    window.history.pushState({}, '', href);
    window.dispatchEvent(new Event('pushstate'));
  };

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const pcSubscribers = useRef<Record<string, () => void>>({});

  // WebRTC Host Logic: Listen for incoming connection requests
  useEffect(() => {
    if (!isHost || !liveId || !localStreamRef.current || !isCameraReady) return;

    console.log("[Host] WebRTC Signaling started");
    const webrtcRef = collection(db, 'lives', liveId, 'webrtc');
    const unsubscribe = onSnapshot(webrtcRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const viewerId = change.doc.id;
        const data = change.doc.data();

        if (change.type === 'added' || change.type === 'modified') {
          // If we have an offer and no answer yet (or resetting connection)
          if (data.offer && !data.answer && !peerConnections.current[viewerId]) {
            console.log(`[Host] Creating connection for viewer: ${viewerId}`);
            
            const pc = new RTCPeerConnection({
              iceServers: [
                { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
                { urls: 'stun:global.stun.twilio.com:3478' }
              ]
            });
            peerConnections.current[viewerId] = pc;

            // Add local tracks
            localStreamRef.current?.getTracks().forEach(track => {
              if (pc.signalingState !== 'closed') {
                pc.addTrack(track, localStreamRef.current!);
              }
            });

            // ICE Candidates: Host -> Viewer
            const hostCandidatesRef = collection(db, 'lives', liveId, 'webrtc', viewerId, 'hostCandidates');
            pc.onicecandidate = (event) => {
              if (event.candidate && pc.signalingState !== 'closed') {
                addDoc(hostCandidatesRef, event.candidate.toJSON());
              }
            };

            // Set remote (viewer's offer)
            if (pc.signalingState !== 'closed') {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.offer)));
              
              // Create answer
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              // Save answer to parent doc
              await updateDoc(doc(db, 'lives', liveId, 'webrtc', viewerId), {
                answer: JSON.stringify(answer),
                hostRespondedAt: Date.now()
              });

              // Listen for Viewer candidates from subcollection
              const viewerCandidatesRef = collection(db, 'lives', liveId, 'webrtc', viewerId, 'viewerCandidates');
              let viewerCandidateBuffer: any[] = [];
              const unsubCandidates = onSnapshot(viewerCandidatesRef, (snap) => {
                snap.docChanges().forEach((c) => {
                  if (c.type === 'added' && pc.signalingState !== 'closed') {
                    const cand = c.doc.data();
                    if (pc.remoteDescription) {
                      pc.addIceCandidate(new RTCIceCandidate(cand));
                    } else {
                      viewerCandidateBuffer.push(cand);
                    }
                  }
                });
              });
              pcSubscribers.current[viewerId] = unsubCandidates;

              if (pc.remoteDescription && viewerCandidateBuffer.length > 0) {
                viewerCandidateBuffer.forEach(cand => pc.addIceCandidate(new RTCIceCandidate(cand)));
                viewerCandidateBuffer = [];
              }
            }
          }
        }

        if (change.type === 'removed') {
          if (peerConnections.current[viewerId]) {
            if (pcSubscribers.current[viewerId]) pcSubscribers.current[viewerId]();
            peerConnections.current[viewerId].close();
            delete peerConnections.current[viewerId];
            delete pcSubscribers.current[viewerId];
          }
        }
      });
    }, (err) => {
       console.error("[Host] WebRTC Signaling error:", err);
    });

    return () => {
      unsubscribe();
      Object.keys(pcSubscribers.current).forEach(id => pcSubscribers.current[id]());
      Object.values(peerConnections.current).forEach((pc: RTCPeerConnection) => pc.close());
      peerConnections.current = {};
      pcSubscribers.current = {};
    };
  }, [isHost, liveId, live?.status, isCameraReady]);

  // WebRTC Viewer Logic: Connect to the Host
  useEffect(() => {
    if (isHost || !liveId || !user) return;

    let pc: RTCPeerConnection | null = null;
    let unsubscribeDoc: any = null;
    let unsubscribeCandidates: any = null;

    let hostCandidateBuffer: any[] = [];

    const startViewerConnection = async () => {
      console.log(`[Viewer] Starting connection to host...`);
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });

      pc.ontrack = (event) => {
        if (!pc || pc.signalingState === 'closed') return;
        console.log("[Viewer] Received remote track");
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // ICE Candidates: Viewer -> Host
      const viewerCandidatesRef = collection(db, 'lives', liveId, 'webrtc', user.id, 'viewerCandidates');
      pc.onicecandidate = (event) => {
        if (event.candidate && pc && pc.signalingState !== 'closed') {
          addDoc(viewerCandidatesRef, event.candidate.toJSON());
        }
      };

      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      if (pc.signalingState !== 'closed') {
        await pc.setLocalDescription(offer);

        const signalingDocRef = doc(db, 'lives', liveId, 'webrtc', user.id);
        
        await setDoc(signalingDocRef, {
          offer: JSON.stringify(offer),
          viewerId: user.id,
          createdAt: Date.now(),
          answer: null 
        });

        // Listen for Host's answer
        unsubscribeDoc = onSnapshot(signalingDocRef, async (docSnap) => {
          if (!docSnap.exists() || !pc || pc.signalingState === 'closed') return;
          const data = docSnap.data();

          if (data.answer && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
            // Process buffered candidates
            hostCandidateBuffer.forEach(cand => pc?.addIceCandidate(new RTCIceCandidate(cand)));
            hostCandidateBuffer = [];
          }
        });

        // Listen for Host candidates
        const hostCandidatesRef = collection(db, 'lives', liveId, 'webrtc', user.id, 'hostCandidates');
        unsubscribeCandidates = onSnapshot(hostCandidatesRef, (snap) => {
          snap.docChanges().forEach((c) => {
            if (c.type === 'added' && pc && pc.signalingState !== 'closed') {
              const cand = c.doc.data();
              if (pc.remoteDescription) {
                pc.addIceCandidate(new RTCIceCandidate(cand));
              } else {
                hostCandidateBuffer.push(cand);
              }
            }
          });
        });
      }
    };

    startViewerConnection();

    return () => {
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeCandidates) unsubscribeCandidates();
      if (pc) {
        pc.close();
        pc = null;
      }
      setRemoteStream(null);
    };
  }, [isHost, liveId, user?.id]);

  useEffect(() => {
    if (remoteStream && !isHost && hostVideoRef.current) {
      hostVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isHost]);

  const endLive = async () => {
    if (!liveId || !user || live?.hostId !== user.id) return;
    
    try {
      await updateDoc(doc(db, 'lives', liveId), {
        status: 'ended',
        endedAt: Date.now()
      });
      toast.success('Live encerrada com sucesso!');
      
      // Redirect host to dashboard instead of feed to continue the cycle
      window.history.pushState({}, '', '/dashboard/host?action=start');
      window.dispatchEvent(new Event('pushstate'));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lives/${liveId}`);
    }
  };

  if (!live) return <div className="p-20 text-center">Carregando live...</div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64.5px)] overflow-hidden bg-bg animate-in fade-in duration-1000">
      {/* Viewport Principal */}
      <div className="flex-[2.5] flex flex-col min-w-0 h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-border-subtle">
        {/* Stream Area */}
        <div className="flex-1 p-1.5 lg:p-6 flex items-center justify-center min-h-0 relative bg-black/20">
          <div className="grid grid-cols-[1.5fr_1fr] gap-1.5 lg:gap-4 w-full h-full max-h-[600px] items-stretch">
            {/* Host Main Window */}
            <div className="relative h-full bg-black rounded-xl lg:rounded-3xl overflow-hidden border border-white/5 shadow-2xl group">
              <video 
                ref={hostVideoRef}
                autoPlay 
                playsInline
                muted={isHost} // Mute host's own camera to avoid feedback, but hear remote host
                className={`w-full h-full object-cover ${!isHost && !remoteStream ? 'hidden' : 'block'}`}
              />
              {!isHost && !remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <Camera className="text-teal" size={32} />
                    </div>
                    <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Conectando ao Host...</p>
                  </div>
                </div>
              )}
              
                <div className="absolute top-1.5 left-1.5 z-20 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <div className="bg-[#D946EF] px-1 py-0.5 rounded text-[6px] lg:text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1 h-1 lg:w-2 lg:h-2 bg-white rounded-full animate-pulse" />
                      Host
                    </div>
                    {live.hostId === user?.id && (
                      <div className="bg-teal px-1 py-0.5 rounded text-[6px] lg:text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1 animate-in fade-in">
                        <Zap size={10} /> Transmitindo
                      </div>
                    )}
                  </div>
                  {live.hostId === user?.id && (
                    <button 
                      onClick={() => setShowEndConfirm(true)}
                      className="bg-red hover:bg-red/80 px-1 py-0.5 rounded text-[6px] lg:text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1 transition-colors w-fit"
                    >
                      <Power size={10} /> Encerrar
                    </button>
                  )}
                </div>
                <div className="bg-black/40 backdrop-blur-sm px-1 py-0.5 rounded flex items-center gap-1.5 absolute top-1.5 right-1.5 z-20">
                  <div className="flex items-center gap-1 text-white/90 text-[7px] lg:text-[11px]">
                    <Users size={8} className="lg:w-3 lg:h-3 text-teal" />
                    {live.viewerCount}
                  </div>
                  {!isHost && (
                    <button 
                      onClick={() => setShowReportModal(true)}
                      className="text-white/40 hover:text-red transition-colors p-0.5"
                      title="Denunciar Live"
                    >
                      <AlertTriangle size={10} className="lg:w-4 lg:h-4" />
                    </button>
                  )}
                </div>

              <div className="absolute bottom-1.5 left-1.5 right-1.5 z-20">
                <div className="bg-black/40 backdrop-blur-sm p-1 rounded-md border border-white/5">
                  <p className="text-white font-bold text-[8px] lg:text-sm truncate leading-none">
                    {live.hostName}
                  </p>
                </div>
              </div>
            </div>

            {/* Guest Slots Grid - 2x4 Layout */}
            <div className="grid grid-cols-2 grid-rows-4 gap-1 lg:gap-3 h-full overflow-hidden">
              {participants.map((p) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative h-full bg-[#1A1A1A] rounded-lg lg:rounded-2xl overflow-hidden border border-white/5 group"
                >
                  <img src={p.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute bottom-0.5 right-0.5 text-white/40">
                    <Mic size={10} strokeWidth={2.5} />
                  </div>
                </motion.div>
              ))}

              {Array.from({ length: Math.max(0, 8 - participants.length) }).map((_, i) => (
                <button 
                  key={`empty-${i}`}
                  onClick={joinSlot}
                  className="relative h-full bg-[#121212] rounded-lg lg:rounded-2xl border border-white/5 hover:border-teal/30 flex flex-col items-center justify-center group"
                >
                  <Plus size={12} className="lg:w-6 lg:h-6 text-white/10 group-hover:text-teal/30" />
                  <span className="text-[5px] lg:text-[10px] font-bold text-white/5 uppercase group-hover:text-teal/30">
                    Convite
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls - Ultra Compact for mobile */}
        <div className="px-2 lg:px-6 pb-2 lg:pb-6 flex items-center gap-1.5 lg:gap-3 shrink-0 relative">
          <button onClick={joinSlot} className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg py-1.5 lg:py-3 text-[8px] lg:text-xs font-black uppercase tracking-wider hover:bg-white/10 transition-colors">
            Janela
          </button>
          <div className="flex-1 relative">
            <button 
              onClick={() => setShowGifts(!showGifts)}
              className="w-full bg-teal text-bg rounded-lg py-1.5 lg:py-3 text-[8px] lg:text-xs font-black uppercase tracking-wider hover:bg-teal-glow shadow-lg transition-all"
            >
              Presentear
            </button>
            <AnimatePresence>
              {showGifts && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: -10, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-surface border border-white/10 rounded-2xl shadow-2xl z-50 flex justify-between gap-1"
                >
                  <GiftButton icon={<Heart size={16} />} label="Coração" cost={10} color="text-red" onClick={() => sendGift('Heart', 10)} />
                  <GiftButton icon={<Flame size={16} />} label="Fogo" cost={50} color="text-orange" onClick={() => sendGift('Flame', 50)} />
                  <GiftButton icon={<Gem size={16} />} label="Gema" cost={200} color="text-teal" onClick={() => sendGift('Gem', 200)} />
                  <GiftButton icon={<Crown size={16} />} label="Coroa" cost={500} color="text-amber" onClick={() => sendGift('Crown', 500)} />
                  <GiftButton icon={<Bomb size={16} />} label="Bomba" cost={1000} color="text-black" onClick={() => sendGift('Bomb', 1000)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Sidebar Chat Section */}
      <div className="flex-1 lg:w-[420px] flex flex-col lg:h-full glass-panel overflow-hidden min-h-[220px]">
        <div className="flex border-b border-border-subtle shrink-0 bg-surface/30">
           <button className="flex-1 py-2 lg:py-4 text-[8px] lg:text-[11px] font-black uppercase tracking-tighter border-b-2 border-teal text-teal">Chat Ao Vivo</button>
           <button className="flex-1 py-2 lg:py-4 text-[8px] lg:text-[11px] font-black uppercase tracking-tighter border-b-2 border-transparent text-text-muted">Participantes</button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2 no-scrollbar min-h-0 bg-bg/20">
          {chatMessages.map((msg) => (
            <div key={msg.id} className="animate-in slide-in-from-bottom-2 duration-300">
               {msg.type === 'gift' ? (
                 <div className="flex items-center gap-2 py-0.5 text-[9px] lg:text-[10px]">
                    <div className="w-4 h-4 rounded-full overflow-hidden border border-white/5 shrink-0">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.userName}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-white/70">
                      <span className="font-bold text-text-main">{msg.userName}</span> envio <span className="text-amber font-bold">{msg.giftType}</span>
                    </div>
                 </div>
               ) : (
                 <div className="flex gap-2 items-start">
                    <div className="text-[9px] font-bold text-teal shrink-0 mt-0.5 capitalize">{msg.userName}:</div>
                    <div className="text-[10px] lg:text-[13px] text-text-main leading-tight break-words">{msg.text}</div>
                 </div>
               )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-2 border-t border-border-subtle bg-bg/80 shrink-0">
          <form onSubmit={sendChatMessage} className="relative">
            <input 
              type="text" 
              placeholder="Chat..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!user}
              className="w-full bg-surface/50 border border-white/5 px-3 py-1.5 lg:py-3 pr-8 rounded-lg text-[10px] lg:text-xs text-text-main focus:outline-none focus:border-teal/50 transition-colors"
            />
            <button 
              type="submit"
              disabled={!user || !newMessage.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-teal disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* End Live Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card border border-white/10 p-8 rounded-[32px] max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-red/10 text-red rounded-full flex items-center justify-center mx-auto">
                <Power size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black">Encerrar Live?</h3>
                <p className="text-text-muted text-sm">Você tem certeza que deseja finalizar sua transmissão agora?</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 btn-ghost py-4 font-bold border border-white/5 uppercase text-xs"
                >
                  Voltar
                </button>
                <button 
                  onClick={endLive}
                  className="flex-1 bg-red hover:bg-red/80 text-white py-4 font-bold rounded-2xl uppercase text-xs shadow-lg shadow-red/20 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetId={live.id}
        targetType="live"
        targetName={`${live.title} (by ${live.hostName})`}
      />
      
      {/* Celebration Overlay */}
      <CelebrationOverlay celebration={celebration} />
    </div>
  );
}

function CelebrationOverlay({ celebration }: { celebration: { type: string; id: string } | null }) {
  if (!celebration) return null;

  const renderEffect = () => {
    switch (celebration.type) {
      case 'Heart':
        return Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`${celebration.id}-${i}`}
            initial={{ opacity: 1, scale: 0, x: '50%', y: '80%' }}
            animate={{ 
              opacity: 0, 
              scale: [1, 1.5, 1],
              x: `${Math.random() * 100}%`, 
              y: `${Math.random() * 50}%` 
            }}
            transition={{ duration: 3, ease: 'easeOut', delay: i * 0.1 }}
            className="absolute text-red pointer-events-none"
          >
            <Heart size={32} fill="currentColor" />
          </motion.div>
        ));
      case 'Flame':
        return Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={`${celebration.id}-${i}`}
            initial={{ opacity: 0, scale: 1, x: `${Math.random() * 100}%`, y: '100%' }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [1, 2, 1],
              y: '0%' 
            }}
            transition={{ duration: 2, ease: 'linear', delay: i * 0.05 }}
            className="absolute text-orange pointer-events-none"
          >
            <Flame size={48} fill="currentColor" />
          </motion.div>
        ));
      case 'Gem':
        return Array.from({ length: 25 }).map((_, i) => (
          <motion.div
            key={`${celebration.id}-${i}`}
            initial={{ opacity: 1, rotate: 0, x: `${Math.random() * 100}%`, y: '-10%' }}
            animate={{ 
              opacity: [1, 1, 0],
              rotate: 360,
              y: '110%' 
            }}
            transition={{ duration: 4, ease: 'bounceOut', delay: i * 0.15 }}
            className="absolute text-teal pointer-events-none"
          >
            <Gem size={24} fill="currentColor" />
          </motion.div>
        ));
      case 'Crown':
        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
             <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: [0, 1.5, 1], rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 1, type: 'spring' }}
              className="text-amber drop-shadow-2xl"
            >
              <Crown size={120} fill="currentColor" />
            </motion.div>
            {/* Confetti simulation */}
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={`${celebration.id}-confetti-${i}`}
                initial={{ x: '50%', y: '50%', scale: 0 }}
                animate={{ 
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  rotate: Math.random() * 360
                }}
                transition={{ duration: 3, delay: 0.5 }}
                className={`absolute w-2 h-2 rounded-sm ${['bg-teal', 'bg-red', 'bg-amber', 'bg-purple-500'][i % 4]}`}
              />
            ))}
          </div>
        );
      case 'Bomb':
        return (
          <motion.div 
            animate={{ 
              x: [0, -20, 20, -20, 20, 0],
              y: [0, 20, -20, 20, -20, 0]
            }}
            transition={{ duration: 0.5, repeat: 2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none bg-red/10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 2, 0], opacity: [1, 1, 0] }}
              transition={{ duration: 1 }}
              className="text-black"
            >
              <Bomb size={200} fill="currentColor" />
            </motion.div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 z-50 overflow-hidden pointer-events-none">
      {renderEffect()}
    </div>
  );
}

function GiftButton({ icon, label, cost, color = "text-teal", onClick }: { icon: React.ReactNode, label: string, cost: number, color?: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center group relative"
    >
      <div className={`p-2 bg-white/5 rounded-lg border border-white/5 group-hover:bg-white/10 group-hover:scale-110 transition-all ${color}`}>
        {icon}
      </div>
      <span className="text-[8px] font-bold mt-1 text-white/60">◈{cost}</span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
        {label}
      </div>
    </button>
  );
}
