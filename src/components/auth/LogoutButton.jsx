import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function LogoutButton({ className = '' }) {
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    setError(false);
    try {
      await logout();
    } catch {
      setError(true);
      setPending(false);
    }
  };

  return (
    <div>
      <Button type="button" variant="outline" size="sm" className={className}
        onClick={handleLogout} disabled={pending} aria-busy={pending}>
        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
        {pending ? 'Cerrando…' : 'Cerrar sesión'}
      </Button>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">No se pudo cerrar sesión. Inténtalo de nuevo.</p>}
    </div>
  );
}
