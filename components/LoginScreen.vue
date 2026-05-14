<script setup lang="ts">
import {computed, reactive} from 'vue'

const props = defineProps<{
  loginLoading: boolean
}>()

const emit = defineEmits<{
  signIn: [{ siteName: string; password: string }]
  create: []
}>()

const form = reactive({
  siteName: undefined as string|undefined,
  password: undefined as string|undefined,
})

const normalizedSiteName = computed(() => form.siteName?.trim())


const canSubmit = computed(() => {
  return normalizedSiteName.value && normalizedSiteName.value.length > 0 && form.password
})

const handleSubmit = () => {
  if (canSubmit.value) {
    emit('signIn', {
      siteName: normalizedSiteName.value,
      password: form.password,
    })
  }
}
</script>

<template>
  <section class="grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,30rem)] lg:items-center">

    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <div class="shrink-0 items-center mt-4">
        <img
            src="/public/energy_stats_favicon-512_512.png"
            alt="favicon"
            class="h-30 w-30 object-contain"
        >
      </div>
      <div class="space-y-4 text-center sm:text-left">
        <h1 class="max-w-3xl text-5xl font-semibold tracking-tight text-highlighted sm:text-6xl">
          Energy Stats
        </h1>
        <p class="max-w-2xl text-base leading-7 text-toned">
          Improve your household's energy management. Analyze your energy production and consumption data,
          get photovoltaic panels generation forecasts.
        </p>
      </div>
    </div>

    <UCard
      class="border border-default/80 bg-default/90 shadow-2xl shadow-primary/10 backdrop-blur"
      :ui="{
        header: 'space-y-2',
        body: 'space-y-5',
      }"
    >
      <template #header>
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold text-highlighted">Log in</h2>
          <p class="text-sm leading-6 text-toned">
            Enter your site name and password, or create new site account.
          </p>
        </div>
      </template>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <UFormField label="Site name" required>
          <UInput
            v-model="form.siteName"
            type="text"
            name="siteName"
            autocomplete="organization"
            placeholder="Enter site name"
            icon="i-lucide-solar-panel"
            size="xl"
            class="w-full"
            :disabled="props.loginLoading"
          />
        </UFormField>

        <UFormField label="Password" required>
          <UInput
            v-model="form.password"
            type="password"
            name="password"
            autocomplete="current-password"
            placeholder="Enter password"
            icon="i-lucide-key-round"
            size="xl"
            class="w-full"
            :disabled="props.loginLoading"
          />
        </UFormField>

        <UButton
          type="submit"
          block
          size="xl"
          label="Log in"
          trailing-icon="i-lucide-arrow-right"
          :loading="props.loginLoading"
          :disabled="!canSubmit"
        />

        <USeparator label="or continue with setup" />

        <div class="grid gap-3">
          <UButton
            type="button"
            block
            color="neutral"
            variant="subtle"
            label="Add new site"
            icon="i-lucide-map-pinned"
            @click="emit('create')"
          />
        </div>
      </form>
    </UCard>
  </section>
</template>
