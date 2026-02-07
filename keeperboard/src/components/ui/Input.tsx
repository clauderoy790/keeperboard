import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-mono font-semibold text-cyan-400 mb-2 tracking-widest uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`
              w-full px-4 py-2.5 bg-neutral-900/50 border-2
              ${error ? 'border-red-500/50 focus:border-red-500' : 'border-cyan-500/20 focus:border-cyan-500/60'}
              text-neutral-100 font-mono text-sm
              placeholder:text-neutral-600 placeholder:font-mono
              focus:outline-none focus:ring-2 focus:ring-cyan-500/20
              transition-all duration-200
              shadow-inner
              ${className}
            `}
            {...props}
          />
          {/* Corner brackets effect */}
          <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500/40 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-2 text-xs font-mono text-red-400 tracking-wide">
            ⚠ {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-xs font-mono text-neutral-500 tracking-wide">
            → {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
