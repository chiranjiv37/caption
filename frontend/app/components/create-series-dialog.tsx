'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X, Layers } from 'lucide-react';

interface CreateSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; description?: string }) => Promise<void>;
}

export function CreateSeriesDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateSeriesDialogProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Series name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreate({
        name: name.trim(),
      });

      // Reset form
      setName('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create series');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false);
      setTimeout(() => {
        setName('');
        setError(null);
      }, 150);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  const isValid = name.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        <div className="p-[22px]">
          {/* Header with icon */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-accent/12 text-accent">
              <Layers className="w-[19px] h-[19px]" strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="m-0 text-[18px] font-bold tracking-[-0.02em]">
                New series
              </h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground leading-[1.4]">
                Group related caption projects so they share a cast, languages & glossary.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 flex w-[30px] h-[30px] items-center justify-center border-none bg-secondary rounded-lg text-muted-foreground hover:bg-secondary/80 transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Series Name Input */}
          <div className="mt-4">
            <label className="block text-[13px] font-semibold mb-[7px]">
              Series name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. The Founders Playbook"
              autoFocus
              className="w-full h-[42px] px-[13px] border border-border rounded-[10px] text-[14px] outline-none bg-background text-foreground focus:border-accent focus:ring-[3px] focus:ring-ring/30 transition-all"
            />
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-5 flex justify-end gap-[10px]">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="h-[42px] px-[18px] rounded-[10px] text-[14px] font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isCreating}
              className="h-[42px] px-5 rounded-[10px] text-[14px] font-semibold gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" strokeWidth={2.2} />
                  Create series
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
