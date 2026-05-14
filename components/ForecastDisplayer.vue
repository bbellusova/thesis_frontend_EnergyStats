<script setup lang="ts">


import type {GetSiteResponse} from "~/composables/types/siteTypes";
import {useForecastAPI} from "~/composables/api/forecastAPI";
import type { ProductionForecastDataResp, WeatherForecastResp} from "~/composables/types/forecastTypes";
import { format } from 'date-fns'

const { getProductionForecast, getWeatherForecast } = useForecastAPI()

const props = defineProps<{
  siteInfo: GetSiteResponse
}>()

const weatherIcons = import.meta.glob('/node_modules/@meteocons/svg/fill/*.svg', {
  eager: true,
  import: 'default',
  query: '?url'
})

const today = ref(true) //today=true, tomorrow=false
const forecastData = ref<ProductionForecastDataResp | null>(null)
const weatherData = ref<WeatherForecastResp | null>(null)
const loading = ref(true)

const errorFetching = ref(false)
const errorMessage = "Forecasts are unavailable at the moment, try again later"

const updateData = async () => {
  loading.value = true
  try {
    forecastData.value = await getProductionForecast(props.siteInfo.siteId)
    weatherData.value = await getWeatherForecast(props.siteInfo.siteId)
    errorFetching.value = false
  } catch (e) {
    errorFetching.value = true
    console.error("Error fetching forecast", e)
  } finally {
    loading.value = false
    console.log(forecastData?.value?.tomorrowTotal)
  }
}


onMounted(async () => {
  await updateData()
})

const showWeather = computed(() => {
  if (!weatherData.value || errorFetching.value) return null
  return today.value ? weatherData.value.todayWeather : weatherData.value.tomorrowWeather
})

const weatherMap: Record<number, string> = {
  0: 'clear-day',
  1: 'mostly-clear-day',
  2: 'partly-cloudy-day',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'overcast-drizzle',
  55: 'extreme-drizzle',
  56: 'drizzle',
  57: 'drizzle',
  61: 'rain',
  63: 'overcast-rain',
  65: 'extreme-rain',
  66: 'sleet',
  67: 'overcast-sleet',
  71: 'snow',
  73: 'overcast-snow',
  75: 'extreme-snow',
  77: 'hail',
  80: 'rain',
  81: 'overcast-rain',
  82: 'extreme-rain',
  85: 'snow',
  86: 'extreme-snow',
  95: 'thunderstorms',
  96: 'thunderstorms-hail',
  99: 'thunderstorms-hail'
};

const getWeatherIcon = (code: number): string => {
  const path = `/node_modules/@meteocons/svg/fill/${weatherMap[code]}.svg`
  return weatherIcons[path] as string
};

const getWeatherIconText = (code: number): string => {
  return weatherMap[code] || 'not-available';
};

const toHours = (seconds: number) => (seconds / 3600).toFixed(1);


const chartSeries = computed(() => {
  if (!forecastData.value) return []
  const productionData = today.value ? forecastData.value.todayData : forecastData.value.tomorrowData
  const hourlyWeatherData = today.value ? weatherData?.value?.todayHourly : weatherData?.value?.tomorrowHourly

  return [{
    name: 'Expected production (kWh)',
    data: Object.entries(productionData).map(([time, val]) => {
      const date = new Date(time)
      const timestamp = date.getTime()
      const hour = date.getHours()

      const weather = hourlyWeatherData?.[hour]

      return {
        x: timestamp,
        y: Number(val.toFixed(2)),
        cloudiness: weather?.cloudiness ?? "n/a",
        irradiance: weather?.irradiance ?? "n/a",
        weatherCode: weather?.weatherCode ?? -1,
        humidity: weather?.humidity ?? "n/a"
      }
    }).sort((a, b) => a.x - b.x)
  }]
})

interface CustomDataPoint {
  x: number;
  y: number;
  weatherCode: number;
  cloudiness: number;
  irradiance: number;
  humidity: number;
}

interface TooltipArgs {
  _: unknown[];
  seriesIndex: number;
  dataPointIndex: number;
  w: {
    config: {
      series: Array<{
        data: CustomDataPoint[];
      }>;
    };
  };
}

