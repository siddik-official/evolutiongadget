"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice, formatVariantShort } from "@/lib/utils";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, subtotal } = useCartStore();

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5" />
            Your Cart ({items.length})
          </DrawerTitle>
          <DrawerDescription>
            {items.length === 0
              ? "Your cart is empty"
              : `${items.length} item${items.length !== 1 ? "s" : ""} in your cart`}
          </DrawerDescription>
        </DrawerHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-4">
            <ShoppingBag className="size-16 text-muted-foreground/30" />
            <div>
              <p className="font-medium text-foreground/70">
                Your cart is empty
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Start shopping to add items to your cart
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} asChild>
              <Link href="/">Shop Now</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {items.map((item) => {
                  const price =
                    item.variant.discount_price ?? item.variant.sale_price;
                  return (
                    <div
                      key={item.variant.id}
                      className="flex gap-3 pb-4 border-b last:border-0"
                    >
                      {item.image_url && (
                        <div className="relative size-20 rounded-md overflow-hidden bg-muted shrink-0">
                          <Image
                            src={item.image_url}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatVariantShort(
                            item.variant.size,
                            item.variant.attributes,
                          )}
                          {item.variant.color && ` · ${item.variant.color}`}
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          {formatPrice(price)}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              updateQuantity(item.variant.id, item.quantity - 1)
                            }
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="text-sm w-6 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              updateQuantity(item.variant.id, item.quantity + 1)
                            }
                          >
                            <Plus className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto text-destructive"
                            onClick={() => removeItem(item.variant.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtotal section */}
              <div className="space-y-2 pt-4 border-t mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">
                    {formatPrice(subtotal())}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Delivery charge calculated at checkout
                </p>
              </div>
            </div>

            <DrawerFooter>
              <Button size="lg" asChild onClick={() => onOpenChange(false)}>
                <Link href="/checkout">Checkout Now</Link>
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Continue Shopping</Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
