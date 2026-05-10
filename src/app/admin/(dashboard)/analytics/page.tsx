"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  Package,
  Percent,
  Tag,
  Truck,
  TrendingDown,
} from "lucide-react";

interface DailySales {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

interface TopProduct {
  product_name: string;
  total_qty: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
  revenue: number;
}

interface CategoryPerformance {
  category: string;
  revenue: number;
  orders: number;
  profit: number;
}

interface CouponStats {
  code: string;
  usage_count: number;
  total_discount: number;
  total_revenue: number;
}

type SalesChannel = "website" | "pos" | "online_platform";

interface ChannelSummary {
  source: SalesChannel;
  label: string;
  order_count: number;
  total_qty: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface ChannelProductRow {
  source: SalesChannel;
  label: string;
  product_name: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface ProductAnalysisReport {
  product_id: string;
  product_name: string;
  total_qty_sold: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin: number;
  current_stock: number;
  current_stock_cost: number;
  stock_added: number;
  stock_removed: number;
  net_stock_change: number;
  total_stock_cost_added: number;
}

interface StockHistoryRow {
  id: string;
  created_at: string;
  product_name: string;
  variant_label: string;
  movement_type: string;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  unit_cost_price: number;
  total_cost_impact: number;
  source: string;
  note: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#a855f7",
  shipped: "#6366f1",
  delivered: "#22c55e",
  canceled: "#ef4444",
  returned: "#6b7280",
};

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState("30");
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<
    CategoryPerformance[]
  >([]);
  const [couponStats, setCouponStats] = useState<CouponStats[]>([]);
  const [channelSummaries, setChannelSummaries] = useState<ChannelSummary[]>(
    [],
  );
  const [channelProducts, setChannelProducts] = useState<ChannelProductRow[]>(
    [],
  );
  const [productReports, setProductReports] = useState<ProductAnalysisReport[]>(
    [],
  );
  const [stockHistory, setStockHistory] = useState<StockHistoryRow[]>([]);
  const [mostSoldProduct, setMostSoldProduct] =
    useState<ProductAnalysisReport | null>(null);
  const [summary, setSummary] = useState({
    revenue: 0,
    cost: 0,
    profit: 0,
    profitMargin: 0,
    orders: 0,
    avgOrder: 0,
    totalDiscount: 0,
    totalDeliveryCharge: 0,
    courierFee: 0,
    netProfit: 0,
    netProfitMargin: 0,
  });
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const getOrderSource = (order: {
    delivery_type: string | null;
    platform: string | null;
  }): SalesChannel => {
    if (order.delivery_type === "store_pickup") return "pos";
    if (
      order.platform &&
      order.platform.trim().length > 0 &&
      order.platform !== "cell_phone"
    )
      return "online_platform";
    return "website";
  };

  const getSourceLabel = (source: SalesChannel) => {
    if (source === "website") return "Website";
    if (source === "pos") return "POS";
    return "Online Platform";
  };

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));
    const since = daysAgo.toISOString();

    // Fetch orders in period (exclude canceled/returned for revenue calculations)
    const { data: orders } = await supabase
      .from("orders")
      .select(
        "id, total, subtotal, discount_amount, delivery_charge, advance_payment_amount, status, created_at, coupon_code, delivery_type, platform, courier_provider",
      )
      .gte("created_at", since);

    // Fetch ALL order items with cost data
    const { data: allItems } = await supabase
      .from("order_items")
      .select(
        "product_id, variant_id, product_name, quantity, total_price, cost_price, unit_price, order_id",
      );

    const { data: variants } = await supabase.from("product_variants").select(`
        id,
        product_id,
        size,
        color,
        stock_quantity,
        cost_price,
        products(name)
      `);

