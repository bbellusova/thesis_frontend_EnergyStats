import type {DataCategory, SortOrder} from '~/composables/types/constantTypes'
import {apiFetch} from "~/composables/api/ApiFetch";
import type {
    DailyStatisticsResponse,
    EnergyDataResponse,
    MonthlyStatisticsResponse, YearlyStatisticsResponse
} from "~/composables/types/energyDataTypes";


export const useEnergyDataAPI = () => {
    const getBaseUrl = (siteId: number) => `/energyData/${siteId}`;

    return {
        getDataForMonthByDays: async (siteId: number, dataCategory: DataCategory, year: number, month: number, signal: AbortSignal) => {
            return await apiFetch<EnergyDataResponse>(
                `${getBaseUrl(siteId)}/${dataCategory}/forMonthByDays/${year}/${month}`,
                { method: 'GET', signal: signal }
            );
        },

        getDataForDayByHours: async (siteId: number, dataCategory: DataCategory, year: number, month: number, day: number,  signal: AbortSignal) => {
            return await apiFetch<EnergyDataResponse>(
                `${getBaseUrl(siteId)}/${dataCategory}/forDayByHours/${year}/${month}/${day}`,
                { method: 'GET', signal: signal }
            );
        },

        getStatisticsForMonth: async (siteId: number, dataCategory: DataCategory, year: number, month: number,  signal: AbortSignal) => {
            return await apiFetch<MonthlyStatisticsResponse>(
                `${getBaseUrl(siteId)}/${dataCategory}/statistics/${year}/${month}`,
                { method: 'GET', signal: signal }
            );
        },

        getStatisticsForDay: async (siteId: number, dataCategory: DataCategory, year: number, month: number, day: number,  signal: AbortSignal) => {
            return await apiFetch<DailyStatisticsResponse>(
                `${getBaseUrl(siteId)}/${dataCategory}/statistics/${year}/${month}/${day}`,
                { method: 'GET', signal: signal}
            );
        },

        getStatisticsForYear: async (siteId: number, dataCategory: DataCategory, year: number,  signal: AbortSignal) => {
            return await apiFetch<YearlyStatisticsResponse>(
                `${getBaseUrl(siteId)}/${dataCategory}/statistics/${year}`,
                { method: 'GET', signal: signal }
            );
        },

        getAvailableYears: async (siteId: number, dataCategories: DataCategory[], sortOrder: SortOrder, signal: AbortSignal) => {
            const params = new URLSearchParams();
            dataCategories.forEach(cat => params.append('dataCategories', cat));

            return await apiFetch<number[]>(
                `${getBaseUrl(siteId)}/availableYears/${sortOrder}?${params.toString()}`,
                { method: 'GET', signal: signal }
            );
        },

        getAvailableMonthsForYear: async (siteId: number, year: number, dataCategories: DataCategory[], sortOrder: SortOrder, signal: AbortSignal) => {
            const params = new URLSearchParams();
            dataCategories.forEach(cat => params.append('dataCategories', cat));

            return await apiFetch<number[]>(
                `${getBaseUrl(siteId)}/availableMonths/${year}/${sortOrder}?${params.toString()}`,
                { method: 'GET', signal: signal }
            );
        },

        getAvailableDaysForMonthInYear: async (siteId: number, year: number, month: number, dataCategories: DataCategory[], sortOrder: SortOrder, signal: AbortSignal) => {
            const params = new URLSearchParams();
            dataCategories.forEach(cat => params.append('dataCategories', cat));

            return await apiFetch<number[]>(
                `${getBaseUrl(siteId)}/availableDays/${year}/${month}/${sortOrder}?${params.toString()}`,
                { method: 'GET', signal: signal }
            );
        }
    };
};
