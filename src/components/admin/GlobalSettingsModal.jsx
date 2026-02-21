
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Save, Loader2, Bot } from 'lucide-react';
import { client } from '@/api/client';
import { toast } from 'sonner';

export default function GlobalSettingsModal({ open, onOpenChange }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        enable_tutor: false
    });

    // Special ID for global settings
    const GLOBAL_SETTINGS_ID = 'global_system_settings';

    useEffect(() => {
        if (open) {
            loadGlobalSettings();
        }
    }, [open]);

    const loadGlobalSettings = async () => {
        setLoading(true);
        try {
            // Try to find existing global settings
            const allSettings = await client.entities.QuizSettings.list();
            const globalSettings = allSettings.find(s => s.entity_id === GLOBAL_SETTINGS_ID);

            if (globalSettings) {
                setSettings({
                    enable_tutor: globalSettings.enable_tutor || false
                });
            } else {
                // If not found, we'll create it on save
                setSettings({ enable_tutor: false });
            }
        } catch (error) {
            console.error('Error loading global settings:', error);
            toast.error('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const allSettings = await client.entities.QuizSettings.list();
            const existingSettings = allSettings.find(s => s.entity_id === GLOBAL_SETTINGS_ID);

            const settingsData = {
                entity_type: 'global', // Custom type for global settings
                entity_id: GLOBAL_SETTINGS_ID,
                enable_tutor: settings.enable_tutor,
                // Default other values to avoid issues if schema requires them
                show_options: true,
                show_feedback: true
            };

            if (existingSettings) {
                await client.entities.QuizSettings.update(existingSettings.id, settingsData);
            } else {
                await client.entities.QuizSettings.create(settingsData);
            }

            toast.success('Configuración guardada correctamente');
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving global settings:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Settings className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <DialogTitle>Configuración Global</DialogTitle>
                            <DialogDescription>
                                Ajustes que afectan a toda la plataforma
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Bot className="w-4 h-4 text-indigo-600" />
                                        <Label htmlFor="tutor-mode" className="font-semibold text-gray-900">
                                            Tutor IA
                                        </Label>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Activa el análisis de errores con IA en los exámenes.
                                    </p>
                                </div>
                                <Switch
                                    id="tutor-mode"
                                    checked={settings.enable_tutor}
                                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enable_tutor: checked }))}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading} className="bg-indigo-600 hover:bg-indigo-700">
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Cambios
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
