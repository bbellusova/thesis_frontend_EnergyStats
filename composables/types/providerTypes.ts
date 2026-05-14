import type {DataAccessType, DataCategory} from "~/composables/types/constantTypes";

export type DataProviderCode = string;

export type DataProvider = {
    code:DataProviderCode,
    name:string,
    accessTypes: DataAccessType[],
    availableCategories: Map<DataCategory, Set<DataAccessType>>,
}

export type DataProviders = DataProvider[]
export type DataProviderMap = Map<DataProviderCode, DataProvider>


export type FileProviderCategories= Map<DataProviderCode, { provider: DataProvider, categories: DataCategory[], supportedFileFormats: string[] }>

export type FileProviderResp = {
    "categories": DataCategory[],
    "supportedFileFormats": string[]
}


export type ProviderInfo = {
    provider: DataProviderCode,
    brandSiteId: number,
    apiKey: string
}

export type AvailableSitesRequest = {
    provider: DataProviderCode
    apiKey: string
}

export type AvailableSitesResponse = {
    brandSiteId: number,
    address: string,
    lat: number | undefined,
    lon: number | undefined,
    timezone: string | undefined,
    peakPower: number | undefined,
    provider: DataProviderCode
    availableCategories: DataCategory[]
}