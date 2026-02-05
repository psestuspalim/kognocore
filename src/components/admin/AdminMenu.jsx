import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronDown, Shield, LayoutDashboard, Key, PenTool
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export default function AdminMenu({
  compact = false
}) {
  const menuItems = [
    {
      label: 'Dashboard Admin',
      icon: LayoutDashboard,
      href: 'AdminHome',
      description: 'Panel principal y herramientas'
    },
    {
      label: 'Gestión de Cursos',
      icon: Key,
      href: 'CourseManagement',
      description: 'Códigos y solicitudes'
    },
    {
      label: 'Gestión de Contenido',
      icon: PenTool,
      href: 'AdminContent',
      description: 'Cursos, materias y quizzes'
    }
  ];

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1 border-purple-300 text-purple-600 hover:bg-purple-50">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-gray-500">
            Panel de Administrador
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {menuItems.map((item) => (
            <Link key={item.href} to={createPageUrl(item.href)}>
              <DropdownMenuItem className="cursor-pointer">
                <item.icon className="w-4 h-4 mr-2 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              </DropdownMenuItem>
            </Link>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {menuItems.map((item) => (
        <Link key={item.href} to={createPageUrl(item.href)}>
          <Button variant="outline" size="sm" className="h-9 text-xs sm:text-sm border-gray-300 hover:bg-gray-50">
            <item.icon className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{item.label}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
}