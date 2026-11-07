import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

export default function PageNotFound() {
  const { isAuthenticated, user } = useAuth();
  const destination = !isAuthenticated ? "/login" : user?.role === "admin" ? "/AdminHome" : "/Quizzes";
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md text-center space-y-6">
        <p className="text-7xl font-light text-slate-300">404</p>
        <h1 className="text-2xl font-semibold text-slate-800">Página no encontrada</h1>
        <p className="text-slate-600">El enlace no existe o la página cambió de ubicación.</p>
        <Button asChild>
          <Link to={destination}>{isAuthenticated ? "Volver al inicio" : "Ir al acceso"}</Link>
        </Button>
      </div>
    </main>
  );
}
