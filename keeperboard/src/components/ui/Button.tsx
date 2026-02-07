import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'relative inline-flex items-center justify-center font-mono font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 overflow-hidden group';

    const variants = {
      primary: 'bg-cyan-500 text-black hover:bg-cyan-400 focus:ring-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]',
      secondary: 'bg-neutral-800 text-cyan-400 border-2 border-cyan-500/30 hover:border-cyan-500/60 hover:bg-neutral-700 focus:ring-cyan-500',
      danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]',
      ghost: 'text-cyan-400 hover:bg-neutral-800/50 focus:ring-cyan-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs tracking-wider',
      md: 'px-5 py-2.5 text-sm tracking-wider',
      lg: 'px-7 py-3.5 text-base tracking-widest',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {/* Scan line effect */}
        <span className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>PROCESSING...</span>
          </span>
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
