
export default function AdminPageHeader({ 
  icon: Icon, 
  title, 
  subtitle, 
  actions,
  badge
}) {
  return (
    <div className="mb-8">
      <div className="surface-panel p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/70 flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-sm text-slate-600">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            {actions}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
