"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  XCircle,
  Loader2,
  RefreshCw,
  Truck,
  Package,
  TrendingUp,
  TrendingDown,
  CircleCheck,
  CircleX,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

interface FraudCheckDisplayProps {
  orderId?: string;
  customerName: string;
  phone: string;
  address: string;
  codAmount: number;
  district?: string;
  policeStation?: string;
  autoCheck?: boolean;
}

interface CourierSummary {
  name: string;
  available: boolean;
  message: string;
  total: number;
  success: number;
  cancel: number;
  deliveredPercentage: number;
  returnPercentage: number;
}

interface FraudCheckerData {
  available: boolean;
  error?: string;
  phone?: string;
  summaries?: {
    [key: string]: CourierSummary;
  };
  totalSummary?: {
    total: number;
    success: number;
    cancel: number;
    successRate: number;
    cancelRate: number;
  };
  riskAssessment?: {
    level: "low" | "medium" | "high" | "very_high" | "unknown";
    score: number;
    status: "Safe" | "Warning" | "Fraud" | "Unknown";
    allowCourierCreate: boolean;
    reasons: string[];
  };
  source?: string;
}

interface FraudCheckResult {
  score: number;
  level: "low" | "medium" | "high";
  reasons: string[];
  allowCourierCreate: boolean;
  orderHistory?: {
    total: number;
    delivered: number;
    cancelled: number;
    recent24h: number;
  };
  fraudBD?: FraudCheckerData;
}

