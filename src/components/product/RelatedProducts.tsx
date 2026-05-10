import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types";

export function RelatedProducts({ products }: { products: Product[] }) {
  return (
    <section className="mt-16">
      <h2 className="text-xl font-bold mb-6">Suggested Products</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
