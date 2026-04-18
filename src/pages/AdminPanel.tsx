import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { Live, AppStatus, CoinPackage } from '../types';
import { ShieldCheck, Plus, Trash2, Edit2, Play, Check, X, UserCheck, MessageSquare, Wallet, Save, AlertTriangle, ExternalLink, Users, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [lives, setLives] = useState<Live[]>([]);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [hostSearch, setHostSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'apps' | 'lives' | 'store' | 'reports' | 'hosts'>('apps');
  const [reportFilter, setReportFilter] = useState({
    status: 'all' as 'all' | 'pending' | 'resolved' | 'dismissed',
    type: 'all' as 'all' | 'live' | 'user'
  });

  const [editingPkg, setEditingPkg] = useState<Partial<CoinPackage> | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    const unsubscribeApps = onSnapshot(collection(db, 'applications'), (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'applications');
    });

    const unsubscribeLives = onSnapshot(collection(db, 'lives'), (snapshot) => {
      setLives(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Live)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'lives');
    });

    const unsubscribePkgs = onSnapshot(collection(db, 'system', 'store_config', 'packages'), (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoinPackage)).sort((a, b) => (a.order || 0) - (b.order || 0)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'system/store_config/packages');
    });

    const unsubscribeReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'reports');
    });

    const unsubscribeHosts = onSnapshot(query(collection(db, 'users'), where('role', '==', 'host')), (snapshot) => {
      setHosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    setLoading(false);
    return () => {
      unsubscribeApps();
      unsubscribeLives();
      unsubscribePkgs();
      unsubscribeReports();
      unsubscribeHosts();
    };
  }, [user]);

  const updateAppStatus = async (appId: string, userId: string, status: AppStatus) => {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status,
        reviewedAt: Date.now()
      });
      
      if (status === 'approved') {
        await updateDoc(doc(db, 'users', userId), {
          role: 'host'
        });
      }
      toast.success(`Candidatura ${status === 'approved' ? 'aprovada' : 'rejeitada'}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'applications');
    }
  };

  const createMockLive = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'lives'), {
        hostId: user.id,
        hostName: 'Vibe Admin',
        hostAvatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`,
        title: 'Live de Teste da Plataforma',
        description: 'Testando as interações iniciais do VibeClub.',
        status: 'live',
        coinEntry: 0,
        slotCost: 50,
        viewerCount: Math.floor(Math.random() * 500) + 10,
        category: 'Conversa',
        createdAt: Date.now(),
      });
      toast.success('Live de teste criada! Verifique o Feed.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'lives');
    }
  };

  const savePackage = async () => {
    if (!editingPkg?.name || !editingPkg?.coins || !editingPkg?.priceBrl) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      if (editingPkg.id) {
        await updateDoc(doc(db, 'system', 'store_config', 'packages', editingPkg.id), editingPkg);
        toast.success('Pacote atualizado');
      } else {
        await addDoc(collection(db, 'system', 'store_config', 'packages'), {
          ...editingPkg,
          isActive: true,
          order: packages.length + 1
        });
        toast.success('Pacote criado');
      }
      setEditingPkg(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system/store_config/packages');
    }
  };

  const deletePackage = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      await deleteDoc(doc(db, 'system', 'store_config', 'packages', id));
      toast.success('Pacote removido');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `system/store_config/packages/${id}`);
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status,
        resolvedAt: Date.now()
      });
      toast.success('Status da denúncia atualizado');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const revokeHost = async (hostId: string) => {
    if (!confirm('Tem certeza que deseja revogar o status de Host? O usuário voltará a ser Viewer.')) return;
    try {
      await updateDoc(doc(db, 'users', hostId), {
        role: 'viewer'
      });
      toast.success('Status de Host revogado com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${hostId}`);
    }
  };

  const navigateToHost = (hostId: string) => {
    const href = `/host/${hostId}`;
    window.history.pushState({}, '', href);
    window.dispatchEvent(new Event('pushstate'));
  };

  const filteredReports = reports.filter(r => {
    const statusMatch = reportFilter.status === 'all' || r.status === reportFilter.status;
    const typeMatch = reportFilter.type === 'all' || r.targetType === reportFilter.type;
    return statusMatch && typeMatch;
  });

  const filteredHosts = hosts.filter(h => {
    const search = hostSearch.toLowerCase();
    return h.name.toLowerCase().includes(search) || h.id.toLowerCase().includes(search) || h.email.toLowerCase().includes(search);
  });

  if (user?.role !== 'admin') return <div className="p-20 text-center">Acesso negado. Apenas administradores.</div>;

  return (
    <div className="px-4 md:px-8 py-10 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <ShieldCheck className="text-teal" size={32} />
          Painel Administrativo
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('apps')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'apps' ? 'bg-teal text-bg shadow-teal-glow' : 'bg-surface text-text-muted hover:text-text-main'}`}>
            Candidaturas
          </button>
          <button onClick={() => setActiveTab('lives')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'lives' ? 'bg-teal text-bg shadow-teal-glow' : 'bg-surface text-text-muted hover:text-text-main'}`}>
            Lives
          </button>
          <button onClick={() => setActiveTab('store')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'store' ? 'bg-teal text-bg shadow-teal-glow' : 'bg-surface text-text-muted hover:text-text-main'}`}>
            Loja
          </button>
          <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-teal text-bg shadow-teal-glow' : 'bg-surface text-text-muted hover:text-text-main'}`}>
            Denúncias {reports.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 text-[10px] bg-red text-white px-1.5 py-0.5 rounded-full">{reports.filter(r => r.status === 'pending').length}</span>}
          </button>
          <button onClick={() => setActiveTab('hosts')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'hosts' ? 'bg-teal text-bg shadow-teal-glow' : 'bg-surface text-text-muted hover:text-text-main'}`}>
            Gerenciar Hosts
          </button>
        </div>
      </div>

      {activeTab === 'apps' && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="text-teal" size={20} />
            Candidaturas Pendentes ({applications.filter(a => a.status === 'pending').length})
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {applications.filter(a => a.status === 'pending').map(app => (
              <div key={app.id} className="bg-card border border-border-subtle p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{app.displayName}</h3>
                    <span className="text-xs bg-surface px-2 py-0.5 rounded text-text-muted">{app.userId.slice(0, 8)}</span>
                  </div>
                  <p className="text-sm text-text-muted italic mb-4">"{app.bio}"</p>
                  <div className="flex flex-wrap gap-2">
                    {app.categories.map((c: string) => (
                      <span key={c} className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded font-bold uppercase">{c}</span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => updateAppStatus(app.id, app.userId, 'approved')}
                    className="bg-teal text-bg font-bold p-3 rounded-xl hover:scale-105 transition-transform"
                  >
                    <Check size={20} />
                  </button>
                  <button 
                    onClick={() => updateAppStatus(app.id, app.userId, 'rejected')}
                    className="bg-red/10 text-red border border-red/20 font-bold p-3 rounded-xl hover:bg-red/20 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))}
            {applications.filter(a => a.status === 'pending').length === 0 && (
               <p className="text-text-muted text-center py-10 bg-surface rounded-2xl border border-dashed border-border-subtle">
                 Nenhuma candidatura pendente no momento.
               </p>
            )}
          </div>
        </section>
      )}
      {activeTab === 'lives' && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Play className="text-teal" size={20} />
              Lives Ativas ({lives.filter(l => l.status === 'live').length})
            </h2>
            <button onClick={createMockLive} className="btn-ghost text-xs flex items-center gap-2">
              <Plus size={16} /> Criar Live Mock
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {lives.filter(l => l.status === 'live').map(live => (
               <div key={live.id} className="bg-card border border-border-subtle rounded-xl p-4 flex gap-4">
                  <div 
                    onClick={() => navigateToHost(live.hostId)}
                    className="w-16 h-16 rounded-lg bg-surface overflow-hidden cursor-pointer hover:border-teal transition-all border border-transparent"
                  >
                    <img src={live.thumbnail || `https://picsum.photos/seed/${live.id}/200`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate">{live.title}</h4>
                    <p 
                      onClick={() => navigateToHost(live.hostId)}
                      className="text-xs text-text-muted truncate hover:text-teal cursor-pointer transition-colors"
                    >
                      por {live.hostName}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                       <div className="flex items-center gap-1 text-[10px] text-teal">
                          <Play size={10} /> {live.viewerCount}
                       </div>
                       <button className="text-[10px] text-red hover:underline">Encerrar</button>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </section>
      )}

      {activeTab === 'store' && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="text-teal" size={20} />
              Configuração da Loja
            </h2>
            {!editingPkg && (
              <button 
                onClick={() => setEditingPkg({ name: '', coins: 0, bonus: 0, priceBrl: 0 })}
                className="btn-primary text-xs flex items-center gap-2"
              >
                <Plus size={16} /> Novo Pacote
              </button>
            )}
          </div>

          {editingPkg && (
            <div className="bg-surface border border-teal/20 rounded-3xl p-8 space-y-6 shadow-2xl">
              <h3 className="text-lg font-bold">{editingPkg.id ? 'Editar Pacote' : 'Novo Pacote de Moedas'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest pl-1">Nome do Pacote</label>
                  <input 
                    type="text" 
                    value={editingPkg.name}
                    onChange={e => setEditingPkg({ ...editingPkg, name: e.target.value })}
                    className="w-full input-field"
                    placeholder="Ex: Starter, Gold, VIP..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest pl-1">Moedas Base</label>
                  <input 
                    type="number" 
                    value={editingPkg.coins}
                    onChange={e => setEditingPkg({ ...editingPkg, coins: Number(e.target.value) })}
                    className="w-full input-field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest pl-1">Bônus Extra</label>
                  <input 
                    type="number" 
                    value={editingPkg.bonus}
                    onChange={e => setEditingPkg({ ...editingPkg, bonus: Number(e.target.value) })}
                    className="w-full input-field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest pl-1">Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingPkg.priceBrl}
                    onChange={e => setEditingPkg({ ...editingPkg, priceBrl: Number(e.target.value) })}
                    className="w-full input-field"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button onClick={() => setEditingPkg(null)} className="btn-ghost text-sm">Cancelar</button>
                <button onClick={savePackage} className="btn-primary text-sm flex items-center gap-2">
                  <Save size={16} /> Salvar Pacote
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map(pkg => (
              <div key={pkg.id} className="bg-card border border-border-subtle rounded-3xl p-6 group hover:border-teal/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-black">{pkg.name}</h4>
                    <p className="text-teal font-mono text-xl">◈ {(pkg.coins + (pkg.bonus || 0)).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text-main">R$ {pkg.priceBrl.toFixed(2)}</p>
                    <p className="text-[10px] text-text-muted">{pkg.coins} + {pkg.bonus} bônus</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-border-subtle opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingPkg(pkg)}
                    className="flex-1 btn-ghost py-2 text-xs flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                  <button 
                    onClick={() => deletePackage(pkg.id!)}
                    className="bg-red/10 text-red p-2 rounded-lg hover:bg-red/20 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {packages.length === 0 && !editingPkg && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-border-subtle rounded-3xl">
                <p className="text-text-muted">Nenhum pacote de moedas configurado.</p>
                <button 
                  onClick={() => setEditingPkg({ name: '', coins: 0, bonus: 0, priceBrl: 0 })}
                  className="mt-4 text-teal hover:underline text-sm font-bold"
                >
                  Criar o primeiro agora →
                </button>
              </div>
            )}
          </div>
        </section>
      )}
      {activeTab === 'reports' && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="text-red" size={20} />
              Denúncias Recebidas ({filteredReports.length})
            </h2>
            
            <div className="flex flex-wrap gap-2">
              <select 
                value={reportFilter.status}
                onChange={(e) => setReportFilter(prev => ({ ...prev, status: e.target.value as any }))}
                className="bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-teal/50 transition-colors"
              >
                <option value="all">Todos Status</option>
                <option value="pending">Pendentes</option>
                <option value="resolved">Resolvidas</option>
                <option value="dismissed">Descartadas</option>
              </select>

              <select 
                value={reportFilter.type}
                onChange={(e) => setReportFilter(prev => ({ ...prev, type: e.target.value as any }))}
                className="bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-teal/50 transition-colors"
              >
                <option value="all">Todos Tipos</option>
                <option value="live">Lives</option>
                <option value="user">Usuários</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredReports.map(report => (
              <div key={report.id} className="bg-card border border-border-subtle p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      report.status === 'pending' ? 'bg-amber/10 text-amber' : 
                      report.status === 'resolved' ? 'bg-teal/10 text-teal' : 'bg-white/10 text-text-muted'
                    }`}>
                      {report.status}
                    </span>
                    <h3 className="font-bold text-lg">{report.reason}</h3>
                  </div>
                  <p className="text-sm text-text-main">
                    Alvo: <span className="font-bold">{report.targetName}</span> ({report.targetType})
                  </p>
                  {report.description && (
                    <p className="text-xs text-text-muted bg-surface/50 p-3 rounded-lg italic">
                      "{report.description}"
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-[10px] text-text-muted">
                    <span>Por: {report.reporterName}</span>
                    <span>Em: {new Date(report.createdAt).toLocaleString()}</span>
                    <button 
                      onClick={() => navigateToHost(report.targetType === 'user' ? report.targetId : report.targetId)}
                      className="text-teal hover:underline flex items-center gap-1"
                    >
                      Ver Alvo <ExternalLink size={10} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  {report.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => updateReportStatus(report.id, 'resolved')}
                        className="bg-teal/10 text-teal border border-teal/20 text-xs font-bold px-4 py-2 rounded-xl hover:bg-teal/20 transition-all"
                      >
                        Resolver
                      </button>
                      <button 
                        onClick={() => updateReportStatus(report.id, 'dismissed')}
                        className="text-text-muted hover:text-text-main text-xs font-bold px-4 py-2 rounded-xl transition-all"
                      >
                        Descartar
                      </button>
                    </>
                  )}
                  <button 
                    onClick={async () => {
                      if(confirm('Excluir registro da denúncia?')) {
                        await deleteDoc(doc(db, 'reports', report.id));
                        toast.success('Registro excluído');
                      }
                    }}
                    className="text-white/20 hover:text-red p-2 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {filteredReports.length === 0 && (
              <p className="text-text-muted text-center py-20 border-2 border-dashed border-border-subtle rounded-3xl">
                Nenhuma denúncia encontrada para estes filtros.
              </p>
            )}
          </div>
        </section>
      )}
      {activeTab === 'hosts' && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-teal" size={20} />
              Hosts Ativos ({filteredHosts.length})
            </h2>

            <div className="relative w-full md:w-64">
              <input 
                type="text" 
                placeholder="Buscar por nome, email ou ID..."
                value={hostSearch}
                onChange={(e) => setHostSearch(e.target.value)}
                className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-teal/50 transition-all pl-10"
              />
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHosts.map(host => (
              <div key={host.id} className="bg-card border border-border-subtle p-4 rounded-2xl flex items-center justify-between gap-4 hover:border-teal/20 transition-all group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-surface overflow-hidden shrink-0 border border-white/5">
                    <img src={host.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${host.id}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate group-hover:text-teal transition-colors">{host.name}</h4>
                    <p className="text-[10px] text-text-muted truncate font-mono">{host.id}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Saldo</span>
                        <span className="text-xs font-mono text-teal bg-teal/5 px-2 py-0.5 rounded w-fit">◈ {host.coins.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col border-l border-white/5 pl-4">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Acumulado</span>
                        <span className="text-xs font-mono text-amber bg-amber/5 px-2 py-0.5 rounded w-fit">◈ {(host.totalEarnings || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigateToHost(host.id)}
                    className="p-2 bg-surface hover:bg-white/5 rounded-lg text-text-muted hover:text-teal transition-all"
                    title="Ver Perfil"
                  >
                    <ExternalLink size={18} />
                  </button>
                  <button 
                    onClick={() => revokeHost(host.id)}
                    className="p-2 bg-red/10 hover:bg-red/20 rounded-lg text-red transition-all"
                    title="Revogar Status de Host"
                  >
                    <ShieldAlert size={18} />
                  </button>
                </div>
              </div>
            ))}
            {filteredHosts.length === 0 && (
              <p className="col-span-full text-text-muted text-center py-20 border-2 border-dashed border-border-subtle rounded-3xl">
                Nenhum host encontrado para esta busca.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
