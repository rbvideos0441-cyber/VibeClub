import React, { useEffect, useState, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, updateDoc } from 'firebase/firestore';
import { User, Live, BioPhoto } from '../types';
import { User as UserIcon, Calendar, Info, MapPin, MessageSquare, Play, Edit2, Save, X, Camera, Plus, Trash2, Image as ImageIcon, PlusCircle, AlertTriangle } from 'lucide-react';
import { LiveCard } from '../components/LiveCard';
import { motion, AnimatePresence } from 'motion/react';
import ReportModal from '../components/ReportModal';

export default function Profile() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [newGalleryItem, setNewGalleryItem] = useState<BioPhoto>({ url: '', description: '' });
  const [showGalleryForm, setShowGalleryForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const segments = window.location.pathname.split('/');
    // Check if it's /host/:id or /profile
    if (window.location.pathname === '/profile') {
      if (auth.currentUser) {
        setProfileId(auth.currentUser.uid);
      } else {
        // Redirect to feed if not logged in
        window.history.pushState({}, '', '/feed');
        window.dispatchEvent(new Event('pushstate'));
      }
    } else {
      const id = segments[segments.length - 1];
      if (id) setProfileId(id);
    }
  }, []);

  useEffect(() => {
    if (!profileId) return;

    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', profileId));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as User;
          setProfileUser(userData);
          setEditedUser(userData);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${profileId}`);
      }
    };

    fetchUser();

    // Fetch user's lives (only if they are a host)
    const livesRef = collection(db, 'lives');
    const q = query(
      livesRef, 
      where('hostId', '==', profileId),
      where('status', '==', 'live'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLives(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Live)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'lives');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profileId]);

  const isOwner = auth.currentUser?.uid === profileId;

  const handleSave = async () => {
    if (!profileId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', profileId), editedUser);
      setProfileUser(prev => prev ? ({ ...prev, ...editedUser }) : null);
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profileId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const navigateTo = (href: string) => {
    window.history.pushState({}, '', href);
    window.dispatchEvent(new Event('pushstate'));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedUser(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addGalleryItem = () => {
    if (!newGalleryItem.url) return;
    const currentGallery = editedUser.gallery || [];
    if (currentGallery.length >= 10) {
      alert("Máximo de 10 fotos permitido");
      return;
    }
    setEditedUser(prev => ({
      ...prev,
      gallery: [...currentGallery, newGalleryItem]
    }));
    setNewGalleryItem({ url: '', description: '' });
    setShowGalleryForm(false);
  };

  const removeGalleryItem = (index: number) => {
    setEditedUser(prev => ({
      ...prev,
      gallery: (prev.gallery || []).filter((_, i) => i !== index)
    }));
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewGalleryItem(prev => ({ ...prev, url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-2xl font-bold">Perfil não encontrado</h1>
        <p className="text-text-muted mt-2">O perfil que você está procurando não existe ou foi removido.</p>
        <button 
          onClick={() => navigateTo('/feed')}
          className="mt-6 text-teal hover:underline"
        >
          Voltar para o Feed
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      {/* Hero/Banner Section */}
      <div className="h-64 md:h-96 relative overflow-hidden bg-surface group">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg/80 z-10" />
        <img 
          src={editedUser.banner || profileUser.banner || `https://picsum.photos/seed/${profileId}/1920/1080`} 
          className="w-full h-full object-cover"
          alt="Banner"
        />
        {isEditing && (
          <button 
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/50 p-4 rounded-full text-white hover:bg-black/70 transition-all border border-white/20"
          >
            <Camera size={32} />
            <input 
              type="file" 
              ref={bannerInputRef} 
              hidden 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, 'banner')}
            />
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-24 md:-mt-32 relative z-20 space-y-8">
        {/* Profile Info Header */}
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="relative group">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-3xl border-4 border-bg bg-card overflow-hidden shadow-2xl relative">
              <img 
                src={editedUser.avatar || profileUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileId}`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                alt={profileUser.name}
              />
              {isEditing && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera size={24} />
                  <span className="text-[10px] uppercase font-bold mt-1">Trocar Foto</span>
                </button>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, 'avatar')}
            />
          </div>
          
          <div className="flex-1 space-y-3 pb-2 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              {isEditing ? (
                <input 
                  type="text"
                  value={editedUser.name}
                  onChange={(e) => setEditedUser(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-surface border border-border-subtle rounded-xl px-4 py-2 text-2xl font-black focus:border-teal outline-none w-full md:w-auto"
                />
              ) : (
                <h1 className="text-4xl font-black tracking-tight">{profileUser.name}</h1>
              )}
              {profileUser.role === 'host' ? (
                <span className="bg-teal/10 text-teal text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-teal/20">
                  Host Verificado
                </span>
              ) : profileUser.role === 'admin' ? (
                <span className="bg-amber/10 text-amber text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-amber/20">
                  Administrador
                </span>
              ) : (
                <span className="bg-white/5 text-text-muted text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
                  Membro
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-text-muted">
              <div className="flex items-center gap-1.5">
                <Calendar size={16} className="text-teal" />
                <span className="text-sm">Membro desde {new Date(profileUser.createdAt).getFullYear()}</span>
              </div>
              {profileUser.role === 'host' && (
                <div className="flex items-center gap-1.5 text-text-main">
                  <Play size={16} className="text-teal" />
                  <span className="text-sm font-bold">{lives.length} transmissões</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isOwner && (
              isEditing ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="btn-ghost flex items-center gap-2 px-6"
                  >
                    <X size={18} /> Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary flex items-center gap-2 px-6 shadow-teal-glow"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Save size={18} /> Salvar Perfil</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {profileUser.role === 'viewer' && (
                    <button 
                      onClick={() => navigateTo('/become-host')}
                      className="btn-primary flex items-center gap-2 px-6 shadow-teal-glow"
                    >
                      <PlusCircle size={18} /> Quero ser Host
                    </button>
                  )}
                  {profileUser.role === 'host' && lives.length === 0 && (
                    <button 
                      onClick={() => navigateTo('/dashboard/host?action=start')}
                      className="btn-primary flex items-center gap-2 px-6 shadow-teal-glow"
                    >
                      <PlusCircle size={18} /> Iniciar Live
                    </button>
                  )}
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="btn-surface flex items-center gap-2 px-6 border border-border-subtle"
                  >
                    <Edit2 size={18} /> Editar Perfil
                  </button>
                </div>
              )
            )}
            {!isEditing && !isOwner && (
              <div className="flex gap-2">
                <button className="btn-primary flex items-center gap-2 px-8">
                  <MessageSquare size={18} strokeWidth={2.5} /> Seguir
                </button>
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="bg-red/10 text-red border border-red/20 p-3 rounded-xl hover:bg-red/20 transition-all"
                  title="Denunciar Usuário"
                >
                  <AlertTriangle size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar: Bio & Info */}
          <div className="space-y-6">
            <div className="bg-card border border-border-subtle rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2">
                <Info className="text-teal" size={24} />
                Biografia
              </h2>
              
              {isEditing ? (
                <textarea 
                  value={editedUser.bio}
                  onChange={(e) => setEditedUser(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Conte um pouco sobre você..."
                  className="w-full bg-surface border border-border-subtle rounded-2xl p-4 text-sm leading-relaxed focus:border-teal outline-none min-h-[150px] resize-none"
                />
              ) : (
                <p className="text-text-muted leading-relaxed text-sm lg:text-base">
                  {profileUser.bio || "Este usuário ainda não adicionou uma biografia."}
                </p>
              )}
              
              <div className="pt-6 border-t border-border-subtle space-y-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted font-medium">Idioma</span>
                  <span className="text-text-main font-bold">Português (BR)</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-text-muted text-sm font-medium">Interesses</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-surface border border-teal/10 px-3 py-1 rounded-lg text-[10px] font-bold text-teal uppercase tracking-wider">Conversa</span>
                    <span className="bg-surface border border-teal/10 px-3 py-1 rounded-lg text-[10px] font-bold text-teal uppercase tracking-wider">Música</span>
                    <span className="bg-surface border border-teal/10 px-3 py-1 rounded-lg text-[10px] font-bold text-teal uppercase tracking-wider">Gaming</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery Section */}
            <div className="bg-card border border-border-subtle rounded-3xl p-6 lg:p-8 space-y-6 shadow-xl leading-none">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ImageIcon className="text-teal" size={22} />
                  Galeria do Bio
                </h2>
                {isEditing && (editedUser.gallery?.length || 0) < 10 && (
                  <button 
                    onClick={() => setShowGalleryForm(true)}
                    className="p-2 bg-teal/10 text-teal rounded-full hover:bg-teal/20 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>

              {showGalleryForm && (
                <div className="bg-surface p-4 rounded-2xl space-y-3 border border-teal/20 animate-in zoom-in-95 duration-200">
                  <div className="aspect-video bg-black/20 rounded-xl overflow-hidden relative flex items-center justify-center border-2 border-dashed border-white/5">
                    {newGalleryItem.url ? (
                      <img src={newGalleryItem.url} className="w-full h-full object-cover" />
                    ) : (
                      <button onClick={() => fileInputRef.current?.click()} className="text-text-muted flex flex-col items-center gap-1">
                         <Camera size={24} />
                         <span className="text-[10px] font-bold uppercase">Escolher Foto</span>
                         <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleGalleryUpload} />
                      </button>
                    )}
                  </div>
                  <input 
                    type="text"
                    placeholder="Descrição da foto..."
                    value={newGalleryItem.description}
                    onChange={(e) => setNewGalleryItem(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-bg border border-border-subtle rounded-xl px-3 py-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowGalleryForm(false)} className="flex-1 btn-ghost py-2 text-xs uppercase font-bold">Cancelar</button>
                    <button onClick={addGalleryItem} className="flex-1 btn-primary py-2 text-xs uppercase font-bold">Adicionar</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <AnimatePresence>
                  {(isEditing ? editedUser.gallery : profileUser.gallery)?.map((photo, idx) => (
                    <motion.div 
                      key={idx} 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer border border-white/5 shadow-md"
                    >
                      <img src={photo.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                        <p className="text-[10px] text-white font-medium leading-tight">{photo.description}</p>
                      </div>
                      {isEditing && (
                        <button 
                          onClick={() => removeGalleryItem(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </motion.div>
                  )) || (
                    <div className="col-span-2 py-8 text-center bg-surface/50 rounded-2xl border border-dashed border-border-subtle">
                       <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Nenhuma foto adicionada</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <Play className="text-teal" size={28} />
              {profileUser.role === 'host' ? 'Minhas Transmissões' : 'Transmissões Favoritas'}
            </h2>

            {profileUser.role === 'host' ? (
              lives.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                  {lives.map(live => (
                    <motion.div 
                      key={live.id}
                      whileHover={{ y: -5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <LiveCard live={live} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-card border-2 border-dashed border-border-subtle rounded-[40px] p-20 text-center flex flex-col items-center gap-4 shadow-inner">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-text-muted">
                    <Play size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-text-main font-bold text-lg">Nenhuma transmissão ainda</p>
                    <p className="text-text-muted max-w-xs mx-auto">Siga este host para ser notificado quando ele entrar ao vivo pela primeira vez!</p>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-card border-2 border-dashed border-border-subtle rounded-[40px] p-20 text-center flex flex-col items-center gap-4 shadow-inner">
                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-text-muted">
                  <Play size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-text-main font-bold text-lg">Área exclusiva para Hosts</p>
                  <p className="text-text-muted max-w-xs mx-auto">Torne-se um host para começar a realizar suas próprias lives e aparecer nesta área!</p>
                </div>
                {isOwner && (
                  <button 
                    onClick={() => navigateTo('/become-host')}
                    className="btn-primary mt-4 px-8"
                  >
                    Quero ser Host
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)}
        targetId={profileUser.id}
        targetType="user"
        targetName={profileUser.name}
      />
    </div>
  );
}
