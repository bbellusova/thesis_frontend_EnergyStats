import {apiFetch} from "~/composables/api/ApiFetch";
import type {
    ProductionForecastDataResp,
    WeatherForecastResp
} from "~/composables/types/forecastTypes";



export const useForecastAPI = () => {
    const getBaseUrl = () => `/forecasts`;

    return {
        getProductionForecast: async (siteId: number): Promise<ProductionForecastDataResp> => {
            return await apiFetch<ProductionForecastDataResp>(`${getBaseUrl()}/generation/${siteId}`);
        },

        validateConfiguration: async (lat: number, lon: number): Promise<boolean> => {
            return await apiFetch<boolean>(`${getBaseUrl()}/generation/validateCoordinates/${lat}/${lon}`, {
                method: 'GET',
            });
        },

        getWeatherForecast: async (siteId: number): Promise<WeatherForecastResp> => {
            return await apiFetch<WeatherForecastResp>(`${getBaseUrl()}/weather/${siteId}`);
        },
    }
};