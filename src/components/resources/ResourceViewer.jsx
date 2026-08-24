
import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import mermaid from 'mermaid';

export default function ResourceViewer({ open, onOpenChange, resource }) {
    const [renderError, setRenderError] = useState(null);

    useEffect(() => {
        if (open && resource?.type === 'mermaid') {
            mermaid.initialize({ startOnLoad: true });
            setTimeout(() => {
                mermaid.contentLoaded();
            }, 100);
        }
    }, [open, resource]);

    if (!resource) return null;

    const renderContent = () => {
        switch (resource.type) {
            case 'video':
                // Simple embed detection for YouTube/Vimeo
                let embedUrl = resource.content;
                if (resource.content.includes('youtube.com/watch?v=')) {
                    embedUrl = resource.content.replace('watch?v=', 'embed/');
                } else if (resource.content.includes('youtu.be/')) {
                    embedUrl = resource.content.replace('youtu.be/', 'youtube.com/embed/');
                }

                return (
                    <div className="aspect-video w-full">
                        <iframe
                            src={embedUrl}
                            className="w-full h-full rounded-lg"
                            allowFullScreen
                            title={resource.title}
                        />
                    </div>
                );
            case 'image':
                return (
                    <div className="flex justify-center">
                        <img
                            src={resource.content}
                            alt={resource.title}
                            className="max-h-[70vh] rounded-lg object-contain"
                        />
                    </div>
                );
            case 'html':
                return (
                    <div className="border rounded-lg p-4 bg-white overflow-auto max-h-[70vh]">
                        <div dangerouslySetInnerHTML={{ __html: resource.content }} />
                    </div>
                );
            case 'mermaid':
                return (
                    <div className="mermaid flex justify-center p-4 bg-white rounded-lg overflow-auto">
                        {resource.content}
                    </div>
                );
            case 'link':
            default:
                return (
                    <div className="p-8 text-center">
                        <p className="mb-4">Este recurso es un enlace externo:</p>
                        <a
                            href={resource.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline text-lg"
                        >
                            {resource.content}
                        </a>
                    </div>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{resource.title}</DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    {renderContent()}
                </div>

                {resource.description && (
                    <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                        {resource.description}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
