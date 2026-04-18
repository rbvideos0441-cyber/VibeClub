import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Calendar, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SESSION_KEY = 'vibeclub_age_confirmed';

export function AgeGate() {
  const { user, verifyAge, logout } = useAuth();
  const [showGate, setShowGate] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [isMinor, setIsMinor] = useState(false);

  useEffect(() => {
    // 1. If user is logged in but not verified in DB
    if (user && !user.isAgeVerified) {
      setShowGate(true);
      return;
    }

    // 2. If user is NOT logged in, check session storage
    if (!user) {
      const isConfirmed = sessionStorage.getItem(SESSION_KEY);
      if (!isConfirmed) {
        setShowGate(true);
      } else {
        setShowGate(false);
      }
    } else {
      // User is logged in and verified
      setShowGate(false);
    }
  }, [user]);

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleConfirmLogged = async () => {
    if (!birthDate) {
      toast.error('Por favor, insira sua data de nascimento.');
      return;
    }

    const age = calculateAge(birthDate);
    if (age < 18) {
      setIsMinor(true);
      toast.error('Você precisa ter 18 anos ou mais para acessar o VibeClub.');
      setTimeout(() => {
        logout();
        window.location.href = 'https://www.google.com';
      }, 3000);
      return;
    }

    await verifyAge(new Date(birthDate).getTime());
  };

  const handleConfirmGuest = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setShowGate(false);
    toast.success('Bem-vindo ao VibeClub!');
  };

  const handleDeclineGuest = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!showGate) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal/5 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative max-w-md w-full bg-card border border-white/10 p-8 lg:p-12 rounded-[40px] shadow-2xl text-center space-y-8"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red/10 text-red rounded-3xl flex items-center justify-center rotate-12">
            <ShieldAlert size={44} />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">
            Acesso Restrito
          </h1>
          <p className="text-text-muted text-sm leading-relaxed">
            O VibeClub é uma plataforma exclusiva para adultos (+18). 
            {user ? ' Por favor, verifique sua identidade informando sua data de nascimento.' : ' Você confirma que possui 18 anos ou mais?'}
          </p>
        </div>

        {user ? (
          <div className="space-y-6">
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-teal transition-colors" size={20} />
              <input 
                type="date" 
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-surface border border-white/5 px-12 py-4 rounded-2xl text-sm focus:outline-none focus:border-teal/50 transition-all appearance-none"
              />
            </div>
            
            <button 
              onClick={handleConfirmLogged}
              disabled={isMinor}
              className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal hover:text-bg transition-all shadow-xl disabled:opacity-50"
            >
              Verificar e Entrar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleDeclineGuest}
              className="py-5 bg-surface text-text-muted rounded-2xl font-black uppercase text-xs tracking-widest hover:text-red transition-all border border-white/5"
            >
              Sou Menor
            </button>
            <button 
              onClick={handleConfirmGuest}
              className="py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal hover:text-bg transition-all shadow-xl"
            >
              Tenho +18
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-white/5">
          <p className="text-[10px] text-text-muted/50 uppercase tracking-[0.2em] font-bold">
            Política de Segurança VibeClub &copy; 2026
          </p>
        </div>

        {isMinor && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-x-8 bottom-8 bg-red/90 text-white p-4 rounded-2xl text-sm font-bold flex items-center gap-2 justify-center"
          >
            <XCircle size={18} /> Acesso negado. Redirecionando...
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
