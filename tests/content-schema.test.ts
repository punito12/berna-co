import { describe, expect, it } from "vitest";
import { CONTENT_SECTIONS } from "@/lib/cms-content-schema";

// El schema del CMS v2 alimenta admin + seed: claves duplicadas romperían ambos.
describe("CONTENT_SECTIONS", () => {
  it("no tiene claves duplicadas", () => {
    const keys = CONTENT_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("todo texto tiene maxLength positivo", () => {
    for (const s of CONTENT_SECTIONS)
      for (const f of s.fields)
        if (f.kind === "text") expect(f.maxLength).toBeGreaterThan(0);
  });
});
