import {apiFetch} from "~/composables/api/ApiFetch";

export const useGeocodingAPI = () => {
    return {
        getTimezoneForCoordinates: async (lat: number, lon: number) => {
            const getBaseUrl = () => `/geocoding`;

            try {
                return await apiFetch<string>(`${getBaseUrl()}/timezoneForCoordinates/${lat}/${lon}`)
            } catch (error) {
                return ""
            }
        }
    }
}