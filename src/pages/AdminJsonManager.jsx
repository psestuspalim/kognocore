import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileJson, Upload, CheckCircle2, XCircle,
  Code, Download, AlertCircle, Sparkles, FolderDown
} from 'lucide-react';
import { toast } from 'sonner';
import { toCompactFormat, fromCompactFormat, isCompactFormat } from '../components/utils/quizFormats';
import AdminShell from '../components/admin/AdminShell';
import AdminPageHeader from '../components/admin/AdminPageHeader';

export default function AdminJsonManager() {
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [formattedJson, setFormattedJson] = useState('');
  const [convertedJson, setConvertedJson] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportedCount, setExportedCount] = useState(0);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['all-quizzes'],
    queryFn: () => base44.entities.Quiz.list('-created_date'),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => base44.entities.Subject.list(),
  });

  const validateJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setValidationResult({
        valid: true,
        message: 'JSON válido',
        data: parsed
      });
      toast.success('JSON válido');
    } catch (error) {
      setValidationResult({
        valid: false,
        message: error.message,
        line: error.message.match(/position (\d+)/)?.[1]
      });
      toast.error('JSON inválido');
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
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setJsonInput(e.target.result);
      toast.success('Archivo cargado');
    };
    reader.readAsText(file);
  };

  const handleExportAll = async () => {
    setExporting(true);
    setExportedCount(0);

    try {
      for (const quiz of quizzes) {
        const subject = subjects.find(s => s.id === quiz.subject_id);
        const subjectName = subject?.name || 'Sin_Materia';
        const safeName = quiz.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '').replace(/\s+/g, '_');
        const filename = `${subjectName}_${safeName}.json`;

        const exportData = {
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions,
          total_questions: quiz.total_questions,
          metadata: {
            subject: subjectName,
            created_date: quiz.created_date,
            file_name: quiz.file_name
          }
        };

        downloadJSON(JSON.stringify(exportData, null, 2), filename);
        setExportedCount(prev => prev + 1);

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast.success(`${quizzes.length} quizzes exportados`);
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error('Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSingle = (quiz) => {
    const subject = subjects.find(s => s.id === quiz.subject_id);
    const subjectName = subject?.name || 'Sin_Materia';
    const safeName = quiz.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '').replace(/\s+/g, '_');
    const filename = `${subjectName}_${safeName}.json`;

    const exportData = {
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions,
      total_questions: quiz.total_questions,
      metadata: {
        subject: subjectName,
        created_date: quiz.created_date,
        file_name: quiz.file_name
      }
    };

    downloadJSON(JSON.stringify(exportData, null, 2), filename);
    toast.success('Quiz exportado');
  };

  const handleImportToDb = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      let quizData = parsed;

      // Auto-convert compact format
      if (isCompactFormat(parsed)) {
        quizData = fromCompactFormat(parsed);
        toast.info('Formato detectado: Compacto (convertido automáticamente)');
      }

      // Basic validation
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error('El JSON debe contener un array de preguntas ("questions" o "q")');
      }

      // Create new quiz
      await base44.entities.Quiz.create({
        title: quizData.title || `Importado ${new Date().toLocaleDateString()}`,
        description: quizData.description || 'Importado desde JSON',
        subject_id: subjects[0]?.id || 'root', // Default to first available subject
        questions: quizData.questions,
        total_questions: quizData.questions.length,
        is_hidden: false,
        created_date: new Date().toISOString()
      });

      toast.success('¡Quiz importado exitosamente!');
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
        <TabsList className="grid w-full grid-cols-4 mb-6">
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
          <TabsTrigger value="export">
            <FolderDown className="w-4 h-4 mr-2" />
            Exportar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Subir Archivo JSON</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".json"
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
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Pega tu JSON aquí...'
                className="min-h-[200px] font-mono text-sm"
              />

              <Button onClick={validateJson} className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Validar JSON
              </Button>

              {validationResult && (
                <Card className={validationResult.valid ? 'border-green-500 bg-green-50' : 'border-destructive bg-destructive/10'}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {validationResult.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold">{validationResult.message}</p>
                        {validationResult.valid && validationResult.data && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Propiedades: {Object.keys(validationResult.data).join(', ')}
                          </p>
                        )}
                      </div>
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

        <TabsContent value="export" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Exportar Quizzes</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Descarga todos los quizzes como archivos JSON
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{quizzes.length} quizzes disponibles</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cada quiz se descargará como archivo JSON independiente
                    </p>
                  </div>
                  <Button
                    onClick={handleExportAll}
                    disabled={exporting || quizzes.length === 0}
                  >
                    {exporting ? (
                      <>Exportando {exportedCount}/{quizzes.length}</>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar todos
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="border rounded-xl divide-y max-h-96 overflow-y-auto">
                {quizzes.map((quiz) => {
                  const subject = subjects.find(s => s.id === quiz.subject_id);
                  return (
                    <div key={quiz.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{quiz.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {subject?.name || 'Sin materia'} • {quiz.total_questions || quiz.questions?.length || 0} preguntas
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportSingle(quiz)}
                        disabled={exporting}
                      >
                        <FileJson className="w-4 h-4 mr-1" />
                        Descargar
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}