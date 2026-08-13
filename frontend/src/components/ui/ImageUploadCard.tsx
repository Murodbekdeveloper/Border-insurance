'use client';

import { useRef, useState } from 'react';

export type ExtractResult =
  | { status: 'success'; message?: string }
  | { status: 'not_configured'; message: string }
  | { status: 'error'; message: string };

interface ImageUploadCardProps {
  label: string;
  description?: string;
  onExtract: (file: File) => Promise<ExtractResult>;
}

export function ImageUploadCard({ label, description, onExtract }: ImageUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setResult(null);
    try {
      const outcome = await onExtract(file);
      setResult(outcome);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
      {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {!file ? (
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
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            isDragOver
              ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30'
              : 'border-slate-300 hover:border-orange-300 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75v12" />
          </svg>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Rasm yuklash yoki shu yerga tashlang</span>
          <span className="text-xs text-slate-400">JPG, PNG</span>
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl ?? undefined} alt={file.name} className="h-14 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
              <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-medium text-orange-600 hover:underline dark:text-orange-400">
                O&apos;zgartirish
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {extracting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            Ma&apos;lumotlarni avtomatik aniqlash
          </button>

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
      )}
    </div>
  );
}
