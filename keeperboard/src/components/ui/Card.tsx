import { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  description?: string;
  footer?: ReactNode;
  className?: string;
  glowEffect?: boolean;
  style?: CSSProperties;
}

export default function Card({
  children,
  title,
  description,
  footer,
  className = '',
  glowEffect = false,
  style
}: CardProps) {
  return (
    <div
      className={`
        relative bg-neutral-900/60 backdrop-blur-sm border-2 border-cyan-500/20
        ${glowEffect ? 'shadow-[0_0_30px_rgba(6,182,212,0.15)]' : ''}
        transition-all duration-300 hover:border-cyan-500/40
        ${className}
      `}
      style={style}
    >
      {/* Scan line animation */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Corner decorations */}
      <span className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-cyan-500 pointer-events-none" />
      <span className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-cyan-500 pointer-events-none" />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-cyan-500 pointer-events-none" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-cyan-500 pointer-events-none" />

      <div className="relative p-6">
        {(title || description) && (
          <div className="mb-4 border-b border-cyan-500/20 pb-4">
            {title && (
              <h3 className="text-lg font-mono font-bold text-cyan-400 tracking-wider uppercase">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-2 text-sm font-mono text-neutral-400 tracking-wide">
                {description}
              </p>
            )}
          </div>
        )}

        <div className="text-neutral-200">
          {children}
        </div>

        {footer && (
          <div className="mt-4 pt-4 border-t border-cyan-500/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
