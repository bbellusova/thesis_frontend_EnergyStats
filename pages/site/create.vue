<script setup lang="ts">
import SiteForm from '~/components/SiteForm.vue'
import {type SiteFormPayload, useSiteFormInitialDataStore} from '~/composables/types/siteTypes'
import {useSiteAPI} from "~/composables/api/siteAPI";
import { useDataAccessApi} from "~/composables/api/dataAccessAPI";
import {useErrorToast} from "~/composables/useErrorToast";
import {loginAndRedirect} from "~/composables/loginRedirect";
import {useSiteAccessMethodMapStore} from "~/composables/types/dataAccessTypes";
import CancelButton from "~/components/CancelButton.vue";
import {useSuccessToast} from "~/composables/useSuccessToast";
const { showError } = useErrorToast()
const { showSuccess } = useSuccessToast()

const siteFormInitialDataStore = useSiteFormInitialDataStore()
const siteAccessMethodMapStore = useSiteAccessMethodMapStore()

const { updateAccessMethod } = useDataAccessApi()
const {createSite} = useSiteAPI()

const initialData = ref(siteFormInitialDataStore.initialData)
const disableBack = ref(false)

const handleSubmit = async (payload: SiteFormPayload) => {
  disableBack.value = true
  console.log('Create site submitted', payload)
  try {
    const siteId = await createSite(payload)
    await loginAndRedirect({siteName: payload.name, password: payload.password}, false)

    for (const [_, dataAccess] of siteAccessMethodMapStore.accessMethods) {
      await updateAccessMethod(siteId, dataAccess)
    }

    siteAccessMethodMapStore.clearAccessMethods()
    siteFormInitialDataStore.clearInitialData()
    await nextTick()

    navigateTo(`/site/dashboard`)
    showSuccess("Site account created successfully")
  } catch (error) {
    showError(error)
    disableBack.value = false
  }
}

</script>

<template>
  <section>
    <div class="flex flex-col">
      <h1 class="text-center text-lg font-bold text-highlighted">Create new site account</h1>
      <SiteForm :initial-data="initialData" @submit="handleSubmit">
        <template #backButton>
          <UButton
              label="Back to providers config"
              variant="subtle"
              color="neutral"
              size="xl"
              icon="i-lucide-arrow-left"
              :disabled="disableBack"
              @click="navigateTo(`/sites/search`)"
          />
        </template>
      </SiteForm>
      <CancelButton class="mt-3" :cancel-disabled="disableBack"/>
    </div>
  </section>

</template>