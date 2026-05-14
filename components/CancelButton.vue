<script setup lang="ts">

import {useSiteAccessMethodMapStore} from "~/composables/types/dataAccessTypes";
import {useSiteFormInitialDataStore} from "~/composables/types/siteTypes";

const siteFormInitialDataStore = useSiteFormInitialDataStore()
const siteAccessMethodMapStore = useSiteAccessMethodMapStore()

const handleCancel = () => {
  siteAccessMethodMapStore.clearAccessMethods()
  siteFormInitialDataStore.clearInitialData()
  navigateTo(`/`)
}

const props = defineProps<{
  cancelDisabled: boolean
}>()

</script>

<template>

  <UButton
      label="Cancel"
      color="error"
      variant="ghost"
      trailing-icon="i-lucide-x"
      :ui="{
      base: 'flex-row justify-center items-center w-fit h-fit',
      label: 'whitespace-normal text-center'
      }"
      :disabled="props.cancelDisabled"
      @click="handleCancel"
  />

</template>

<style scoped>

</style>