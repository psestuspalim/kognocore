import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Trash2, Pencil, EyeOff, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { buildPalette } from '@/utils/theme';

// Paleta pastel por posición de parcial (fallback si folder.color no existe)
const FALLBACK_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];

export default function FolderCard({ folder, itemCount, isAdmin, onDelete, onEdit, onClick }) {
  // Color: usa el asignado en datos, o fallback por posición del nombre
  const parcialNum = parseInt((folder.name || '').match(/\d+/)?.[0] || '1', 10);
  const accent = folder.color || FALLBACK_COLORS[(parcialNum - 1) % 4] || '#0ea5e9';

  const p = buildPalette(accent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -3 }}
      transition={{ duration: 0.18 }}
    >
      <Card
        onClick={onClick}
        className="cursor-pointer transition-all overflow-hidden relative group"
        style={{
          background: p.cardBg,
          border: `1px solid ${p.border}`,
          boxShadow: p.shadow,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: p.accentLine }} />

        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg"
          style={{ boxShadow: `inset 0 0 0 1px ${p.borderHover}`, background: `radial-gradient(ellipse at top, ${p.glow} 0%, transparent 65%)` }}
        />

        {/* Label chip */}
        <div className="px-4 pt-4 pb-0">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase rounded-full px-2.5 py-0.5 border"
            style={{ color: p.chipText, background: p.chipBg, borderColor: p.chipBorder }}
          >
            <ClipboardList className="w-3 h-3" />
            Parcial
          </span>
        </div>

        <CardContent className="p-4 pt-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: p.iconBg, border: `1px solid ${p.chipBorder}` }}
              >
                <FolderOpen className="w-6 h-6" style={{ color: p.iconColor }} />
              </div>

              {/* Name + count */}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800 text-base truncate flex items-center gap-2">
                  {folder.name}
                  {folder.is_hidden && <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                </h3>
                {folder.description && (
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{folder.description}</p>
                )}
                <div className="mt-1.5">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border hover:opacity-90 transition-opacity"
                    style={{ background: p.badgeBg, color: p.badgeText, borderColor: p.badgeBorder }}
                  >
                    {itemCount} {itemCount === 1 ? 'elemento' : 'elementos'}
                  </Badge>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon"
                  onClick={(e) => { e.stopPropagation(); onEdit(folder); }}
                  className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-white/50">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon"
                  onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                  className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50/70">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}