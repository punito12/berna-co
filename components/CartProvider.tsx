"use client";

// Global shopping cart shared across pages. Backed by localStorage so it
// survives navigation (home -> checkout) and page reloads.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { priceFor, type ProductForUI } from "@/lib/products";

// One line in the cart. Same product with a different empanado = separate line.
export type CartLine = {
  key: string; // productId + breadcrumbType
  productId: string;
  name: string;
  breadcrumbType: string;
  price: number;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  totalItems: number;
  totalPrice: number;
  // false until the saved cart has been read from localStorage. Lets pages
  // avoid flashing an "empty cart" message before hydration finishes.
  hydrated: boolean;
  addToCart: (product: ProductForUI, breadcrumbType: string) => void;
  changeQuantity: (key: string, delta: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "berna-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

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
            price: priceFor(product, breadcrumbType),
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

  const totalItems = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );
  const totalPrice = useMemo(
    () => lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [lines]
  );

  const value = useMemo(
    () => ({
      lines,
      totalItems,
      totalPrice,
      hydrated,
      addToCart,
      changeQuantity,
      clearCart,
    }),
    [lines, totalItems, totalPrice, hydrated, addToCart, changeQuantity, clearCart]
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
