<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {useDataProviders, useDataProvidersAPI} from '~/composables/api/providerAPI'
import { useErrorToast } from '~/composables/useErrorToast'
import type {
  AvailableSitesResponse, AvailableSitesRequest,
  DataProviderCode, ProviderInfo,
} from '~/composables/types/providerTypes'
import {
  useSiteFormInitialDataStore
} from '~/composables/types/siteTypes'
import {DATA_CATEGORIES, type DataAccessType, type DataCategory, DataCategoryInfo} from "~/composables/types/constantTypes";
import {useSiteAccessMethodMapStore} from "~/composables/types/dataAccessTypes";

const {getAvailableSitesForAPIKey} = useDataProvidersAPI()
const { loadDataProviders, dataProvidersApiDataAccess, dataProvidersFileDataAccess } = useDataProviders()
const { showError } = useErrorToast()

const siteFormInitialDataStore = useSiteFormInitialDataStore()
const siteAccessMethodMapStore = useSiteAccessMethodMapStore()

onMounted(async() => {
  await loadDataProviders()
  const configuredSites = siteAccessMethodMapStore.accessMethods
  foundProvidersByAPI.value.clear()
  configuredSites.forEach((access, category) => {
    if (access.dataAccessType === 'API' && access.dataProvider && access.apiKey) {
      foundProvidersByAPI.value.set(access.dataProvider, {
        provider: access.dataProvider,
        brandSiteId: access.dataProviderSiteId as number,
        apiKey: access.apiKey
      })
      if (!foundCategoriesByAPI.value.has(category)) {
        foundCategoriesByAPI.value.set(category, new Set())
      }
      foundCategoriesByAPI.value.get(category)!.add(access.dataProvider)
    }
  })
  addAnother.value = canAddAnother.value
  console.log(canAddAnother.value)
  if (!addAnother.value){
    handleConfigureCategories()
  }
})


const form = reactive({
  provider: '',
  apiKey: '',
})

const touched = reactive({
  provider: false,
  apiKey: false,
})

const foundProvidersByAPI = ref<Map<DataProviderCode, ProviderInfo>>(new Map())
const foundCategoriesByAPI = ref<Map<DataCategory, Set<DataProviderCode>>>(new Map())

const canAddAnother = computed(() => {
  console.log(foundProvidersByAPI.value.size, dataProvidersApiDataAccess.value?.size)
  return foundProvidersByAPI.value.size <  (dataProvidersApiDataAccess.value?.size ?? foundProvidersByAPI.value.size)
})

const isLoading = ref(false)
const addAnother = ref(canAddAnother.value)
const askAddAnother = ref(false)
const configureCategories = ref(false)
const askConfigureCategories = ref(false)
const submittedInfo = ref<AvailableSitesRequest | null>(null);
const sites = ref<AvailableSitesResponse[]>([])
const currProvider = ref("")

const providerOptions = computed(() => {

    const usedProviders = new Set(foundProvidersByAPI.value.keys())

    return Array.from(dataProvidersApiDataAccess.value.entries())
      .filter(([code]) => !usedProviders.has(code))
      .map(([code, provider]) => ({
        label: provider.name,
        value: code,
      }))
    }
)

const errors = computed(() => ({
  provider: !form.provider ? 'Choose a provider.' : '',
  apiKey: !form.apiKey.trim() ? 'API key is required.' : '',
}))

const isValid = computed(() => !errors.value.provider && !errors.value.apiKey)

const fieldError = (field: keyof typeof form) => {
  return touched[field] && errors.value[field] ? errors.value[field] : undefined
}

const categorySettingCompleted = computed(() => {
  return availableCategoriesList.value.every(item => !!item.selectedProvider)
});

const handleLoadSites = async () => {
  touched.provider = true
  touched.apiKey = true

  if (!isValid.value) {
    return
  }

  isLoading.value = true

  try {
    const request = {
      provider: form.provider,
      apiKey: form.apiKey.trim(),
    }
    sites.value = await getAvailableSitesForAPIKey(request)
    currProvider.value = form.provider
    form.provider = ""
    form.apiKey = ""
    touched.provider = false
    touched.apiKey = false

    addAnother.value = false
    submittedInfo.value = request
  } catch (error) {
    sites.value = []
    showError(error)
  } finally {
    isLoading.value = false
  }
}

const handleConfigureCategories = () => {
  askConfigureCategories.value = false
  askAddAnother.value = false
  addAnother.value = false
  configureCategories.value = true
}

