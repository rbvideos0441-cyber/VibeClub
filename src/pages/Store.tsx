import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, onSnapshot } from 'firebase/firestore';
import { CoinPackage } from '../types';
import { Wallet, History, CreditCard, Landmark, Check, Star, Zap, Crown as CrownIcon, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Store() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [fetching, setFetching] = useState(true);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'system', 'store_config', 'packages'), (snapshot) => {
      const pkgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoinPackage));
      setPackages(pkgs.sort((a, b) => (a.order || 0) - (b.order || 0)));
      setFetching(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'system/store_config/packages');
      setFetching(false);
    });

    return () => unsubscribe();
  }, []);

  const buyCoins = async (pkg: CoinPackage) => {
    if (!user) {
      toast.error('Faça login para comprar moedas');
      return;
    }

    setLoading(true);
    toast.loading('Iniciando pagamento...', { id: 'payment' });

    // In a real app, this would redirect to Stripe/MercadoPago
    // For this demo, we simulate a successful payment after 2 seconds
    setTimeout(async () => {
      try {
        const totalCoins = pkg.coins + pkg.bonus;
        
        // 1. Credit user
        await updateDoc(doc(db, 'users', user.id), {
          coins: increment(totalCoins)
        });

        // 2. Log transaction
        await addDoc(collection(db, 'transactions'), {
          userId: user.id,
          type: 'purchase',
          amount: totalCoins,
          description: `Compra do pacote ${pkg.name}`,
          createdAt: Date.now()
        });

        toast.success(`◈ ${totalCoins} creditados com sucesso!`, { id: 'payment' });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.id}/transactions`);
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <div className="px-4 md:px-8 py-10 max-w-6xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber to-teal-glow">
            Loja VibeClub
          </h1>
          <p className="text-text-muted mt-2">Adquira VibeCoins para interagir e apoiar seus hosts favoritos.</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl flex items-center gap-6 shadow-xl">
          <div className="coin-balance px-6 py-3 scale-110">
            <span className="text-xl">◈ {user ? user.coins.toLocaleString() : '---'}</span>
          </div>
          {user?.role === 'host' && (
            <button className="btn-ghost text-xs px-4 ml-4">Sacar</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {fetching ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Carregando ofertas...</p>
          </div>
        ) : packages.map((pkg, i) => (
          <div key={pkg.id} className="bg-card border border-border-subtle rounded-3xl p-8 relative overflow-hidden group hover:border-teal transition-all shadow-xl">
            {i === 1 && (
              <div className="absolute top-0 right-0 badge-live bg-teal shadow-[0_0_15px_rgba(0,201,167,0.3)] animate-none">
                POPULAR
              </div>
            )}
            
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-surface rounded-2xl text-teal border border-teal/10 shadow-inner">
                {pkg.coins < 500 ? <Zap /> : pkg.coins < 2000 ? <Star /> : <CrownIcon />}
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-text-main">R$ {pkg.priceBrl.toFixed(2)}</div>
                <div className="text-[10px] text-text-muted uppercase font-bold tracking-tighter mt-1">Cobrança única</div>
              </div>
            </div>

            <div className="mb-8 p-4 bg-bg/40 rounded-2xl border border-white/5">
              <div className="text-3xl font-mono font-black text-amber flex items-center gap-2 drop-shadow-lg">
                ◈ {pkg.coins.toLocaleString()}
              </div>
              {(pkg.bonus || 0) > 0 && (
                <div className="text-teal font-black text-[11px] mt-1 bg-teal/10 inline-block px-2 py-0.5 rounded uppercase tracking-widest">
                  + {pkg.bonus} bônus extra
                </div>
              )}
            </div>

            <button 
              onClick={() => buyCoins(pkg)}
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-4 shadow-teal-glow"
            >
              <CreditCard size={20} />
              Comprar Agora
            </button>

            <div className="mt-6 space-y-3">
              <Feature text="Acesso instantâneo" />
              <Feature text="Apoie criadores" />
              <Feature text="Destaque no chat" />
            </div>
          </div>
        ))}
        {!fetching && packages.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border-subtle rounded-3xl">
             <p className="text-text-muted">Nenhum pacote disponível no momento.</p>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border-subtle rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <History className="text-teal" />
          <h2 className="text-xl font-bold">Segurança e Pagamento</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <SecurityCard 
            icon={<ShieldCheck className="text-teal" size={32} />} 
            title="SSL Criptografado" 
            desc="Suas transações são totalmente seguras com criptografia de ponta a ponta." 
          />
          <SecurityCard 
            icon={<Landmark className="text-teal" size={32} />} 
            title="Vários Métodos" 
            desc="Pague via PIX, Cartão de Crédito ou Boleto através dos nossos parceiros oficiais." 
          />
          <SecurityCard 
            icon={<Check className="text-teal" size={32} />} 
            title="Crédito Imediato" 
            desc="As moedas caem na sua conta assim que o pagamento é confirmado." 
          />
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <div className="w-1 h-1 bg-teal rounded-full" />
      {text}
    </div>
  );
}

function SecurityCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="space-y-3">
      {icon}
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
    </div>
  );
}
