import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Home,
  BarChart3,
  Trophy,
  ClipboardList,
  Award,
  Menu,
  X,
  LogOut,
  Shield,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const sidebarItems = [
  { label: 'Inicio', icon: Home, href: 'Quizzes' },
  { label: 'Progreso', icon: BarChart3, href: 'Progress' },
  { label: 'Ranking', icon: Trophy, href: 'Leaderboard' },
  { label: 'Mis Tareas', icon: ClipboardList, href: 'MyTasks' },
  { label: 'Logros', icon: Award, href: 'Badges' },
];

export default function UserShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href) => {
    const path = createPageUrl(href);
    // Handle root path being Quizzes
    if (href === 'Quizzes' && location.pathname === '/') return true;
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-50 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
           <BookOpen className="w-6 h-6 text-primary" />
           <span className="font-bold text-lg">Axayak</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-background border-r flex-col z-40">
        <div className="h-16 flex items-center px-6 border-b">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary mr-2" />
            <span className="font-bold text-xl">Axayak</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} to={createPageUrl(item.href)}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all font-medium relative",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r" />
                  )}
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
             <Avatar>
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase() || 'US'}</AvatarFallback>
             </Avatar>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium truncate">{user?.username || 'Usuario'}</p>
               <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
             </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 mb-2" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
           {user?.role === 'admin' && (
            <Link to={createPageUrl('AdminHome')}>
              <Button variant="secondary" className="w-full justify-start bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-200">
                <Shield className="w-4 h-4 mr-2" />
                Panel Admin
              </Button>
            </Link>
          )}
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-16 bottom-0 w-64 bg-background border-r z-40 flex flex-col">
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {sidebarItems.map((item) => {
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
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all font-medium relative",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r" />
                      )}
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

             <div className="p-4 border-t">
              <div className="flex items-center gap-3 mb-4">
                 <Avatar>
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase() || 'US'}</AvatarFallback>
                 </Avatar>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium truncate">{user?.username || 'Usuario'}</p>
                   <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                 </div>
              </div>
              <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 mb-2" onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
               {user?.role === 'admin' && (
                <Link to={createPageUrl('AdminHome')} onClick={() => setSidebarOpen(false)}>
                  <Button variant="secondary" className="w-full justify-start bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-200">
                    <Shield className="w-4 h-4 mr-2" />
                    Panel Admin
                  </Button>
                </Link>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
