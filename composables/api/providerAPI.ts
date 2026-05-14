import {apiFetch} from "~/composables/api/ApiFetch";
import type {DataAccessType, DataCategory} from "~/composables/types/constantTypes";
import type {
    AvailableSitesRequest, AvailableSitesResponse,
    DataProviderCode, DataProviderMap,
    DataProviders,
    FileProviderCategories,
    FileProviderResp
} from "~/composables/types/providerTypes";
import {ApiError} from "~/composables/types/errors";


export const useDataProvidersAPI = () => {
    const getBaseUrl = () => `/providers`;

    return {
        getAvailableProviders: async () => {
            return await apiFetch<DataProviders>(`${getBaseUrl()}`, {
                method: 'GET'
            })
        },

        getAvailableSitesForAPIKey: async (payload: AvailableSitesRequest) => {

            return await apiFetch<AvailableSitesResponse[]>(
                `${getBaseUrl()}/${payload.provider}/availableSitesForAPIKey`,
                {
                    method: 'GET',
                    query: {
                        key: payload.apiKey,
                    },
                },
            )
        },

        getProvidersWithFileDataImportForSite: async (siteId: number) => {
            const {dataProvidersFileDataAccess} = useDataProviders();

            console.log("getting avaialble providers for file import for site")
            const response = await apiFetch<Record<DataProviderCode, FileProviderResp>>(`${getBaseUrl()}/configuredFileImportProviders/${siteId}`, {
                method: 'GET'
            });
            if (!response) {
                throw new ApiError("No response received from server", 500);
            }
            const result: FileProviderCategories = new Map();

            for (const [code, resp] of Object.entries(response)) {
                const providerInfo = dataProvidersFileDataAccess.value.get(code);

                if (providerInfo) {
                    result.set(code, {
                        provider: providerInfo,
                        categories: resp.categories,
                        supportedFileFormats: resp.supportedFileFormats
                    });
                }
            }
            console.log(result)
            return result;
        }
    }
}

export const useDataProviders = () => {
    const dataProviders = useState<DataProviders>('data-providers', () => [])
    const loaded = useState('data-providers-loaded', () => false)
    const pending = useState('data-providers-pending', () => false)
    const dataProvidersAPI = useDataProvidersAPI()

    const loadDataProviders = async () => {
        if (loaded.value || pending.value) return

        pending.value = true
        try {
            dataProviders.value = await dataProvidersAPI.getAvailableProviders()

            loaded.value = true
        } finally {
            pending.value = false
        }
    }

    console.log(dataProviders.value)
    const dataProviderMap = computed<DataProviderMap>(() =>
        new Map(
            dataProviders.value.map((provider) => [provider.code, {
                ...provider,
                availableCategories: new Map(
                    Object.entries(provider.availableCategories || {}).map(([cat, types]) => [
                        cat as DataCategory,
                        new Set(types as DataAccessType[])
                    ])
                )
            }])
        )
    )

    const dataProvidersApiDataAccess = computed<DataProviderMap>(() =>
        new Map(
            dataProviders.value
                .filter((provider) => provider.accessTypes.includes('API'))
                .map((provider) => [provider.code, {
                    ...provider,
                    availableCategories: new Map(
                        Object.entries(provider.availableCategories || {}).map(([cat, types]) => [
                            cat as DataCategory,
                            new Set(types as DataAccessType[])
                        ])
                    )
                }])
        )
    )

    const dataProvidersFileDataAccess = computed<DataProviderMap>(() =>
        new Map(
            dataProviders.value
                .filter((provider) => provider.accessTypes.includes('FILE'))
                .map((provider) => [provider.code, {
                    ...provider,
                    availableCategories: new Map(
                        Object.entries(provider.availableCategories || {}).map(([cat, types]) => [
                            cat as DataCategory,
                            new Set(types as DataAccessType[])
                        ])
                    )
                }])
        )
    )


    return {
        dataProviderMap,
        dataProvidersApiDataAccess,
        dataProvidersFileDataAccess,
        loadDataProviders,
    }
}

