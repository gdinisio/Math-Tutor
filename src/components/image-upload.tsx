"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, ImagePlus, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadedImage } from "@/lib/types";

interface ImageUploadProps {
  label: string;
  description: string;
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  multiple?: boolean;
}

function createUploadedImage(file: File): UploadedImage {
  return {
    id: crypto.randomUUID(),
    file,
    preview: URL.createObjectURL(file),
  };
}

export function ImageUpload({
  label,
  description,
  images,
  onChange,
  multiple = true,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const accepted = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (accepted.length === 0) return;

      const newImages = multiple
        ? [...images, ...accepted.map(createUploadedImage)]
        : [createUploadedImage(accepted[0])];

      onChange(newImages);
    },
    [images, multiple, onChange],
  );

  const removeImage = (id: string) => {
    const removed = images.find((img) => img.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);
    onChange(images.filter((img) => img.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          {label}
        </h3>
        <p className="text-sm text-[var(--color-ink-muted)]">{description}</p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "group relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all",
          isDragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
            : "border-[var(--color-border)] bg-white/60 hover:border-[var(--color-accent)] hover:bg-white",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-paper-dark)] text-[var(--color-accent)] transition-transform group-hover:scale-110">
          <Upload className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-[var(--color-ink)]">
          Drop images here or click to browse
        </p>
        <p className="mt-1 flex items-center justify-center gap-3 text-xs text-[var(--color-ink-muted)]">
          <span className="inline-flex items-center gap-1">
            <ImagePlus className="h-3.5 w-3.5" /> Photos
          </span>
          <span className="inline-flex items-center gap-1">
            <Camera className="h-3.5 w-3.5" /> Camera
          </span>
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="group/img relative aspect-[4/3] overflow-hidden rounded-lg border border-[var(--color-border)] bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.preview}
                alt="Upload preview"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute right-2 top-2 rounded-full bg-[var(--color-ink)]/80 p-1 text-white opacity-0 transition-opacity group-hover/img:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="absolute bottom-0 left-0 right-0 truncate bg-[var(--color-ink)]/70 px-2 py-1 text-xs text-white">
                {img.file.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
