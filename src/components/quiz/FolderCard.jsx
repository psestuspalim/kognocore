import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Trash2, Pencil, EyeOff, ChevronRight } from 'lucide-react';
import { buildPalette } from '@/utils/theme';

const FALLBACK_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];

export default function FolderCard({ folder, itemCount, isAdmin, onDelete, onEdit, onClick }) {
  const parcialNum = parseInt((folder.name || '').match(/\d+/)?.[0] || '1', 10);
  const accent = folder.color || FALLBACK_COLORS[(parcialNum - 1) % 4] || '#0ea5e9';
  const p = buildPalette(accent);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer transition-all duration-150 overflow-hidden relative group rounded-xl border hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: p.cardBg,
        borderColor: p.border,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />

      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: p.iconBg }}
            >
              <FolderOpen className="w-5 h-5" style={{ color: p.iconColor }} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-800 text-[15px] truncate flex items-center gap-1.5">
                {folder.name}
                {folder.is_hidden && <EyeOff className="w-3 h-3 text-slate-400" />}
              </h3>
              {folder.description && (
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{folder.description}</p>
              )}
              <span className="text-xs text-slate-400 mt-1 block">
                {itemCount} {itemCount === 1 ? 'elemento' : 'elementos'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon"
                  onClick={(e) => { e.stopPropagation(); onEdit(folder); }}
                  className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-lg">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon"
                  onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                  className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
