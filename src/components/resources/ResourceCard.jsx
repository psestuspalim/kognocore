
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Image as ImageIcon, Video, Link as LinkIcon, Edit, Trash2, Code } from 'lucide-react';

const ResourceCard = ({ resource, onClick, onEdit, onDelete, canEdit }) => {
    const getIcon = (type) => {
        switch (type) {
            case 'video': return <Video className="w-5 h-5 text-red-500" />;
            case 'image': return <ImageIcon className="w-5 h-5 text-blue-500" />;
            case 'html': return <Code className="w-5 h-5 text-orange-500" />;
            case 'mermaid': return <FileText className="w-5 h-5 text-purple-500" />; // Or a diagram icon
            case 'link': return <LinkIcon className="w-5 h-5 text-green-500" />;
            default: return <FileText className="w-5 h-5 text-gray-500" />;
        }
    };

    const getBadgeColor = (type) => {
        switch (type) {
            case 'video': return 'bg-red-100 text-red-700 hover:bg-red-200';
            case 'image': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
            case 'html': return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
            case 'mermaid': return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
            default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow group relative flex flex-col h-full">
            <div
                onClick={() => onClick(resource)}
                className="cursor-pointer flex-grow"
            >
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                {getIcon(resource.type)}
                            </div>
                            <Badge variant="secondary" className={getBadgeColor(resource.type)}>
                                {resource.type?.toUpperCase()}
                            </Badge>
                        </div>
                    </div>
                    <CardTitle className="text-lg mt-3 line-clamp-2 leading-tight">
                        {resource.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {resource.description || "Sin descripción"}
                    </p>
                </CardContent>
            </div>

            {canEdit && (
                <CardFooter className="pt-2 border-t bg-gray-50/50 flex justify-end gap-2 px-4 py-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-white hover:text-indigo-600"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(resource);
                        }}
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-white hover:text-red-600"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(resource.id);
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
};

export default ResourceCard;
