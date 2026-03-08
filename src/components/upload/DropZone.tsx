'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
  disabled?: boolean;
}

export function DropZone({ onFileSelect, accept = 'image/*', className, disabled }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) {
        onFileSelect(f);
      }
    },
    [onFileSelect, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelect(f);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        'flex h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200',
        isDragOver
          ? 'border-primary bg-primary/10 scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:bg-primary/5',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {isDragOver ? (
        <>
          <ImagePlus className="text-primary mb-3 h-10 w-10" />
          <p className="text-primary text-sm font-medium">Drop to upload</p>
        </>
      ) : (
        <>
          <Upload className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-sm font-medium">Drop receipt image here</p>
          <p className="text-muted-foreground mt-1 text-xs">or click to browse</p>
          <p className="text-muted-foreground/60 mt-2 text-[10px]">PNG, JPG, WebP up to 10MB</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