const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    stacked: false,
    toolbar: {
      show: true,
      tools:{
        zoom: false
      },
      export: {
        png: {
          filename: `energy-stats-${(showWeather.value) ? format(showWeather.value.date, 'yyyy-MM-dd') : ''}`
        },
        svg: {
          filename: `energy-stats-${(showWeather.value) ? format(showWeather.value.date, 'yyyy-MM-dd') : ''}`
        },
        csv: {
          filename: `energy-stats-${(showWeather.value) ? format(showWeather.value.date, 'yyyy-MM-dd') : ''}`
        }
      }
    },
    zoom: {
      enabled: true,
      allowMouseWheelZoom: false
    },
    events: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeZoom: (chartContext: any, zoomInfo: any) => {
        const xaxis = zoomInfo?.xaxis;
        if (!xaxis) return;

        const minDistance = 3600000*2;
        const zoomDistance = xaxis.max - xaxis.min;

        if (zoomDistance < minDistance) {
          return {
            xaxis: {
              min: chartContext.opts.xaxis.min,
              max: chartContext.opts.xaxis.max
            }
          }
        }
        return { xaxis }
      }
    }
  },
  xaxis: {
    type: 'datetime',
    labels: {
      datetimeUTC: false
    }
  },
  yaxis: {
    title: { text: 'Production (kWh)' }
  },
  dataLabels: { enabled: false },
  colors: ['#3b82f6', '#94a3b8'],
  tooltip: {
    intersect: false,
    custom: ({ _, seriesIndex, dataPointIndex, w }: TooltipArgs) => {
      const point = w.config.series[seriesIndex]?.data[dataPointIndex]
      if (!point) return '';
      const iconUrl = getWeatherIcon(point.weatherCode)
      const altText = getWeatherIconText(point.weatherCode).replaceAll('-', ' ')

      return `
        <div class="bg-white border border-gray-100 text-xs rounded-lg">
          <div class="mb-0 bg-gray-100 px-1 py-1 border-b border-gray-300 text-xs text-left">${format(point.x, 'dd.MM.yyyy HH:00')}</div>
          <div class="m-1">Expected generation: <span class="font-bold">${point.y} kWh</span></div>
          <div class="grid grid-cols-[1fr_auto]">
          <div class="flex flex-col justify-center">
          <div class="m-1 text-slate-500">Cloudiness: <span class="font-bold">${point.cloudiness}%</span></div>
          <div class="m-1 text-orange-400">Global tilted irradiance: <span class="font-bold">${point.irradiance} W/m²</span></div>
          <div class="m-1 text-blue-400">Humidity: <span class="font-bold">${point.humidity}%</span></div>
          </div>
          <div class="flex-shrink-0 flex items-center">
            <img
              src="${iconUrl}"
              alt="${altText}"
              class="w-12 h-12 object-contain"
            />
          </div>
          </div>
        </div>
      `
    }
  }
}))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-row space-y-1 justify-between">
        <h2 class="text-lg font-semibold text-highlighted flex items-center"><UIcon name="i-lucide-trending-up-down" class="mr-2"/> Energy generation Forecast</h2>
        <UButton
            color="neutral"
            variant="ghost"
            title="Refresh forecast data"
            @click="updateData"
        >
          <UIcon v-if="loading" name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 text-gray-400" />
          <UIcon v-else name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-400" />
        </UButton>
      </div>
    </template>

    <div class="flex items-center justify-between">
    <UFieldGroup class="flex items-center ">
      <UButton
          color='secondary'
          :variant="today ? 'solid' : 'subtle'"
          label="Today"
          @click="today = true"
      />

      <UButton
          color='secondary'
          :variant="!today ? 'solid' : 'subtle'"
          label="Tomorrow"
          @click="today = false"
      />
    </UFieldGroup>
      <h4 v-if="!errorFetching && showWeather" class="ml-5"> Forecast for {{ format(showWeather.date, 'EEEE, MMM dd yyyy') }}</h4>
      <h4 v-if="errorFetching && !loading" class="ml-5">{{errorMessage}}</h4>
    </div>

    <div class="w-full my-5 text-center">
      <span v-if="!errorFetching && forecastData != null && today">Expected total: <span class="font-bold">{{forecastData.todayTotal.toFixed(2)}} kWh</span></span>
      <span v-if="!errorFetching && forecastData != null && !today">Expected total: <span class="font-bold">{{forecastData.tomorrowTotal.toFixed(2)}} kWh</span></span>
    </div>

    <div class="h-70 w-full">
      <ClientOnly>
        <apexchart
            v-if="!loading && !errorFetching && chartSeries.length > 0"
            type="bar"
            height="100%"
            width="100%"
            :options="chartOptions"
            :series="chartSeries"
        />
        <div v-else-if="loading" class="h-full flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 text-gray-400" />
        </div>
      </ClientOnly>
    </div>
    <div v-if="showWeather && !errorFetching" class="w-full flex items-end justify-between">
      <div class="flex-1 space-y-1">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-sunrise" class="w-4 h-4" />
          <span>
            Sunrise: <span class="font-bold">{{ format(new Date(showWeather.sunrise), 'HH:mm') }}</span>
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-sunset" class="w-4 h-4" />
          <span>
            Sunset: <span class="font-bold">{{ format(new Date(showWeather.sunset), 'HH:mm') }}</span>
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-thermometer" class="w-5 h-5" />
          <span>
            Temperatures: <span class="font-bold">low {{showWeather.temperatureMin}}{{showWeather.temperatureUnit}}, high {{showWeather.temperatureMax}}{{showWeather.temperatureUnit}}</span>
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-clock" class="w-4 h-4" />
          <span>
            Daylight hours: <span class="font-bold">{{ toHours(showWeather.daylightDuration) }}</span>
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-solar-panel" class="w-4 h-4" />
          <span>
            Sunshine hours: <span class="font-bold">{{ toHours(showWeather.sunshineDuration) }}</span>
          </span>
        </div>
      </div>

      <div class="shrink-0 flex items-center">
        <img
            :src="getWeatherIcon(showWeather.weatherCode)"
            :alt="getWeatherIconText(showWeather.weatherCode).replaceAll('-', ' ')"
            class="w-40 h-40 object-contain mr-10"
        >
      </div>
    </div>

  </UCard>
</template>