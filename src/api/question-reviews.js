import { getAuthorizationHeaders } from '@/lib/supabase';

export async function reviewRequest(method = 'GET', body) {
  const response = await fetch('/api/quizzes?resource=question-reviews', {
    method, headers: { ...await getAuthorizationHeaders(), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo enviar la revisión. Intenta de nuevo.');
  return result;
}
