
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Lightbulb, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIErrorFeedback({ isLoading, analysis }) {
    if (isLoading) {
        return (
            <Card className="border-indigo-100 bg-indigo-50/30 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full h-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[160px] text-center space-y-3">
                    <div className="relative">
                        <Bot className="w-8 h-8 text-indigo-400 animate-bounce" />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
                    </div>
                    <p className="text-sm font-medium text-indigo-600 animate-pulse">
                        El Profesor IA está analizando tu respuesta...
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!analysis) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Bot className="w-24 h-24 text-indigo-600" />
                </div>

                <CardHeader className="pb-2 border-b border-indigo-100/50">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                            <Bot className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h3 className="font-bold text-indigo-900 text-sm md:text-base">
                            Análisis del Tutor IA
                        </h3>
                        {analysis.tipo_error && (
                            <Badge variant="outline" className="ml-auto border-indigo-200 text-indigo-700 bg-indigo-50">
                                {analysis.tipo_error}
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                    <div className="space-y-3">
                        <div className="flex gap-3 items-start">
                            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    El Problema
                                </p>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {analysis.explicacion_breve}
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 flex gap-3 items-start">
                            <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-amber-600/80 uppercase tracking-wider">
                                    Recomendación
                                </p>
                                <p className="text-sm text-amber-900 leading-relaxed italic">
                                    "{analysis.recomendacion}"
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
