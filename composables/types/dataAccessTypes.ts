import type {DataAccessType, DataCategory, ProviderDataAccessType} from "~/composables/types/constantTypes";
import type {DataProviderCode} from "~/composables/types/providerTypes";
import type {StateTree} from "pinia";

export type AccessMethodRequest = {
    dataCategory: DataCategory,
    dataAccessType: ProviderDataAccessType,
    dataProvider: DataProviderCode|undefined,
    dataProviderSiteId: number|undefined,
    apiKey: string|undefined,
}

export type DataAccess = {
    "siteId": number,
    "dataCategory": DataCategory,
    "dataAccessType": DataAccessType,
    "dataProvider": DataProviderCode|undefined,
    "dataProviderSiteId": number|undefined,
    "apiKey": string|undefined
}

export type SiteAccessMethodMap = Map<DataCategory, AccessMethodRequest>


export const useSiteAccessMethodMapStore = defineStore('siteAccessMethodMap', () => {
        const accessMethods = ref<SiteAccessMethodMap>(new Map())

        const setAccessMethod = (category: DataCategory, access: AccessMethodRequest) => {
            accessMethods.value.set(category, access)
        }
        const removeAccessMethod = (category: DataCategory) => {
            accessMethods.value.delete(category)
        }
        const clearAccessMethods = () => {
            accessMethods.value = new Map()
        }

        return { accessMethods, setAccessMethod, clearAccessMethods, removeAccessMethod }
    },
    {
        persist: {
            serializer: {
                serialize: (value: StateTree) => {
                    return JSON.stringify({
                        ...value,
                        accessMethods: Array.from(value.accessMethods.entries())
                    })
                },
                deserialize: (value: string) => {
                    const data = JSON.parse(value)
                    data.accessMethods = new Map(data.accessMethods)
                    return data as StateTree
                }
            }
        }
    })