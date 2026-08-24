
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';

export default function ResourceEditor({ open, onOpenChange, resource = null, onSave, parentContext }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'link', // link, video, image, html, mermaid
        content: '',
    });

    useEffect(() => {
        if (open) {
            if (resource) {
                setFormData({
                    title: resource.title || '',
                    description: resource.description || '',
                    type: resource.type || 'link',
                    content: resource.content || '',
                });
            } else {
                setFormData({
                    title: '',
                    description: '',
                    type: 'link',
                    content: '',
                });
            }
        }
    }, [open, resource]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                ...formData,
                ...parentContext // contains course_id, subject_id, or folder_id
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving resource:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {resource ? 'Editar Recurso' : 'Nuevo Recurso'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="link">Enlace</SelectItem>
                                <SelectItem value="video">Video (YouTube/Vimeo)</SelectItem>
                                <SelectItem value="image">Imagen (URL)</SelectItem>
                                <SelectItem value="html">HTML / Animación</SelectItem>
                                <SelectItem value="mermaid">Diagrama Mermaid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">
                            {formData.type === 'link' ? 'URL' :
                                formData.type === 'video' ? 'URL del Video' :
                                    formData.type === 'image' ? 'URL de la Imagen' :
                                        formData.type === 'mermaid' ? 'Código Mermaid' :
                                            'Código HTML'}
                        </Label>
                        {formData.type === 'mermaid' || formData.type === 'html' ? (
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="font-mono text-sm h-32"
                                required
                            />
                        ) : (
                            <Input
                                id="content"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                required
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción (Opcional)</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
