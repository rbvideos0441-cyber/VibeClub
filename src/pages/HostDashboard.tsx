import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, limit, orderBy } from 'firebase/firestore';
import { Live } from '../types';
import { LayoutDashboard, PlusCircle, Wallet, Users, BarChart3, Star, Zap, History, Power } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HostDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ viewers: 0, coins: 0, lives: 0 });
  const [activeLive, setActiveLive] = useState<Live | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLive, setNewLive] = useState({
    title: '',
    category: 'Música',
    coinEntry: 0,
    slotCost: 50,
  });

  useEffect(() => {
    if (!user) return;

    // Check for auto-start query param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'start') {
      setShowCreateModal(true);
      // Clean up the URL without refreshing
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Fetch host stats and active liver
    const livesRef = collection(db, 'lives');
    const q = query(livesRef, where('hostId', '==', user.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Live));
      setActiveLive(liveList.find(l => l.status === 'live') || null);
      
      setStats({
        lives: liveList.length,
        viewers: liveList.reduce((acc, l) => acc + l.viewerCount, 0),
        coins: 1250 // Simulated historical earnings
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'lives');
    });

    return () => unsubscribe();
  }, [user]);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  };

  const startLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const docRef = await addDoc(collection(db, 'lives'), {
        hostId: user.id,
        hostName: user.name,
        hostAvatar: user.avatar,
        title: newLive.title,
        status: 'live',
        coinEntry: Number(newLive.coinEntry),
        slotCost: Number(newLive.slotCost),
        viewerCount: 0,
        category: newLive.category,
        createdAt: Date.now(),
      });
      toast.success('Live iniciada!');
      navigateTo(`/live/${docRef.id}`);
    } catch (err) {
      toast.error('Erro ao iniciar live');
    }
  };

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [liveToEnd, setLiveToEnd] = useState<string | null>(null);

  const endLive = async () => {
    if (!liveToEnd) return;
    try {
      await updateDoc(doc(db, 'lives', liveToEnd), {
        status: 'ended',
        endedAt: Date.now()
      });
      toast.success('Live encerrada com sucesso!');
      setShowEndConfirm(false);
      setLiveToEnd(null);
    } catch (err) {
      toast.error('Erro ao encerrar live');
    }
  };

  if (user?.role !== 'host') return <div className="p-20 text-center">Você precisa ser um Host aprovado para acessar esta página.</div>;

  return (
    <div className="px-4 md:px-8 py-10 max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal to-teal-glow">
            Painel do Host
          </h1>
          <p className="text-text-muted mt-1">Gerencie suas transmissões e veja seu crescimento.</p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 px-8"
        >
          <PlusCircle size={20} />
          Iniciar Nova Live
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Users className="text-teal" />} label="Visualizações Totais" value={stats.viewers.toLocaleString()} />
        <StatCard icon={<Star className="text-amber" />} label="Transações (◈)" value={`◈ ${stats.coins.toLocaleString()}`} />
        <StatCard icon={<BarChart3 className="text-blue" />} label="Total de Lives" value={stats.lives.toString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Session or Prompt */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="text-teal" size={20} />
            Sessão Atual
          </h2>
          
          {activeLive ? (
            <div className="bg-card border border-teal/30 p-8 rounded-3xl relative overflow-hidden">
               <div className="absolute top-0 right-0 bg-red text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase animate-pulse">
                AO VIVO AGORA
              </div>
              <div className="flex items-start gap-6">
                <div className="w-32 aspect-video bg-surface rounded-xl overflow-hidden hidden sm:block">
                   <img src={`https://picsum.photos/seed/${activeLive.id}/200`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{activeLive.title}</h3>
                  <div className="flex gap-4 text-sm text-text-muted mb-6">
                    <span className="flex items-center gap-1"><Users size={14} /> {activeLive.viewerCount} assistindo</span>
                    <span className="flex items-center gap-1"><Star size={14} /> ◈ {activeLive.coinEntry} entrada</span>
                  </div>
                  <div className="flex gap-3">
                     <button 
                       onClick={() => navigateTo(`/live/${activeLive.id}`)}
                       className="btn-primary text-sm px-6"
                     >
                       Ver Minha Live
                     </button>
                     <button 
                       onClick={() => {
                         setLiveToEnd(activeLive.id);
                         setShowEndConfirm(true);
                       }}
                       className="btn-ghost text-sm px-6 border-red text-red hover:bg-red/10"
                     >
                       Encerrar
                     </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-dashed border-border-subtle p-12 rounded-3xl text-center flex flex-col items-center">
               <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4 text-text-muted">
                  <Play size={32} />
               </div>
               <h3 className="font-bold text-lg">Pronto para entrar no ar?</h3>
               <p className="text-text-muted mt-2 mb-6">Configure sua live e comece a conectar com seu público.</p>
               <button onClick={() => setShowCreateModal(true)} className="btn-ghost text-sm">Configurar Transmissão</button>
            </div>
          )}
        </div>

        {/* Earnings & Withdraw */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="text-teal" size={20} />
            Financeiro
          </h2>
          <div className="bg-card border border-border-subtle p-8 rounded-3xl space-y-6 shadow-xl">
             <div>
                <div className="text-xs text-text-muted uppercase font-bold tracking-widest mb-1">Disponível para Saque</div>
                <div className="text-4xl font-mono font-black text-amber">◈ {user.coins.toLocaleString()}</div>
                <div className="text-xs text-text-muted mt-1">≈ R$ {(user.coins * 0.06).toFixed(2)}</div>
             </div>
             
             <div className="h-px bg-border-subtle" />
             
             <div className="space-y-4">
                <button 
                  disabled={user.coins < 500}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-not-allowed py-3"
                >
                  Solicitar Saque (PIX)
                </button>
                <div className="text-[10px] text-text-muted text-center uppercase tracking-tighter">
                  Mínimo para saque: ◈ 500
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Create Live Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/90 backdrop-blur-sm animate-in fade-in transition-all">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-card border border-border-subtle w-full max-w-lg rounded-3xl p-8 relative shadow-2xl"
           >
              <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-text-muted hover:text-red transition-colors">
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-black mb-8">Nova Transmissão</h2>
              
              <form onSubmit={startLive} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-text-muted">Título da Live</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Dê um nome atrativo para sua live..."
                    className="input-field w-full"
                    value={newLive.title}
                    onChange={e => setNewLive({...newLive, title: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-text-muted">Categoria</label>
                    <select 
                      className="input-field w-full"
                      value={newLive.category}
                      onChange={e => setNewLive({...newLive, category: e.target.value})}
                    >
                      <option>Música</option>
                      <option>Gaming</option>
                      <option>Conversa</option>
                      <option>Arte</option>
                      <option>Esportes</option>
                      <option>Educação</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-text-muted">Custo Entrada (◈)</label>
                    <input 
                      type="number" 
                      min="0"
                      className="input-field w-full font-mono"
                      value={newLive.coinEntry}
                      onChange={e => setNewLive({...newLive, coinEntry: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-text-muted">Custo da Janela (◈)</label>
                  <input 
                    type="number" 
                    min="10"
                    className="input-field w-full font-mono"
                    value={newLive.slotCost}
                    onChange={e => setNewLive({...newLive, slotCost: Number(e.target.value)})}
                  />
                  <p className="text-[10px] text-text-muted italic">Valor que participantes pagam para entrar na câmera.</p>
                </div>

                <button type="submit" className="w-full btn-primary py-4 mt-4">
                  Abrir Transmissão
                </button>
              </form>
           </motion.div>
        </div>
      )}

      {/* End Live Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/90 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card border border-border-subtle p-8 rounded-[32px] max-w-sm w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-red/10 text-red rounded-full flex items-center justify-center mx-auto">
                <Power size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black">Encerrar Live?</h3>
                <p className="text-text-muted text-sm">A transmissão será finalizada para todos os espectadores.</p>
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
                  className="flex-1 bg-red hover:bg-red/80 text-white py-4 font-bold rounded-2xl uppercase text-xs shadow-lg shadow-red/20 transition-all font-black"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-card border border-border-subtle p-6 rounded-2xl flex items-center gap-4">
      <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center text-xl">
        {icon}
      </div>
      <div>
        <div className="text-xs text-text-muted uppercase font-bold tracking-widest">{label}</div>
        <div className="text-2xl font-bold font-mono">{value}</div>
      </div>
    </div>
  );
}

import { Play, X } from 'lucide-react';
