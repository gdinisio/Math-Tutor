"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_SOURCE_BYTES } from "@/lib/image";
import type { UploadedImage } from "@/lib/types";

/** Matches the per-side cap enforced by the API route. */
const MAX_IMAGES = 12;

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
  const browseRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  // Every preview is an object URL, which the browser holds until it is
  // explicitly revoked. Without this the page leaks a full-size photo per
  // upload for as long as the tab is open.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => {
    return () => {
      for (const img of imagesRef.current) URL.revokeObjectURL(img.preview);
    };
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const problems: string[] = [];

      const accepted = incoming.filter((file) => {
        if (!file.type.startsWith("image/")) {
          problems.push(`${file.name} isn't an image`);
          return false;
        }
        if (file.size > MAX_SOURCE_BYTES) {
          problems.push(`${file.name} is over 25 MB`);
          return false;
        }
        return true;
      });

      if (accepted.length === 0) {
        setWarning(problems[0] ?? "No images were added");
        return;
      }

      let next: UploadedImage[];

      if (multiple) {
        const room = MAX_IMAGES - images.length;
        if (room <= 0) {
          setWarning(`You can attach at most ${MAX_IMAGES} images here`);
          return;
        }
        if (accepted.length > room) {
          problems.push(`only the first ${room} were added (max ${MAX_IMAGES})`);
        }
        next = [...images, ...accepted.slice(0, room).map(createUploadedImage)];
      } else {
        // Single mode replaces the existing image — release the old preview.
        for (const img of images) URL.revokeObjectURL(img.preview);
        next = [createUploadedImage(accepted[0])];
      }

      setWarning(problems.length > 0 ? problems.join("; ") : null);
      onChange(next);
    },
    [images, multiple, onChange],
  );

  const removeImage = (id: string) => {
    const removed = images.find((img) => img.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);
    setWarning(null);
    onChange(images.filter((img) => img.id !== id));
  };

  const clearAll = () => {
    for (const img of images) URL.revokeObjectURL(img.preview);
    setWarning(null);
    onChange([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    // Reset so picking the same file twice still fires a change event.
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
            {label}
          </h3>
          <p className="text-sm text-[var(--color-ink-muted)]">{description}</p>
        </div>
        {images.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-paper-dark)] hover:text-[var(--color-ink)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/*
        Two inputs rather than one: `capture` on a lone input forces the camera
        on mobile and hides the photo library entirely, so a student couldn't
        upload a photo they'd already taken.
      */}
      <input
        ref={browseRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={onInputChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onInputChange}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label={`Add ${label.toLowerCase()} images`}
        onClick={() => browseRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            browseRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "group relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all",
          isDragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
            : "border-[var(--color-border)] bg-white/60 hover:border-[var(--color-accent)] hover:bg-white",
        )}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-paper-dark)] text-[var(--color-accent)] transition-transform group-hover:scale-110">
          <Upload className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-[var(--color-ink)]">
          Drop images here or click to browse
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">
          <ImagePlus className="h-3.5 w-3.5" />
          {multiple ? `Up to ${MAX_IMAGES} pages` : "One photo"}
        </p>
      </div>

      {/* Hidden on desktop, where `capture` is ignored and this just duplicates Browse. */}
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="touch-only w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/70 px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)]"
      >
        <Camera className="h-4 w-4 text-[var(--color-accent)]" />
        Take a photo
      </button>

      {warning && (
        <p className="text-xs text-[var(--color-accent)]">{warning}</p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="group/img relative aspect-[4/3] overflow-hidden rounded-lg border border-[var(--color-border)] bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.preview}
                alt={`${label} page ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute right-2 top-2 rounded-full bg-[var(--color-ink)]/80 p-1 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover/img:opacity-100"
                aria-label={`Remove ${img.file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="absolute inset-x-0 bottom-0 truncate bg-[var(--color-ink)]/70 px-2 py-1 text-xs text-white">
                {multiple ? `${index + 1}. ` : ""}
                {img.file.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
