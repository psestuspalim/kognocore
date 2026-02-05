import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

export function DoubleConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    description = "This action cannot be undone.",
    confirmText = "CONFIRM",
    actionButtonText = "Confirm",
    variant = "destructive",
    className = ""
}) {
    const [inputValue, setInputValue] = useState('');

    const handleConfirm = () => {
        if (inputValue === confirmText) {
            onConfirm();
            onClose();
            setInputValue('');
        }
    };

    const handleClose = () => {
        setInputValue('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertTriangle className="h-6 w-6" />
                        <DialogTitle className="text-xl">{title}</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="confirm-input" className="text-sm font-semibold">
                            Type <span className="font-mono text-red-600 font-bold bg-red-50 px-1 rounded">{confirmText}</span> to confirm:
                        </Label>
                        <Input
                            id="confirm-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={confirmText}
                            className="border-red-200 focus-visible:ring-red-500"
                            autoComplete="off"
                        />
                    </div>
                </div>

                <DialogFooter className="sm:justify-between flex-row gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        className="flex-1 sm:flex-none"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant={variant}
                        onClick={handleConfirm}
                        disabled={inputValue !== confirmText}
                        className="flex-1 sm:flex-none"
                    >
                        {actionButtonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
