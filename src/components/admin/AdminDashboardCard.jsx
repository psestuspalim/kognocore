import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminDashboardCard({
  title,
  description,
  count,
  items = [],
  stats = [], // New: array of {label, value} objects
  primaryActionLabel,
  primaryActionTo,
  icon: Icon,
  countColor = 'text-primary',
  iconColor = 'text-primary',
  variant = 'default' // 'default' or 'stats'
}) {
  const isStatsMode = variant === 'stats' || (stats.length > 0 && items.length === 0);

  return (
    <Card className="hover:shadow-lg hover:border-primary/30 transition-all rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-3">
          {Icon && (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
          )}
          {count !== undefined && (
            <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
              {count}
            </Badge>
          )}
        </div>
        <div>
          <CardTitle className="text-lg font-semibold mb-1">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Mode - Show statistics grid */}
        {isStatsMode && stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Default Mode - Show items list */}
        {!isStatsMode && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.primary}</p>
                  {item.secondary && (
                    <p className="text-xs text-muted-foreground truncate">{item.secondary}</p>
                  )}
                </div>
                {item.badge && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isStatsMode && items.length === 0 && stats.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
              {Icon && <Icon className="w-6 h-6 text-muted-foreground/50" />}
            </div>
            <p>No hay datos disponibles</p>
          </div>
        )}

        <Link to={createPageUrl(primaryActionTo)}>
          <Button className="w-full h-10">
            {primaryActionLabel}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}