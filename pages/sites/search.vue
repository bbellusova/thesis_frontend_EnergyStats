<script setup lang="ts">
import CancelButton from "~/components/CancelButton.vue";
</script>
<template>
  <div class="flex flex-col">
  <SiteSearch />
  <CancelButton class="mt-3" :cancel-disabled="false"/>
  </div>
</template>
