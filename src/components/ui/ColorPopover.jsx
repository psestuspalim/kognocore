import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESETS = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#64748b', // Slate
    '#f43f5e'  // Rose
];

export function ColorPopover({ color, onChange, className = "" }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", className)}
                >
                    <div
                        className="w-4 h-4 rounded-full mr-2 border border-black/10"
                        style={{ backgroundColor: color }}
                    />
                    <span className="flex-1 truncate">{color}</span>
                    <Palette className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <h4 className="font-medium text-sm leading-none">Presets</h4>
                        <p className="text-xs text-muted-foreground">Select a brand color</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset}
                                className={cn(
                                    "w-8 h-8 rounded-full border border-black/10 flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                    color === preset && "ring-2 ring-ring ring-offset-2"
                                )}
                                style={{ backgroundColor: preset }}
                                onClick={() => onChange(preset)}
                                type="button"
                            >
                                {color === preset && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-1 pt-2 border-t">
                        <h4 className="font-medium text-sm leading-none">Custom</h4>
                        <div className="flex gap-2 mt-2">
                            <Input
                                value={color}
                                onChange={(e) => onChange(e.target.value)}
                                className="h-8"
                                placeholder="#000000"
                            />
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => onChange(e.target.value)}
                                className="w-8 h-8 p-1 rounded border cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
