import {useSiteFormInitialDataStore} from "~/composables/types/siteTypes";
import {useSiteAccessMethodMapStore} from "~/composables/types/dataAccessTypes";


export default defineNuxtRouteMiddleware((to, from) => {
    const siteFormInitialDataStore = useSiteFormInitialDataStore()
    const accessMethodStore = useSiteAccessMethodMapStore()

    const wizardRoutes = ['/sites/search', '/site/create']

    if (wizardRoutes.includes(from.path) && !wizardRoutes.includes(to.path)) {
        console.log('User left the configuration, clearing stored data...')

        siteFormInitialDataStore.clearInitialData()
        accessMethodStore.clearAccessMethods()
    }
})