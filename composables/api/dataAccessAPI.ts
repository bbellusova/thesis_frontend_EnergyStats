import {apiFetch} from "~/composables/api/ApiFetch";
import type {DataCategory} from "~/composables/types/constantTypes";
import type {AccessMethodRequest, DataAccess} from "~/composables/types/dataAccessTypes";




export const useDataAccessApi = () => {
    const getBaseUrl = () => `/dataAccess`;

    return {
        getAvailableCategoriesForSite: async (siteId: number) => {
            return await apiFetch<DataCategory[]>(`${getBaseUrl()}/${siteId}/availableCategories`, {
                method: 'GET'
            });
        },

        getDataAccessForSiteAndCategory: async (siteId: number, category: DataCategory) => {
            return await apiFetch<DataAccess>(`${getBaseUrl()}/${siteId}/${category}`, {
                method: 'GET'
            });
        },

        updateAccessMethod: async (siteId: number, payload: AccessMethodRequest) => {
            const { dataCategory, ...accessMethod } = payload;
            return await apiFetch(`${getBaseUrl()}/${siteId}/${dataCategory}`, {
                method: 'PUT',
                body: accessMethod,
            });
        }
    };
};