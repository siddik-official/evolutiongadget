"use client";

import { Button } from "@/components/ui/button";
import { Printer, Download, FileText, Receipt } from "lucide-react";

interface InvoiceActionsProps {
  invoiceType: "pos" | "regular";
  onTypeChange: (type: "pos" | "regular") => void;
  onPrint: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
}

export default function InvoiceActions({
  invoiceType,
  onTypeChange,
  onPrint,
  onDownload,
  isDownloading = false,
}: InvoiceActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
      {/* Invoice Type Toggle */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => onTypeChange("pos")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            invoiceType === "pos"
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"
          }`}
        >
          <Receipt className="size-4" />
          POS Receipt
        </button>
        <button
          onClick={() => onTypeChange("regular")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700 ${
            invoiceType === "regular"
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"
          }`}
        >
          <FileText className="size-4" />
          Regular Invoice
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" onClick={onPrint}>
          <Printer className="size-4 mr-2" />
          Print
        </Button>
        <Button onClick={onDownload} disabled={isDownloading}>
          <Download className="size-4 mr-2" />
          {isDownloading ? "Generating..." : "Download PDF"}
        </Button>
      </div>
    </div>
  );
}
