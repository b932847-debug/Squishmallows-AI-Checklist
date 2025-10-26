import React from 'react';
import type { Squishmallow, Status } from '../types';

interface SquishCardProps {
  item: Squishmallow;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onStatusChange: (id:string, status: Status) => void;
  onSetImage: (id: string) => void;
}

const placeholderSvg = (name: string): string => {
  // Fix: Replaced .replaceAll() with .replace() and a global regex for wider compatibility.
  const Svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100%' height='100%' fill='#1e293b'/><text x='50%' y='50%' fill='#94a3b8' font-size='12' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif'>${(name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(Svg)}`;
};

const truncate = (s: string | null, n: number): string => {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

const StatusBadge: React.FC<{ status: Status, onClick: () => void }> = ({ status, onClick }) => {
    const baseClasses = "px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer border border-transparent transition-all";
    const statusMap = {
        there: { text: "There", className: "badge-there hover:border-emerald-400" },
        arriving: { text: "Arriving", className: "badge-arriving hover:border-amber-400" },
        notthere: { text: "Not There", className: "badge-notthere hover:border-red-400" },
        untracked: { text: "Untracked", className: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400" }
    };
    const { text, className } = statusMap[status];

    return <span className={`${baseClasses} ${className}`} onClick={onClick}>{text}</span>;
}


export const SquishCard: React.FC<SquishCardProps> = ({ item, isSelected, onSelect, onStatusChange, onSetImage }) => {
  return (
    <div className="glass rounded-xl p-3 flex flex-col sm:flex-row gap-4 transition-all duration-300 hover:shadow-lg dark:hover:shadow-pink-900/20">
      <img
        src={item.image || placeholderSvg(item.name)}
        alt={item.name}
        className="w-full sm:w-24 h-24 object-cover rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).src = placeholderSvg(item.name); }}
      />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between">
            <h3 className="font-bold text-base leading-tight">{item.name}</h3>
            <input 
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelect(item.id, e.target.checked)}
                className="form-checkbox h-5 w-5 rounded bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 text-pink-500 focus:ring-pink-500"
            />
        </div>

        <p className="text-sm text-[var(--muted-text)] flex-1">{truncate(item.extract, 100) || (item.identified ? 'No extract available.' : 'Not yet identified.')}</p>

        <div className="flex flex-wrap items-center gap-2 mt-auto">
            <StatusBadge status="there" onClick={() => onStatusChange(item.id, 'there')} />
            <StatusBadge status="arriving" onClick={() => onStatusChange(item.id, 'arriving')} />
            <StatusBadge status="notthere" onClick={() => onStatusChange(item.id, 'notthere')} />
            <button onClick={() => onSetImage(item.id)} className="text-xs text-[var(--muted-text)] hover:text-[var(--accent)] transition">Set Image</button>
             {item.source && <a href={item.source} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--muted-text)] hover:text-[var(--accent)] transition">Source</a>}
        </div>
      </div>
    </div>
  );
};