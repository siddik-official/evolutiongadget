"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export interface CategoryImage {
  url: string;
  path: string;
}

interface CategoryImageUploadProps {
  image: CategoryImage | null;
  onImageChange: (image: CategoryImage | null) => void;
}

export default function CategoryImageUpload({
  image,
  onImageChange,
}: CategoryImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);

      // Upload to API
      const response = await fetch("/api/upload/category-images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();

      // Update with uploaded image
      onImageChange({
        url: data.url,
        path: data.path,
      });

      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!image) return;

    try {
      // Delete from storage if it has a path
      if (image.path) {
        await fetch(`/api/upload/category-images?path=${image.path}`, {
          method: "DELETE",
        });
      }

      onImageChange(null);
      toast.success("Image removed");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove image");
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!image ? (
        <Button
          type="button"
          variant="outline"
          className="w-full h-40 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Category Banner
            </>
          )}
        </Button>
      ) : (
        <div className="relative w-full h-40 border rounded-lg overflow-hidden group">
          <Image
            src={image.url}
            alt="Category banner"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Recommended: 1200x400px banner image. Max 5MB. JPG, PNG, WebP, or AVIF.
      </p>
    </div>
  );
}
