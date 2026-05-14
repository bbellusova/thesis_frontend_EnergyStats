<script setup lang="ts">
import {useDataProviders} from "~/composables/api/providerAPI";

onMounted(async() => {
  const {loadDataProviders} = useDataProviders()
  await loadDataProviders()
})

</script>

<template>
  <main class="app-shell">
    <NuxtPage />
    <UToaster position="top-right" />
  </main>
</template>
