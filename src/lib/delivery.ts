import { BD_ALL_DISTRICTS, BD_DISTRICT_TO_DIVISION } from "@/lib/constants";

export type DeliveryZone = "inside_dhaka" | "sub_dhaka" | "outside_dhaka";

export const DELIVERY_DHAKA_CITY_AREAS_KEY = "delivery_dhaka_city_areas";
export const DELIVERY_SUB_DHAKA_AREAS_KEY = "delivery_sub_dhaka_areas";

export const DEFAULT_DHAKA_CITY_AREAS = [
  "Dhaka City",
  "Gulshan",
  "Banani",
  "Dhanmondi",
  "Mirpur",
  "Uttara",
  "Mohammadpur",
  "Badda",
];

export const DEFAULT_SUB_DHAKA_AREAS = [
  "Ashulia",
  "Dhamrai",
  "Dohar",
  "Hemayetpur",
  "Keraniganj Model",
  "Nawabganj",
  "Savar",
  "South Keraniganj",
];

const normalizeLocationValue = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[.,/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizedDistrictToDivision = new Map<string, string>(
  Object.entries(BD_DISTRICT_TO_DIVISION).map(([district, division]) => [
    normalizeLocationValue(district),
    division,
  ]),
);

const normalizedDistrictSet = new Set(
  BD_ALL_DISTRICTS.map((district) => normalizeLocationValue(district)),
);

export const parseLocationList = (
  rawValue: string | null | undefined,
  fallback: string[] = [],
): string[] => {
  const parsed = (rawValue || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  const values = parsed.length > 0 ? parsed : fallback;
  return Array.from(new Set(values));
};

export const readDeliveryAreaSettings = (
  storeSettings: Record<string, string | null | undefined>,
): { dhakaCityAreas: string[]; subDhakaAreas: string[] } => ({
  dhakaCityAreas: parseLocationList(
    storeSettings[DELIVERY_DHAKA_CITY_AREAS_KEY],
    DEFAULT_DHAKA_CITY_AREAS,
  ),
  subDhakaAreas: parseLocationList(
    storeSettings[DELIVERY_SUB_DHAKA_AREAS_KEY],
    DEFAULT_SUB_DHAKA_AREAS,
  ),
});

const matchesLocation = (input: string, candidate: string): boolean => {
  const normalizedInput = normalizeLocationValue(input);
  const normalizedCandidate = normalizeLocationValue(candidate);

  if (!normalizedInput || !normalizedCandidate) return false;
  if (normalizedInput === normalizedCandidate) return true;

  return (
    normalizedInput.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedInput)
  );
};

export const resolveDeliveryZone = ({
  district,
  area,
  dhakaCityAreas = DEFAULT_DHAKA_CITY_AREAS,
  subDhakaAreas = DEFAULT_SUB_DHAKA_AREAS,
}: {
  district: string;
  area?: string | null;
  dhakaCityAreas?: string[];
  subDhakaAreas?: string[];
}): DeliveryZone => {
  if (normalizeLocationValue(district) !== "dhaka") {
    return "outside_dhaka";
  }

  const normalizedArea = normalizeLocationValue(area || "");
  if (!normalizedArea) {
    return "inside_dhaka";
  }

  if (
    subDhakaAreas.some((candidate) =>
      matchesLocation(normalizedArea, candidate),
    )
  ) {
    return "sub_dhaka";
  }

  if (
    dhakaCityAreas.some((candidate) =>
      matchesLocation(normalizedArea, candidate),
    )
  ) {
    return "inside_dhaka";
  }

  return "outside_dhaka";
};

export const getDivisionByDistrict = (district: string): string | null => {
  const direct = BD_DISTRICT_TO_DIVISION[district];
  if (direct) return direct;

  return (
    normalizedDistrictToDivision.get(normalizeLocationValue(district)) || null
  );
};

export const isValidDistrict = (district: string): boolean =>
  normalizedDistrictSet.has(normalizeLocationValue(district));
