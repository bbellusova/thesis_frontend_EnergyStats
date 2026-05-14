<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useDataProviders } from '~/composables/api/providerAPI'
import {
  type SiteFormInitialData,
  type SiteFormPayload, useSiteFormInitialDataStore,
} from '~/composables/types/siteTypes';
import {useForecastAPI} from "~/composables/api/forecastAPI";
import {useSiteAPI} from "~/composables/api/siteAPI";
import {useGeocodingAPI} from "~/composables/api/geocodingAPI";

let coordinatesTimer: NodeJS.Timeout
let nameTimer: NodeJS.Timeout

const {canUseSiteName} = useSiteAPI()
const {getTimezoneForCoordinates} = useGeocodingAPI()
const siteFormInitialDataStore = useSiteFormInitialDataStore()


const props = defineProps<{
  initialData: SiteFormInitialData | null
}>()

const emit = defineEmits<{
  submit: [payload: SiteFormPayload]
}>()

const { dataProvidersFileDataAccess } = useDataProviders()
const {validateConfiguration} = useForecastAPI()
console.log("Form", dataProvidersFileDataAccess)

const form = reactive({
  name: props.initialData?.name ?? '',
  password: '',
  passwordAgain: '',
  azimuth: props.initialData?.azimuth?.toString() ?? '',
  declination: props.initialData?.declination?.toString() ?? '',
  peakPowerKw: props.initialData?.peakPowerKw?.toString() ?? '',
  latitude: props.initialData?.latitude?.toString() ?? '',
  longitude: props.initialData?.longitude?.toString() ?? '',
  timezone: props.initialData?.timezone ?? '',
})

const touched = reactive({
  name: false,
  password: false,
  passwordAgain: false,
  azimuth: false,
  declination: false,
  peakPowerKw: false,
  latitude: false,
  longitude: false,
  timezone: false,
})

const fieldError = (field: keyof typeof form) => {
  return touched[field] && errors.value[field] ? errors.value[field] : undefined
}
const timeZoneQuery = ref('')
const timezoneListId = 'site-timezone-options'
const supportedTimezones =
  typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

const normalizedName = computed(() => form.name.trim())
const normalizedTimezone = computed(() => form.timezone.trim())

const filteredTimezones = computed(() => {
  const query = timeZoneQuery.value.trim().toLowerCase()

  if (!query) {
    return supportedTimezones.slice(0, 100)
  }

  return supportedTimezones
    .filter((timezone) => timezone.toLowerCase().includes(query))
    .slice(0, 100)
})

const parseNumber = (value: string) => {
  if (value.trim() === '') {
    return Number.NaN
  }
  return Number(value)
}

const isTimezoneValid = (timezone: string | undefined) => {
  return timezone !== undefined && timezone !== "" && supportedTimezones.includes(timezone)
}

const validateLocationAndTimezone = async (latitude: number, longitude: number) => {

  const [result, timezone] = await Promise.all([
    validateConfiguration(latitude, longitude),
    getTimezoneForCoordinates(latitude, longitude)
  ])

  isConfigValid.value = result
  configNotValidMessage.value = "Energy generation forecasts will not be available for coordinates " + latitude + ", " + longitude

  if (!isTimezoneValid(timezone)) {
    disableTimezone.value = false
    form.timezone = ""
  } else {
    disableTimezone.value = true
    form.timezone = timezone
  }
}

onMounted(() => {
  disableInput.value = true
  if (!isTimezoneValid(form.timezone) && form.latitude && form.longitude && validators.latitude.value && validators.longitude.value){
    console.log("validating coordinates")
    validateLocationAndTimezone(Number(form.latitude), Number(form.longitude))
  }
  disableInput.value = false
})

const submitLoading = ref(false)
const coordinatesLoading = ref(false)
const disableInput = ref(false)
const disableNameInput = ref(false)

const disableTimezone = ref(isTimezoneValid(props.initialData?.timezone))

const resetConfigValid = () => {
  isConfigValid.value = true
  configNotValidMessage.value = ""
}
const isConfigValid = ref(true)
const configNotValidMessage = ref("")

const isNameValid = ref(true)

watch(
    (form),
    (newForm) => {
      siteFormInitialDataStore.setInitialData( {
        name: normalizedName.value,
        azimuth: Number(newForm.azimuth),
        declination: Number(newForm.declination),
        timezone: newForm.timezone,
        peakPowerKw: Number(newForm.peakPowerKw),
        latitude: Number(newForm.latitude),
        longitude: Number(newForm.longitude)
      })
    }
)

