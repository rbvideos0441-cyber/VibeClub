import React, { useEffect, useState, useRef } from 'react';
import { LiveCard } from '../components/LiveCard';
import { Live } from '../types';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { Compass, Zap, X } from 'lucide-react';

export default function Feed() {
  const { user } = useAuth();
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('Tudo');
  const [newLiveNotif, setNewLiveNotif] = useState<Live | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const livesRef = collection(db, 'lives');
    // Filter only active lives
    let q = query(
      livesRef, 
      where('status', '==', 'live'),
      orderBy('createdAt', 'desc')
    );
    
    if (category !== 'Tudo') {
      q = query(
        livesRef, 
        where('status', '==', 'live'),
        where('category', '==', category), 
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const livesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Live));
      
      // Detect new lives for notifications (only if user is logged in and it's not the first load)
      if (user && !isInitialLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newLive = { id: change.doc.id, ...change.doc.data() } as Live;
            // Only notify for lives that aren't already in our list (to avoid duplicates)
            if (!lives.find(l => l.id === newLive.id)) {
              setNewLiveNotif(newLive);
              // Auto-hide after 5 seconds
              setTimeout(() => setNewLiveNotif(null), 5000);
            }
          }
        });
      }

      setLives(livesData);
      setLoading(false);
      isInitialLoad.current = false;
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'lives');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category]);

  const categories = ['Tudo', 'Música', 'Gaming', 'Conversa', 'Arte', 'Esportes', 'Educação'];

  return (
    <div className="px-4 md:px-8 py-8 animate-in fade-in duration-500 relative">
      <AnimatePresence>
        {newLiveNotif && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-teal/90 backdrop-blur-md text-bg px-4 py-2 rounded-full shadow-teal-glow flex items-center gap-3 pointer-events-auto border border-white/20">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <Zap size={14} className="fill-current" />
              <span className="text-xs font-black uppercase tracking-wider">
                Nova Live: <span className="underline decoration-bg/30">{newLiveNotif.hostName}</span> começou agora!
              </span>
              <button 
                onClick={() => setNewLiveNotif(null)}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-text-main to-teal-glow">
            Explorar VibeClub
          </h1>
          <p className="text-text-muted mt-1">Descubra as transmissões mais vibrantes do momento.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
                category === cat 
                  ? 'bg-teal text-bg shadow-[0_0_15px_rgba(0,201,167,0.3)]' 
                  : 'bg-surface text-text-muted hover:text-text-main border border-border-subtle'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="bg-card rounded-xl aspect-video animate-pulse border border-border-subtle" />
          ))}
        </div>
      ) : lives.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {lives.map(live => (
            <div key={live.id}>
              <LiveCard live={live} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4 border border-border-subtle">
            <Compass className="text-text-muted" size={40} />
          </div>
          <h2 className="text-xl font-bold">Nenhuma live encontrada</h2>
          <p className="text-text-muted">Parece que ninguém está ao vivo nesta categoria agora.</p>
        </div>
      )}
    </div>
  );
}
