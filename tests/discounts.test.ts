import { describe, expect, it } from "vitest";
import { chargeableUnits, quantityPromoDiscount } from "@/lib/discounts";

// La matemática de promos por cantidad: la parte más sensible del pricing.
describe("chargeableUnits", () => {
  it("2x1: paga 1 de cada 2", () => {
    expect(chargeableUnits(1, "2x1")).toBe(1);
    expect(chargeableUnits(2, "2x1")).toBe(1);
    expect(chargeableUnits(3, "2x1")).toBe(2);
    expect(chargeableUnits(4, "2x1")).toBe(2);
    expect(chargeableUnits(5, "2x1")).toBe(3);
  });
  it("3x2: paga 2 de cada 3", () => {
    expect(chargeableUnits(2, "3x2")).toBe(2);
    expect(chargeableUnits(3, "3x2")).toBe(2);
    expect(chargeableUnits(6, "3x2")).toBe(4);
    expect(chargeableUnits(7, "3x2")).toBe(5);
  });
  it("sin promo: paga todo", () => {
    expect(chargeableUnits(4, "")).toBe(4);
    expect(chargeableUnits(4, "OFERTA")).toBe(4);
  });
});

describe("quantityPromoDiscount", () => {
  it("descuenta el precio de las unidades gratis", () => {
    expect(quantityPromoDiscount(2, 10000, "2x1")).toBe(10000);
    expect(quantityPromoDiscount(5, 10000, "2x1")).toBe(20000);
    expect(quantityPromoDiscount(3, 8000, "3x2")).toBe(8000);
    expect(quantityPromoDiscount(1, 8000, "3x2")).toBe(0);
    expect(quantityPromoDiscount(10, 8000, "")).toBe(0);
  });
});
