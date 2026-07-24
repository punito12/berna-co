export type ProspectProviderQuery = {
  id: string;
  provider: string;
  mode: string;
  value: string;
  placeTypes: string[];
};

export type ProspectProviderRequest = {
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  resultLimit: number;
  query: ProspectProviderQuery;
};

export type ProspectProviderPlace = {
  externalId: string | null;
  name: string;
  address: string;
  neighborhood: string | null;
  locality: string | null;
  province: string | null;
  country: string;
  latitude: number;
  longitude: number;
  mapsUrl: string | null;
  listingUrl: string | null;
  primaryType: string | null;
  types: string[];
  rating: number | null;
  reviewCount: number | null;
  operatingStatus: string | null;
  permanentlyClosed: boolean;
  pureServiceAreaBusiness: boolean;
  rawData: Record<string, unknown>;
};

export type ProspectProviderResponse = {
  places: ProspectProviderPlace[];
  requestCount: number;
};

export type ProspectProviderIdResponse = {
  externalIds: string[];
  requestCount: number;
};

export type ProspectProviderDetailsResponse = ProspectProviderResponse & {
  failures: { externalId: string; message: string }[];
};

export interface ProspectDiscoveryProvider {
  readonly key: string;
  searchIds(request: ProspectProviderRequest): Promise<ProspectProviderIdResponse>;
  fetchDetails(externalIds: string[]): Promise<ProspectProviderDetailsResponse>;
}

// Green Life se mantiene aislado detrás del mismo contrato. Su sitio público
// actual no expone una API geográfica estable y sus páginas no incluyen
// coordenadas estructuradas, por lo que el crawler queda deliberadamente
// deshabilitado hasta contar con permiso/feed confiable.
export class GreenLifeProvider implements ProspectDiscoveryProvider {
  readonly key = "GREEN_LIFE";

  async searchIds(): Promise<ProspectProviderIdResponse> {
    throw new Error(
      "Green Life no tiene un feed geográfico estructurado configurado. " +
        "No se ejecutó scraping HTML para evitar una extracción frágil."
    );
  }

  async fetchDetails(): Promise<ProspectProviderDetailsResponse> {
    throw new Error(
      "Green Life no tiene un feed geográfico estructurado configurado. " +
        "No se ejecutó scraping HTML para evitar una extracción frágil."
    );
  }
}

export function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