    const { data: rawStockHistory, error: stockHistoryFetchError } =
      await supabase
        .from("inventory_stock_history")
        .select(
          "id, variant_id, product_id, movement_type, quantity_change, stock_before, stock_after, unit_cost_price, total_cost_impact, source, note, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);

    if (!orders || !allItems) {
      setLoading(false);
      return;
    }

    const stockHistoryData = stockHistoryFetchError
      ? []
      : rawStockHistory || [];

    // Create order ID set from filtered orders
    const validOrderIds = new Set(
      orders
        .filter((o) => !["canceled", "returned"].includes(o.status))
        .map((o) => o.id),
    );

    // Filter items to only include items from orders in period
    const validItems = allItems.filter((item) =>
      validOrderIds.has(item.order_id),
    );

    // Calculate summary metrics
    const validOrders = orders.filter(
      (o) => !["canceled", "returned"].includes(o.status),
    );

    // ─── Pre-compute per-item courier fee allocation ───
    // Delivery charge is a customer→courier pass-through (customer pays it, courier keeps it).
    // It has ZERO net effect on product profit. Only the 1% courier fee is deducted from our remittance.
    // So per-item fee = only the 1% courier fee, distributed proportionally by revenue share.
    type OrderWithFees = { id: string; total: number; delivery_type?: string | null; advance_payment_amount?: number | null; delivery_charge?: number | null };
    const orderFeeMap = new Map<string, number>(); // orderId -> courier fee only
    (validOrders as OrderWithFees[]).forEach((o) => {
      if (o.delivery_type === "store_pickup") { orderFeeMap.set(o.id, 0); return; }
      const advance = Number(o.advance_payment_amount || 0);
      const cod = Math.max(0, o.total - advance);
      // Only 1% courier fee — delivery charge is neutral (customer pays, courier keeps)
      orderFeeMap.set(o.id, cod * 0.01);
    });

    // Sum revenue per order (to compute each item's share)
    const orderRevenueMap = new Map<string, number>();
    validItems.forEach((item) => {
      orderRevenueMap.set(item.order_id, (orderRevenueMap.get(item.order_id) || 0) + item.total_price);
    });

    // itemAllocatedFee[i] = courier fee allocated to validItems[i]
    const itemAllocatedFee = validItems.map((item) => {
      const orderFee = orderFeeMap.get(item.order_id) || 0;
      const orderRevenue = orderRevenueMap.get(item.order_id) || 0;
      if (orderRevenue === 0 || orderFee === 0) return 0;
      return (item.total_price / orderRevenue) * orderFee;
    });
    // ───────────────────────────────────────────────────────────────
    const totalRevenue = validOrders.reduce((s, o) => s + o.total, 0);
    const totalDiscount = validOrders.reduce(
      (s, o) => s + (o.discount_amount || 0),
      0,
    );
    const totalCost = validItems.reduce(
      (s, item) => s + (item.cost_price || 0) * item.quantity,
      0,
    );
    // Gross profit = Revenue - Product Cost (delivery charge is collected revenue, counts in total)
    const totalProfit = totalRevenue - totalCost;
    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // ─── Correct courier fee: 1% of COD (= Total - Advance Payment) per order ───
    // Only for orders that went through a courier (have a courier_provider)
    // For ALL delivery orders: the courier collects (Total - Advance) on behalf of us.
    // They deduct 1% of that COD amount before remitting.
    // Additionally, the delivery charge we paid them is already included in order.total,
    // so delivery charge is a pass-through cost.
    let totalCourierFee = 0;
    let totalDeliveryChargeDeduction = 0;

    validOrders.forEach((o: { total: number; advance_payment_amount?: number | null; delivery_charge?: number | null; delivery_type?: string | null; courier_provider?: string | null }) => {
      // Only courier-delivered orders have COD handling
      if (o.delivery_type === "store_pickup") return;
      const advance = Number(o.advance_payment_amount || 0);
      const deliveryCharge = Number(o.delivery_charge || 0);
      const codAmount = Math.max(0, o.total - advance);
      // Courier fee = 1% of COD
      totalCourierFee += codAmount * 0.01;
      // Delivery charge is a cost (we pass it through to the customer but the courier keeps it)
      totalDeliveryChargeDeduction += deliveryCharge;
    });

    // Net profit = Gross Profit - Courier Fee - Delivery Charges
    const netProfit = totalProfit - totalCourierFee - totalDeliveryChargeDeduction;
    const netProfitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    setSummary({
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalProfit,
      profitMargin,
      orders: validOrders.length,
      avgOrder: validOrders.length > 0 ? totalRevenue / validOrders.length : 0,
      totalDiscount,
      totalDeliveryCharge: totalDeliveryChargeDeduction,
      courierFee: totalCourierFee,
      netProfit,
      netProfitMargin,
    });

    // Group by date (valid orders only)
    const byDate: Record<
      string,
      { revenue: number; cost: number; orders: number }
    > = {};

    validOrders.forEach((order) => {
      const date = new Date(order.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!byDate[date]) byDate[date] = { revenue: 0, cost: 0, orders: 0 };
      byDate[date].revenue += order.total;
      byDate[date].orders += 1;

      // Add cost for items in this order
      const orderItems = validItems.filter(
        (item) => item.order_id === order.id,
      );
      const orderCost = orderItems.reduce(
        (s, item) => s + (item.cost_price || 0) * item.quantity,
        0,
      );
      // Also deduct courier fee (1% of COD) and delivery charge from daily profit
      const advance = Number((order as { advance_payment_amount?: number | null }).advance_payment_amount || 0);
      const deliveryCharge = Number((order as { delivery_charge?: number | null }).delivery_charge || 0);
      const codAmount = order.delivery_type !== "store_pickup" ? Math.max(0, order.total - advance) : 0;
      const orderCourierFee = codAmount * 0.01;
      byDate[date].cost += orderCost + orderCourierFee + deliveryCharge;
    });

    setDailySales(
      Object.entries(byDate).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        orders: data.orders,
      })),
    );

    // Top products analysis (for this selected period)
    const byProduct: Record<
      string,
      { total_qty: number; total_revenue: number; total_cost: number }
    > = {};

    validItems.forEach((item, idx) => {
      if (!byProduct[item.product_name]) {
        byProduct[item.product_name] = {
          total_qty: 0,
          total_revenue: 0,
          total_cost: 0,
        };
      }
      byProduct[item.product_name].total_qty += item.quantity;
      byProduct[item.product_name].total_revenue += item.total_price;
      byProduct[item.product_name].total_cost +=
        (item.cost_price || 0) * item.quantity + itemAllocatedFee[idx];
    });

    const sortedProducts = Object.entries(byProduct)
      .map(([product_name, data]) => ({
        product_name,
        ...data,
        total_profit: data.total_revenue - data.total_cost,
        profit_margin:
          data.total_revenue > 0
            ? ((data.total_revenue - data.total_cost) / data.total_revenue) * 100
            : 0,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10);

    setTopProducts(sortedProducts);

    // Sales channel analytics (Website vs POS vs Online Platform)
    const validOrderMap = new Map(
      validOrders.map((order) => [order.id, order]),
    );

    const channelAgg: Record<
      SalesChannel,
      {
        orderIds: Set<string>;
        total_qty: number;
        revenue: number;
        cost: number;
      }
    > = {
      website: { orderIds: new Set(), total_qty: 0, revenue: 0, cost: 0 },
      pos: { orderIds: new Set(), total_qty: 0, revenue: 0, cost: 0 },
      online_platform: {
        orderIds: new Set(),
        total_qty: 0,
        revenue: 0,
        cost: 0,
      },
    };

    const channelProductAgg = new Map<
      string,
      {
        source: SalesChannel;
        product_name: string;
        qty: number;
        revenue: number;
        cost: number;
      }
    >();

    validItems.forEach((item, idx) => {
      const order = validOrderMap.get(item.order_id);
      if (!order) return;

      const source = getOrderSource(order);
      const channel = channelAgg[source];
      channel.orderIds.add(order.id);
      channel.total_qty += Number(item.quantity || 0);
      channel.revenue += Number(item.total_price || 0);
      channel.cost += Number(item.cost_price || 0) * Number(item.quantity || 0);

      const key = `${source}::${item.product_name}`;
      const row = channelProductAgg.get(key) || {
        source,
        product_name: item.product_name,
        qty: 0,
        revenue: 0,
        cost: 0,
      };
      row.qty += Number(item.quantity || 0);
      row.revenue += Number(item.total_price || 0);
      // Include allocated fee in product-level cost for accurate profit
      row.cost += Number(item.cost_price || 0) * Number(item.quantity || 0) + itemAllocatedFee[idx];
      channelProductAgg.set(key, row);
    });

    const channelSummaryRows: ChannelSummary[] = (
      Object.keys(channelAgg) as SalesChannel[]
    ).map((source) => {
      const channel = channelAgg[source];
      // Deduct only the 1% courier fee — delivery is a customer→courier pass-through
      let channelCourierFee = 0;
      channel.orderIds.forEach((orderId) => {
        const order = validOrderMap.get(orderId);
        if (!order || order.delivery_type === "store_pickup") return;
        const advance = Number((order as { advance_payment_amount?: number | null }).advance_payment_amount || 0);
        const cod = Math.max(0, order.total - advance);
        channelCourierFee += cod * 0.01;
      });
      const profit = channel.revenue - channel.cost - channelCourierFee;
      return {
        source,
        label: getSourceLabel(source),
        order_count: channel.orderIds.size,
        total_qty: channel.total_qty,
        revenue: channel.revenue,
        cost: channel.cost,
        profit,
      };
    });

    setChannelSummaries(channelSummaryRows);

    const channelProductRows: ChannelProductRow[] = Array.from(
      channelProductAgg.values(),
    )
      .map((row) => ({
        source: row.source,
        label: getSourceLabel(row.source),
        product_name: row.product_name,
        qty: row.qty,
        revenue: row.revenue,
        cost: row.cost,
        profit: row.revenue - row.cost,
      }))
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 30);

    setChannelProducts(channelProductRows);

    // Per-product report with stock and cost history
    const salesByProduct = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        total_qty_sold: number;
        total_revenue: number;
        total_cost: number;
      }
    >();

    validItems.forEach((item, idx) => {
      const productId = item.product_id || "unknown";
      const existing = salesByProduct.get(productId) || {
        product_id: productId,
        product_name: item.product_name,
        total_qty_sold: 0,
        total_revenue: 0,
        total_cost: 0,
      };

      existing.total_qty_sold += Number(item.quantity || 0);
      existing.total_revenue += Number(item.total_price || 0);
      // Include allocated courier fee + delivery charge for accurate net profit
      existing.total_cost +=
        Number(item.cost_price || 0) * Number(item.quantity || 0) + itemAllocatedFee[idx];
      salesByProduct.set(productId, existing);
    });

    const inventoryByProduct = new Map<
      string,
      {
        product_name: string;
        current_stock: number;
        current_stock_cost: number;
      }
    >();

    const variantLabelById = new Map<string, string>();

    (variants || []).forEach(
      (variant: {
        id: string;
        product_id: string;
        size: string;
        color: string | null;
        stock_quantity: number;
        cost_price: number;
        products: { name: string } | { name: string }[] | null;
      }) => {
        const productName = Array.isArray(variant.products)
          ? variant.products[0]?.name || "Unknown Product"
          : variant.products?.name || "Unknown Product";

        const existing = inventoryByProduct.get(variant.product_id) || {
          product_name: productName,
          current_stock: 0,
          current_stock_cost: 0,
        };

        existing.current_stock += Number(variant.stock_quantity || 0);
        existing.current_stock_cost +=
          Number(variant.stock_quantity || 0) * Number(variant.cost_price || 0);
        inventoryByProduct.set(variant.product_id, existing);

        const label = `${variant.size}${variant.color ? ` / ${variant.color}` : ""}`;
        variantLabelById.set(variant.id, label);
      },
    );

    const historyByProduct = new Map<
      string,
      {
        stock_added: number;
        stock_removed: number;
        net_stock_change: number;
        total_stock_cost_added: number;
      }
    >();

    stockHistoryData.forEach(
      (row: {
        product_id: string;
        quantity_change: number;
        total_cost_impact: number;
      }) => {
        const existing = historyByProduct.get(row.product_id) || {
          stock_added: 0,
          stock_removed: 0,
          net_stock_change: 0,
          total_stock_cost_added: 0,
        };

        const qtyChange = Number(row.quantity_change || 0);
        existing.net_stock_change += qtyChange;

        if (qtyChange > 0) {
          existing.stock_added += qtyChange;
          existing.total_stock_cost_added += Number(row.total_cost_impact || 0);
        } else if (qtyChange < 0) {
          existing.stock_removed += Math.abs(qtyChange);
        }

        historyByProduct.set(row.product_id, existing);
      },
    );

    const allProductIds = new Set<string>([
      ...Array.from(salesByProduct.keys()),
      ...Array.from(inventoryByProduct.keys()),
    ]);

    const reports = Array.from(allProductIds)
      .map((productId) => {
        const sales = salesByProduct.get(productId);
        const inventory = inventoryByProduct.get(productId);
        const history = historyByProduct.get(productId);

        const totalRevenue = Number(sales?.total_revenue || 0);
        const totalCost = Number(sales?.total_cost || 0);
        const totalProfit = totalRevenue - totalCost;

        return {
          product_id: productId,
          product_name:
            sales?.product_name || inventory?.product_name || "Unknown Product",
          total_qty_sold: Number(sales?.total_qty_sold || 0),
          total_revenue: totalRevenue,
          total_cost: totalCost,
          total_profit: totalProfit,
          profit_margin:
            totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
          current_stock: Number(inventory?.current_stock || 0),
          current_stock_cost: Number(inventory?.current_stock_cost || 0),
          stock_added: Number(history?.stock_added || 0),
          stock_removed: Number(history?.stock_removed || 0),
          net_stock_change: Number(history?.net_stock_change || 0),
          total_stock_cost_added: Number(history?.total_stock_cost_added || 0),
        };
      })
      .sort(
        (a, b) =>
          b.total_qty_sold - a.total_qty_sold ||
          b.total_revenue - a.total_revenue,
      );

    setProductReports(reports);
    setMostSoldProduct(reports.length > 0 ? reports[0] : null);

    const movementRows: StockHistoryRow[] = stockHistoryData.map(
      (row: {
        id: string;
        created_at: string;
        product_id: string;
        variant_id: string;
        movement_type: string;
        quantity_change: number;
        stock_before: number;
        stock_after: number;
        unit_cost_price: number;
        total_cost_impact: number;
        source: string;
        note: string | null;
      }) => {
        const productName =
          inventoryByProduct.get(row.product_id)?.product_name ||
          "Unknown Product";
        const variantLabel =
          variantLabelById.get(row.variant_id) || row.variant_id.slice(0, 8);

        return {
          id: row.id,
          created_at: row.created_at,
          product_name: productName,
          variant_label: variantLabel,
          movement_type: row.movement_type,
          quantity_change: Number(row.quantity_change || 0),
          stock_before: Number(row.stock_before || 0),
          stock_after: Number(row.stock_after || 0),
          unit_cost_price: Number(row.unit_cost_price || 0),
          total_cost_impact: Number(row.total_cost_impact || 0),
          source: row.source,
          note: row.note,
        };
      },
    );

    setStockHistory(movementRows);

    // Order status breakdown (all orders in period)
    const byStatus: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((order) => {
      if (!byStatus[order.status]) {
        byStatus[order.status] = { count: 0, revenue: 0 };
      }
      byStatus[order.status].count += 1;
      if (!["canceled", "returned"].includes(order.status)) {
        byStatus[order.status].revenue += order.total;
      }
    });

    setStatusBreakdown(
      Object.entries(byStatus).map(([status, data]) => ({
        status,
        count: data.count,
        revenue: data.revenue,
      })),
    );

    // Category performance (fetch products to get categories)
    const productIds = [
      ...new Set(validItems.map((item) => item.product_id).filter(Boolean)),
    ];
    const { data: products } = await supabase
      .from("products")
      .select("id, name, category_id, categories(name)")
      .in("id", productIds);

    if (products) {
      const byCategory: Record<
        string,
        { revenue: number; orders: Set<string>; cost: number; courierFee: number }
      > = {};

      validItems.forEach((item) => {
        const product = products.find((p) => p.id === item.product_id) as
          | {
              id: string;
              name: string;
              categories: { name: string } | { name: string }[] | null;
            }
          | undefined;

        const categoryName = Array.isArray(product?.categories)
          ? (product?.categories[0]?.name ?? "Uncategorized")
          : (product?.categories?.name ?? "Uncategorized");

        if (!byCategory[categoryName]) {
          byCategory[categoryName] = { revenue: 0, orders: new Set(), cost: 0, courierFee: 0 };
        }
        byCategory[categoryName].revenue += item.total_price;
        byCategory[categoryName].orders.add(item.order_id);
        byCategory[categoryName].cost += (item.cost_price || 0) * item.quantity;
      });

      // Distribute only courier fees per category by order (delivery is pass-through)
      validOrders.forEach((order) => {
        if (order.delivery_type === "store_pickup") return;
        const advance = Number((order as { advance_payment_amount?: number | null }).advance_payment_amount || 0);
        const cod = Math.max(0, order.total - advance);
        const fee = cod * 0.01;
        // Find which category this order's items belong to (use first item's category)
        const orderItem = validItems.find((i) => i.order_id === order.id);
        if (!orderItem) return;
        const product = products.find((p) => p.id === orderItem.product_id) as { categories: { name: string } | { name: string }[] | null } | undefined;
        const cat = Array.isArray(product?.categories)
          ? (product?.categories[0]?.name ?? "Uncategorized")
          : (product?.categories?.name ?? "Uncategorized");
        if (byCategory[cat]) {
          byCategory[cat].courierFee += fee;
        }
      });

      setCategoryPerformance(
        Object.entries(byCategory)
          .map(([category, data]) => ({
            category,
            revenue: data.revenue,
            orders: data.orders.size,
            profit: data.revenue - data.cost - data.courierFee,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
      );
    }

    // Coupon usage statistics
    const byCoupon: Record<
      string,
      { usage_count: number; total_discount: number; total_revenue: number }
    > = {};

    validOrders.forEach((order) => {
      if (order.coupon_code) {
        if (!byCoupon[order.coupon_code]) {
          byCoupon[order.coupon_code] = {
            usage_count: 0,
            total_discount: 0,
            total_revenue: 0,
          };
        }
        byCoupon[order.coupon_code].usage_count += 1;
        byCoupon[order.coupon_code].total_discount +=
          order.discount_amount || 0;
        byCoupon[order.coupon_code].total_revenue += order.total;
      }
    });

    setCouponStats(
      Object.entries(byCoupon)
        .map(([code, data]) => ({
          code,
          ...data,
        }))
        .sort((a, b) => b.usage_count - a.usage_count),
    );

    setLoading(false);
  }, [period, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <p className="text-center py-12 text-muted-foreground">
          Loading analytics...
        </p>
      </div>
    );
  }

  const mostProfitableProduct =
    productReports.length > 0
      ? [...productReports].sort((a, b) => b.total_profit - a.total_profit)[0]
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="size-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatPrice(summary.revenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.orders} orders · Avg {formatPrice(summary.avgOrder)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Package className="size-4" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {formatPrice(summary.cost)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Product cost (COGS)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="size-4" />
              Gross Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatPrice(summary.profit)}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Percent className="size-3" />
              {summary.profitMargin.toFixed(1)}% margin (before courier)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Tag className="size-4" />
              Total Discounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatPrice(summary.totalDiscount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Courier Fee & Net Profit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
              <Truck className="size-4" />
              Courier Fee (1% COD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              −{formatPrice(summary.courierFee)}
            </p>
            <p className="text-xs text-amber-600/70 mt-1">
              1% deducted by Pathao/Steadfast from COD
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
              <TrendingUp className="size-4" />
              Net Profit (After Courier)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPrice(summary.netProfit)}
            </p>
            <p className="text-xs text-emerald-600/70 flex items-center gap-1 mt-1">
              <Percent className="size-3" />
              {summary.netProfitMargin.toFixed(1)}% net margin
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <TrendingDown className="size-4" />
              Profit Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium text-green-600">{formatPrice(summary.revenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">− Product Cost</span>
              <span className="font-medium text-orange-600">−{formatPrice(summary.cost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">− Delivery Charges</span>
              <span className="font-medium text-amber-600">−{formatPrice(summary.totalDeliveryCharge)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">− Courier Fee (1% COD)</span>
              <span className="font-medium text-amber-600">−{formatPrice(summary.courierFee)}</span>
            </div>
            <div className="border-t pt-1.5 flex justify-between text-sm font-semibold">
              <span>Net Profit</span>
              <span className={summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {formatPrice(summary.netProfit)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel-wise Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Channel Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {channelSummaries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {channelSummaries.map((channel) => (
                <Card key={channel.source}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{channel.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>
                      Orders:{" "}
                      <span className="font-semibold">
                        {channel.order_count}
                      </span>
                    </p>
                    <p>
                      Products Sold:{" "}
                      <span className="font-semibold">{channel.total_qty}</span>
                    </p>
                    <p>
                      Revenue:{" "}
                      <span className="font-semibold text-green-600">
                        {formatPrice(channel.revenue)}
                      </span>
                    </p>
                    <p>
                      Cost:{" "}
                      <span className="font-semibold text-orange-600">
                        {formatPrice(channel.cost)}
                      </span>
                    </p>
                    <p>
                      Profit:{" "}
                      <span className="font-semibold text-blue-600">
                        {formatPrice(channel.profit)}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No channel analytics data.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel Product Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {channelProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelProducts.map((row) => (
                    <TableRow key={`${row.source}-${row.product_name}`}>
                      <TableCell>
                        <Badge variant="secondary">{row.label}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.product_name}
                      </TableCell>
                      <TableCell className="text-right">{row.qty}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatPrice(row.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        {formatPrice(row.cost)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-semibold">
                        {formatPrice(row.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No channel product data yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Product Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Most Sold Product ({period} days)</CardTitle>
          </CardHeader>
          <CardContent>
            {mostSoldProduct ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {mostSoldProduct.product_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Sold:{" "}
                  <span className="font-medium text-foreground">
                    {mostSoldProduct.total_qty_sold}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Profit:{" "}
                  <span className="font-medium text-blue-600">
                    {formatPrice(mostSoldProduct.total_profit)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Current Stock:{" "}
                  <span className="font-medium text-foreground">
                    {mostSoldProduct.current_stock}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No product sales data.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Highest Profit Product ({period} days)</CardTitle>
          </CardHeader>
          <CardContent>
            {mostProfitableProduct ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {mostProfitableProduct.product_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Profit:{" "}
                  <span className="font-medium text-blue-600">
                    {formatPrice(mostProfitableProduct.total_profit)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Revenue:{" "}
                  <span className="font-medium text-green-600">
                    {formatPrice(mostProfitableProduct.total_revenue)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Margin:{" "}
                  <span className="font-medium text-foreground">
                    {mostProfitableProduct.profit_margin.toFixed(1)}%
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No product profit data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Product Analytics Report */}
      <Card>
        <CardHeader>
          <CardTitle>Product Analytics Report</CardTitle>
        </CardHeader>
        <CardContent>
          {productReports.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">
                      Sold ({period}d)
                    </TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Stock Added</TableHead>
                    <TableHead className="text-right">Stock Removed</TableHead>
                    <TableHead className="text-right">
                      Stock Cost Added
                    </TableHead>
                    <TableHead className="text-right">
                      Current Stock Cost
                    </TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productReports.map((report) => (
                    <TableRow key={report.product_id}>
                      <TableCell className="font-medium">
                        {report.product_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.total_qty_sold}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.current_stock}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +{report.stock_added}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{report.stock_removed}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(report.total_stock_cost_added)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(report.current_stock_cost)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatPrice(report.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        {formatPrice(report.total_cost)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-semibold">
                        {formatPrice(report.total_profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            report.profit_margin > 30 ? "default" : "secondary"
                          }
                        >
                          {report.profit_margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No product analytics data yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stock Movement History */}
      <Card>
        <CardHeader>
          <CardTitle>Stock History with Cost Price Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {stockHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty Change</TableHead>
                    <TableHead className="text-right">Before</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">
                      Total Cost Impact
                    </TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockHistory.slice(0, 120).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {new Date(row.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.product_name}
                      </TableCell>
                      <TableCell>{row.variant_label}</TableCell>
                      <TableCell className="capitalize">
                        {row.movement_type.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${row.quantity_change >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {row.quantity_change >= 0
                          ? `+${row.quantity_change}`
                          : row.quantity_change}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.stock_before}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.stock_after}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(row.unit_cost_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(row.total_cost_impact)}
                      </TableCell>
                      <TableCell>{row.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No stock movement history yet. Save stock changes in inventory to
              start tracking.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Revenue, Cost, Profit Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue, Cost & Profit Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {dailySales.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value) => formatPrice(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="Cost"
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No sales data for this period.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Order Status Breakdown & Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length > 0 ? (
              <div className="space-y-3">
                {statusBreakdown.map((stat) => (
                  <div
                    key={stat.status}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="size-4 rounded"
                        style={{
                          backgroundColor:
                            STATUS_COLORS[stat.status] || "#6b7280",
                        }}
                      />
                      <div>
                        <p className="font-medium capitalize">{stat.status}</p>
                        <p className="text-sm text-muted-foreground">
                          {stat.count} order{stat.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatPrice(stat.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No order data
              </p>
            )}
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryPerformance.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value) => formatPrice(Number(value))}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(355, 82%, 56%)"
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="profit"
                      fill="#3b82f6"
                      name="Profit"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No category data
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Best Selling Products with Profit */}
      <Card>
        <CardHeader>
          <CardTitle>Best Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p, i) => (
                  <TableRow key={p.product_name}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {p.product_name}
                    </TableCell>
                    <TableCell className="text-right">{p.total_qty}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatPrice(p.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatPrice(p.total_cost)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-semibold">
                      {formatPrice(p.total_profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={p.profit_margin > 30 ? "default" : "secondary"}
                      >
                        {p.profit_margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No product data yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Coupon Usage Statistics */}
      {couponStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Coupon Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coupon Code</TableHead>
                  <TableHead className="text-right">Times Used</TableHead>
                  <TableHead className="text-right">Total Discount</TableHead>
                  <TableHead className="text-right">
                    Revenue Generated
                  </TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couponStats.map((coupon) => {
                  const roi =
                    coupon.total_discount > 0
                      ? (coupon.total_revenue / coupon.total_discount).toFixed(
                          2,
                        )
                      : "N/A";
                  return (
                    <TableRow key={coupon.code}>
                      <TableCell>
                        <code className="font-mono font-semibold bg-muted px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        {coupon.usage_count}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatPrice(coupon.total_discount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatPrice(coupon.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            parseFloat(roi as string) > 5
                              ? "default"
                              : "secondary"
                          }
                        >
                          {roi}x
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
