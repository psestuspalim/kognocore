import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminKpiCard({ icon: Icon, label, value, trend, loading }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group border-white/70 bg-white/80 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 transition-all">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/20 border border-white/80 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 truncate">{label}</p>
          </div>
          {trend && (
            <div className="text-xs font-semibold text-emerald-600">
              {trend}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
