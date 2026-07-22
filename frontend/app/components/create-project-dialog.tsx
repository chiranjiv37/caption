'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, X, Sparkles, Upload, Info } from 'lucide-react';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    description?: string;
    source_language: string;
    series_id?: string;
    file: File;
  }) => Promise<void>;
  series?: { id: string; name: string }[];
  progress?: number;
  status?: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
  series = [],
  progress: externalProgress,
  status: externalStatus,
}: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [uploadName, setUploadName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadName(file.name);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setIsCreating(true);
    setCreateProgress(0);
    setError(null);

    // Simulate initial progress until real upload progress starts
    const interval = setInterval(() => {
      setCreateProgress((prev) => Math.min(98, prev + 8 + Math.random() * 12));
    }, 110);

    try {
      await onCreate({
        name: name.trim(),
        source_language: sourceLanguage,
        file,
      });

      clearInterval(interval);
      setCreateProgress(100);

      // Reset form
      setName('');
      setSourceLanguage('en');
      setUploadName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false);
      setTimeout(() => {
        setName('');
        setSourceLanguage('en');
        setUploadName('');
        setError(null);
        setCreateProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 150);
    }
  };

  const isValid = name.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        {!isCreating ? (
          <div className="p-[22px]">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[19px] font-bold tracking-[-0.02em]">
                New caption project
              </h2>
              <button
                onClick={handleClose}
                className="flex w-[30px] h-[30px] items-center justify-center border-none bg-transparent rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
            </div>

            {/* Form */}
            <div className="mt-[18px] flex flex-col gap-[15px]">
              {/* Project Name */}
              <div>
                <label className="block text-[13px] font-semibold mb-[7px]">
                  Project name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Espresso Machine Review"
                  autoFocus
                  className="w-full h-[42px] px-[13px] border border-border rounded-[10px] text-[14px] outline-none bg-background text-foreground focus:border-accent focus:ring-[3px] focus:ring-ring/30 transition-all"
                />
              </div>

              {/* Video File Upload */}
              <div>
                <label className="block text-[13px] font-semibold mb-[7px]">
                  Video file
                </label>
                <label className="flex flex-col items-center justify-center gap-[8px] p-5 border-[1.5px] border-dashed border-border rounded-[12px] bg-secondary/30 hover:bg-secondary/50 cursor-pointer text-center transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFilePick}
                    className="hidden"
                  />
                  <div className="flex w-[40px] h-[40px] items-center justify-center rounded-[10px] bg-accent/12 text-accent">
                    <Upload className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <div className="text-[13px] font-medium text-foreground">
                    {uploadName || 'Click to upload a video'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    MP4, MOV, or WebM · up to 2 GB
                  </div>
                </label>
              </div>

              {/* Spoken Language */}
              <div>
                <label className="block text-[13px] font-semibold mb-[7px]">
                  Spoken language
                </label>
                <div className="flex gap-[6px] flex-wrap">
                  {LANGUAGES.map((lang) => {
                    const isSelected = sourceLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => setSourceLanguage(lang.code)}
                        className={`inline-flex items-center gap-[6px] h-8 px-3 rounded-lg border font-semibold text-[12px] transition-colors ${
                          isSelected
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-border bg-background text-foreground hover:bg-secondary'
                        }`}
                      >
                        {lang.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info Box */}
              <div className="flex items-center gap-[10px] p-[11px_13px] rounded-[10px] bg-secondary text-[12px] text-muted-foreground">
                <Info className="w-4 h-4 text-accent flex-shrink-0" strokeWidth={1.8} />
                Speaker diarization runs automatically — each voice gets its own waveform track.
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 flex justify-end gap-[10px]">
              <Button
                variant="outline"
                onClick={handleClose}
                className="h-[42px] px-[18px] rounded-[10px] text-[14px] font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isValid}
                className="h-[42px] px-5 rounded-[10px] text-[14px] font-semibold gap-2"
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.8} />
                Transcribe & create
              </Button>
            </div>
          </div>
        ) : (
          /* Creating State */
          <div className="p-[38px_32px]">
            <div className="flex items-center gap-[14px]">
              <div className="w-[38px] h-[38px] rounded-full border-[3px] border-border border-t-accent animate-spin" />
              <div>
                <div className="text-[16px] font-semibold tracking-[-0.01em]">
                  {externalStatus === 'uploading'
                    ? 'Uploading video...'
                    : externalStatus === 'transcribing'
                    ? 'Transcribing audio...'
                    : 'Creating project...'}
                </div>
                <div className="text-[13px] text-muted-foreground mt-0.5">
                  {externalStatus === 'uploading'
                    ? 'Uploading your video to the server'
                    : externalStatus === 'transcribing'
                    ? 'Processing video and generating transcript'
                    : 'Setting up your caption project'}
                </div>
              </div>
            </div>
            <div className="mt-5 h-[7px] rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
                style={{ width: `${externalProgress ?? createProgress}%` }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
