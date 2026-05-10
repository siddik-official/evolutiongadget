"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Order } from "@/types";
import {
  InvoicePOS,
  InvoiceRegular,
  InvoiceActions,
} from "@/components/invoice";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function CustomerInvoicePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceType, setInvoiceType] = useState<"pos" | "regular">("regular");
  const [isDownloading, setIsDownloading] = useState(false);
  const [footerPhone, setFooterPhone] = useState("01313542742");
  const invoiceRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    async function fetchOrder() {
      const [orderRes, itemsRes, settingsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase
          .from("store_settings")
          .select("key, value")
          .eq("key", "footer_phone")
          .single(),
      ]);

      if (orderRes.data) {
        const o = orderRes.data as Order;
        o.items = (itemsRes.data || []) as Order["items"];
        setOrder(o);
      }

      if (settingsRes.data?.value) {
        setFooterPhone(settingsRes.data.value);
      }

      setLoading(false);
    }

    fetchOrder();
  }, [orderId, supabase]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!invoiceRef.current || !order) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      let pdf: jsPDF;
      if (invoiceType === "pos") {
        const pdfWidth = 80;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [pdfWidth, pdfHeight],
        });
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      } else {
        pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`Invoice-${order.order_number}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Order not found.</p>
        <Button variant="outline" asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 print:hidden">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/thank-you/${orderId}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Your Invoice</h1>
            <p className="text-sm text-muted-foreground">
              Order #{order.order_number}
            </p>
          </div>
        </div>

        {/* Invoice Actions */}
        <InvoiceActions
          invoiceType={invoiceType}
          onTypeChange={setInvoiceType}
          onPrint={handlePrint}
          onDownload={handleDownload}
          isDownloading={isDownloading}
        />

        {/* Invoice Preview */}
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-6 print:bg-transparent print:p-0">
          <div
            className={`shadow-lg print:shadow-none ${
              invoiceType === "pos"
                ? "max-w-[80mm] mx-auto"
                : "max-w-[210mm] mx-auto"
            }`}
          >
            {invoiceType === "pos" ? (
              <InvoicePOS ref={invoiceRef} order={order} storePhone={footerPhone} />
            ) : (
              <InvoiceRegular ref={invoiceRef} order={order} storePhone={footerPhone} />
            )}
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:hidden {
              display: none !important;
            }
            #invoice-content,
            #invoice-content * {
              visibility: visible;
            }
            #invoice-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              margin: ${invoiceType === "pos" ? "5mm" : "10mm"};
              size: ${invoiceType === "pos" ? "80mm auto" : "A4"};
            }
          }
        `}</style>
      </div>
    </div>
  );
}
