"use client";

import { Order } from "@/types";
import { formatPrice, formatVariantShort } from "@/lib/utils";
import { Scissors } from "lucide-react";
import { forwardRef } from "react";

interface InvoiceRegularProps {
  order: Order;
  storeName?: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
}

const InvoiceRegular = forwardRef<HTMLDivElement, InvoiceRegularProps>(
  (
    {
      order,
      storeName = "Evolution Gadget",
      storePhone = "01313542742",
      storeEmail = "info@evolutiongadget.com",
      storeAddress = "Dhaka, Bangladesh",
    },
    ref,
  ) => {
    const orderDate = new Date(order.created_at);
    const invoiceNumber = `INV-${order.order_number}`;

    // Calculate customization charge
    const customizationCharge =
      order.total -
      order.subtotal -
      order.delivery_charge +
      (order.discount_amount ?? 0);

    return (
      <div
        ref={ref}
        id="invoice-content"
        style={{
          backgroundColor: "#ffffff",
          color: "#000000",
          padding: "32px",
          maxWidth: "210mm",
          margin: "0 auto",
          fontFamily: "Arial, sans-serif",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #ddc1a6",
            paddingBottom: "24px",
            marginBottom: "32px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {/* Left: Logo and Store Info */}
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}
          >
            <img
              src="/logo.png"
              alt="Evolution Gadget logo"
              style={{ width: "60px", height: "60px", objectFit: "contain" }}
            />
            <div>
              <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "normal",
                  color: "#ddc1a6",
                  letterSpacing: "-0.025em",
                  margin: 0,
                  textTransform: "uppercase",
                  fontFamily: "'Noize Sport', Arial, sans-serif",
                }}
              >
                {storeName}
              </h1>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  margin: "4px 0 2px 0",
                  fontStyle: "italic",
                }}
              >
                Premium Tech Made Simple
              </p>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#4b5563",
                  marginTop: "8px",
                }}
              >
                <p style={{ margin: "2px 0" }}>{storeAddress}</p>
                <p style={{ margin: "2px 0" }}>Phone: {storePhone}</p>
                <p style={{ margin: "2px 0" }}>Email: {storeEmail}</p>
              </div>
            </div>
          </div>

          {/* Right: Invoice Info */}
          <div style={{ textAlign: "right" }}>
            <h2
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                color: "#1f2937",
                margin: 0,
                letterSpacing: "-0.025em",
              }}
            >
              INVOICE
            </h2>
            <div style={{ marginTop: "16px", fontSize: "0.9375rem" }}>
              <p style={{ color: "#4b5563", margin: "4px 0" }}>
                <span style={{ fontWeight: 600 }}>Invoice #:</span>{" "}
                {invoiceNumber}
              </p>
              <p style={{ color: "#4b5563", margin: "4px 0" }}>
                <span style={{ fontWeight: 600 }}>Order #:</span>{" "}
                {order.order_number}
              </p>
              <p style={{ color: "#4b5563", margin: "4px 0" }}>
                <span style={{ fontWeight: 600 }}>Date:</span>{" "}
                {orderDate.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Info - Single Section */}
        <div style={{ marginBottom: "32px" }}>
          <h3
            style={{
              fontSize: "0.875rem",
              fontWeight: "bold",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px",
              margin: "0 0 12px 0",
            }}
          >
            Customer Information
          </h3>
          <div
            style={{
              backgroundColor: "#f9fafb",
              padding: "16px",
              borderRadius: "8px",
              fontSize: "0.9375rem",
            }}
          >
            <p
              style={{
                fontWeight: 600,
                color: "#1f2937",
                margin: "0 0 8px 0",
                fontSize: "1rem",
              }}
            >
              {order.customer_name}
            </p>
            <p style={{ color: "#4b5563", margin: "0 0 4px 0" }}>
              <span style={{ fontWeight: 600 }}>Phone:</span>{" "}
              {order.customer_phone}
            </p>
            {order.customer_email && (
              <p style={{ color: "#4b5563", margin: "0 0 4px 0" }}>
                <span style={{ fontWeight: 600 }}>Email:</span>{" "}
                {order.customer_email}
              </p>
            )}
            <p style={{ color: "#4b5563", margin: "4px 0 0 0" }}>
              <span style={{ fontWeight: 600 }}>Address:</span> {order.address}
              {order.area && `, ${order.area}`}, {order.district},{" "}
              {order.division}
            </p>
          </div>
        </div>

        {/* Payment & Delivery Info - No Status */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            fontSize: "0.875rem",
            color: "#4b5563",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <span>
            <span style={{ fontWeight: 600 }}>Payment Method:</span>{" "}
            {order.payment_method === "cod"
              ? "Cash on Delivery"
              : order.payment_method === "online"
                ? "Online Payment"
                : order.payment_method === "advance"
                  ? "Advance Payment"
                  : "Cash"}
          </span>
          <span>•</span>
          <span>
            <span style={{ fontWeight: 600 }}>Delivery:</span>{" "}
            {order.delivery_type === "home_delivery"
              ? "Home Delivery"
              : "Store Pickup"}
          </span>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: "32px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#1f2937", color: "#ffffff" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Item Description
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Size
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Unit Price
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#f9fafb" : "#ffffff",
                  }}
                >
                  <td style={{ padding: "12px 16px", color: "#4b5563" }}>
                    {index + 1}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div>
                      <p
                        style={{ fontWeight: 500, color: "#1f2937", margin: 0 }}
                      >
                        {item.product_name}
                      </p>
                      {item.variant_color && (
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "#6b7280",
                            margin: 0,
                          }}
                        >
                          Color: {item.variant_color}
                        </p>
                      )}
                      {item.customization_note && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "flex-start",
                            gap: "6px",
                            marginTop: "4px",
                            fontSize: "0.875rem",
                            color: "#b45309",
                            backgroundColor: "#fffbeb",
                            borderRadius: "4px",
                            padding: "4px 8px",
                          }}
                        >
                          <Scissors
                            style={{
                              width: "14px",
                              height: "14px",
                              flexShrink: 0,
                              marginTop: "2px",
                            }}
                          />
                          <span>{item.customization_note}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      color: "#4b5563",
                    }}
                  >
                    {formatVariantShort(
                      item.variant_size,
                      item.variant_attributes,
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      color: "#4b5563",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      color: "#4b5563",
                    }}
                  >
                    {formatPrice(item.unit_price)}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontWeight: 500,
                      color: "#1f2937",
                    }}
                  >
                    {formatPrice(item.total_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "32px",
          }}
        >
          <div style={{ width: "288px" }}>
            <div style={{ fontSize: "0.875rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                }}
              >
                <span style={{ color: "#4b5563" }}>Subtotal:</span>
                <span style={{ color: "#1f2937" }}>
                  {formatPrice(order.subtotal)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                }}
              >
                <span style={{ color: "#4b5563" }}>Delivery Charge:</span>
                <span style={{ color: "#1f2937" }}>
                  {formatPrice(order.delivery_charge)}
                </span>
              </div>
              {customizationCharge > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                  }}
                >
                  <span
                    style={{
                      color: "#4b5563",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Scissors style={{ width: "12px", height: "12px" }} />{" "}
                    Customization:
                  </span>
                  <span style={{ color: "#1f2937" }}>
                    {formatPrice(customizationCharge)}
                  </span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    color: "#16a34a",
                  }}
                >
                  <span>Discount:</span>
                  <span>-{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <div
                style={{
                  borderTop: "2px solid #1f2937",
                  paddingTop: "8px",
                  marginTop: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "bold",
                    fontSize: "1.125rem",
                  }}
                >
                  <span style={{ color: "#1f2937" }}>Total:</span>
                  <span style={{ color: "#f97316" }}>
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "24px",
            marginTop: "32px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "32px",
            }}
          >
            <div>
              <h4
                style={{
                  fontWeight: 600,
                  color: "#1f2937",
                  marginBottom: "8px",
                  margin: "0 0 8px 0",
                }}
              >
                Terms & Conditions
              </h4>
              <ul
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  margin: 0,
                  paddingLeft: "0",
                  listStyle: "none",
                }}
              >
                <li style={{ marginBottom: "4px" }}>
                  • Products can be exchanged within 3 days of delivery
                </li>
                <li style={{ marginBottom: "4px" }}>
                  • Items must be in original condition with tags
                </li>
                <li style={{ marginBottom: "4px" }}>
                  • Customized items are non-refundable
                </li>
                <li>• Please retain this invoice for any claims</li>
              </ul>
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#4b5563",
                  marginBottom: "16px",
                  margin: "0 0 16px 0",
                }}
              >
                Thank you for shopping with {storeName}!
              </p>
              <div
                style={{
                  display: "inline-block",
                  borderTop: "1px solid #9ca3af",
                  paddingTop: "8px",
                  paddingLeft: "32px",
                  paddingRight: "32px",
                }}
              >
                <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}>
                  Authorized Signature
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Watermark for status */}
        {order.status === "canceled" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              opacity: 0.1,
            }}
          >
            <span
              style={{
                color: "#ef4444",
                fontSize: "6rem",
                fontWeight: "bold",
                transform: "rotate(-30deg)",
              }}
            >
              CANCELED
            </span>
          </div>
        )}
      </div>
    );
  },
);

InvoiceRegular.displayName = "InvoiceRegular";

export default InvoiceRegular;
