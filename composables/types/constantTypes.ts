

export const DATA_CATEGORIES = [
    "ENERGY_CONSUMPTION_FROM_THE_GRID",
    "ENERGY_CONSUMPTION_TOTAL",
    "ENERGY_PRODUCTION_IMMEDIATELY_CONSUMED",
    "ENERGY_PRODUCTION_TO_THE_GRID",
    "ENERGY_PRODUCTION_TOTAL"
] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number];

export const DataCategoryInfo:Record<DataCategory, string> = {
    "ENERGY_CONSUMPTION_FROM_THE_GRID": "Energy consumed from the grid",
    "ENERGY_CONSUMPTION_TOTAL": "Total energy consumption",
    "ENERGY_PRODUCTION_IMMEDIATELY_CONSUMED": "Generated energy consumed immediately",
    "ENERGY_PRODUCTION_TO_THE_GRID": "Generated energy fed to the grid",
    "ENERGY_PRODUCTION_TOTAL": "Total energy production",
}

export const categoryName = (cat: DataCategory) => {
    return DataCategoryInfo[cat as DataCategory] ?? cat
}

export const categoryColors: Record<string, string> = {
    ENERGY_CONSUMPTION_FROM_THE_GRID: '#f2933a',
    ENERGY_CONSUMPTION_TOTAL: '#db428f',
    ENERGY_PRODUCTION_IMMEDIATELY_CONSUMED: '#22c3c3',
    ENERGY_PRODUCTION_TO_THE_GRID: '#a67bd1',
    ENERGY_PRODUCTION_TOTAL: '#53bd6f',
}

export type DataAccessType = "API" | "FILE" | "UNAVAILABLE" | "CALCULATED"
export type ProviderDataAccessType = Exclude<DataAccessType, "UNAVAILABLE" | "CALCULATED">

export type SortOrder = "ASC" | "DESC"