const handleSiteSelection = async (site: AvailableSitesResponse) => {
    const info = submittedInfo.value
    const currentInitialData = siteFormInitialDataStore.initialData
    siteFormInitialDataStore.setInitialData( {
      name: currentInitialData?.name ?? undefined,
      azimuth: currentInitialData?.azimuth ?? undefined,
      declination: currentInitialData?.declination ?? undefined,
      timezone: site.timezone ?? currentInitialData?.timezone ?? undefined,
      peakPowerKw: site.peakPower ?? currentInitialData?.peakPowerKw ?? undefined,
      latitude: site.lat ?? currentInitialData?.latitude ?? undefined,
      longitude: site.lon ?? currentInitialData?.longitude ?? undefined
    })

    if (info) {
      foundProvidersByAPI.value.set(info.provider, {provider: info.provider, apiKey: info.apiKey, brandSiteId: site.brandSiteId})
      site.availableCategories.forEach((category) => {
        if (!foundCategoriesByAPI.value.has(category)) {
          foundCategoriesByAPI.value.set(category, new Set())
        }
        foundCategoriesByAPI.value.get(category)!.add(info.provider)
      })
    }
    await nextTick()

    sites.value = []
    askAddAnother.value = canAddAnother.value
    if (!askAddAnother.value){
      askConfigureCategories.value = false
      configureCategories.value = true
      return
    }
    askConfigureCategories.value = true
}

const handleAddAnother = () => {
  askAddAnother.value = false
  addAnother.value = true
}

const apiKeyQuestion = computed(() => {
  if (foundProvidersByAPI.value.size > 0){
    return "I don't have more API keys, let's configure categories for added providers"
  }
  return "I don't have any API key"
})

const isSetToNone = ref(
    new Map<DataCategory, boolean>(
        DATA_CATEGORIES.map(cat => [cat, false])
    )
);


const availableCategoriesList = computed(() => {
  return Object.values(DATA_CATEGORIES).map((category) => {

    const apiProviders = foundCategoriesByAPI.value.get(category)
    const apiOptions = apiProviders
        ? Array.from(apiProviders).map(code => ({
          label: `${dataProvidersApiDataAccess.value.get(code)?.name ?? code} (API import)`,
          value: `${code}:API`,
        }))
        : []

    const fileOptions: { label: string, value: DataProviderCode }[] = []
    dataProvidersFileDataAccess.value.forEach((provider, code) => {
      const accessTypes = provider.availableCategories.get(category)
      if (accessTypes != undefined && accessTypes.has("FILE")) {
        fileOptions.push({
          label: `${provider.name} (File Import)`,
          value: `${code}:FILE`
        })
      }
    })

    if (apiOptions.length === 0 && fileOptions.length === 0) {
      return null
    }

    const options = [
      ...apiOptions,
      ...fileOptions,
      {
        label: `None`,
        value: `NONE`
      }
    ]

    let selectedProvider = undefined
    const configuredAccessMethods = siteAccessMethodMapStore.accessMethods
    if (configuredAccessMethods && configuredAccessMethods.has(category)) {
      const provider = configuredAccessMethods.get(category)?.dataProvider
      const type = configuredAccessMethods.get(category)?.dataAccessType
      const findValue = (provider && type) ? provider+":"+type : "NONE"
      selectedProvider = options.find(opt => opt.value === findValue)?.label
    } else if (isSetToNone.value.get(category) == true){
      selectedProvider = options.find(opt => opt.value === "NONE")?.label
    }

    return {
      category,
      categoryLabel: DataCategoryInfo[category] ?? category,
      selectedProvider: selectedProvider,
      options: options
    }
  }).filter(item => item !== null)
})


const handleCategorySelection = (category: DataCategory, value: string) => {

  if (value == "NONE") {
    isSetToNone.value.set(category, true)
    siteAccessMethodMapStore.removeAccessMethod(category)
    return
  }
  isSetToNone.value.set(category, false)


  const [providerCode, accessType] = value.split(':') as [DataProviderCode, DataAccessType]

  if (accessType == "FILE"){
    siteAccessMethodMapStore.setAccessMethod(category, {
      dataCategory: category,
      dataAccessType: "FILE",
      dataProvider: providerCode,
      dataProviderSiteId: undefined,
      apiKey: undefined
    })
    console.log(siteAccessMethodMapStore.accessMethods)
    return
  }

  siteAccessMethodMapStore.setAccessMethod(category, {
    dataCategory: category,
    dataAccessType: "API",
    dataProvider: providerCode,
    dataProviderSiteId: foundProvidersByAPI.value.get(providerCode)?.brandSiteId,
    apiKey: foundProvidersByAPI.value.get(providerCode)?.apiKey
  })
  console.log(siteAccessMethodMapStore.accessMethods)
}

</script>

