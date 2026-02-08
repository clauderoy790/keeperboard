'use client';

interface Environment {
  id: string;
  name: string;
  is_default: boolean;
}

interface EnvironmentSwitcherProps {
  environments: Environment[];
  selectedEnvironmentId: string | null;
  onEnvironmentChange: (environmentId: string) => void;
}

export default function EnvironmentSwitcher({
  environments,
  selectedEnvironmentId,
  onEnvironmentChange,
}: EnvironmentSwitcherProps) {
  if (environments.length === 0) {
    return null;
  }

  // Auto-select default environment if none selected
  if (!selectedEnvironmentId && environments.length > 0) {
    const defaultEnv = environments.find((e) => e.is_default) || environments[0];
    onEnvironmentChange(defaultEnv.id);
    return null;
  }

  return (
    <div className="flex items-center gap-3 mb-4">
      <label className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-widest">
        Environment:
      </label>
      <div className="relative">
        <select
          value={selectedEnvironmentId || ''}
          onChange={(e) => onEnvironmentChange(e.target.value)}
          className="
            px-4 py-2 bg-neutral-900/50 border-2 border-cyan-500/20
            focus:border-cyan-500/60 text-neutral-100 font-mono text-sm
            focus:outline-none focus:ring-2 focus:ring-cyan-500/20
            transition-all duration-200 appearance-none cursor-pointer
            pr-10
          "
        >
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name} {env.is_default ? '(Default)' : ''}
            </option>
          ))}
        </select>
        {/* Corner brackets */}
        <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500/40 pointer-events-none" />
        <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500/40 pointer-events-none" />
        <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500/40 pointer-events-none" />
        <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500/40 pointer-events-none" />
        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-4 h-4 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
