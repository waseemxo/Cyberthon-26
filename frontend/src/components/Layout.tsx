import { Link, useLocation } from 'react-router-dom';
import { History, Upload } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Analyze', icon: Upload },
    { path: '/history', label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background Orbs */}
      <div className="orb" style={{ width: 300, height: 300, background: '#FF8C42', top: '-5%', left: '-5%' }} />
      <div className="orb" style={{ width: 250, height: 250, background: '#06B6D4', bottom: '5%', right: '-3%', animationDelay: '-7s' }} />
      <div className="orb" style={{ width: 150, height: 150, background: '#FF8C42', bottom: '20%', left: '40%', animationDelay: '-13s' }} />

      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none scanline-overlay opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 no-underline group">
              <img
                src="/lucid-logo.png"
                alt="LUCID"
                className="h-9 w-auto group-hover:drop-shadow-[0_0_8px_rgba(255,140,66,0.4)] transition-all"
              />
              <div>
                <span className="text-lg font-bold text-primary font-mono tracking-widest glow-text">
                  LUCID
                </span>
                <span className="hidden sm:block text-[10px] text-text-muted font-mono leading-none mt-0.5">
                  Layered Unforgable Content Integrity Detection
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive =
                  path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-medium transition-all no-underline ${
                      isActive
                        ? 'bg-primary/15 text-primary-light border border-primary/20'
                        : 'text-text-secondary hover:text-primary-light hover:bg-surface-lighter border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-text-muted text-sm font-mono">
            LUCID — Layered Unforgable Content Integrity Detection
          </p>
        </div>
      </footer>
    </div>
  );
}
