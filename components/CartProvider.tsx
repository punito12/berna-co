"use client";

// Global shopping cart shared across pages. Backed by localStorage so it
// survives navigation (home -> checkout) and page reloads.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { promoPriceFor, type ProductForUI } from "@/lib/products";
import { quantityPromoDiscount } from "@/lib/discounts";

// One line in the cart. Same product with a different empanado = separate line.
export type CartLine = {
  key: string; // productId + breadcrumbType
  productId: string;
  name: string;
  breadcrumbType: string;
  price: number; // unit price already with the product's % promo applied
  promoType: string; // "" | "2x1" | "3x2" for the quantity promo
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  totalItems: number;
  subtotal: number; // sum of price*qty, before quantity promos
  promoDiscount: number; // savings from 2x1/3x2 quantity promos
  totalPrice: number; // subtotal - promoDiscount
  // false until the saved cart has been read from localStorage. Lets pages
  // avoid flashing an "empty cart" message before hydration finishes.
  hydrated: boolean;
  addToCart: (product: ProductForUI, breadcrumbType: string) => void;
  changeQuantity: (key: string, delta: number) => void;
  clearCart: () => void;
  // Refreshes unit prices + promos against the live products (used by checkout
  // so the shown amount always matches what the server will charge).
  reprice: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

// Bumped to v2: lines now carry promoType (older saved carts lacked it).
const STORAGE_KEY = "berna-cart-v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Mirror of `lines` so async callbacks (reprice) read the latest value.
  const linesRef = useRef<CartLine[]>([]);
  linesRef.current = lines;

  // Load saved cart once on mount (client only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch {
      // Corrupt storage — start with an empty cart rather than crashing.
    }
    setHydrated(true);
  }, []);

  // Persist whenever the cart changes (after the initial load).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Ignore storage write errors (e.g. private mode quota).
    }
  }, [lines, hydrated]);

  const addToCart = useCallback(
    (product: ProductForUI, breadcrumbType: string) => {
      const key = `${product.id}__${breadcrumbType}`;
      setLines((prev) => {
        const existing = prev.find((line) => line.key === key);
        if (existing) {
          return prev.map((line) =>
            line.key === key
              ? { ...line, quantity: line.quantity + 1 }
              : line
          );
        }
        return [
          ...prev,
          {
            key,
            productId: product.id,
            name: product.name,
            breadcrumbType,
            price: promoPriceFor(product, breadcrumbType),
            promoType: product.promoType ?? "",
            quantity: 1,
          },
        ];
      });
    },
    []
  );

  const changeQuantity = useCallback((key: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((line) =>
          line.key === key
            ? { ...line, quantity: line.quantity + delta }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  // Re-fetch live prices/promos for the current lines and update them. Drops
  // lines for products that are no longer available.
  const reprice = useCallback(async () => {
    const current = linesRef.current;
    if (current.length === 0) return;
    try {
      const res = await fetch("/api/cart/reprice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: current.map((l) => ({
            productId: l.productId,
            breadcrumbType: l.breadcrumbType,
          })),
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        prices: Record<
          string,
          { unitPrice: number; promoType: string; available: boolean }
        >;
      };
      setLines((prev) =>
        prev
          .map((l) => {
            const info = data.prices[l.key];
            if (!info) return l;
            return { ...l, price: info.unitPrice, promoType: info.promoType };
          })
          .filter((l) => data.prices[l.key]?.available !== false)
      );
    } catch {
      // Network issue — keep the saved prices; the server validates at checkout.
    }
  }, []);

  const totalItems = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );
  // Subtotal before quantity promos (unit prices already include the % promo).
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [lines]
  );
  // Savings from 2x1 / 3x2 quantity promos.
  const promoDiscount = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum +
          quantityPromoDiscount(line.quantity, line.price, line.promoType ?? ""),
        0
      ),
    [lines]
  );
  const totalPrice = subtotal - promoDiscount;

  const value = useMemo(
    () => ({
      lines,
      totalItems,
      subtotal,
      promoDiscount,
      totalPrice,
      hydrated,
      addToCart,
      changeQuantity,
      clearCart,
      reprice,
    }),
    [
      lines,
      totalItems,
      subtotal,
      promoDiscount,
      totalPrice,
      hydrated,
      addToCart,
      changeQuantity,
      clearCart,
      reprice,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de <CartProvider>");
  }
  return ctx;
}
