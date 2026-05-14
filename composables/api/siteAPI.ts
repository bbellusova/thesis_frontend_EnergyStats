import type {
  CreateSiteRequest, GetSiteResponse,
  SiteFormPayload,
} from '~/composables/types/siteTypes'
import {apiFetch} from "~/composables/api/ApiFetch";


export const useSiteAPI = () => {
  const getBaseUrl = () => `/sites`;

  return {
    canUseSiteName: async (name: string) => {
      return await apiFetch<boolean>(`${getBaseUrl()}/canUseSiteName/${name}`)
    },

    createSite: async (payload: SiteFormPayload) => {
      const req = toCreateSiteRequest(payload)
      return await apiFetch<number>(`${getBaseUrl()}`, {
        method: 'POST',
        body: req,
      })
    },

    getSiteById: async(siteId: number) => {
      return await apiFetch<GetSiteResponse>(`${getBaseUrl()}/${siteId}`, {
        method: 'GET',
      })
    }
  }
}

const toCreateSiteRequest = (payload: SiteFormPayload): CreateSiteRequest => ({
  siteName: payload.name,
  password: payload.password,
  azm: payload.azimuth,
  dec: payload.declination,
  kwp: payload.peakPowerKw,
  lat: payload.latitude,
  lon: payload.longitude,
  timezone: payload.timezone,
})