watch(
    () => [form.name],
    () => {
      isNameValid.value = true
      clearTimeout(nameTimer)
      nameTimer = setTimeout(async () => {
        if (validators.name.value){
          disableNameInput.value = true
          const canUseName = await canUseSiteName(normalizedName.value)
          if (!canUseName) {
            isNameValid.value = false
          }
          disableNameInput.value = false
        }
      }, 1000)
    }
)

watch(
    () => [form.latitude, form.longitude],
    () => {
      clearTimeout(coordinatesTimer)
      resetConfigValid()
      coordinatesTimer = setTimeout(async () => {
        disableInput.value = true
        await nextTick()
        coordinatesLoading.value = true
        if (form.latitude && form.longitude && validators.latitude.value && validators.longitude.value) {
          await validateLocationAndTimezone(Number(form.latitude), Number(form.longitude))
        }
        coordinatesLoading.value = false
        disableInput.value = false
      }, 1000)
    }
)

const validators = {
  name: computed(() => normalizedName.value.length > 0),
  password: computed(() => form.password.length >= 8),
  passwordAgain: computed(() => form.passwordAgain === form.password),
  azimuth: computed(() => {
    const value = parseNumber(form.azimuth)
    return Number.isFinite(value) && value >= -180 && value <= 180
  }),
  declination: computed(() => {
    const value = parseNumber(form.declination)
    return Number.isFinite(value) && value >= 0 && value <= 90
  }),
  peakPowerKw: computed(() => {
    const value = parseNumber(form.peakPowerKw)
    return Number.isFinite(value) && value > 0
  }),
  latitude: computed(() => {
    const value = parseNumber(form.latitude)
    return Number.isFinite(value) && value >= -90 && value <= 90
  }),
  longitude: computed(() => {
    const value = parseNumber(form.longitude)
    return Number.isFinite(value) && value >= -180 && value <= 180
  }),
  timezone: computed(() => supportedTimezones.includes(normalizedTimezone.value)),
}

const formIsValid = computed(() => Object.values(validators).every((validator) => validator.value))

const errors = computed<Record<keyof typeof form, string>>(() => ({
  name: !validators.name.value ? 'Name is required and cannot be only whitespace.' : '',
  password: !validators.password.value ? 'Password is required and must be at least 8 characters long.' : '',
  passwordAgain: !validators.passwordAgain.value ? 'Passwords must match.' : '',
  azimuth: !validators.azimuth.value ? 'Azimuth must be between -180.0 and 180.0.' : '',
  declination: !validators.declination.value ? 'Declination must be between 0.0 and 90.0.' : '',
  peakPowerKw: !validators.peakPowerKw.value ? 'Peak power must be greater than 0.0.' : '',
  latitude: !validators.latitude.value ? 'Latitude must be between -90.0 and 90.0.' : '',
  longitude: !validators.longitude.value ? 'Longitude must be between -180.0 and 180.0.' : '',
  timezone: !validators.timezone.value ? 'Choose a valid IANA timezone.' : '',
}))

const handleTimezoneInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  touched.timezone = true
  form.timezone = value
  timeZoneQuery.value = value
}

const handleSubmit = () => {

  disableInput.value = true
  submitLoading.value = true
  console.log(submitLoading.value)

  if (!formIsValid.value) {
    disableInput.value = false
    submitLoading.value = false
    return
  }

  emit('submit', {
    name: normalizedName.value,
    password: form.password,
    azimuth: Number(form.azimuth),
    declination: Number(form.declination),
    peakPowerKw: Number(form.peakPowerKw),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    timezone: normalizedTimezone.value
  })
}

const precalculatedCoordinates = computed(() => props.initialData?.latitude != undefined || props.initialData?.longitude != undefined)

</script>

