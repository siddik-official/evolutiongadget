import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
