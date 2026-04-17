import React from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, LogOut, Menu, User, Wallet, Compass, LayoutDashboard, PlusCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: (e: any, href: string) => void;
}

const NavLink: React.FC<NavLinkProps> = ({ href, icon, children, onClick }) => {
  return (
    <a href={href} onClick={(e) => onClick(e, href)} className="flex items-center gap-2 text-text-muted hover:text-teal transition-colors font-medium">
      {icon}
      {children}
    </a>
  );
};

const MenuLink: React.FC<NavLinkProps> = ({ href, icon, children, onClick }) => {
  return (
    <a href={href} onClick={(e) => onClick(e, href)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-muted hover:bg-surface hover:text-text-main transition-colors text-sm">
      {icon}
      {children}
    </a>
  );
};

export function Navbar() {
  const { user, signIn, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  const navigateTo = (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement | HTMLButtonElement>, href: string) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new Event('pushstate'));
    setIsMenuOpen(false);
    setIsMobileNavOpen(false);
  };

  const navLinks = [
    { href: '/feed', label: 'Explorar', icon: <Compass size={18} /> },
    { href: '/dashboard/host', label: 'Dashboard', icon: <LayoutDashboard size={18} />, hidden: user?.role !== 'host' },
    { href: '/admin', label: 'Admin', icon: <ShieldCheck size={18} />, hidden: user?.role !== 'admin' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel h-16 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="md:hidden p-2 text-text-muted hover:text-teal transition-colors"
          >
            <Menu size={24} />
          </button>
          <div 
            onClick={(e) => navigateTo(e, '/feed')} 
            className="logo text-xl md:text-2xl font-black flex items-center gap-2 group cursor-pointer"
          >
            VIBE<span className="text-teal group-hover:text-teal-glow transition-colors">CLUB</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          {navLinks.filter(link => !link.hidden).map(link => (
            <NavLink key={link.href} href={link.href} icon={link.icon} onClick={navigateTo}>{link.label}</NavLink>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {user ? (
          <div className="flex items-center gap-2 md:gap-4">
            <div className="coin-balance hidden xs:flex">
              <span>◈ {user.coins.toLocaleString()}</span>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-10 h-10 rounded-full border border-border-subtle overflow-hidden hover:border-teal transition-all flex items-center justify-center bg-surface"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-teal font-bold">{user.name.charAt(0)}</span>
                )}
              </button>

              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border-subtle rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in duration-200">
                  <div className="px-3 py-2 border-b border-border-subtle mb-2 md:hidden">
                    <p className="text-xs text-text-muted uppercase font-bold tracking-widest">Seu Saldo</p>
                    <p className="text-teal font-mono font-bold">◈ {user.coins.toLocaleString()}</p>
                  </div>
                  <MenuLink href="/profile" icon={<User size={16} />} onClick={navigateTo}>Meu Perfil</MenuLink>
                  <MenuLink href="/store" icon={<Wallet size={16} />} onClick={navigateTo}>Comprar Moedas</MenuLink>
                  {user.role === 'viewer' && (
                    <MenuLink href="/become-host" icon={<PlusCircle size={16} />} onClick={navigateTo}>Ser um Host</MenuLink>
                  )}
                  <div className="h-px bg-border-subtle my-2" />
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red hover:bg-red/10 transition-colors text-sm"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button onClick={signIn} className="btn-primary flex items-center gap-2 py-1.5 px-4 md:py-2 md:px-6 text-sm md:text-base">
            <LogIn size={18} />
            <span className="hidden sm:inline">Entrar</span>
          </button>
        )}
      </div>

      {/* Mobile Sidebar Navigation */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileNavOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-64 bg-card border-r border-border-subtle p-6 animate-in slide-in-from-left duration-300">
            <div className="logo text-xl font-black mb-10">
              VIBE<span className="text-teal">CLUB</span>
            </div>
            
            <div className="space-y-6">
              {navLinks.filter(link => !link.hidden).map(link => (
                <button 
                  key={link.href}
                  onClick={(e) => navigateTo(e, link.href)}
                  className="w-full flex items-center gap-4 text-text-muted hover:text-teal transition-colors font-medium text-lg"
                >
                  {link.icon}
                  {link.label}
                </button>
              ))}
            </div>

            <div className="absolute bottom-10 left-6 right-6 pt-6 border-t border-border-subtle">
              {user ? (
                <button onClick={logout} className="flex items-center gap-3 text-red font-medium">
                  <LogOut size={20} />
                  Sair da Conta
                </button>
              ) : (
                <button onClick={signIn} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  <LogIn size={20} />
                  Entrar no Club
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
