import React from 'react';
import { Live } from '../types';
import { Users, Play } from 'lucide-react';
import { motion } from 'motion/react';

export function LiveCard({ live }: { live: Live }) {
  const navigateToLive = (e: React.MouseEvent) => {
    e.preventDefault();
    const href = `/live/${live.id}`;
    window.history.pushState({}, '', href);
    window.dispatchEvent(new Event('pushstate'));
  };

  const navigateToHost = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering navigateToLive
    e.preventDefault();
    const href = `/host/${live.hostId}`;
    window.history.pushState({}, '', href);
    window.dispatchEvent(new Event('pushstate'));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="card-live group cursor-pointer"
      onClick={navigateToLive}
    >
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={live.thumbnail || `https://picsum.photos/seed/${live.id}/600/400`} 
          alt={live.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        
        <div className="absolute top-3 left-3 flex gap-2">
          {live.status === 'live' && <div className="badge-live flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" /> AO VIVO</div>}
          <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            {live.category}
          </div>
        </div>

        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">
          <Users size={12} className="text-teal" />
          {live.viewerCount}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play size={48} className="text-teal fill-teal/20" />
        </div>
      </div>

      <div className="p-4 flex gap-3">
        <div 
          onClick={navigateToHost}
          className="w-10 h-10 rounded-full border border-border-subtle overflow-hidden flex-shrink-0 hover:border-teal transition-colors"
        >
          <img 
            src={live.hostAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${live.hostId}`} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-text-main font-semibold truncate leading-tight group-hover:text-teal transition-colors">
            {live.title}
          </h3>
          <p 
            onClick={navigateToHost}
            className="text-text-muted text-sm truncate hover:text-teal transition-colors inline-block cursor-pointer"
          >
            {live.hostName}
          </p>
          
          <div className="mt-2 flex items-center gap-2">
            {live.coinEntry > 0 ? (
              <div className="badge-coin">
                <span className="text-amber">◈</span>
                {live.coinEntry} para assistir
              </div>
            ) : (
              <div className="text-[10px] text-teal font-bold uppercase tracking-widest bg-teal/10 px-2 py-0.5 rounded">
                Grátis
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
