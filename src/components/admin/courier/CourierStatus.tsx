"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, ExternalLink, Clock } from "lucide-react";
import type { CourierProvider, CourierStatus } from "@/lib/courier/types";

interface CourierStatusProps {
  provider: CourierProvider | null;
  trackingNumber: string | null;
  status: CourierStatus | null;
  shippedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  picked: "bg-blue-100 text-blue-800",
  in_transit: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  partial_delivered: "bg-orange-100 text-orange-800",
  returned: "bg-red-100 text-red-800",
  hold: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const TRACKING_URLS: Record<string, string> = {
  pathao: "https://merchant.pathao.com/tracking?consignment_id=",
  steadfast: "https://steadfast.com.bd/tracking?id=",
};

export function CourierStatusDisplay({
  provider,
  trackingNumber,
  status,
  shippedAt,
}: CourierStatusProps) {
  if (!provider || !trackingNumber) {
    return null;
  }

  const trackingUrl = TRACKING_URLS[provider] + trackingNumber;

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <Truck className="size-4" />
          Courier Shipment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Provider</span>
          <Badge variant="outline" className="capitalize">
            <Package className="size-3 mr-1" />
            {provider}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tracking #</span>
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-blue-600 hover:underline flex items-center gap-1"
          >
            {trackingNumber}
            <ExternalLink className="size-3" />
          </a>
        </div>

        {status && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              className={STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}
            >
              {status.replace("_", " ")}
            </Badge>
          </div>
        )}

        {shippedAt && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Shipped</span>
            <span className="text-sm flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(shippedAt).toLocaleString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
