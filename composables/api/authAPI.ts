import {apiFetch} from "~/composables/api/ApiFetch";
import type {GetSiteResponse} from "~/composables/types/siteTypes";
import {ApiError} from "~/composables/types/errors";

export const useAuthAPI = () => {
    const getBaseUrl = () => `/auth`;

    return {
        loginToSite: async (name: string, password: string) => {
            try {
                console.log('Trying login')
                const response = await apiFetch<GetSiteResponse>(`${getBaseUrl()}/login`, {
                    method: 'POST',
                    body: {
                        siteName: name,
                        password: password
                    }
                })

                const siteCookie = useCookie<GetSiteResponse>('siteInformation')
                siteCookie.value = response

            } catch (error) {
                if (error instanceof ApiError) throw error
                throw error;
            }
        },

        validateSite: async (headers?: Record<string, string>) => {
            await apiFetch<unknown>(`${getBaseUrl()}/validation`, {
                method: 'GET',
                headers: headers
            })
        },

        logoutFromSite: async () => {
            try {
                await apiFetch(`${getBaseUrl()}/logout`, {method: 'POST'})
            } finally {
                const siteCookie = useCookie('siteInformation')
                siteCookie.value = null
                navigateTo('/')
            }
        },
    }
}