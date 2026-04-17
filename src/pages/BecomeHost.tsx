import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { AppStatus } from '../types';
import { Send, CheckCircle, Clock, AlertCircle, Instagram, ShieldCheck, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BecomeHost() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    socialLink: '',
    whyHost: '',
    hasEquipment: 'Básico',
    categories: [] as string[],
  });
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'applications'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setApplication(snapshot.docs[0].data());
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'applications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat) 
        ? prev.categories.filter(c => c !== cat) 
        : [...prev.categories, cat]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (formData.categories.length === 0) {
      toast.error('Selecione pelo menos uma categoria');
      return;
    }

    try {
      await addDoc(collection(db, 'applications'), {
        ...formData,
        userId: user.id,
        status: 'pending',
        createdAt: Date.now(),
      });
      toast.success('Candidatura enviada com sucesso!');
    } catch (err) {
      toast.error('Erro ao enviar candidatura');
    }
  };

  if (!user) return <div className="p-20 text-center">Faça login para se candidatar.</div>;
  if (loading) return <div className="p-20 text-center">Carregando...</div>;

  if (application) {
    const navigateTo = (path: string) => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('pushstate'));
    };

    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        {application.status === 'pending' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-amber/10 rounded-full flex items-center justify-center mx-auto text-amber mb-8">
              <Clock size={48} />
            </div>
            <h1 className="text-3xl font-bold">Candidatura em Análise</h1>
            <p className="text-text-muted text-lg">
              Recebemos seu pedido, {application.displayName}! Nossa equipe de moderadores revisará seus dados em até 48 horas.
            </p>
            <div className="bg-card border border-border-subtle p-6 rounded-2xl text-left space-y-2">
              <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Resumo do Pedido</div>
              <div className="flex justify-between border-bottom border-border-subtle py-2">
                <span>Nome Artístico</span>
                <span className="font-bold text-teal">{application.displayName}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Status</span>
                <span className="text-amber font-bold">Pendente</span>
              </div>
            </div>
          </div>
        )}

        {application.status === 'approved' && (
          <div className="space-y-6 animate-in modal-enter">
            <div className="w-24 h-24 bg-teal/10 rounded-full flex items-center justify-center mx-auto text-teal mb-8 border-2 border-teal">
              <CheckCircle size={48} />
            </div>
            <h1 className="text-3xl font-bold">Parabéns, Host!</h1>
            <p className="text-text-muted text-lg">
              Sua candidatura foi aprovada. Você agora tem acesso total ao painel do host e pode iniciar transmissões.
            </p>
            <button 
              onClick={() => navigateTo('/dashboard/host')}
              className="btn-primary"
            >
              Ir para o Dashboard
            </button>
          </div>
        )}

        {application.status === 'rejected' && (
          <div className="space-y-6">
            <div className="w-24 h-24 bg-red/10 rounded-full flex items-center justify-center mx-auto text-red mb-8 border-2 border-red">
              <AlertCircle size={48} />
            </div>
            <h1 className="text-3xl font-bold">Candidatura Rejeitada</h1>
            <p className="text-text-muted text-lg">
              Infelizmente sua candidatura não foi aprovada neste momento.
            </p>
            {application.adminNote && (
              <div className="bg-red/5 border border-red/20 p-4 rounded-xl text-red text-sm italic">
                Motivo: {application.adminNote}
              </div>
            )}
            <p className="text-sm text-text-muted mt-8">Você poderá tentar novamente em 30 dias.</p>
          </div>
        )}
      </div>
    );
  }

  const allCategories = ['Música ao vivo', 'Gaming', 'Conversa/Podcast', 'Arte e Criatividade', 'Esportes', 'Culinária', 'Educação', 'Entretenimento'];

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-in slide-in-from-bottom-5 duration-700">
      <div className="mb-12">
        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal to-teal-glow">
          Seja um Host no VibeClub
        </h1>
        <p className="text-text-muted mt-4 text-lg">
          Transforme sua paixão em ganhos reais. Nossa comunidade aguarda seu conteúdo único.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-teal font-bold text-lg uppercase tracking-wider border-bottom border-teal/20 pb-2">
            <ShieldCheck size={20} />
            Dados Básicos
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-muted">Nome Artístico</label>
              <input 
                type="text" 
                required 
                placeholder="Ex: DJ Vibe ou NinjaGamer"
                className="input-field" 
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-muted">Link de Rede Social</label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="url" 
                  required 
                  placeholder="https://instagram.com/seuuser"
                  className="input-field pl-10 w-full" 
                  value={formData.socialLink}
                  onChange={e => setFormData({...formData, socialLink: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-text-muted">Sobre você (Bio)</label>
            <textarea 
              required 
              rows={3}
              placeholder="Conte-nos um pouco sobre quem você é e o que pretende trazer para as lives..."
              className="input-field resize-none" 
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-teal font-bold text-lg uppercase tracking-wider border-bottom border-teal/20 pb-2">
            <Heart size={20} />
            Conteúdo e Infra
          </div>

          <div className="flex flex-col gap-4 text-sm font-bold text-text-muted">
            Categorias de Conteúdo (Selecione o que se aplica)
            <div className="flex flex-wrap gap-2">
              {allCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-xl border transition-all ${
                    formData.categories.includes(cat) 
                    ? 'bg-teal border-teal text-bg shadow-md' 
                    : 'bg-surface border-border-subtle text-text-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-text-muted">Equipamento</label>
            <select 
              className="input-field cursor-pointer"
              value={formData.hasEquipment}
              onChange={e => setFormData({...formData, hasEquipment: e.target.value})}
            >
              <option value="Básico">Básico (Celular/Webcam)</option>
              <option value="Intermediário">Intermediário (Microfone USB/Câmera HD)</option>
              <option value="Profissional">Profissional (Estúdio/Câmera 4K)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-text-muted">Por que você quer ser host?</label>
            <textarea 
              required 
              rows={2}
              placeholder="Qual sua motivação principal?"
              className="input-field resize-none" 
              value={formData.whyHost}
              onChange={e => setFormData({...formData, whyHost: e.target.value})}
            />
          </div>
        </section>

        <div className="pt-6 border-top border-border-subtle flex items-center justify-between">
          <p className="text-xs text-text-muted max-w-sm">
            Ao se candidatar, você concorda com nossos termos de conduta e transparência financeira.
          </p>
          <button type="submit" className="btn-primary flex items-center gap-2 px-10">
            Enviar Candidatura
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
