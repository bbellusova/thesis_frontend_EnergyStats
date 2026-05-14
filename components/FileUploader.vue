<script setup lang="ts">
import {reactive, ref} from 'vue'

import {categoryColors, categoryName, type DataCategory} from "~/composables/types/constantTypes";
import type {DataProviderCode, FileProviderCategories} from "~/composables/types/providerTypes";
import {useErrorToast} from "~/composables/useErrorToast";
import {useSuccessToast} from "~/composables/useSuccessToast";
import {useDataProvidersAPI} from "~/composables/api/providerAPI";
import {fileImportApiFetch} from "~/composables/api/ApiFetch";

const { showError } = useErrorToast()
const { showSuccess } = useSuccessToast()



const { getProvidersWithFileDataImportForSite } = useDataProvidersAPI()

const importFileForSite = async (siteId: number, provider: DataProviderCode, category: DataCategory, file: File) => {
  await fileImportApiFetch(`providers/${provider}/importDataFromFile/${siteId}/${category}`, file)
}

const props = defineProps<{
  siteId: number
}>()

const emit = defineEmits(['upload-success'])

const providers = ref< { label: string, value: string }[]>([])
const options = ref<FileProviderCategories>(new Map())

const isUploading = ref(false)

onMounted(async () => {
  try {
    options.value = await getProvidersWithFileDataImportForSite(props.siteId)
    providers.value = Array.from(options.value.entries()).map(([code, data]) => ({
      label: data.provider.name,
      value: code,
    }))
    console.log("Options", options.value)
    console.log("Providers", providers.value)
  }catch (error) {
    showError(error, false)
  }
})

const form = reactive({
  provider: undefined as DataProviderCode | undefined,
  category: undefined as DataCategory | undefined
})

const categoryOptions = computed(() => {
  const rawCategories = options.value.get(form.provider!)?.categories || []

  return rawCategories.map(cat => ({
    label: categoryName(cat),
    value: cat,
    icon: "i-lucide-sun"
  }))
})

const supportedFileFormats = computed(() => {
  const defaultFormats = ".xlsx, .xls, .csv"
  if (form.provider) {
    return options.value.get(form.provider)?.supportedFileFormats?.join(", ") ?? defaultFormats
  }
  return defaultFormats
})

const file = ref<File|null>(null)
const status = ref('')

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0){
    file.value = target.files[0]!
  } else {
    file.value = null
  }
}

watch(() => form.provider, (newProvider) => {
  if (newProvider) {

    if (categoryOptions.value.length === 1 && categoryOptions.value[0]) {
      form.category = categoryOptions.value[0].value
    } else {
      form.category = undefined
    }
  }
})

const canSubmit = computed(() => form.provider != undefined && form.category != undefined && file.value != null )

const handleSubmit = async () => {
  if (!file.value && !canSubmit.value) return

  if (canSubmit.value && file.value && form.provider && form.category) {
    try {
      status.value = 'Uploading...'
      isUploading.value = true
      await importFileForSite(props.siteId, form.provider, form.category, file.value)
      status.value = 'Success'
      console.log("Success")
      showSuccess("Data imported successfully")
      emit('upload-success')
    } catch (error) {
      status.value = 'Upload failed.'
      console.error(error)
      showError(error, false)
    } finally {
      isUploading.value = false
      file.value = null
    }
  }
}
</script>

<template>
  <div class="card">
    <UForm class="w-full max-w-4xl space-y-6" :state="form" @submit.prevent="handleSubmit">
      <UCard class="w-full max-w-4xl">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted flex items-center"><UIcon name="i-lucide-file" class="mr-2"/> Import data from a file</h2>
          </div>
        </template>

        <div class="w-full">
          <UFormField class="w-full" label="Select energy provider from which is your file:" name="provider" required >
            <USelect
                v-model="form.provider"
                :items="providers"
                placeholder="Select provider"
                icon="i-lucide-plug-zap"
                size="xl"
                class="w-full"
                :disabled="isUploading"
            />
          </UFormField>
        </div>

        <div class="w-full">
          <UFormField class="w-full mt-2" label="Select the data category to import:" name="category" required >
            <USelectMenu
                v-model="form.category"
                :items="categoryOptions"
                label-key="label"
                value-key="value"
                :searchable="false"
                placeholder="Select data category"
                icon="i-lucide-database-zap"
                size="xl"
                class="w-full"
                :disabled="!form.provider || isUploading"
            >
              <template #item="option">
              <UIcon
                  :name="option.item.icon"
                  class="w-5 h-5 shrink-0"
                  :style="{ color: categoryColors[option.item.value] }"
              />
              <span class="truncate">{{ option.item.label }}</span>
            </template>
            </USelectMenu>
          </UFormField>
        </div>

        <UFormField class="w-full mt-2" label="Select the file:" name="file" required >
          <div class="flex flex-col">
          <span v-if="form.provider">
            Supported file formats: {{ supportedFileFormats }}
          </span>
          <span v-if="form.category" class="text-amber-600 italic">Ensure your file contains data for the "<span class="font-bold">{{categoryName(form.category)}}</span>" data category.</span>
          </div>
          <UInput
            type="file"
            icon="i-lucide-upload"
            class="w-full"
            :accept="supportedFileFormats"
            :disabled="!form.category || isUploading"
            @change="onFileSelected"
          />
        <div class="flex justify-end mt-4">
          <UButton
              type="submit"
              size="xl"
              label="Upload data"
              trailing-icon="i-lucide-arrow-right"
              :disabled="!canSubmit"
              :loading="isUploading"
          />
        </div>
        </UFormField>

      </UCard>


    </UForm>
  </div>
</template>