'use client';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b-2 border-cyan-500/20">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-cyan-400 hover:bg-neutral-900/50 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Page title with glitch effect on hover */}
        <h2 className="text-xl lg:text-2xl font-mono font-bold text-cyan-400 tracking-wider uppercase group">
          <span className="relative inline-block">
            {title}
            <span className="absolute inset-0 text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ transform: 'translate(-2px, -1px)' }}>
              {title}
            </span>
            <span className="absolute inset-0 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ transform: 'translate(2px, 1px)' }}>
              {title}
            </span>
          </span>
        </h2>

        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
            Online
          </span>
        </div>
      </div>

      {/* Animated line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
    </header>
  );
}
