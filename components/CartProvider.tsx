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
import {
  promoPriceFor,
  promoTypeFor,
  stockFor,
  type ProductForUI,
} from "@/lib/products";
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
  maxStock?: number;
  weightGrams: number; // unit weight, for the volume (kg) discount
};

type CartContextValue = {
  lines: CartLine[];
  totalItems: number;
  totalUnits: number; // total units, for the volume discount
  subtotal: number; // sum of price*qty, before quantity promos
  promoDiscount: number; // savings from 2x1/3x2 quantity promos
  totalPrice: number; // subtotal - promoDiscount
  // false until the saved cart has been read from localStorage. Lets pages
  // avoid flashing an "empty cart" message before hydration finishes.
  hydrated: boolean;
  addToCart: (product: ProductForUI, breadcrumbType: string) => boolean;
  changeQuantity: (key: string, delta: number) => void;
  clearCart: () => void;
  // Refreshes unit prices + promos against the live products (used by checkout
  // so the shown amount always matches what the server will charge).
  reprice: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

// Bumped to v3: lines now carry maxStock so frontend controls can cap quantity.
const STORAGE_KEY = "berna-cart-v3";

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
      const maxStock = Math.max(0, Math.floor(stockFor(product, breadcrumbType)));
      if (!product.available || maxStock <= 0) return false;
      const currentLine = linesRef.current.find((line) => line.key === key);
      if (currentLine && currentLine.quantity >= maxStock) return false;
      setLines((prev) => {
        const existing = prev.find((line) => line.key === key);
        if (existing) {
          if (existing.quantity >= maxStock) return prev;
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
            promoType: promoTypeFor(product, breadcrumbType),
            quantity: 1,
            maxStock,
            weightGrams: product.weightGrams ?? 0,
          },
        ];
      });
      return true;
    },
    []
  );

  const changeQuantity = useCallback((key: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((line) => {
          if (line.key !== key) return line;
          const raw = line.quantity + delta;
          const max = Number.isFinite(line.maxStock)
            ? Math.max(0, Math.floor(line.maxStock ?? 0))
            : Number.POSITIVE_INFINITY;
          return { ...line, quantity: Math.min(Math.max(0, raw), max) };
        })
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
          {
            unitPrice: number;
            promoType: string;
            available: boolean;
            maxStock: number;
            weightGrams?: number;
          }
        >;
      };
      setLines((prev) =>
        prev
          .map((l) => {
            const info = data.prices[l.key];
            if (!info) return l;
            return {
              ...l,
              price: info.unitPrice,
              promoType: info.promoType,
              maxStock: info.maxStock,
              quantity: Math.min(l.quantity, Math.max(0, info.maxStock)),
              weightGrams: info.weightGrams ?? l.weightGrams ?? 0,
            };
          })
          .filter(
            (l) =>
              data.prices[l.key]?.available !== false &&
              l.quantity > 0 &&
              (data.prices[l.key]?.maxStock ?? 0) > 0
          )
      );
    } catch {
      // Network issue — keep the saved prices; the server validates at checkout.
    }
  }, []);

  const totalItems = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );
  // Total units (for the volume discount + motivational message). Each unit
  // counts as 1 regardless of weight.
  const totalUnits = useMemo(
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
      totalUnits,
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
      totalUnits,
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
