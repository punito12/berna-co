import { describe, expect, it } from "vitest";
import { renderCmsTemplate } from "@/lib/catalog-cms-labels";

// Los templates del CMS ({count}, {pct}) alimentan carrito y checkout.
describe("renderCmsTemplate", () => {
  it("reemplaza placeholders", () => {
    expect(
      renderCmsTemplate("Te faltan {count} para el {pct}% OFF", {
        count: 3,
        pct: 10,
      })
    ).toBe("Te faltan 3 para el 10% OFF");
  });
  it("deja el texto igual si no hay placeholders", () => {
    expect(renderCmsTemplate("Finalizar pedido", { count: 1 })).toBe(
      "Finalizar pedido"
    );
  });
});
