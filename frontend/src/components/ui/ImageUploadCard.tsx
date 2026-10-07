'use client';

import { useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export type ExtractResult =
  | { status: 'success'; message?: string }
  | { status: 'not_configured'; message: string }
  | { status: 'error'; message: string };

interface ImageUploadCardProps {
  label: string;
  description?: string;
  // Most documents have meaningful info on both sides (e.g. a passport's
  // photo page vs. registration page) — up to 2 photos can be attached and
  // are sent to extraction together in one call.
  maxFiles?: number;
  onExtract: (files: File[]) => Promise<ExtractResult>;
}

interface SlotFile {
  file: File;
  previewUrl: string;
}

export function ImageUploadCard({ label, description, maxFiles = 2, onExtract }: ImageUploadCardProps) {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<SlotFile[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (selected: FileList | File[] | null) => {
    if (!selected) return;
    const incoming = Array.from(selected).slice(0, maxFiles - slots.length);
    if (incoming.length === 0) return;
    setSlots((prev) => [
      ...prev,
      ...incoming.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    setResult(null);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setResult(null);
  };

  const handleExtract = async () => {
    if (slots.length === 0) return;
    setExtracting(true);
    setResult(null);
    try {
      const outcome = await onExtract(slots.map((s) => s.file));
      setResult(outcome);
    } finally {
      setExtracting(false);
    }
  };

  const canAddMore = slots.length < maxFiles;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
      {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      {maxFiles > 1 && (
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {t('imageUpload.bothSidesNote', { maxFiles })}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={maxFiles > 1}
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="mt-3 flex flex-col gap-3">
        {slots.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {slots.map((slot, index) => (
              <div
                key={slot.previewUrl}
                className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slot.previewUrl} alt={slot.file.name} className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0 max-w-[9rem]">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{slot.file.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  aria-label={t('imageUpload.cancelImage')}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-white shadow hover:bg-red-600 dark:bg-slate-600 dark:hover:bg-red-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              isDragOver
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30'
                : 'border-slate-300 hover:border-orange-300 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75v12" />
            </svg>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {slots.length > 0 ? t('imageUpload.addMore') : t('imageUpload.uploadOrDrop')}
            </span>
            <span className="text-xs text-slate-400">JPG, PNG</span>
          </button>
        )}

        {slots.length > 0 && (
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {extracting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {t('imageUpload.autoDetect')}
          </button>
        )}

        {result && (
          <p
            className={`rounded-lg px-3 py-2 text-xs ${
              result.status === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                : result.status === 'not_configured'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
            }`}
          >
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
