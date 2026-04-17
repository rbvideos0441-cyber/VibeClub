import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'live' | 'user';
  targetName: string;
}

const REASONS = [
  'Conteúdo Inadequado',
  'Assédio ou Bullying',
  'Ódio ou Discriminação',
  'Spam ou Fraude',
  'Violação de Direitos Autorais',
  'Outro'
];

export default function ReportModal({ isOpen, onClose, targetId, targetType, targetName }: ReportModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Você precisa estar logado para denunciar');
      return;
    }
    if (!reason) {
      toast.error('Selecione um motivo');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.id,
        reporterName: user.name,
        targetId,
        targetType,
        targetName,
        reason,
        description,
        status: 'pending',
        createdAt: Date.now(),
      });
      setIsSuccess(true);
      toast.success('Denúncia enviada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reports');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {!isSuccess ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Denunciar {targetType === 'live' ? 'Live' : 'Usuário'}</h3>
                  <p className="text-xs text-text-muted">Denunciando: {targetName}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Motivo</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-bg border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal/50 transition-colors"
                    required
                  >
                    <option value="">Selecione um motivo</option>
                    {REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Descrição (Opcional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Adicione mais detalhes sobre a denúncia..."
                    className="w-full bg-bg border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal/50 transition-colors min-h-[100px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-red hover:bg-red/80 disabled:opacity-50 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Enviar Denúncia'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-teal" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Denúncia Recebida</h3>
              <p className="text-sm text-text-muted mb-6">
                Nossa equipe de moderação irá analisar sua denúncia em breve. 
                Obrigado por ajudar a manter o VibeClub seguro.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-surface border border-white/10 hover:bg-white/5 py-3 rounded-xl font-bold text-sm transition-all"
              >
                Fechar
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