export function FraudCheckDisplay({
  orderId,
  customerName,
  phone,
  address,
  codAmount,
  district,
  policeStation,
  autoCheck = true,
}: FraudCheckDisplayProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FraudCheckResult | null>(null);

  const performFraudCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/fraud/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          customerName,
          phone,
          address,
          codAmount,
          district,
          policeStation,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        toast.error(data.error || "Fraud check failed");
      }
    } catch (error) {
      console.error("Fraud check error:", error);
      toast.error("Failed to perform fraud check");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoCheck) {
      performFraudCheck();
    }
  }, [autoCheck]);

  const getStatusConfig = (status: string | undefined) => {
    switch (status) {
      case "Safe":
        return {
          color: "bg-gradient-to-r from-green-500 to-emerald-500",
          bgColor: "bg-green-50 dark:bg-green-950/30",
          borderColor: "border-green-200 dark:border-green-800",
          textColor: "text-green-700 dark:text-green-300",
          icon: <ShieldCheck className="size-8" />,
          label: "Safe Customer",
        };
      case "Warning":
        return {
          color: "bg-gradient-to-r from-yellow-500 to-orange-500",
          bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          textColor: "text-yellow-700 dark:text-yellow-300",
          icon: <ShieldAlert className="size-8" />,
          label: "Warning",
        };
      case "Fraud":
        return {
          color: "bg-gradient-to-r from-red-500 to-rose-500",
          bgColor: "bg-red-50 dark:bg-red-950/30",
          borderColor: "border-red-200 dark:border-red-800",
          textColor: "text-red-700 dark:text-red-300",
          icon: <ShieldX className="size-8" />,
          label: "High Risk",
        };
      default:
        return {
          color: "bg-gradient-to-r from-gray-400 to-gray-500",
          bgColor: "bg-gray-50 dark:bg-gray-900/30",
          borderColor: "border-gray-200 dark:border-gray-800",
          textColor: "text-gray-700 dark:text-gray-300",
          icon: <Shield className="size-8" />,
          label: "Unknown",
        };
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "low":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800">
            <CheckCircle2 className="size-3 mr-1" />
            Low Risk
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="size-3 mr-1" />
            Medium Risk
          </Badge>
        );
      case "high":
      case "very_high":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800">
            <XCircle className="size-3 mr-1" />
            High Risk
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Activity className="size-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="size-5 text-blue-600" />
            Fraud Risk Assessment
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={performFraudCheck}
            disabled={loading}
            className="hover:bg-white/50 dark:hover:bg-slate-700/50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading && !result && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-8 animate-spin mb-3 text-blue-600" />
            <p className="text-sm font-medium">Analyzing customer...</p>
            <p className="text-xs mt-1">Checking courier history</p>
          </div>
        )}

        {result && (
          <>
            {/* Status Hero Section */}
            {result.fraudBD?.available && result.fraudBD.riskAssessment && (
              <div
                className={`p-6 ${getStatusConfig(result.fraudBD.riskAssessment.status).bgColor} border-b ${getStatusConfig(result.fraudBD.riskAssessment.status).borderColor}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-full ${getStatusConfig(result.fraudBD.riskAssessment.status).color} text-white shadow-lg`}
                  >
                    {getStatusConfig(result.fraudBD.riskAssessment.status).icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3
                        className={`text-xl font-bold ${getStatusConfig(result.fraudBD.riskAssessment.status).textColor}`}
                      >
                        {
                          getStatusConfig(result.fraudBD.riskAssessment.status)
                            .label
                        }
                      </h3>
                      {getRiskBadge(result.fraudBD.riskAssessment.level)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Trust Score:{" "}
                      <span
                        className={`font-bold text-lg ${getScoreColor(100 - result.fraudBD.riskAssessment.score)}`}
                      >
                        {100 - result.fraudBD.riskAssessment.score}%
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    {result.allowCourierCreate ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CircleCheck className="size-5" />
                        <span className="text-sm font-medium">
                          Shipping Allowed
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <CircleX className="size-5" />
                        <span className="text-sm font-medium">
                          Shipping Blocked
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Quick Stats */}
              {result.fraudBD?.available && result.fraudBD.totalSummary && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="size-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                        Total Orders
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {result.fraudBD.totalSummary.total}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-100 dark:border-green-900">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="size-4 text-green-600" />
                      <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                        Delivered
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {result.fraudBD.totalSummary.success}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {result.fraudBD.totalSummary.successRate.toFixed(0)}%
                      success
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-100 dark:border-red-900">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="size-4 text-red-600" />
                      <span className="text-xs font-medium text-red-600 uppercase tracking-wide">
                        Cancelled
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {result.fraudBD.totalSummary.cancel}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {result.fraudBD.totalSummary.cancelRate.toFixed(0)}%
                      cancel
                    </p>
                  </div>
                </div>
              )}

              {/* Courier Breakdown */}
              {result.fraudBD?.available && result.fraudBD.summaries && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-slate-600" />
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Courier History
                    </h4>
                    {result.fraudBD.source && (
                      <Badge variant="outline" className="text-xs ml-auto">
                        {result.fraudBD.source}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(result.fraudBD.summaries).map(
                      ([key, courier]) => (
                        <div
                          key={key}
                          className={`p-4 rounded-xl border transition-all ${
                            courier.available && courier.total > 0
                              ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${courier.available && courier.total > 0 ? "bg-green-500" : "bg-gray-300"}`}
                              />
                              <span className="font-semibold text-sm capitalize">
                                {courier.name}
                              </span>
                            </div>
                            {courier.available && courier.total > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {courier.total} orders
                              </span>
                            )}
                          </div>

                          {courier.available && courier.total > 0 ? (
                            <>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    Delivery Rate
                                  </span>
                                  <span className="font-medium">
                                    {courier.deliveredPercentage}%
                                  </span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${getProgressColor(courier.deliveredPercentage)}`}
                                    style={{
                                      width: `${courier.deliveredPercentage}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-4 mt-3 text-xs">
                                <span className="text-green-600">
                                  <CheckCircle2 className="size-3 inline mr-1" />
                                  {courier.success}
                                </span>
                                <span className="text-red-600">
                                  <XCircle className="size-3 inline mr-1" />
                                  {courier.cancel}
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {courier.message || "No data"}
                            </p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Local Order History */}
              {result.orderHistory && result.orderHistory.total > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Your Store History
                  </h4>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold">
                        {result.orderHistory.total}
                      </p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        {result.orderHistory.delivered}
                      </p>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">
                        {result.orderHistory.cancelled}
                      </p>
                      <p className="text-xs text-muted-foreground">Cancelled</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-600">
                        {result.orderHistory.recent24h}
                      </p>
                      <p className="text-xs text-muted-foreground">Last 24h</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Not Available */}
              {result.fraudBD && !result.fraudBD.available && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="size-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300">
                        Courier History Unavailable
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {result.fraudBD.error ||
                          "Could not fetch courier history"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Reasons */}
              {result.reasons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Analysis Details
                  </h4>
                  <ul className="space-y-2">
                    {result.reasons.map((reason, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-900"
                      >
                        {reason.includes("✅") || reason.includes("✓") ? (
                          <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                        ) : reason.includes("🚨") || reason.includes("⚠️") ? (
                          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <Activity className="size-4 text-blue-600 shrink-0 mt-0.5" />
                        )}
                        <span className="text-slate-600 dark:text-slate-400">
                          {reason.replace(/^[✓✅⚠️🚨📊]\s*/, "")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* High Risk Warning */}
              {(result.level === "high" ||
                result.fraudBD?.riskAssessment?.status === "Fraud") && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                      <ShieldX className="size-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-300">
                        ⚠️ High Risk Customer Detected
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        This customer has multiple fraud indicators. We strongly
                        recommend confirming the order via phone call before
                        shipping. Automatic courier creation has been blocked.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
