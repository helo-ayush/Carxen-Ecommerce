/**
 * Standard Indian Automotive Vehicle Registry for Carxen Storefront
 * Provides structured Make -> Model -> Generation/Year hierarchy
 * with support for custom dynamic additions.
 */

export interface VehicleModelEntry {
  name: string;
  bodyType?: "SUV" | "Sedan" | "Hatchback" | "MUV" | "EV" | "Coupe";
  years?: string[];
  generations?: string[];
}

export interface VehicleMakeEntry {
  make: string;
  popular?: boolean;
  models: VehicleModelEntry[];
}

export const STANDARD_VEHICLE_CATALOG: VehicleMakeEntry[] = [
  {
    make: "Mahindra",
    popular: true,
    models: [
      { name: "Thar", bodyType: "SUV", years: ["2020-2024", "2010-2019"] },
      { name: "Thar Roxx", bodyType: "SUV", years: ["2024-Present"] },
      { name: "Scorpio N", bodyType: "SUV", years: ["2022-Present"] },
      { name: "Scorpio Classic", bodyType: "SUV", years: ["2022-Present", "2014-2022"] },
      { name: "XUV700", bodyType: "SUV", years: ["2021-Present"] },
      { name: "XUV 3XO", bodyType: "SUV", years: ["2024-Present"] },
      { name: "XUV300", bodyType: "SUV", years: ["2019-2024"] },
      { name: "Bolero", bodyType: "SUV", years: ["All Generations"] },
      { name: "Bolero Neo", bodyType: "SUV", years: ["2021-Present"] },
    ],
  },
  {
    make: "Tata",
    popular: true,
    models: [
      { name: "Nexon", bodyType: "SUV", years: ["2023-Present (Facelift)", "2020-2023 (Gen 2)", "2017-2020 (Gen 1)"] },
      { name: "Nexon EV", bodyType: "EV", years: ["2023-Present", "2020-2023"] },
      { name: "Punch", bodyType: "SUV", years: ["2021-Present"] },
      { name: "Punch EV", bodyType: "EV", years: ["2024-Present"] },
      { name: "Curvv", bodyType: "Coupe", years: ["2024-Present"] },
      { name: "Harrier", bodyType: "SUV", years: ["2023-Present (Facelift)", "2019-2023"] },
      { name: "Safari", bodyType: "SUV", years: ["2023-Present (Facelift)", "2021-2023"] },
      { name: "Altroz", bodyType: "Hatchback", years: ["2020-Present"] },
      { name: "Tiago", bodyType: "Hatchback", years: ["2020-Present", "2016-2020"] },
      { name: "Tigor", bodyType: "Sedan", years: ["2020-Present", "2017-2020"] },
    ],
  },
  {
    make: "Hyundai",
    popular: true,
    models: [
      { name: "Creta", bodyType: "SUV", years: ["2024-Present (Facelift)", "2020-2024 (Gen 2)", "2015-2020 (Gen 1)"] },
      { name: "Creta Electric", bodyType: "EV", years: ["2025-Present"] },
      { name: "Venue", bodyType: "SUV", years: ["2022-Present (Facelift)", "2019-2022"] },
      { name: "Exter", bodyType: "SUV", years: ["2023-Present"] },
      { name: "i20", bodyType: "Hatchback", years: ["2020-Present (Gen 3)", "2014-2020 (Elite)", "2008-2014"] },
      { name: "Verna", bodyType: "Sedan", years: ["2023-Present (Gen 6)", "2017-2023 (Gen 5)"] },
      { name: "Alcazar", bodyType: "SUV", years: ["2024-Present (Facelift)", "2021-2024"] },
      { name: "Tucson", bodyType: "SUV", years: ["2022-Present (Gen 4)", "2016-2022"] },
      { name: "Aura", bodyType: "Sedan", years: ["2020-Present"] },
      { name: "Grand i10 Nios", bodyType: "Hatchback", years: ["2019-Present"] },
    ],
  },
  {
    make: "Maruti Suzuki",
    popular: true,
    models: [
      { name: "Swift", bodyType: "Hatchback", years: ["2024-Present (Gen 4)", "2018-2024 (Gen 3)", "2011-2018 (Gen 2)"] },
      { name: "Brezza", bodyType: "SUV", years: ["2022-Present (Gen 2)", "2016-2022 (Vitara Brezza)"] },
      { name: "Baleno", bodyType: "Hatchback", years: ["2022-Present (Facelift)", "2015-2022"] },
      { name: "Dzire", bodyType: "Sedan", years: ["2024-Present (Gen 4)", "2017-2024 (Gen 3)"] },
      { name: "Fronx", bodyType: "SUV", years: ["2023-Present"] },
      { name: "Grand Vitara", bodyType: "SUV", years: ["2022-Present"] },
      { name: "Ertiga", bodyType: "MUV", years: ["2018-Present (Gen 2)", "2012-2018 (Gen 1)"] },
      { name: "XL6", bodyType: "MUV", years: ["2019-Present"] },
      { name: "Jimny", bodyType: "SUV", years: ["2023-Present"] },
      { name: "WagonR", bodyType: "Hatchback", years: ["2019-Present", "2010-2019"] },
      { name: "Celerio", bodyType: "Hatchback", years: ["2021-Present", "2014-2021"] },
      { name: "Ignis", bodyType: "Hatchback", years: ["2017-Present"] },
    ],
  },
  {
    make: "Kia",
    popular: true,
    models: [
      { name: "Seltos", bodyType: "SUV", years: ["2023-Present (Facelift)", "2019-2023"] },
      { name: "Sonet", bodyType: "SUV", years: ["2024-Present (Facelift)", "2020-2024"] },
      { name: "Carens", bodyType: "MUV", years: ["2022-Present"] },
      { name: "Carnival", bodyType: "MUV", years: ["2024-Present", "2020-2023"] },
      { name: "EV6", bodyType: "EV", years: ["2022-Present"] },
      { name: "Syros", bodyType: "SUV", years: ["2025-Present"] },
    ],
  },
  {
    make: "Toyota",
    popular: true,
    models: [
      { name: "Fortuner", bodyType: "SUV", years: ["2021-Present (Facelift)", "2016-2021", "2009-2016"] },
      { name: "Innova Hycross", bodyType: "MUV", years: ["2022-Present"] },
      { name: "Innova Crysta", bodyType: "MUV", years: ["2016-Present"] },
      { name: "Urban Cruiser Hyryder", bodyType: "SUV", years: ["2022-Present"] },
      { name: "Glanza", bodyType: "Hatchback", years: ["2022-Present", "2019-2022"] },
      { name: "Hilux", bodyType: "SUV", years: ["2022-Present"] },
      { name: "Camry", bodyType: "Sedan", years: ["2019-Present"] },
    ],
  },
  {
    make: "Honda",
    popular: true,
    models: [
      { name: "City", bodyType: "Sedan", years: ["2020-Present (Gen 5)", "2014-2020 (Gen 4)"] },
      { name: "Elevate", bodyType: "SUV", years: ["2023-Present"] },
      { name: "Amaze", bodyType: "Sedan", years: ["2024-Present (Gen 3)", "2018-2024 (Gen 2)", "2013-2018 (Gen 1)"] },
    ],
  },
  {
    make: "MG",
    popular: true,
    models: [
      { name: "Hector", bodyType: "SUV", years: ["2023-Present (Facelift)", "2019-2023"] },
      { name: "Windsor EV", bodyType: "EV", years: ["2024-Present"] },
      { name: "Comet EV", bodyType: "EV", years: ["2023-Present"] },
      { name: "Astor", bodyType: "SUV", years: ["2021-Present"] },
      { name: "ZS EV", bodyType: "EV", years: ["2022-Present", "2020-2022"] },
    ],
  },
  {
    make: "Skoda",
    popular: false,
    models: [
      { name: "Kushaq", bodyType: "SUV", years: ["2021-Present"] },
      { name: "Slavia", bodyType: "Sedan", years: ["2022-Present"] },
      { name: "Kylaq", bodyType: "SUV", years: ["2025-Present"] },
      { name: "Kodiaq", bodyType: "SUV", years: ["2022-Present"] },
    ],
  },
  {
    make: "Volkswagen",
    popular: false,
    models: [
      { name: "Taigun", bodyType: "SUV", years: ["2021-Present"] },
      { name: "Virtus", bodyType: "Sedan", years: ["2022-Present"] },
      { name: "Tiguan", bodyType: "SUV", years: ["2021-Present"] },
    ],
  },
];

/**
 * Returns merged dictionary of Make -> Models (Standard catalog).
 */
export function getMergedVehiclesByBrand(): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const entry of STANDARD_VEHICLE_CATALOG) {
    result[entry.make] = entry.models.map((m) => m.name);
  }

  return result;
}
