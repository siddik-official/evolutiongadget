import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "category-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];

async function ensureCategoryImagesBucket() {
  const supabase = createAdminClient();
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    return { error };
  }

  const bucket = buckets.find((item) => item.id === BUCKET_NAME);
  if (!bucket) {
    const { error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      },
    );

    if (createError) {
      return { error: createError };
    }

    return { error: null };
  }

  const needsUpdate =
    bucket.public !== true ||
    bucket.file_size_limit !== MAX_FILE_SIZE ||
    JSON.stringify(bucket.allowed_mime_types ?? []) !==
      JSON.stringify(ALLOWED_MIME_TYPES);

  if (needsUpdate) {
    const { error: updateError } = await supabase.storage.updateBucket(
      BUCKET_NAME,
      {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      },
    );

    if (updateError) {
      return { error: updateError };
    }
  }

  return { error: null };
}

/**
 * Upload category banner image to Supabase Storage
 * POST /api/upload/category-images
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only JPG, PNG, WebP, and AVIF are allowed",
        },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { error: bucketError } = await ensureCategoryImagesBucket();
    if (bucketError) {
      console.error("Bucket setup error:", bucketError);
      return NextResponse.json(
        { error: bucketError.message || "Failed to prepare storage bucket" },
        { status: 500 },
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Category image upload error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to upload image" },
        { status: 500 },
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Delete category banner image from Supabase Storage
 * DELETE /api/upload/category-images?path=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Image path is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.error("Category image delete error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete image" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
