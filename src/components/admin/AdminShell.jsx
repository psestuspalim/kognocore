import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, BookOpen, Users, FileJson, Menu, X, ArrowLeft, Shield, FolderTree, Trash2, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sidebarItems = [
  {
    section: 'Admin',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: 'AdminHome' },
      { label: 'Contenido', icon: FolderTree, href: 'AdminContent' },
      { label: 'Progreso', icon: TrendingUp, href: 'AdminProgress' },
      { label: 'Papelera', icon: Trash2, href: 'AdminTrash' },
      { label: 'Estudiantes', icon: Users, href: 'AdminStudents' },
      { label: 'JSON Manager', icon: FileJson, href: 'AdminJsonManager' }
    ]
  },
  {
    section: 'Operaciones',
    items: [
      { label: 'Cursos', icon: BookOpen, href: 'CourseManagement' },

    ]
  }
];

export default function AdminShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isActive = (href) => {
    const currentPath = location.pathname.split('/').pop();
    return currentPath === href;
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(255,176,99,0.18)_0%,transparent_34%),radial-gradient(circle_at_88%_2%,rgba(54,158,168,0.16)_0%,transparent_35%),linear-gradient(180deg,rgba(255,253,248,0.92)_0%,rgba(248,245,238,0.92)_100%)]" />
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/70 bg-white/85 backdrop-blur-md z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display text-sm font-semibold tracking-tight text-slate-800">Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block fixed left-0 top-0 h-screen w-72 border-r border-white/70 bg-white/80 backdrop-blur-md">
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="h-20 flex items-center px-6 border-b border-white/70">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-slate-900">Admin Panel</p>
              <p className="text-xs text-slate-500">Control y operaciones</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-5">
            {sidebarItems.map((section, idx) => (
              <div key={idx} className="mb-6">
                <h3 className="px-6 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {section.section}
                </h3>
                <div className="space-y-1.5 px-3">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link key={item.href} to={createPageUrl(item.href)}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative",
                            active
                              ? "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30"
                              : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                          )}
                        >
                          <Icon className="w-[18px] h-[18px]" />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="border-t border-white/70 p-4">
            <Link to={createPageUrl('Quizzes')}>
              <Button variant="outline" size="sm" className="w-full justify-start bg-white/70">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a la app
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-16 bottom-0 w-72 border-r border-white/70 bg-white/90 backdrop-blur-md z-40 overflow-y-auto">
            <nav className="py-4">
              {sidebarItems.map((section, idx) => (
                <div key={idx} className="mb-6">
                  <h3 className="px-6 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {section.section}
                  </h3>
                  <div className="space-y-1.5 px-3">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          to={createPageUrl(item.href)}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <div
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative",
                              active
                                ? "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30"
                                : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                            )}
                          >
                            <Icon className="w-[18px] h-[18px]" />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
