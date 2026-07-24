import { describe, expect, it } from "vitest";
import {
  decideProspectDuplicate,
  matchExistingCustomerByName,
  nameSimilarity,
} from "@/lib/prospect-dedupe";

const existing = [
  {
    id: "one",
    name: "La Proveeduría",
    address: "Av. de los Lagos 120, Nordelta",
    latitude: -34.416,
    longitude: -58.651,
    googlePlaceId: "google-1",
  },
];

describe("deduplicación jerárquica", () => {
  it("prioriza Google Place ID", () => {
    const decision = decideProspectDuplicate(
      {
        name: "Otro nombre",
        address: "Otra dirección",
        latitude: -34.5,
        longitude: -58.7,
        googlePlaceId: "google-1",
      },
      existing
    );
    expect(decision.kind).toBe("EXACT");
  });

  it("unifica dirección normalizada y nombre similar", () => {
    const decision = decideProspectDuplicate(
      {
        name: "LA PROVEEDURIA SRL",
        address: "Av. de los Lagos 120, Nordelta, Argentina",
        latitude: -34.416,
        longitude: -58.651,
        googlePlaceId: null,
      },
      existing
    );
    expect(decision.kind).toBe("EXACT");
  });

  it("solo sugiere merge cuando la cercanía no es concluyente", () => {
    const decision = decideProspectDuplicate(
      {
        name: "La Proveeduria Market",
        address: "Av. de los Lagos 122",
        latitude: -34.4162,
        longitude: -58.6511,
        googlePlaceId: null,
      },
      existing
    );
    expect(decision.kind).toBe("POSSIBLE");
  });

  it("no mezcla locales lejanos", () => {
    const decision = decideProspectDuplicate(
      {
        name: "La Proveeduría",
        address: "Calle 1",
        latitude: -34.7,
        longitude: -58.9,
        googlePlaceId: null,
      },
      existing
    );
    expect(decision.kind).toBe("NONE");
  });

  it("detecta un cliente existente por nombre normalizado", () => {
    expect(
      matchExistingCustomerByName("LA PROVEEDURÍA S.R.L.", [
        { id: "customer-1", name: "La Proveeduria" },
      ])
    ).toBe("customer-1");
    expect(nameSimilarity("Mercado Norte", "Mercado del Sur")).toBeLessThan(0.8);
  });
});

