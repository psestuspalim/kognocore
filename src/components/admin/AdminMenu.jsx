import { adminNavigation } from "./adminNavigation";
import { Button } from '@/components/ui/button';
import {
  ChevronDown, Shield
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
  const menuItems = adminNavigation.flatMap(section => section.items);

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Administración" variant="outline" size="sm" className="h-9 gap-1 border-purple-300 text-purple-600 hover:bg-purple-50">
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
            <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
              <Link to={createPageUrl(item.href)}>
                <item.icon className="w-4 h-4 mr-2 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm">{item.label}</p>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {menuItems.map((item) => (
        <Button key={item.href} asChild variant="outline" size="sm" className="h-9 text-xs sm:text-sm border-gray-300 hover:bg-gray-50">
          <Link to={createPageUrl(item.href)}>
            <item.icon className="w-4 h-4 sm:mr-2" />
            <span>{item.label}</span>
          </Link>
        </Button>
      ))}
    </div>
  );
}
