import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Single entry point to the admin area. The sections themselves live in the
// dashboard sidebar, so they are not repeated here.
export default function AdminMenu() {
  return (
    <Button asChild aria-label="Ir al panel de administración" variant="outline" size="sm" className="h-9 gap-1 border-purple-300 text-purple-600 hover:bg-purple-50">
      <Link to={createPageUrl('AdminHome')}>
        <Shield className="w-4 h-4" />
        <span className="hidden sm:inline">Admin</span>
      </Link>
    </Button>
  );
}
