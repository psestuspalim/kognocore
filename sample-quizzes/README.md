# Sample Quizzes

Este directorio contiene quizzes de ejemplo que se utilizan como referencia y para pruebas.

## Estructura

Los quizzes están organizados por materia:

```
sample-quizzes/
├── README.md (este archivo)
├── anatomia/
├── biofisica/
├── bioquimica/
├── histologia/
└── ...
```

## Formato de Quiz

Cada archivo JSON debe seguir este formato:

```json
{
  "title": "Título del Quiz",
  "description": "Descripción opcional del quiz",
  "questions": [
    {
      "question": "Texto de la pregunta",
      "options": [
        "Opción A",
        "Opción B",
        "Opción C",
        "Opción D"
      ],
      "correct_answer": 0,
      "explanation": "Explicación opcional de la respuesta correcta"
    }
  ],
  "total_questions": 1,
  "metadata": {
    "subject": "Nombre de la materia",
    "folder": "Nombre de la carpeta (ej: Primer Parcial)",
    "created_date": "2024-01-01",
    "file_name": "nombre_archivo.json"
  }
}
```

## Cómo Agregar Nuevos Quizzes de Ejemplo

### Opción 1: Agregar Manualmente

1. Crea un subdirectorio para la materia si no existe
2. Guarda el archivo JSON con el formato correcto
3. El archivo estará disponible para importación manual desde el admin panel

### Opción 2: Importar desde la Aplicación

1. Ve al **Admin Panel** → **JSON Manager**
2. Selecciona la pestaña **"Importar"**
3. Arrastra o selecciona el archivo JSON
4. El quiz se importará automáticamente a la base de datos

### Opción 3: Exportar desde la Aplicación

1. Ve al **Admin Panel** → **Herramientas de Mantenimiento**
2. Haz clic en **"Exportar Quizzes"**
3. Selecciona los quizzes que quieres guardar como ejemplos
4. Los archivos se descargarán con nombres organizados: `Curso_Materia_Carpeta_Quiz.json`
5. Mueve los archivos a este directorio y organízalos por materia

## Quizzes de Ejemplo Actuales

_Agrega aquí los 5 quizzes de ejemplo cuando estén disponibles_

1. **Anatomía I** - [Pendiente]
2. **Biofísica** - [Pendiente]
3. **Bioquímica** - [Pendiente]
4. **Histología I** - [Pendiente]
5. **[Materia]** - [Pendiente]

## Notas

- Los quizzes de ejemplo NO se importan automáticamente a la base de datos
- Son archivos de referencia que pueden importarse manualmente cuando sea necesario
- Útiles para:
  - Probar la funcionalidad de importación
  - Demostrar el formato correcto
  - Compartir quizzes entre instancias de la aplicación
  - Backup de quizzes importantes