<template>
  <section class="w-full max-w-4xl space-y-6">

    <UCard class="w-full max-w-4xl mt-10 border-t-4 border-primary">
      <template #header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <h3 class="font-bold text-highlighted">Supported providers for file data import:</h3>
            <div
                v-for="[provider, details] in dataProvidersFileDataAccess"
                :key="provider"
                class="flex justify-between items-center"
            >
              <h3 class="text-toned">{{details.name ?? provider}}</h3>
            </div>
          </div>
        <div v-if="foundProvidersByAPI.size > 0">
        <h3 class="font-bold text-highlighted">Added providers with an API:</h3>
        <div
            v-for="[provider] in foundProvidersByAPI"
            :key="provider"
            class="flex justify-between items-center"
        >
          <h3 class="text-toned">{{dataProvidersApiDataAccess.get(provider)?.name ?? provider}}</h3>
        </div>
        </div>
        </div>
      </template>
    </UCard>

    <UCard v-if="addAnother" class="w-full max-w-4xl">
      <template #header>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">Find available sites</h2>
          <p class="text-sm text-toned">Choose your API-capable provider and enter your API key.</p>
        </div>
      </template>

      <UForm class="space-y-4" :state="form" @submit.prevent="handleLoadSites">
        <UFormField label="Provider" name="provider" required :error="fieldError('provider')">
          <USelect
            v-model="form.provider"
            :items="providerOptions"
            value-key="value"
            label-key="label"
            placeholder="Select provider"
            icon="i-lucide-plug-zap"
            size="xl"
            class="w-full"
            @update:model-value="touched.provider = true"
          />
        </UFormField>

        <UFormField label="API key" name="apiKey" required :error="fieldError('apiKey')">
          <UInput
            v-model="form.apiKey"
            type="password"
            name="apiKey"
            autocomplete="off"
            placeholder="Enter API key"
            icon="i-lucide-key-round"
            size="xl"
            class="w-full"
            @update:model-value="touched.apiKey = true"
          />
        </UFormField>

        <div class="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6">
          <UButton
              type="button"
              color="secondary"
              variant="subtle"
              size="xl"
              trailing-icon="i-lucide-x"
              class="justify-center h-auto"
              @click="handleConfigureCategories"
          >
          <span class="whitespace-normal text-center">
              {{apiKeyQuestion}}
          </span>
          </UButton>
          <UButton
            type="submit"
            color="secondary"
            size="xl"
            label="Load sites"
            trailing-icon="i-lucide-search"
            :loading="isLoading"
            class="justify-center h-auto"
            :click="handleLoadSites"
            :disabled="!isValid"
          />
        </div>
      </UForm>
    </UCard>

    <UCard v-if="sites.length" class="w-full max-w-4xl">
      <template #header>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">Available sites</h2>
          <p class="text-sm text-toned">
            {{ sites.length }} site(s) returned by the provider.
            Select site you want to start an account for.
          </p>
        </div>
        <SolarEdgeLogo v-if="currProvider == `SolarEdge`" />
      </template>

      <div class="space-y-3">
        <div
          v-for="site in sites"
          :key="`${site.brandSiteId}-${site.address}`"
          class="border border-default p-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-gray-100 hover:border-green-500"
          role="button"
          @click="handleSiteSelection(site)"
        >
          <div class="font-medium text-highlighted">{{ site.address }}</div>
          <div class="text-sm text-toned">Provider site ID: {{ site.brandSiteId }}</div>
          <div class="text-sm text-toned">Provider: {{ site.provider }}</div>
          <div class="text-sm text-toned">Timezone: {{ site.timezone || 'Unavailable' }}</div>
          <div class="text-sm text-toned">
            Coordinates:
            {{ site.lat ?? 'n/a' }},
            {{ site.lon ?? 'n/a' }}
          </div>
          <div class="text-sm text-toned">Peak power: {{ site.peakPower ?? 'Unavailable'}}</div>
        </div>
      </div>

    </UCard>

    <div class="flex flex-col sm:justify-end gap-3 mt-6">
    <UButton
        v-if="askAddAnother"
        color="secondary"
        class="justify-center h-auto"
        @click="handleAddAnother"
    >
      <span class="whitespace-normal text-center">
        I want to add another API Provider
    </span>
    </UButton>
    <UButton
        v-if="askAddAnother"
        class="justify-center h-auto"
        color="secondary"
        variant="subtle"
        @click="handleConfigureCategories"
    >
      <span class="whitespace-normal text-center">
        {{ apiKeyQuestion }}
    </span>
    </UButton>
    </div>


    <UCard v-if="configureCategories" class="w-full max-w-4xl">
      <template #header>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">Configure available categories</h2>
          <p class="text-sm text-toned">Select a provider for each discovered data category.</p>
        </div>
      </template>

      <div class="space-y-6">
        <div
            v-for="item in availableCategoriesList"
            :key="item.category"
            class="grid grid-cols-1 w-full sm:grid-cols-2 justify-between gap-4 p-4 border border-default rounded-lg"
        >
          <div class="flex-1 min-w-0">
            <div class="font-medium text-highlighted">{{ item.categoryLabel }}</div>
            <div class="text-xs text-toned uppercase tracking-wider">{{ item.category }}</div>
          </div>

          <div class="w-full sm:w-lg max-w-full">
            <UFormField class="w-full">
            <USelect
                class="w-full"
                required
                :model-value="item.selectedProvider"
                :items="item.options"
                :ui="{
                  base: 'w-full truncate overflow-hidden',
                  leading: 'flex-shrink-0'
                }"
                placeholder="Select provider..."
                icon="i-lucide-plug-zap"
                @update:model-value="(val) => handleCategorySelection(item.category, val)"
            />
            </UFormField>
          </div>
        </div>
      </div>
      <div class="flex justify-end">
      <UButton class="mt-6" type="submit" :disabled="!categorySettingCompleted" @click="navigateTo('/site/create')">
        Set providers for categories and proceed
      </UButton>
      </div>
    </UCard>
  </section>
</template>
