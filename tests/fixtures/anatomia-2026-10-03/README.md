# Banco de anatomía proporcionado el 3 de octubre de 2026

Los doce archivos `P1-B*.json` proceden del ZIP aportado por el usuario. Conservan
el contenido original y sirven tanto para importación individual desde la web
como para comprobar compatibilidad: 300 preguntas y 788 puntos.

`fixtures-prueba.json`, `sinonimos.json` y `regresiones.txt` conservan los datos,
diccionario y comprobaciones de referencia del paquete. El test ejecuta las
68 comprobaciones contra el motor y diccionario integrados en la aplicación.

Ejecutar desde la raíz del proyecto:

```sh
node --test tests/anatomy-bank.test.mjs tests/quiz-block-import.test.mjs
```

La aplicación usa el motor 1.3.1: integra la versión adjunta 1.3.0 y conserva
la compatibilidad con campos vacíos de secuencias, alternativas por pregunta,
decimales y negativos. Admite rangos numéricos con guion y rechaza listas de
conjeturas cuando la pregunta pide un único valor.

Estos archivos de prueba no se publican automáticamente como cuestionarios
en la base de datos. Para cargarlos, selecciona cada JSON de bloque en el
importador del directorio de destino.
