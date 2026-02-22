import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck, Sparkles } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('code');
    const { login, checkAppState } = useAuth();
    const navigate = useNavigate();
    const isLocalRuntime = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    const createLocalStudentSession = async (inputCode) => {
        const normalized = (inputCode || '').trim().toUpperCase();
        const mockStudent = {
            id: `student_${normalized.slice(-6) || 'local'}`,
            email: `estudiante+${normalized.toLowerCase() || 'local'}@kognocore.local`,
            last_name: 'Invitado',
            username: `Estudiante ${normalized || 'Local'}`,
            is_admin: false,
            role: 'student',
            courseId: normalized || 'LOCAL'
        };

        localStorage.setItem('app_mock_token', JSON.stringify(mockStudent));
        localStorage.removeItem('kc_token');
        await checkAppState();
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const success = await login(email, password);
            if (success) {
                navigate('/');
            } else {
                setError('Invalid credentials');
            }
        } catch (_err) {
            setError('An error occurred during login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const normalizedCode = code.trim().toUpperCase();
        if (normalizedCode.length < 8) {
            setError('El código debe tener al menos 8 caracteres');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: normalizedCode })
            });

            let data = {};
            try {
                data = await res.json();
            } catch (_parseError) {
                data = {};
            }

            if (!res.ok) {
                // In local environments the /api backend may be unavailable.
                if (import.meta.env.DEV || isLocalRuntime) {
                    await createLocalStudentSession(normalizedCode);
                    navigate('/');
                    return;
                }
                setError(data.error || 'Error al canjear el código');
                return;
            }

            if (!data.token) {
                if (import.meta.env.DEV || isLocalRuntime) {
                    await createLocalStudentSession(normalizedCode);
                    navigate('/');
                    return;
                }
                setError('Respuesta inválida del servidor');
                return;
            }

            localStorage.setItem('kc_token', data.token);
            localStorage.removeItem('app_mock_token');
            await checkAppState(); // Reload auth context
            navigate('/');
        } catch (_err) {
            if (import.meta.env.DEV || isLocalRuntime) {
                try {
                    await createLocalStudentSession(normalizedCode);
                    navigate('/');
                    return;
                } catch (_fallbackErr) {
                    setError('Error al crear sesión local');
                    return;
                }
            }
            setError('Error de conexión o validación');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
            <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-orange-300/35 blur-3xl animate-float-slow" />
            <div className="pointer-events-none absolute right-[-6rem] top-[-2rem] h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl animate-float-slow" />
            <div className="pointer-events-none absolute bottom-[-5rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-200/35 blur-3xl" />

            <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="animate-fade-up rounded-3xl border border-white/40 bg-white/40 p-8 backdrop-blur-md lg:p-10">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/65 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">
                        <Sparkles className="h-3.5 w-3.5" />
                        Plataforma de aprendizaje
                    </div>
                    <h1 className="font-display text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                        Aprende más rápido con una experiencia visual moderna.
                    </h1>
                    <p className="mt-5 max-w-xl text-base text-slate-700 sm:text-lg">
                        Inicia sesión con tu código o como administrador para gestionar contenido, evaluar progreso y coordinar sesiones.
                    </p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        <div className="surface-panel p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Cursos</p>
                            <p className="mt-1 text-2xl font-bold text-slate-900">Dinámicos</p>
                        </div>
                        <div className="surface-panel p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Seguimiento</p>
                            <p className="mt-1 text-2xl font-bold text-slate-900">En tiempo real</p>
                        </div>
                    </div>
                </section>

                <Card className="hero-glow animate-fade-up w-full max-w-xl justify-self-center border-none bg-white/88">
                    <CardHeader className="space-y-2">
                        <CardTitle className="font-display text-2xl text-center text-slate-900">Acceso a la Plataforma</CardTitle>
                        <CardDescription className="text-center text-slate-600">
                            Selecciona el método de ingreso que necesites.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs
                            defaultValue="code"
                            value={activeTab}
                            onValueChange={(value) => {
                                setActiveTab(value);
                                setError('');
                            }}
                            className="w-full"
                        >
                            <TabsList className="mb-5 grid w-full grid-cols-2">
                                <TabsTrigger value="code" className="gap-2">
                                    <KeyRound className="h-4 w-4" />
                                    Código
                                </TabsTrigger>
                                <TabsTrigger value="admin" className="gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Admin
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="code">
                                <form onSubmit={handleCodeLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Código de Acceso</Label>
                                        <Input
                                            id="code"
                                            type="text"
                                            placeholder="Ingrese su código, ej. X7VBN9"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                                            required
                                            className="h-12 uppercase text-center font-mono text-lg tracking-[0.25em]"
                                        />
                                    </div>
                                    {error && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                            {error}
                                        </div>
                                    )}
                                    {(import.meta.env.DEV || isLocalRuntime) && error && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={async () => {
                                                setIsLoading(true);
                                                try {
                                                    await createLocalStudentSession(code);
                                                    navigate('/');
                                                } finally {
                                                    setIsLoading(false);
                                                }
                                            }}
                                            disabled={isLoading || !code}
                                        >
                                            Continuar en modo local
                                        </Button>
                                    )}
                                    <Button type="submit" size="lg" className="w-full" disabled={isLoading || !code}>
                                        {isLoading ? 'Verificando...' : 'Ingresar al Curso'}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="admin">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Usuario o Email</Label>
                                        <Input
                                            id="email"
                                            type="text"
                                            placeholder="admin"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Contraseña</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    {error && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                            {error}
                                        </div>
                                    )}
                                    <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                                        {isLoading ? 'Entrando...' : 'Entrar (Admin)'}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Login;
