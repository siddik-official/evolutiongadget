"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface FraudCheckResult {
  phone: string;
  total_orders: number;
  delivered: number;
  cancelled: number;
  returned: number;
  fraud_reports: number;
  delivery_rate: number;
  risk_level: "low" | "medium" | "high";
  providers: {
    pathao?: { orders: number; delivered: number; cancelled: number };
    steadfast?: { orders: number; delivered: number; cancelled: number };
    internal?: { orders: number; delivered: number; cancelled: number };
  };
}

interface FraudCheckProps {
  defaultPhone?: string;
  compact?: boolean;
  onResult?: (result: FraudCheckResult) => void;
}

export function FraudCheck({
  defaultPhone,
  compact,
  onResult,
}: FraudCheckProps) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FraudCheckResult | null>(null);

  const checkFraud = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/courier/fraud-check?phone=${encodeURIComponent(phone)}`,
      );
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data.data);
      onResult?.(data.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Fraud check failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "low":
        return <CheckCircle2 className="size-4" />;
      case "medium":
        return <AlertTriangle className="size-4" />;
      case "high":
        return <XCircle className="size-4" />;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="flex-1"
          />
          <Button onClick={checkFraud} disabled={loading} size="sm">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
          </Button>
        </div>

        {result && (
          <div className="flex items-center gap-3 text-sm">
            <Badge className={getRiskColor(result.risk_level)}>
              {getRiskIcon(result.risk_level)}
              <span className="ml-1 capitalize">{result.risk_level} Risk</span>
            </Badge>
            <span className="text-muted-foreground">
              {result.delivery_rate}% delivery rate
            </span>
            <span className="text-muted-foreground">
              ({result.delivered}/{result.total_orders} orders)
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="size-5" />
          Courier Fraud Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter customer phone number"
            onKeyDown={(e) => e.key === "Enter" && checkFraud()}
          />
          <Button onClick={checkFraud} disabled={loading}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
            Check
          </Button>
        </div>

        {result && (
          <div className="space-y-4 pt-4 border-t">
            {/* Risk Level */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Risk Level</span>
              <Badge className={getRiskColor(result.risk_level)}>
                {getRiskIcon(result.risk_level)}
                <span className="ml-1 capitalize">{result.risk_level}</span>
              </Badge>
            </div>

            {/* Delivery Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <TrendingUp className="size-4" />
                  Delivery Success Rate
                </span>
                <span className="font-bold">{result.delivery_rate}%</span>
              </div>
              <Progress value={result.delivery_rate} className="h-2" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <Package className="size-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{result.total_orders}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="size-4 mx-auto mb-1 text-green-600" />
                <p className="text-lg font-bold text-green-700">
                  {result.delivered}
                </p>
                <p className="text-xs text-green-600">Delivered</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                <XCircle className="size-4 mx-auto mb-1 text-red-600" />
                <p className="text-lg font-bold text-red-700">
                  {result.cancelled}
                </p>
                <p className="text-xs text-red-600">Cancelled</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                <AlertTriangle className="size-4 mx-auto mb-1 text-orange-600" />
                <p className="text-lg font-bold text-orange-700">
                  {result.returned}
                </p>
                <p className="text-xs text-orange-600">Returned</p>
              </div>
            </div>

            {/* Provider Breakdown */}
            {result.providers && Object.keys(result.providers).length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <h4 className="text-sm font-medium">By Source</h4>
                <div className="space-y-1 text-sm">
                  {result.providers.internal &&
                    result.providers.internal.orders > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Internal Orders
                        </span>
                        <span>
                          {result.providers.internal.delivered}/
                          {result.providers.internal.orders} delivered
                        </span>
                      </div>
                    )}
                  {result.providers.pathao &&
                    result.providers.pathao.orders > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pathao</span>
                        <span>
                          {result.providers.pathao.delivered}/
                          {result.providers.pathao.orders} delivered
                        </span>
                      </div>
                    )}
                  {result.providers.steadfast &&
                    result.providers.steadfast.orders > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Steadfast</span>
                        <span>
                          {result.providers.steadfast.delivered}/
                          {result.providers.steadfast.orders} delivered
                        </span>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Warning for high risk */}
            {result.risk_level === "high" && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 dark:text-red-300">
                    High Risk Customer
                  </p>
                  <p className="text-red-600 dark:text-red-400">
                    This customer has a high cancellation/return rate. Consider
                    confirming the order via phone call before shipping.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
