import type {GetSiteResponse} from "~/composables/types/siteTypes";

export default defineNuxtRouteMiddleware(async (to) => {
    const siteInfo = useCookie<GetSiteResponse | null>('siteInformation')

    if (!siteInfo.value && to.path.startsWith('/site/dashboard')) {
        return navigateTo('/')
    }
})