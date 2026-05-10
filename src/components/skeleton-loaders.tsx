import { Skeleton } from "@/components/ui/skeleton";

function FormFieldSkeleton({
  labelWidth,
  inputHeight = "h-10",
}: {
  labelWidth: string;
  inputHeight?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className={`${inputHeight} w-full rounded-md`} />
    </div>
  );
}

/**
 * Generic page loading skeleton with smooth fade-in animation
 */
export const PageSkeleton = () => (
  <div className="animate-in fade-in-50 duration-300 w-full">
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={`page-card-${index}`}
            className="flex flex-col gap-4 rounded-xl border border-border/60 p-5"
          >
            <Skeleton className="h-6 w-36" />
            <FormFieldSkeleton labelWidth="w-20" />
            <FormFieldSkeleton labelWidth="w-24" />
            <FormFieldSkeleton labelWidth="w-16" inputHeight="h-20" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ProductCardSkeleton = () => (
  <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-3">
    <Skeleton className="aspect-square w-full rounded-lg" />
    <Skeleton className="h-3 w-20" />
    <Skeleton className="h-5 w-full" />
    <Skeleton className="h-5 w-2/3" />
    <div className="mt-1 flex items-center justify-between gap-3">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
  </div>
);

/**
 * Product listing skeleton with smooth fade-in animation
 */
export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="animate-in fade-in-50 duration-300 w-full">
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={`grid-item-${index}`} />
      ))}
    </div>
  </div>
);

/**
 * Profile/Form skeleton with smooth fade-in animation
 */
export const ProfileSkeleton = () => (
  <div className="animate-in fade-in-50 duration-300 w-full">
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <FormFieldSkeleton labelWidth="w-20" />
      <FormFieldSkeleton labelWidth="w-24" />
      <FormFieldSkeleton labelWidth="w-16" />
      <FormFieldSkeleton labelWidth="w-28" inputHeight="h-24" />
      <Skeleton className="h-10 w-32 rounded-md" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
    </div>
  </div>
);

/**
 * Product detail skeleton with smooth fade-in animation
 */
export const ProductDetailSkeleton = () => (
  <div className="animate-in fade-in-50 duration-300 w-full">
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-96 w-full rounded-lg" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`thumb-${index}`}
              className="h-20 w-full rounded-lg"
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-border/60 p-5">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>

        <FormFieldSkeleton labelWidth="w-20" />
        <FormFieldSkeleton labelWidth="w-24" />
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="border-t border-border pt-5">
          <FormFieldSkeleton labelWidth="w-40" inputHeight="h-16" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Table skeleton with smooth fade-in animation
 */
export const TableSkeleton = ({ rows = 10 }: { rows?: number }) => (
  <div className="animate-in fade-in-50 duration-300 w-full">
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex gap-4 p-4 bg-muted/50 border-b border-border">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`table-header-${index}`} className="h-4 flex-1" />
        ))}
      </div>

      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`table-row-${rowIndex}`}
          className="flex gap-4 p-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
        >
          {Array.from({ length: 4 }).map((_, columnIndex) => (
            <Skeleton
              key={`table-col-${rowIndex}-${columnIndex}`}
              className={`h-4 ${columnIndex === 0 ? "w-24" : columnIndex === 3 ? "w-16" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/**
 * Checkout skeleton with smooth fade-in animation
 */
export const CheckoutSkeleton = () => (
  <div className="animate-in fade-in-50 duration-300 w-full">
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <div
            key={`checkout-section-${sectionIndex}`}
            className="flex flex-col gap-4 rounded-xl border border-border/60 p-4"
          >
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 2 }).map((_, fieldIndex) => (
              <FormFieldSkeleton
                key={`checkout-field-${sectionIndex}-${fieldIndex}`}
                labelWidth={fieldIndex === 0 ? "w-24" : "w-20"}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="sticky top-20 flex h-fit flex-col gap-4 rounded-xl border border-border/60 p-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`summary-row-${index}`}
            className="flex justify-between gap-2"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
        <div className="border-t border-border pt-3">
          <div className="flex justify-between gap-2 mb-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </div>
    </div>
  </div>
);
