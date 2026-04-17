import React, { useEffect, useState } from 'react';
import { LiveCard } from '../components/LiveCard';
import { Live } from '../types';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';

export default function Feed() {
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('Tudo');

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
      setLives(livesData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'lives');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category]);

  const categories = ['Tudo', 'Música', 'Gaming', 'Conversa', 'Arte', 'Esportes', 'Educação'];

  return (
    <div className="px-4 md:px-8 py-8 animate-in fade-in duration-500">
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

import { Compass } from 'lucide-react';
