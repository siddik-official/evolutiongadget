"use client";

import { Order } from "@/types";
import { formatPrice, formatVariantShort } from "@/lib/utils";
import { Scissors } from "lucide-react";
import { forwardRef } from "react";

interface InvoicePOSProps {
  order: Order;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
}

const InvoicePOS = forwardRef<HTMLDivElement, InvoicePOSProps>(
  (
    {
      order,
      storeName = "Evolution Gadget",
      storePhone = "01313542742",
      storeAddress = "Dhaka, Bangladesh",
    },
    ref,
  ) => {
    const orderDate = new Date(order.created_at);

    // Calculate customization charge
    const customizationCharge =
      order.total -
      order.subtotal -
      order.delivery_charge +
      (order.discount_amount ?? 0);

    const dashedBorder = "1px dashed #9ca3af";
    const solidBorder = "1px solid #9ca3af";

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "12px",
          width: "80mm",
          margin: "0 auto",
          padding: "16px",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            borderBottom: dashedBorder,
            paddingBottom: "12px",
            marginBottom: "12px",
          }}
        >
          <h1
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            {storeName}
          </h1>
          <p
            style={{ fontSize: "10px", marginTop: "4px", margin: "4px 0 0 0" }}
          >
            {storeAddress}
          </p>
          <p style={{ fontSize: "10px", margin: 0 }}>Tel: {storePhone}</p>
        </div>

        {/* Order Info */}
        <div
          style={{
            borderBottom: dashedBorder,
            paddingBottom: "12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Order #:</span>
            <span style={{ fontWeight: "bold" }}>{order.order_number}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Date:</span>
            <span>{orderDate.toLocaleDateString("en-GB")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Time:</span>
            <span>
              {orderDate.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div
          style={{
            borderBottom: dashedBorder,
            paddingBottom: "12px",
            marginBottom: "12px",
          }}
        >
          <p
            style={{
              fontWeight: "bold",
              marginBottom: "4px",
              margin: "0 0 4px 0",
            }}
          >
            Customer:
          </p>
          <p style={{ margin: 0 }}>{order.customer_name}</p>
          <p style={{ margin: 0 }}>{order.customer_phone}</p>
          {order.delivery_type === "home_delivery" && (
            <>
              <p
                style={{
                  marginTop: "4px",
                  fontSize: "10px",
                  margin: "4px 0 0 0",
                }}
              >
                {order.address}
              </p>
              <p style={{ fontSize: "10px", margin: 0 }}>
                {order.area && `${order.area}, `}
                {order.district}, {order.division}
              </p>
            </>
          )}
        </div>

        {/* Items Header */}
        <div
          style={{
            borderBottom: solidBorder,
            paddingBottom: "4px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
            }}
          >
            <span style={{ flex: 1 }}>Item</span>
            <span style={{ width: "32px", textAlign: "center" }}>Qty</span>
            <span style={{ width: "64px", textAlign: "right" }}>Price</span>
          </div>
        </div>

        {/* Items */}
        <div
          style={{
            borderBottom: dashedBorder,
            paddingBottom: "12px",
            marginBottom: "12px",
          }}
        >
          {order.items?.map((item, index) => (
            <div key={item.id} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingRight: "8px",
                  }}
                >
                  {item.product_name}
                </span>
                <span style={{ width: "32px", textAlign: "center" }}>
                  {item.quantity}
                </span>
                <span style={{ width: "64px", textAlign: "right" }}>
                  {formatPrice(item.total_price)}
                </span>
              </div>
              <p
                style={{
                  fontSize: "10px",
                  color: "#4b5563",
                  paddingLeft: "8px",
                  margin: 0,
                }}
              >
                {formatVariantShort(item.variant_size, item.variant_attributes)}
                {item.variant_color && ` | ${item.variant_color}`}
              </p>
              {item.customization_note && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "4px",
                    fontSize: "10px",
                    paddingLeft: "8px",
                    marginTop: "2px",
                  }}
                >
                  <Scissors
                    style={{ width: "12px", height: "12px", flexShrink: 0 }}
                  />
                  <span>{item.customization_note}</span>
                </div>
              )}
              {index < (order.items?.length || 0) - 1 && (
                <div
                  style={{
                    borderBottom: "1px dotted #d1d5db",
                    marginTop: "8px",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal:</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Delivery:</span>
            <span>{formatPrice(order.delivery_charge)}</span>
          </div>
          {customizationCharge > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Customization:</span>
              <span>{formatPrice(customizationCharge)}</span>
            </div>
          )}
          {order.discount_amount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Discount:</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div
            style={{
              borderTop: solidBorder,
              paddingTop: "4px",
              marginTop: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              <span>TOTAL:</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div
          style={{
            borderTop: dashedBorder,
            paddingTop: "12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Payment:</span>
            <span style={{ textTransform: "uppercase" }}>
              {order.payment_method === "cod"
                ? "Cash on Delivery"
                : order.payment_method === "online"
                  ? "Online Payment"
                  : order.payment_method === "advance"
                    ? "Advance Payment"
                    : "Cash"}
            </span>
          </div>
          {/* <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Status:</span>
            <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>
              {order.status}
            </span>
          </div> */}
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            borderTop: dashedBorder,
            paddingTop: "12px",
            marginTop: "12px",
          }}
        >
          <p style={{ fontSize: "10px", margin: 0 }}>
            Thank you for shopping with us!
          </p>
          <p
            style={{ fontSize: "10px", marginTop: "4px", margin: "4px 0 0 0" }}
          >
            Exchange within 3 days with receipt
          </p>
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: "8px",
                border: solidBorder,
                padding: "4px 8px",
              }}
            >
              ★★★★★
            </div>
          </div>
        </div>
      </div>
    );
  },
);

InvoicePOS.displayName = "InvoicePOS";

export default InvoicePOS;
