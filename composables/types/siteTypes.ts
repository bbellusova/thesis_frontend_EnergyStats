import { defineStore } from 'pinia'


export type SiteFormInitialData = {
    name: string | undefined
    azimuth: number | undefined
    declination: number | undefined
    peakPowerKw: number | undefined
    latitude: number | undefined
    longitude: number | undefined
    timezone: string | undefined
}

export const useSiteFormInitialDataStore = defineStore('siteFormInitialData', () => {
    const initialData = ref<SiteFormInitialData | null>(null)
    const setInitialData = (data: SiteFormInitialData) => {
        initialData.value = data
    }
    const clearInitialData = () => {
        initialData.value = null
    }
    return {initialData, setInitialData, clearInitialData}
    },
    {
        persist: true,
    },
)

export type SiteFormPayload = {
    name: string
    password: string
    azimuth: number
    declination: number
    peakPowerKw: number
    latitude: number
    longitude: number
    timezone: string
}

export type CreateSiteRequest = {
    siteName: string
    password: string
    azm: number
    dec: number
    kwp: number
    lat: number
    lon: number
    timezone: string
}

export type GetSiteResponse = {
    siteId: number,
    siteName: string
    azm: number
    dec: number
    kwp: number
    lat: number
    lon: number
    timezone: string
}