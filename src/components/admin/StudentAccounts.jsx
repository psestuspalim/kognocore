import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { getAuthorizationHeaders } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

const empty = () => ({ username: '', full_name: '', password: '', course_ids: [], is_active: true });

export default function StudentAccounts() {
  const cache = useQueryClient();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const students = useQuery({ queryKey: ['all-users'], queryFn: () => client.entities.User.list() });
  const courses = useQuery({ queryKey: ['courses'], queryFn: () => client.entities.Course.list('order') });
  const open = student => { setError(''); setForm(student ? { ...student, password: '' } : empty()); };
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));

  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Publish existing browser-only structure so another device can open assigned courses.
      await client.entities.Course.list();
      await client.entities.Subject.list();
      await client.entities.Folder.list();
      const response = await fetch('/api/students', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { ...await getAuthorizationHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el alumno.');
      await cache.invalidateQueries({ queryKey: ['all-users'] });
      await cache.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success(form.id ? 'Alumno actualizado' : 'Alumno registrado');
      setForm(null);
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  };

  return <Card className="mb-6">
    <CardContent className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Cuentas de alumnos</h2><p className="text-sm text-muted-foreground">Acceso con usuario y contraseña. Administra sus cursos y el estado de la cuenta.</p></div>
        <Button onClick={() => open(null)}>Registrar alumno</Button>
      </div>
      <Input aria-label="Buscar cuentas de alumnos" placeholder="Buscar por usuario o nombre" value={search} onChange={event => setSearch(event.target.value)} />
      {students.isPending && <p role="status">Cargando alumnos…</p>}
      {students.error && <p role="alert" className="text-red-600">{students.error.message} <Button variant="outline" onClick={() => students.refetch()}>Reintentar</Button></p>}
      {students.data?.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay cuentas. Registra el primer alumno.</p>}
      {(students.data || []).filter(student => `${student.username} ${student.full_name}`.toLowerCase().includes(search.toLowerCase())).map(student => <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div><p className="font-medium">{student.username} <span className="text-xs text-muted-foreground">{student.is_active ? 'Activa' : 'Suspendida'}</span></p><p className="text-sm text-muted-foreground">{student.full_name} · {student.course_ids.map(id => courses.data?.find(course => course.id === id)?.name || id).join(', ') || 'Sin cursos asignados'}</p></div>
        <Button variant="outline" onClick={() => open(student)}>Administrar</Button>
      </div>)}
      <Dialog open={Boolean(form)} onOpenChange={value => { if (!value && !saving) setForm(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? 'Administrar alumno' : 'Registrar alumno'}</DialogTitle><DialogDescription>Asigna los cursos que el alumno podrá consultar desde cualquier dispositivo.</DialogDescription></DialogHeader>
          {form && <form onSubmit={save} className="space-y-4">
            <div className="space-y-1"><Label htmlFor="student-username">Usuario</Label><Input id="student-username" value={form.username} onChange={event => update('username', event.target.value)} disabled={Boolean(form.id) || saving} required minLength={3} maxLength={40} pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,39}" autoComplete="off" />{form.id && <p className="text-xs text-muted-foreground">El usuario de ingreso permanece fijo.</p>}</div>
            <div className="space-y-1"><Label htmlFor="student-name">Nombre</Label><Input id="student-name" value={form.full_name} onChange={event => update('full_name', event.target.value)} maxLength={120} disabled={saving} placeholder="Opcional al registrar; se usará el usuario" /></div>
            <div className="space-y-1"><Label htmlFor="student-password">{form.id ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Label><Input id="student-password" type="password" autoComplete="new-password" value={form.password} onChange={event => update('password', event.target.value)} required={!form.id} minLength={8} maxLength={128} disabled={saving} /><p className="text-xs text-muted-foreground">Mínimo 8 caracteres. {form.id ? 'Déjala vacía para conservar la actual.' : 'Comparte las credenciales con el alumno.'}</p></div>
            <fieldset disabled={saving || courses.isPending} className="space-y-2"><legend className="text-sm font-medium mb-2">Cursos asignados</legend>
              {courses.error && <p role="alert" className="text-red-600">No se pudieron cargar los cursos.</p>}
              {courses.isPending && <p>Cargando cursos…</p>}
              {courses.data?.length === 0 && <p className="text-sm text-muted-foreground">Primero crea un curso en Contenido.</p>}
              {(courses.data || []).map(course => <label key={course.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.course_ids.includes(course.id)} onChange={event => update('course_ids', event.target.checked ? [...form.course_ids, course.id] : form.course_ids.filter(id => id !== course.id))} />{course.name}</label>)}
            </fieldset>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={event => update('is_active', event.target.checked)} disabled={saving} />Cuenta activa</label>
            {!form.is_active && <p className="text-sm text-muted-foreground">El alumno no podrá ingresar ni realizar nuevas solicitudes. Su historial se conserva.</p>}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setForm(null)}>Cancelar</Button><Button type="submit" disabled={saving || courses.isPending || Boolean(courses.error)}>{saving ? 'Guardando…' : 'Guardar alumno'}</Button></div>
          </form>}
        </DialogContent>
      </Dialog>
    </CardContent>
  </Card>;
}
