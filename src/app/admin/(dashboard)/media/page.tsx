"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Images,
  Settings2,
  GripVertical,
  Link as LinkIcon,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { Banner } from "@/types";

export default function MediaPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [transitionSeconds, setTransitionSeconds] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-banner edit state (title, link_url)
  const [editState, setEditState] = useState<
    Record<string, { title: string; link_url: string; alt_text: string }>
  >({});

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch("/api/banners?all=true");
      const data = await res.json();
      setBanners(data.banners ?? []);
      if (data.settings?.transition_seconds) {
        setTransitionSeconds(data.settings.transition_seconds);
      }
      // init edit state
      const init: typeof editState = {};
      for (const b of data.banners ?? []) {
        init[b.id] = {
          title: b.title ?? "",
          link_url: b.link_url ?? "",
          alt_text: b.alt_text ?? "",
        };
      }
      setEditState(init);
    } catch {
      toast.error("Failed to load banners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    let added = 0;

    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);

        const uploadRes = await fetch("/api/upload/banners", {
          method: "POST",
          body: fd,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error);

        // Create banner record
        const bannerRes = await fetch("/api/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: uploadData.url,
            storage_path: uploadData.path,
            sort_order: banners.length + added,
          }),
        });
        if (!bannerRes.ok) {
          const d = await bannerRes.json();
          throw new Error(d.error);
        }
        added++;
      } catch (err) {
        toast.error(
          `Failed to upload ${file.name}: ${err instanceof Error ? err.message : "unknown error"}`,
        );
      }
    }

    if (added > 0) {
      toast.success(`${added} banner image${added > 1 ? "s" : ""} uploaded`);
      await fetchAll();
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function toggleActive(banner: Banner) {
    const res = await fetch(`/api/banners/${banner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !banner.is_active }),
    });
    if (!res.ok) {
      toast.error("Failed to update banner");
      return;
    }
    setBanners((prev) =>
      prev.map((b) =>
        b.id === banner.id ? { ...b, is_active: !b.is_active } : b,
      ),
    );
    toast.success(
      !banner.is_active
        ? "Banner is now visible on homepage"
        : "Banner hidden from homepage",
    );
  }

  async function handleUpdateMeta(bannerId: string) {
    const s = editState[bannerId];
    if (!s) return;
    const res = await fetch(`/api/banners/${bannerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: s.title || null,
        link_url: s.link_url || null,
        alt_text: s.alt_text || null,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Saved");
    setBanners((prev) =>
      prev.map((b) =>
        b.id === bannerId
          ? {
              ...b,
              title: s.title || null,
              link_url: s.link_url || null,
              alt_text: s.alt_text || null,
            }
          : b,
      ),
    );
  }

  async function handleUpdateOrder(bannerId: string, newOrder: number) {
    await fetch(`/api/banners/${bannerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sort_order: newOrder }),
    });
    setBanners((prev) =>
      prev
        .map((b) => (b.id === bannerId ? { ...b, sort_order: newOrder } : b))
        .sort((a, b) => a.sort_order - b.sort_order),
    );
  }

  async function handleDelete(banner: Banner) {
    if (!confirm("Delete this banner image? This cannot be undone.")) return;
    const res = await fetch(`/api/banners/${banner.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Banner deleted");
    setBanners((prev) => prev.filter((b) => b.id !== banner.id));
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/banners/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transition_seconds: transitionSeconds }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      toast.success("Slideshow settings saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings",
      );
    } finally {
      setSavingSettings(false);
    }
  }

  const activeCount = banners.filter((b) => b.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Images className="size-6" />
            Media — Banners
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload banner images and choose which ones appear on the homepage.
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {uploading ? "Uploading..." : "Upload Images"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="bg-muted rounded-lg px-4 py-3 text-sm">
          <span className="font-semibold">{banners.length}</span>
          <span className="text-muted-foreground ml-1">total images</span>
        </div>
        <div className="bg-green-50 rounded-lg px-4 py-3 text-sm">
          <span className="font-semibold text-green-700">{activeCount}</span>
          <span className="text-green-600 ml-1">
            {activeCount === 1 ? "showing on homepage" : "active on homepage"}
          </span>
        </div>
        {activeCount > 1 && (
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm">
            <span className="text-blue-600">
              Slideshow mode — transitions every {transitionSeconds}s
            </span>
          </div>
        )}
        {activeCount === 1 && (
          <div className="bg-yellow-50 rounded-lg px-4 py-3 text-sm">
            <span className="text-yellow-700">Single image — no slideshow</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Banner List */}
        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Images className="size-12 text-muted-foreground mb-4" />
                <p className="font-medium text-lg">No banners yet</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Upload images to display on the homepage banner section.
                </p>
                <Button
                  className="mt-4 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  Upload Your First Banner
                </Button>
              </CardContent>
            </Card>
          ) : (
            banners.map((banner, idx) => (
              <Card
                key={banner.id}
                className={`overflow-hidden transition-all ${
                  banner.is_active
                    ? "ring-2 ring-green-500 ring-offset-1"
                    : "opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row gap-0">
                  {/* Image */}
                  <div className="relative w-full sm:w-48 sm:min-w-[12rem] h-40 sm:h-32 shrink-0 bg-muted">
                    <Image
                      src={banner.image_url}
                      alt={banner.alt_text ?? `Banner ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 192px"
                      unoptimized
                    />
                    {banner.is_active && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-green-500 text-white text-xs">
                          Active
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex-1 p-3 sm:p-4 space-y-3">
                    {/* Title and Link inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Title (optional)
                        </Label>
                        <Input
                          value={editState[banner.id]?.title ?? ""}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              [banner.id]: {
                                ...prev[banner.id],
                                title: e.target.value,
                              },
                            }))
                          }
                          placeholder="e.g. Summer Sale"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <LinkIcon className="size-3" /> Link URL (optional)
                        </Label>
                        <Input
                          value={editState[banner.id]?.link_url ?? ""}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              [banner.id]: {
                                ...prev[banner.id],
                                link_url: e.target.value,
                              },
                            }))
                          }
                          placeholder="/category/football"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => handleUpdateMeta(banner.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant={banner.is_active ? "default" : "outline"}
                        className={`h-8 text-xs gap-1 ${
                          banner.is_active
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }`}
                        onClick={() => toggleActive(banner)}
                      >
                        {banner.is_active ? (
                          <>
                            <Eye className="size-3" /> Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="size-3" /> Hidden
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(banner)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {/* Sort order */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <GripVertical className="size-4 text-muted-foreground" />
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        Display order:
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={banner.sort_order}
                        onChange={(e) =>
                          handleUpdateOrder(
                            banner.id,
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="h-7 w-16 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">
                        (lower = shown first)
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="size-4" />
                Slideshow Settings
              </CardTitle>
              <CardDescription>
                Only applies when 2+ banners are active.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-1 mb-2">
                  <Clock className="size-4" />
                  Transition every
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={transitionSeconds}
                    onChange={(e) =>
                      setTransitionSeconds(
                        Math.min(
                          30,
                          Math.max(1, parseInt(e.target.value) || 5),
                        ),
                      )
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Between 1 and 30 seconds.
                </p>
              </div>

              <Separator />

              <Button
                onClick={saveSettings}
                disabled={savingSettings}
                className="w-full gap-2"
              >
                {savingSettings ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Settings2 className="size-4" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-gray-400 shrink-0" />
                <span>0 active → fallback hero shows</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-yellow-400 shrink-0" />
                <span>1 active → single image, no arrows</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-green-500 shrink-0" />
                <span>2+ active → slideshow with arrows</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
