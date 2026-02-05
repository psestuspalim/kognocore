import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, BookOpen, Users, FileJson, Activity,
  BarChart3, ClipboardList, Menu, X, ArrowLeft, Shield, FolderTree, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sidebarItems = [
  {
    section: 'Admin',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: 'AdminHome' },
      { label: 'Contenido', icon: FolderTree, href: 'AdminContent' },
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

export default function AdminShell({ children, title, subtitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isActive = (href) => {
    const currentPath = location.pathname.split('/').pop();
    return currentPath === href;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-semibold">Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block fixed left-0 top-0 h-screen w-64 bg-background border-r">
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="h-16 flex items-center px-6 border-b">
            <Shield className="w-6 h-6 text-primary mr-2" />
            <span className="font-semibold text-lg">Admin Panel</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {sidebarItems.map((section, idx) => (
              <div key={idx} className="mb-6">
                <h3 className="px-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.section}
                </h3>
                <div className="space-y-1 px-3">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link key={item.href} to={createPageUrl(item.href)}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r" />
                          )}
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
          <div className="border-t p-4">
            <Link to={createPageUrl('Quizzes')}>
              <Button variant="outline" size="sm" className="w-full justify-start">
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
          <aside className="lg:hidden fixed left-0 top-16 bottom-0 w-64 bg-background border-r z-40 overflow-y-auto">
            <nav className="py-4">
              {sidebarItems.map((section, idx) => (
                <div key={idx} className="mb-6">
                  <h3 className="px-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.section}
                  </h3>
                  <div className="space-y-1 px-3">
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
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative",
                              active
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {active && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r" />
                            )}
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
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}