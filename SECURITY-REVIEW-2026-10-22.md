# Revisión de seguridad — 22 de octubre de 2026

Repositorio revisado: C:/Users/chuyi/Desktop/PARA 2026/Proyectos/kognocore.
Las dos rutas configuradas inicialmente no existen. No se desplegaron cambios.

## PHP
No se encontraron archivos PHP ni manifiestos Composer en el código revisado.
La aplicación usa React/Vite y funciones JavaScript con Supabase. Esto no verifica infraestructura externa.
El aviso oficial del 21 de octubre identifica CVE-2026-109618 y CVE-2026-109619.
Versiones corregidas: 8.2.35, 8.3.36, 8.4.27 y 8.5.12.
Fuente: https://www.php.net/archive/2026.php#2026-10-21-5

## Correcciones aplicadas
- npm audit fix --ignore-scripts: actualizaciones compatibles del lockfile y dependencias instaladas.
- MathText.jsx: escapar HTML antes de generar el marcado matemático.
- ResourceViewer.jsx: mostrar recursos HTML en iframe sandbox sin permisos de scripts ni mismo origen; Mermaid con securityLevel strict.
- tests/html-security.test.mjs: regresiones de inyección HTML y aislamiento del recurso.

## Resultados de auditoría
Antes: 38 paquetes afectados (1 crítico, 25 altos, 10 moderados, 2 bajos).
Después: 11 paquetes afectados (0 críticos, 5 altos, 4 moderados, 2 bajos).
La consulta con --omit=dev también informa estos 11; no deben considerarse resueltos.

Pendientes:
- braces y cadena Tailwind/chokidar/micromatch/fast-glob: agotamiento de pila.
- postcss-selector-parser y postcss-nested: agotamiento de CPU.
- KaTeX y Mermaid: elusión de restricciones trust cuando ya existe contaminación de prototipos.
- react-router y react-router-dom: redirecciones abiertas e inyección durante hidratación SSR.
npm propone migraciones mayores a Tailwind 4.3.3, Mermaid 12.2.0 y React Router DOM 7.18.4.
No se aplicó --force: requieren adaptar y verificar las funciones afectadas.
El conteo de npm incluye dependencias transitivas; no equivale a 11 fallos explotables demostrados en producción.

## Verificación
node --test: 65 aprobadas, 1 fallo.
Las dos pruebas nuevas pasan.
El fallo de tests/question-review.test.mjs es ERR_IMPORT_ATTRIBUTE_MISSING al importar src/lib/sinonimos.json en Node 24.
No se modificó esa importación.
No se verificaron la base de datos desplegada, secretos del hosting ni servicios de producción.

Compilacion: npm run build finalizo correctamente (Vite 6.4.5), con advertencias de tamano de chunks e imports mixtos.
