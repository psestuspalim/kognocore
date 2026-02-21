import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, checkAppState } = useAuth();
    const navigate = useNavigate();

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
        } catch (err) {
            setError('An error occurred during login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al canjear el código');
                return;
            }

            localStorage.setItem('kc_token', data.token);
            await checkAppState(); // Reload auth context
            navigate(`/course/${data.courseId}`);
        } catch (err) {
            setError('Error de conexión o validación');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Acceso a la Plataforma</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="code" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="code">Código Estudiante</TabsTrigger>
                            <TabsTrigger value="admin">Administrador</TabsTrigger>
                        </TabsList>

                        <TabsContent value="code">
                            <form onSubmit={handleCodeLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Código de Acceso</Label>
                                    <Input
                                        id="code"
                                        type="text"
                                        placeholder="Ingrese su código ej. X7VBN9"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        required
                                        className="uppercase text-center font-mono text-xl tracking-widest"
                                    />
                                </div>
                                {error && (
                                    <div className="text-sm text-red-500 text-center">
                                        {error}
                                    </div>
                                )}
                                <Button type="submit" className="w-full" disabled={isLoading || !code}>
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
                                    <div className="text-sm text-red-500 text-center">
                                        {error}
                                    </div>
                                )}
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Entrando...' : 'Entrar (Admin)'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;
