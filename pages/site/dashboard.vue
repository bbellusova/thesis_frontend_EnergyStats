<script setup lang="ts">

import type {GetSiteResponse} from "~/composables/types/siteTypes";
import {useAuthAPI} from "~/composables/api/authAPI";
import {useSiteAPI} from "~/composables/api/siteAPI";


const {logoutFromSite, validateSite} = useAuthAPI()
const {getSiteById} = useSiteAPI()

const siteCookie = useCookie<GetSiteResponse | null>('siteInformation')

onMounted(async() => {
  await validateSite()
  siteValidated.value = true
  if (!siteId.value){
    navigateTo("/")
  } else if (!siteInfo.value){
    siteCookie.value = await getSiteById(siteId.value)
  }
})

const siteValidated = ref(false)

const handleLogout = () => {
  siteValidated.value = false
  logoutFromSite()
}

const siteInfo = computed(() => {
  return siteCookie.value ?? null
})

const siteId = computed(() => {
  return siteInfo?.value?.siteId ?? null
})

const siteName = computed(() => {
  return siteInfo?.value?.siteName ?? null
})

const lat = computed(() => {return siteInfo?.value?.lat ?? ""})
const lon = computed(() => {return siteInfo?.value?.lon ?? ""})
const azm = computed(() => {return siteInfo?.value?.azm ?? ""})
const dec = computed(() => {return siteInfo?.value?.dec ?? ""})
const kwp = computed(() => {return siteInfo?.value?.kwp ?? ""})
const timezone = computed(() => {return siteInfo?.value?.timezone ?? ""})


const refreshCounter = ref(0)

const handleUploadSuccess = () => {
  refreshCounter.value++
}

</script>

<template>
  <div>
  <div v-if="!siteValidated" class="h-full flex items-center justify-center">
    <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 text-gray-400" />
  </div>
  <div v-if="siteValidated">
    <div class="grid grid-cols-3 items-center mb-3">
      <div/>

      <h1 class="text-2xl text-center ">Welcome to site
        <UPopover mode="click">
          <span class="font-bold cursor-pointer hover:text-primary transition-colors border-b border-gray-400">
            {{ siteName }}
          </span>
          <template #content>
          <div class="p-4 w-64">
            <h3 class="font-bold text-sm mb-2 uppercase text-center text-gray-500">Site Information</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-toned">Location:</span>
                <span class="font-mono text-xs">{{lat}}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-toned">Longitude:</span>
                <span class="font-mono text-xs">{{lon}}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-toned">Timezone:</span>
                <span class="font-mono text-xs">{{timezone}}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-toned">Azimuth (S=0°):</span>
                <span class="font-mono text-xs">{{ azm }}°</span>
              </div>
              <div class="flex justify-between">
                <span class="text-toned">Declination:</span>
                <span class="font-mono text-xs">{{ dec }}°</span>
              </div>
              <div class="flex justify-between">
                <span class="text-toned">Peak power:</span>
                <span class="font-mono text-xs">{{ kwp }} kW</span>
              </div>
            </div>
          </div>
          </template>
        </UPopover>
        dashboard</h1>

      <div class="flex justify-end">
        <UButton variant="soft" color="neutral" @click="handleLogout">Logout</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

      <div class="lg:col-span-1 shrink-0 space-y-6">
        <FileUploader :site-id="siteId!" @upload-success="handleUploadSuccess"/>
        <ForecastDisplayer :site-info="siteInfo!" />
      </div>

      <div class="lg:col-span-2 shrink-0">
        <ChartDisplayer :site-id="siteId!" :refresh-key="refreshCounter"/>
      </div>

    </div>
  </div>
  </div>

</template>

<style scoped>

</style>