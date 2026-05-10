"use client";

import { AdminOrderForm } from "@/components/admin/AdminOrderForm";

export default function CreateOrderPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Order</h1>
        <p className="text-muted-foreground">
          Manually create an order for a customer
        </p>
      </div>
      <AdminOrderForm />
    </div>
  );
}