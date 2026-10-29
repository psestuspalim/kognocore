import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Copy, Download } from 'lucide-react';
import { client } from '@/api/client';
import { getAuthorizationHeaders } from '@/lib/supabase';
import { generateStudentCredentials, registerStudentBatch, credentialsText } from '@/lib/student-generator';
import AdminShell from '@/components/admin/AdminShell';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminUserGenerator() {
  const cache = useQueryClient();
  const lock = useRef(false);
  const [count, setCount] = useState(10);
  const [rows, setRows] = useState([]);
  const [courseIds, setCourseIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const courses = useQuery({ queryKey: ['courses'], queryFn: () => client.entities.Course.list('order') });
  const created = rows.filter(row => row.status === 'created').length;
  const run = async action => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (failure) { setError(failure.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const generate = () => run(async () => {
    const existing = await client.entities.User.list();
    setRows(generateStudentCredentials(Number(count), existing.map(student => student.username)));
  });
  const register = () => run(async () => {
    if (courseIds.length) {
      await client.entities.Course.list();
      await client.entities.Subject.list();
      await client.entities.Folder.list();
    }
    const result = await registerStudentBatch(rows, {
      courseIds,
      listStudents: () => client.entities.User.list(),
      createStudent: async payload => {
        const response = await fetch('/api/students', { method: 'POST',
          headers: { ...await getAuthorizationHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo registrar el alumno.');
        return data.student;
      },
      onUpdate: updated => setRows(previous => previous.map(row => row.username === updated.username ? updated : row))
    });
    setRows(result);
    setMessage(`${result.filter(row => row.status === 'created').length} de ${result.length} cuentas registradas. Puedes copiar o descargar sus credenciales.`);
    await cache.invalidateQueries({ queryKey: ['all-users'] });
    await cache.invalidateQueries({ queryKey: ['enrollments'] });
  });
  const download = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + credentialsText(rows)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'credenciales-alumnos.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <AdminShell>
    <AdminPageHeader icon={UserPlus} title="Generar usuarios" subtitle="Crea alumnos con nombres graciosos de anatomía y contraseñas listas para asignar." />
    <Card><CardContent className="p-5 space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">Cantidad de alumnos (1–50)
          <Input className="mt-1 w-40" type="number" min={1} max={50} value={count} disabled={busy || rows.length > 0} onChange={event => setCount(event.target.value)} />
        </label>
        <Button disabled={busy || rows.length > 0} onClick={generate}>{busy && !rows.length ? 'Generando…' : 'Generar lista'}</Button>
      </div>
      <fieldset disabled={busy || created > 0} className="space-y-2">
        <legend className="font-medium text-sm mb-2">Cursos para todo el lote (opcional)</legend>
        {courses.isPending && <p className="text-sm">Cargando cursos…</p>}
        {courses.error && <p className="text-sm text-rose-700">No se pudieron cargar los cursos. <button className="underline" onClick={() => courses.refetch()}>Reintentar</button></p>}
        {(courses.data || []).map(course => <label key={course.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={courseIds.includes(course.id)} onChange={event => setCourseIds(previous => event.target.checked ? [...previous, course.id] : previous.filter(id => id !== course.id))} />{course.name}
        </label>)}
        <p className="text-xs text-slate-500">Sin selección, las cuentas quedan activas y sin cursos asignados.</p>
      </fieldset>
      {rows.length > 0 && <>
        <p className="text-sm">Revisa la lista y pulsa Registrar cuentas. Descarga o copia las credenciales antes de salir; las contraseñas solo se muestran en esta sesión.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="p-2">Usuario</th><th className="p-2">Contraseña</th><th className="p-2">Estado</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.username} className="border-b">
            <td className="p-2 font-mono">{row.username}</td><td className="p-2 font-mono whitespace-nowrap">{row.password}</td>
            <td className="p-2">{row.status === 'created' ? 'Registrado' : row.status === 'error' ? <span className="text-rose-700">{row.error}</span> : 'Pendiente'}</td>
          </tr>)}</tbody>
        </table></div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || created === rows.length || Boolean(courseIds.length && courses.error)} onClick={register}>{busy ? `Registrando… ${created}/${rows.length}` : created ? 'Reintentar pendientes' : 'Registrar cuentas'}</Button>
          <Button variant="outline" disabled={busy || !created} onClick={() => run(async () => {
            await navigator.clipboard.writeText(credentialsText(rows)); setMessage('Credenciales registradas copiadas.');
          })}><Copy className="w-4 h-4 mr-2" />Copiar registradas</Button>
          <Button variant="outline" disabled={busy || !created} onClick={download}><Download className="w-4 h-4 mr-2" />Descargar registradas</Button>
          <Button variant="ghost" disabled={busy} onClick={() => {
            if (created && !window.confirm('¿Ya guardaste las credenciales? Al iniciar otro lote dejarán de mostrarse aquí.')) return;
            setRows([]); setMessage(''); setError('');
          }}>Nuevo lote</Button>
        </div>
      </>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </CardContent></Card>
  </AdminShell>;
}
