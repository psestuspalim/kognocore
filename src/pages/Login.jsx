import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { client } from '@/api/client';
import { getOrCreateLearnerId } from '@/lib/learner-id';

function generateRandomAlias() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let tag = '';
    for (let i = 0; i < 4; i++) tag += chars[Math.floor(Math.random() * chars.length)];
    return `Estudiante_${tag}`;
}

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('code');
    const { login, checkAppState } = useAuth();
    const navigate = useNavigate();

    const resolveCourseByCode = async (normalized) => {
        // 1) Full auth: Vercel /api/redeem (returns token + courseId)
        try {
            const response = await fetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: normalized })
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.courseId && data?.token) {
                    return {
                        courseId: data.courseId,
                        courseName: null,
                        token: data.token,
                        source: 'server'
                    };
                }
            }
        } catch (_err) {
            // continue to next fallback
        }

        // 2) Lighter server validation (no token, just validates code exists)
        try {
            const response = await fetch('/api/invites-validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: normalized })
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.valid && data?.courseId) {
                    return {
                        courseId: data.courseId,
                        courseName: null,
                        token: null,
                        source: 'server-validated'
                    };
                }
            }
        } catch (_err) {
            // continue to local fallback
        }

        // 3) Local fallback: CourseAccessCode in local storage
        try {
            const allCodes = await client.entities.CourseAccessCode.list();
            const found = allCodes.find(c => (c.code || '').trim().toUpperCase() === normalized);
            if (found) {
                return {
                    courseId: found.course_id || 'course_enarm2026',
                    courseName: found.course_name || 'ENARM 2026',
                    token: null,
                    source: 'local-code'
                };
            }
        } catch (_err) {
            // ignore
        }

        return null;
    };

    const createLocalStudentSession = async (inputCode) => {
        const normalized = (inputCode || '').trim().toUpperCase();
        const learnerId = getOrCreateLearnerId();
        const randomAlias = generateRandomAlias();

        const resolved = await resolveCourseByCode(normalized);
        if (!resolved) {
            throw new Error('INVALID_CODE');
        }
        const targetCourseId = resolved.courseId || 'course_enarm2026';
        const targetCourseName = resolved.courseName || 'ENARM 2026';

        // If we have a server token, use canonical auth path (courseId comes from /api/me)
        if (resolved.token) {
            localStorage.setItem('kc_token', resolved.token);
            localStorage.setItem('kc_display_name', randomAlias);
            localStorage.removeItem('app_mock_token');

            // Create enrollment so admin can see this student
            try {
                const existing = await client.entities.CourseEnrollment.filter({
                    learner_id: learnerId,
                    course_id: targetCourseId
                });
                if (existing.length === 0) {
                    await client.entities.CourseEnrollment.create({
                        user_email: `learner+${learnerId}@kognocore.local`,
                        username: randomAlias,
                        learner_id: learnerId,
                        course_id: targetCourseId,
                        course_name: targetCourseName,
                        access_code: normalized,
                        status: 'approved'
                    });
                } else if (existing[0].username !== randomAlias) {
                    await client.entities.CourseEnrollment.update(existing[0].id, {
                        username: randomAlias
                    });
                }
            } catch (_err) {
                // non-blocking
            }

            await checkAppState();
            return;
        }

        const mockStudent = {
            id: `student_${learnerId.slice(0, 8)}`,
            email: `learner+${learnerId}@kognocore.local`,
            last_name: 'Estudiante',
            username: randomAlias,
            full_name: randomAlias,
            is_admin: false,
            role: 'user',
            courseId: targetCourseId,
            accessCode: normalized,
            loginMode: 'direct-code',
            learner_id: learnerId
        };

        localStorage.setItem('app_mock_token', JSON.stringify(mockStudent));
        localStorage.removeItem('kc_token');

        if (targetCourseId) {
            try {
                const existing = await client.entities.CourseEnrollment.filter({
                    user_email: mockStudent.email,
                    course_id: targetCourseId
                });

                if (existing.length === 0) {
                    await client.entities.CourseEnrollment.create({
                        user_email: mockStudent.email,
                        username: mockStudent.username,
                        learner_id: learnerId,
                        course_id: targetCourseId,
                        course_name: targetCourseName,
                        access_code: normalized,
                        status: 'approved'
                    });
                } else if (existing[0].status !== 'approved') {
                    await client.entities.CourseEnrollment.update(existing[0].id, {
                        status: 'approved'
                    });
                }
            } catch (_err) {
                // keep login successful even if enrollment persistence fails
            }
        }

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
        if (normalizedCode.length < 4) {
            setError('El código debe tener al menos 4 caracteres');
            setIsLoading(false);
            return;
        }

        try {
            await createLocalStudentSession(normalizedCode);
            navigate('/');
        } catch (err) {
            if (String(err?.message || '') === 'INVALID_CODE') {
                setError('Código de acceso inválido. Verifica que el código sea correcto.');
            } else if (String(err?.message || '').startsWith('SERVER_CONFIG:')) {
                setError('Servidor de códigos no configurado en Vercel');
            } else {
                setError('Error de ingreso. Intenta de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(150deg,#f8f6ee_0%,#eef5f7_42%,#f8f0d9_100%)] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-amber-300/35 blur-3xl animate-float-slow" />
            <div className="pointer-events-none absolute right-[-8rem] top-[-4rem] h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl animate-float-slow" />
            <div className="pointer-events-none absolute bottom-[-6rem] left-1/3 h-96 w-96 rounded-full bg-blue-200/25 blur-3xl" />

            <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl items-start gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <section className="animate-fade-up rounded-[2rem] border border-white/60 bg-white/55 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-md sm:p-8 lg:p-9">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                            <Sparkles className="h-3.5 w-3.5 text-cyan-700" />
                            Kognocore
                        </div>
                        <div className="hidden rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white sm:block">
                            Plataforma Académica
                        </div>
                    </div>

                    <h1 className="font-display text-[clamp(2.1rem,5.4vw,4.5rem)] font-bold leading-[1.08] tracking-tight text-slate-950">
                        Bienvenido a
                        <span className="mt-1 block pb-2 leading-[1.08] bg-[linear-gradient(110deg,#0f2d47,#1d4f7f,#0b7aa4)] bg-clip-text text-transparent">
                            Kognocore.
                        </span>
                    </h1>

                    <p className="mt-5 max-w-2xl text-[clamp(1rem,1.5vw,1.35rem)] leading-relaxed text-slate-700">
                        Ingresa con tu código para abrir tu curso al instante o accede como administrador para gestionar contenido, monitorear progreso y coordinar evaluaciones.
                    </p>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Marca</p>
                            <p className="mt-1 text-2xl font-bold text-slate-900">Kognocore</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Cursos</p>
                            <p className="mt-1 text-2xl font-bold text-slate-900">Modulares</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Seguimiento</p>
                            <p className="mt-1 text-2xl font-bold text-slate-900">En vivo</p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/70 bg-white/85 p-4 text-sm text-slate-700">
                        Flujo: <strong>1)</strong> ingresa tu código de acceso, <strong>2)</strong> abre tu curso y responde quizzes.
                    </div>
                </section>

                <Card className="hero-glow animate-fade-up w-full max-w-xl justify-self-center rounded-[2rem] border border-white/65 bg-white/90 shadow-[0_25px_80px_rgba(15,23,42,0.16)]">
                    <CardHeader className="space-y-2 pb-3">
                        <CardTitle className="font-display text-3xl text-center text-slate-950">Acceso Kognocore</CardTitle>
                        <CardDescription className="text-center text-base text-slate-600">
                            Selecciona el método de ingreso.
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
                            <TabsList className="mb-6 grid h-14 w-full grid-cols-2 rounded-2xl bg-slate-100 p-1">
                                <TabsTrigger value="code" className="gap-2 rounded-xl text-base font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg">
                                    <KeyRound className="h-4 w-4" />
                                    Código
                                </TabsTrigger>
                                <TabsTrigger value="admin" className="gap-2 rounded-xl text-base font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg">
                                    <ShieldCheck className="h-4 w-4" />
                                    Admin
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="code">
                                <form onSubmit={handleCodeLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="code" className="text-base font-semibold text-slate-800">Código de Acceso</Label>
                                        <Input
                                            id="code"
                                            type="text"
                                            placeholder="Ej: X7VBN9Q2"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                                            required
                                            className="h-14 rounded-2xl border-slate-300 uppercase text-center font-mono text-2xl tracking-[0.35em] shadow-inner focus-visible:ring-2 focus-visible:ring-cyan-500"
                                        />
                                        <p className="text-xs text-slate-500 text-center">Se te asignará un usuario anónimo automáticamente</p>
                                    </div>
                                    {error && (
                                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                            {error}
                                        </div>
                                    )}
                                    <Button type="submit" size="lg" className="h-14 w-full rounded-2xl bg-slate-900 text-lg font-semibold hover:bg-slate-800" disabled={isLoading || !code}>
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
                                            placeholder="jesus o admin"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="h-12 rounded-xl"
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
                                            className="h-12 rounded-xl"
                                        />
                                    </div>
                                    {error && (
                                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                            {error}
                                        </div>
                                    )}
                                    <Button type="submit" size="lg" className="h-12 w-full rounded-xl bg-slate-900 hover:bg-slate-800" disabled={isLoading}>
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