<template>
  <UForm class="w-full max-w-4xl space-y-6" :state="form" @submit.prevent="handleSubmit">
    <UCard class="w-full max-w-3xl">
      <template #header>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">Sign in details</h2>
          <p class="text-sm text-toned">Choose a site name and password that will be used for login.</p>
        </div>
      </template>

      <div class="grid gap-4">
        <UFormField label="Name" name="name" required :error="fieldError('name')">
          <UInput
            v-model="form.name"
            type="text"
            name="name"
            autocomplete="organization"
            placeholder="Enter site name"
            icon="i-lucide-solar-panel"
            size="xl"
            class="w-full"
            :disabled="disableInput || disableNameInput"
            @update:model-value="touched.name = true"
          >
            <template #trailing>
              <div class="flex items-center gap-1.5 relative z-60" @click.prevent>
                <UPopover mode="click" :popper="{ placement: 'top-start', strategy: 'fixed'}">
                  <template #default>
                    <UIcon
                        name="i-lucide-info"
                        class="w-4 h-4 text-toned hover:text-primary cursor-help"
                    />
                  </template>
                  <template #content>
                    <div class="mt-2 flex flex-col items-center max-w-[60vw]">
                      <span class="italic">This will be the unique identifier used to log in to your site,
                      it will not be possible to change it later</span>
                    </div>
                  </template>
                </UPopover>
              </div>
            </template>
          </UInput>
          <div v-if="!isNameValid" class="flex items-center">
            <span class="text-red-500 text-s font-light mt-3">This name is already occupied, please pick a different one.</span>
          </div>
        </UFormField>

        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Password" name="password" required :error="fieldError('password')">
            <UInput
              v-model="form.password"
              type="password"
              name="password"
              autocomplete="new-password"
              placeholder="Enter password"
              icon="i-lucide-key-round"
              size="xl"
              class="w-full"
              :disabled="disableInput"
              @update:model-value="touched.password = true"
            />
          </UFormField>

          <UFormField
            label="Password again"
            name="passwordAgain"
            required
            :error="fieldError('passwordAgain')"
          >
            <UInput
              v-model="form.passwordAgain"
              type="password"
              name="passwordAgain"
              autocomplete="new-password"
              placeholder="Repeat password"
              icon="i-lucide-shield-check"
              size="xl"
              class="w-full"
              :disabled="disableInput"
              @update:model-value="touched.passwordAgain = true"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

    <UCard class="w-full max-w-3xl">
      <template #header>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">Site configuration</h2>
          <p class="text-sm text-toned">Set panel orientation and maximum possible power of your photovoltaic  system (in kilowatts). This information will be used when evaluating generation forecasts.</p>
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-3">
        <UFormField label="Azimuth (degrees, S = 0°)" name="azimuth" required :error="fieldError('azimuth')">
          <UInput
            v-model="form.azimuth"
            type="text"
            inputmode="decimal"
            name="azimuth"
            placeholder="-180.0 to 180.0"
            icon="i-lucide-compass"
            size="xl"
            class="w-full"
            :disabled="disableInput"
            @update:model-value="touched.azimuth = true"
          >
          <template #trailing>
            <div class="flex items-center gap-1.5 relative z-60" @click.prevent>
              <UPopover mode="click" :popper="{ placement: 'top-start', strategy: 'fixed'}">
                <template #default>
                  <UIcon
                      name="i-lucide-info"
                      class="w-4 h-4 text-toned hover:text-primary cursor-help"
                  />
                </template>
                <template #content>
                  <div class="mt-2 flex flex-col items-center max-w-[60vw]">
                    <span class="italic">Enter the cardinal direction of your panels in space according to this diagram:</span>
                    <img
                        src="/public/windrose.png"
                        alt="Azimuth Diagram"
                        class="w-1/2 h-auto object-contain p-1 bg-white"
                    >
                    <p class="text-toned mt-1">South: 0°, West: 90°, North: 180° (and -180°), East: -90°</p>
                    <NuxtLink to="https://doc.forecast.solar/lib/exe/detail.php?id=api%3Aestimate&media=api:windrose.png" target="_blank" class="text-secondary hover:underline">
                      Image source: forecast.solar
                    </NuxtLink>
                  </div>
                </template>
              </UPopover>
            </div>
          </template>
          </UInput>
        </UFormField>

        <UFormField label="Declination (degrees)" name="declination" required :error="fieldError('declination')">
          <UInput
            v-model="form.declination"
            type="text"
            name="declination"
            inputmode="decimal"
            placeholder="0.0 to 90.0"
            icon="i-lucide-triangle-right"
            size="xl"
            class="w-full"
            :disabled="disableInput"
            @update:model-value="touched.declination = true"
          >
            <template #trailing>
              <div class="flex items-center gap-1.5 relative z-60" @click.prevent>
                <UPopover mode="click" :popper="{ placement: 'top-start', strategy: 'fixed'}">
                  <template #default>
                    <UIcon
                        name="i-lucide-info"
                        class="w-4 h-4 text-toned hover:text-primary cursor-help"
                    />
                  </template>
                  <template #content>
                    <div class="mt-2 flex flex-col items-center max-w-[60vw]">
                      <span class="italic">Enter the angle between the earth's surface and the panels
                        (0° means they are laying horizontally on the ground).</span>
                    </div>
                  </template>
                </UPopover>
              </div>
            </template>
          </UInput>
        </UFormField>

        <UFormField label=" kW peak power (in kilowatts)" name="peakPowerKw" required :error="fieldError('peakPowerKw')">
          <UInput
            v-model="form.peakPowerKw"
            type="text"
            name="peakPowerKw"
            inputmode="decimal"
            placeholder="Greater than 0.0"
            icon="i-lucide-zap"
            size="xl"
            class="w-full"
            :disabled="disableInput"
            @update:model-value="touched.peakPowerKw = true"
          >
            <template #trailing>
              <div class="flex items-center gap-1.5 relative z-60" @click.prevent>
                <UPopover mode="click" :popper="{ placement: 'top-start', strategy: 'fixed'}">
                  <template #default>
                    <UIcon
                        name="i-lucide-info"
                        class="w-4 h-4 text-toned hover:text-primary cursor-help"
                    />
                  </template>
                  <template #content>
                    <div class="mt-2 flex flex-col items-center max-w-[60vw]">
                      <span class="italic">Enter the maximum power of your photovoltaic system in kilowatts.</span>
                    </div>
                  </template>
                </UPopover>
              </div>
            </template>
          </UInput>
        </UFormField>
      </div>
    </UCard>

    <UCard class="w-full max-w-3xl">
      <template #header>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">Site location</h2>
          <p class="text-sm text-toned">Provide coordinates where your photovoltaic system is located and a valid IANA timezone.
            The timezone will be prefilled if the provided coordinates are valid and forecasts are available for them.</p>
          <p v-if="precalculatedCoordinates" class=" italic text-sm text-toned">Fine tune the coordinates to your exact site location to get more accurate forecasts.</p>
        </div>
        <div v-if="!isConfigValid" class="flex items-center">
          <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-[1em] h-[1em] text-amber-600"
          />
          <span class="text-amber-600 italic mr-5">{{configNotValidMessage}}</span>
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Latitude" name="latitude" required :error="fieldError('latitude')">
          <UInput
            v-model="form.latitude"
            type="text"
            name="latitude"
            inputmode="decimal"
            placeholder="-90.0 to 90.0"
            icon="i-lucide-map"
            size="xl"
            class="w-full"
            :disabled="disableInput"
            @update:model-value="touched.latitude = true"
          />
        </UFormField>

        <UFormField label="Longitude" name="longitude" required :error="fieldError('longitude')">
          <UInput
            v-model="form.longitude"
            type="text"
            name="longitude"
            min="-180"
            max="180"
            step="0.1"
            inputmode="decimal"
            placeholder="-180.0 to 180.0"
            icon="i-lucide-map-pinned"
            size="xl"
            class="w-full"
            :disabled="disableInput"
            @update:model-value="touched.longitude = true"
          />
        </UFormField>

        <UFormField class="md:col-span-2" label="Timezone" name="timezone" required :error="fieldError('timezone')">
          <UInput
            :model-value="form.timezone"
            type="text"
            name="timezone"
            :list="timezoneListId"
            autocomplete="off"
            placeholder="Start typing a timezone"
            icon="i-lucide-globe"
            size="xl"
            class="w-full"
            :disabled="disableInput || disableTimezone"
            :loading="coordinatesLoading"
            @input="handleTimezoneInput"
          />
          <datalist :id="timezoneListId">
            <option
              v-for="timezone in filteredTimezones"
              :key="timezone"
              :value="timezone"
            />
          </datalist>
        </UFormField>
      </div>
    </UCard>

    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="order-2 sm:order-1">
      <slot name="backButton" />
      </div>
      <div class="order-1 sm:order-2">
      <UButton
        type="submit"
        size="xl"
        label="Create site"
        trailing-icon="i-lucide-arrow-right"
        :disabled="!formIsValid || disableInput || !isNameValid"
        :loading="submitLoading"
      />
      </div>
    </div>
  </UForm>
</template>
