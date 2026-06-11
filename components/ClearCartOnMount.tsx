"use client";

import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";

// Clears the cart once on mount. Used in /pedido/confirmado so the cart is
// only emptied after a successful payment (not before the MP redirect).
export default function ClearCartOnMount() {
  const { clearCart } = useCart();
  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
