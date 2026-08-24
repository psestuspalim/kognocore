import { useState } from 'react';
import { client } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileJson, Upload, CheckCircle2, XCircle,
  Code, Download, AlertCircle, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { toCompactFormat, fromCompactFormat, isCompactFormat } from '../components/utils/quizFormats';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import { z } from 'zod';

// Define Zod Schema for Quiz Validation
const questionSchema = z.object({
  text: z.string().optional(),
  question: z.string().optional(),
  type: z.string().optional(),
  options: z.any().optional(),
  answerOptions: z.any().optional(),
  correctAnswer: z.any().optional(),
  explanation: z.string().optional(),
  justificacion: z.string().optional(),
  feedback: z.string().optional(),
  serie: z.any().optional(),
  difficulty: z.string().optional()
}).refine(data => Boolean(data.text || data.question), {
  message: "Question text is required"
});

const quizSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, "Must contain at least 1 question"),
  subject_id: z.string().optional(),
  is_hidden: z.boolean().optional(),
  metadata: z.any().optional()
});

export default function AdminJsonManager() {
  const queryClient = useQueryClient();
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [formattedJson, setFormattedJson] = useState('');
  const [convertedJson, setConvertedJson] = useState('');

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['all-quizzes'],
    queryFn: () => client.entities.Quiz.list('-created_date'),
  });



  const validateTextareaRef = useRef(null);
  const importTextareaRef = useRef(null);

  const parseSyntaxError = (errMessage, text) => {
    let position = null;
    let line = null;
    let column = null;

    const posMatch = errMessage.match(/position\s+(\d+)/i) || errMessage.match(/at\s+(\d+)/i);
    if (posMatch) position = parseInt(posMatch[1], 10);

    const lineMatch = errMessage.match(/line\s+(\d+)/i);
    const colMatch = errMessage.match(/column\s+(\d+)/i);
    if (lineMatch) line = parseInt(lineMatch[1], 10);
    if (colMatch) column = parseInt(colMatch[1], 10);

    if (position !== null && line === null) {
      const upToError = text.slice(0, position);
      const lines = upToError.split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    } else if (line !== null && position === null) {
      const lines = text.split('\n');
      let currentPos = 0;
      for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
        currentPos += lines[i].length + 1;
      }
      position = currentPos + (column ? Math.max(0, column - 1) : 0);
    }

    return { message: errMessage, line, column, position };
  };

  const jumpToError = (textareaRef, errorInfo) => {
    if (!textareaRef?.current) return;
    const textarea = textareaRef.current;
    const text = textarea.value;

    let targetStart = 0;
    let targetEnd = 0;

    if (errorInfo?.position !== null && errorInfo?.position !== undefined) {
      targetStart = Math.min(text.length, errorInfo.position);
      targetEnd = Math.min(text.length, errorInfo.position + 15);
    } else if (errorInfo?.line) {
      const lines = text.split('\n');
      let charCount = 0;
      for (let i = 0; i < Math.min(errorInfo.line - 1, lines.length); i++) {
        charCount += lines[i].length + 1;
      }
      targetStart = charCount;
      targetEnd = charCount + (lines[errorInfo.line - 1]?.length || 10);
    }

    textarea.focus();
    textarea.setSelectionRange(targetStart, targetEnd);
    const linesBefore = text.slice(0, targetStart).split('\n').length;
    textarea.scrollTop = Math.max(0, (linesBefore - 4) * 20);
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const validateJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);

      let dataToValidate = parsed;
      if (isCompactFormat(parsed)) {
        dataToValidate = fromCompactFormat(parsed);
      }

      const result = quizSchema.safeParse(dataToValidate);

      if (result.success) {
        setValidationResult({
          valid: true,
          message: 'JSON válido (Schema Correcto)',
          data: result.data
        });
        toast.success('JSON válido');
      } else {
        const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        setValidationResult({
          valid: false,
          message: `Errores de Schema: ${issues}`,
          data: null
        });
        toast.error('JSON inválido según schema');
      }

    } catch (error) {
      const errorInfo = parseSyntaxError(error.message, jsonInput);
      setValidationResult({
        valid: false,
        message: `Error de sintaxis: ${error.message}`,
        errorInfo
      });
      toast.error('JSON mal formado');
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormattedJson(formatted);
      toast.success('JSON formateado');
    } catch (error) {
      toast.error('No se puede formatear JSON inválido');
    }
  };

  const convertToCompact = () => {
    try {
      const parsed = JSON.parse(jsonInput);

      if (isCompactFormat(parsed)) {
        toast.info('El JSON ya está en formato compacto');
        setConvertedJson(JSON.stringify(parsed, null, 2));
        return;
      }

      const compact = toCompactFormat(parsed);
      setConvertedJson(JSON.stringify(compact, null, 2));
      toast.success('Convertido a formato compacto');
    } catch (error) {
      toast.error('Error al convertir: ' + error.message);
    }
  };

  const convertToFull = () => {
    try {
      const parsed = JSON.parse(jsonInput);

      if (!isCompactFormat(parsed)) {
        toast.info('El JSON no está en formato compacto');
        setConvertedJson(JSON.stringify(parsed, null, 2));
        return;
      }

      const full = fromCompactFormat(parsed);
      setConvertedJson(JSON.stringify(full, null, 2));
      toast.success('Convertido a formato completo');
    } catch (error) {
      toast.error('Error al expandir: ' + error.message);
    }
  };

  const downloadJSON = (data, filename) => {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo descargado');
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    if (files.length === 1) {
      // Single file - load into editor
      const reader = new FileReader();
      reader.onload = (e) => {
        setJsonInput(e.target.result);
        toast.success('Archivo cargado');
      };
      reader.readAsText(files[0]);
    } else {
      // Multiple files - import directly to DB
      handleMultipleFileImport(files);
    }
  };

  const handleMultipleFileImport = async (files) => {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    toast.info(`Procesando ${files.length} archivos...`);

    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        let quizData = parsed;

        // Auto-convert compact format
        if (isCompactFormat(parsed)) {
          quizData = fromCompactFormat(parsed);
        }

        // Basic validation
        if (!quizData.questions || !Array.isArray(quizData.questions)) {
          throw new Error('El JSON debe contener un array de preguntas');
        }

        // Create new quiz
        await client.entities.Quiz.create({
          title: quizData.title || file.name.replace('.json', ''),
          description: quizData.description || 'Importado desde JSON',
          subject_id: quizData.subject_id || selectedTargetSubject || 'subj_med_interna',
          course_id: 'course_enarm2026',
          questions: quizData.questions,
          is_hidden: false,
        });

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} cuestionario(s) importado(s) exitosamente`);
      queryClient.invalidateQueries(['quizzes']);
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} archivo(s) fallaron. Ver consola para detalles.`);
      console.error('Errores de importación:', errors);
    }
  };

  const [selectedTargetSubject, setSelectedTargetSubject] = useState('subj_med_interna');

  const handleImportToDb = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      let quizData = parsed;

      // Auto-convert compact format or simplified format
      if (isSimplifiedFormat(parsed)) {
        quizData = fromSimplifiedFormat(parsed);
      } else if (isCompactFormat(parsed)) {
        quizData = fromCompactFormat(parsed);
        toast.info('Formato detectado: Compacto (convertido automáticamente)');
      }

      // Basic validation
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error('El JSON debe contener un array de preguntas ("questions" o "q")');
      }

      // Create new quiz
      await client.entities.Quiz.create({
        title: quizData.title || `Cuestionario ${new Date().toLocaleDateString()}`,
        description: quizData.description || 'Importado desde JSON',
        subject_id: quizData.subject_id || selectedTargetSubject || 'subj_med_interna',
        course_id: 'course_enarm2026',
        questions: quizData.questions,
        total_questions: quizData.questions.length,
        is_hidden: false,
        created_date: new Date().toISOString()
      });

      toast.success('¡Quiz importado exitosamente a ENARM 2026!');
      queryClient.invalidateQueries(['quizzes']);
      setJsonInput(''); // Clear input on success

      // Optionally invalidate query to refresh list
      // queryClient.invalidateQueries(['all-quizzes']);

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Error al importar: ' + error.message);
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        icon={FileJson}
        title="JSON Manager"
        subtitle="Importar, validar, convertir y exportar archivos JSON"
      />

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="import">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="validate">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Validar
          </TabsTrigger>
          <TabsTrigger value="convert">
            <Sparkles className="w-4 h-4 mr-2" />
            Convertir
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Subir Archivo JSON</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Exportación de Quizzes</p>
                    <p className="text-sm text-blue-700 mt-1">
                      La funcionalidad de exportación ahora se encuentra en el <strong>Dashboard Admin</strong> con organización jerárquica mejorada (Curso → Materia → Carpeta).
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".json"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="json-upload"
                />
                <label htmlFor="json-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Click para subir archivo JSON</p>
                  <p className="text-sm text-muted-foreground mt-1">o pega el contenido abajo</p>
                </label>
              </div>

              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"title": "Mi Quiz", "questions": [...]}'
                className="min-h-[300px] font-mono text-sm"
              />

              <Button onClick={handleImportToDb} className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Upload className="w-4 h-4 mr-2" />
                Importar a Base de Datos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validate" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Validar JSON</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                ref={validateTextareaRef}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Pega tu JSON aquí...'
                className="min-h-[220px] font-mono text-xs leading-relaxed"
              />

              <Button onClick={validateJson} className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Validar JSON
              </Button>

              {validationResult && (
                <Card className={validationResult.valid ? 'border-green-500 bg-green-50' : 'border-destructive bg-destructive/10'}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {validationResult.valid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold text-sm">{validationResult.message}</p>
                          {validationResult.valid && validationResult.data && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Propiedades: {Object.keys(validationResult.data).join(', ')}
                            </p>
                          )}
                          {validationResult.errorInfo?.line && (
                            <p className="text-xs text-destructive font-medium mt-1">
                              Línea {validationResult.errorInfo.line}{validationResult.errorInfo.column ? `, Columna ${validationResult.errorInfo.column}` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      {!validationResult.valid && validationResult.errorInfo && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => jumpToError(validateTextareaRef, validationResult.errorInfo)}
                          className="shrink-0"
                        >
                          Ir directo al error
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="convert" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Convertir Formatos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Pega tu JSON aquí...'
                className="min-h-[200px] font-mono text-sm"
              />

              <div className="grid grid-cols-3 gap-3">
                <Button onClick={formatJson} variant="outline">
                  <Code className="w-4 h-4 mr-2" />
                  Formatear
                </Button>
                <Button onClick={convertToCompact} variant="outline">
                  <Sparkles className="w-4 h-4 mr-2" />
                  A Compacto
                </Button>
                <Button onClick={convertToFull} variant="outline">
                  <Code className="w-4 h-4 mr-2" />
                  A Completo
                </Button>
              </div>

              {(formattedJson || convertedJson) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Resultado:</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadJSON(formattedJson || convertedJson, 'converted.json')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                  <Textarea
                    value={formattedJson || convertedJson}
                    readOnly
                    className="min-h-[300px] font-mono text-sm bg-muted"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </AdminShell>
  );
}