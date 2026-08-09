"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SelectedFile {
  file: File;
}

/**
 * Validated file picker (PNG / JPG / JPEG / PDF, max 5 MB).
 * Returns the raw File via onChange so the caller uploads to Supabase Storage.
 */
export function FileInput({
  label,
  onChange,
  error,
  disabled,
}: {
  label?: string;
  onChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handle = (f: File | undefined) => {
    if (!f) return;
    if (!ALLOWED_FILE_TYPES.includes(f.type)) {
      setErr("Only PNG, JPG, JPEG or PDF files are allowed.");
      setFile(null);
      onChange(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setErr("File must be 5 MB or smaller.");
      setFile(null);
      onChange(null);
      return;
    }
    setErr(null);
    setFile({ file: f });
    onChange(f);
  };

  const isImage = file?.file.type.startsWith("image/");

  return (
    <div>
      {label && <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              onChange(null);
            }}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-white/40 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 dark:bg-white/5",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Attach a file</span>
          <span className="text-xs text-muted-foreground">PNG, JPG, JPEG or PDF · max 5 MB</span>
        </button>
      )}
      {(err ?? error) && <p className="mt-1.5 text-xs text-red-500">{err ?? error}</p>}
    </div>
  );
}
