<script setup lang="ts">

import {useDataAccessApi} from "~/composables/api/dataAccessAPI";
import {useEnergyDataAPI} from "~/composables/api/energyDataAPI";

import {
  categoryColors, categoryName,
  DATA_CATEGORIES,
  type DataAccessType,
  type DataCategory,
  DataCategoryInfo
} from "~/composables/types/constantTypes";
import type {
  DailyStatisticsResponse,
  EnergyDataResponse,
  MonthlyStatisticsResponse,
  YearlyStatisticsResponse
} from "~/composables/types/energyDataTypes";

import { format } from 'date-fns'
import {useErrorToast} from "~/composables/useErrorToast";
import {ApiError} from "~/composables/types/errors";

const { getAvailableCategoriesForSite, getDataAccessForSiteAndCategory } = useDataAccessApi()
const {
  getAvailableYears,
  getAvailableMonthsForYear,
  getAvailableDaysForMonthInYear,
  getDataForMonthByDays,
  getDataForDayByHours,
  getStatisticsForMonth,
  getStatisticsForDay
} = useEnergyDataAPI()

const {showError} = useErrorToast()


const props = defineProps<{
  siteId: number
  refreshKey: number
}>()

watch(() => props.refreshKey, () => {
  console.log("Refreshing chart data...")
  refreshAvailableDatesAndData()
})


const selection = ref({
  categories: [] as DataCategory[],
  year: undefined as number | undefined,
  month: undefined as number | undefined,
  day: undefined as number | undefined
})

const availableCategories = ref<DataCategory[]>([])
const dataCategoryAccessType = ref<Map<DataCategory, DataAccessType>>(new Map())

onMounted(async () => {
  const categories = await getAvailableCategoriesForSite(props.siteId)
  availableCategories.value = categories

  const results = await Promise.all(
      categories.map(async (cat) => {
        const access = await getDataAccessForSiteAndCategory(props.siteId, cat)
        return { cat, type: access.dataAccessType }
      })
  )

  const categoryToAccessType = new Map()
  results.forEach(res => categoryToAccessType.set(res.cat, res.type))
  dataCategoryAccessType.value = categoryToAccessType
})

const categoryFetchControllers = new Map<DataCategory, AbortController>()
const availableYearsController = ref<AbortController>()
const availableMonthsController = ref<AbortController>()
const availableDaysController = ref<AbortController>()


const cancelRequestForCategory = (cat: DataCategory) => {
  const controller = categoryFetchControllers.get(cat)
  if (controller) {
    controller.abort()
    categoryFetchControllers.delete(cat)
  }
}

const loadingCharts = ref(false)
const disableSelection = ref(false)

const availableYears = ref<number[]>([])
const availableYearsLoading = ref(false)
const availableMonths = ref<number[]>([])
const availableMonthsLoading = ref(false)
const availableDays = ref<number[]>([])
const availableDaysLoading = ref(false)


const monthItems = computed(() =>
    availableMonths.value.map((month) => ({
      label: format(new Date(2026, month - 1, 1), 'MMMM'),
      value: month,
    }))
)

const refreshAvailableDatesAndData = async () => {
  disableSelection.value = true
  const categories = selection.value.categories
  const year = selection.value.year
  const month = selection.value.month
  const day = selection.value.day
  if (categories.length > 0) {
    await fetchAvailableYears(categories)
    if (year) {
      await fetchAvailableMonths(year, categories)
      if (month) {
        await fetchAvailableDays(year, month, categories)
        if (day){
          await fetchData(year, month, day, categories)
        }
      }
    } else {
      selection.value.year = availableYears.value[0]
    }
  }
  disableSelection.value = false
}

const dataFetched = ref(false)
const fetchedData = ref<Partial<Record<DataCategory, EnergyDataResponse>>>({})

const statsDataLoading = ref(
    new Map<DataCategory, boolean>(
        Object.values(DATA_CATEGORIES).map(cat => [cat as DataCategory, false])
    )
)
const fetchedYearlyStatistics = ref<Partial<Record<DataCategory, YearlyStatisticsResponse>>>({})
const fetchedMonthlyStatistics = ref<Partial<Record<DataCategory, MonthlyStatisticsResponse>>>({})
const fetchedDailyStatistics = ref<Partial<Record<DataCategory, DailyStatisticsResponse>>>({})


const setLoading = (category: DataCategory, status: boolean) => {
  statsDataLoading.value.set(category, status)
}

const displayStatisticsForOneDayOnly = computed(() => {
  return selection.value.day !== 0
})

const activeStatistics = computed(() => {
  const active = selection.value.day !== 0
      ? fetchedDailyStatistics.value
      : fetchedMonthlyStatistics.value;

  const filtered: Record<string, DailyStatisticsResponse | MonthlyStatisticsResponse> = {};

  selection.value.categories.forEach(cat => {
    if (active[cat]) {
      filtered[cat] = active[cat];
    }
  });

  return filtered || {};
});

const canKeepSelectedDay = () => {
  return selection.value.day !== undefined && availableDays.value.length > 0 && (availableDays.value.includes(selection.value.day) || selection.value.day == 0)
}

const clearFetchedData = () => {
  dataFetched.value = false
  fetchedData.value = {}
  fetchedYearlyStatistics.value = {}
  fetchedMonthlyStatistics.value = {}
  fetchedDailyStatistics.value = {}
}

const clearFetchedDataForCategories = (categories: DataCategory[]) => {
  categories.forEach((cat) => {
    if (cat in fetchedData.value) {
      fetchedData.value[cat] = undefined
    }
    if (cat in fetchedYearlyStatistics.value) {
      fetchedYearlyStatistics.value[cat] = undefined
    }
    if (cat in fetchedMonthlyStatistics.value) {
      fetchedMonthlyStatistics.value[cat] = undefined
    }
    if (cat in fetchedDailyStatistics.value) {
      fetchedDailyStatistics.value[cat] = undefined
    }
  })
}

const fetchData = async (year: number, month: number, day: number, categories: DataCategory[]) => {
  loadingCharts.value = true
  clearFetchedDataForCategories(categories)
  let toLoadCategories = categories.length
  try {
    const fetchDataForCategories = categories.map(async (cat) => {
      if (categoryFetchControllers.has(cat)) {
        console.log(`Aborting stale request for ${cat}.`)
        cancelRequestForCategory(cat)
      }

      const controller = new AbortController()
      categoryFetchControllers.set(cat, controller)

      if (day == 0) {
        fetchedData.value![cat] = await getDataForMonthByDays(
            props.siteId,
            cat,
            year,
            month,
            controller.signal
        )
        toLoadCategories -= 1
        loadingCharts.value = (toLoadCategories > 0)
        setLoading(cat, true)
        fetchedMonthlyStatistics.value![cat] = await getStatisticsForMonth(
            props.siteId,
            cat,
            year,
            month,
            controller.signal)
        setLoading(cat, false)

      } else {
        fetchedData.value![cat] = await getDataForDayByHours(
            props.siteId,
            cat,
            year,
            month,
            day,
            controller.signal
        )
        toLoadCategories -= 1
        loadingCharts.value = (toLoadCategories > 0)
        setLoading(cat, true)
        fetchedDailyStatistics.value![cat] = await getStatisticsForDay(
            props.siteId,
            cat,
            year,
            month,
            day,
            controller.signal)
        setLoading(cat, false)

      }
      dataFetched.value = true
    })

    await Promise.all(fetchDataForCategories)
  } catch (error) {
    if (error instanceof ApiError){
      console.error("ERROR Failed to fetch chart data", error)
      showError(error, false)
    }
  } finally {
    loadingCharts.value = false
  }
}

const fetchAvailableYears = async (categories: DataCategory[]) => {
  if (categories.length > 0) {
    try {
      availableYearsLoading.value = true
      if (availableYearsController.value) {
        availableYearsController.value.abort()
      }
      availableYearsController.value = new AbortController()
      availableYears.value = await getAvailableYears(props.siteId, categories, "DESC", availableYearsController.value.signal)
    } catch (error) {
      if (error instanceof ApiError) {
        console.log("ERROR av years", error)
        showError(error, false)
      }
    } finally {
      availableYearsLoading.value = false
    }
  }
}

const fetchAvailableMonths = async(year: number, categories: DataCategory[]) => {
  if (categories.length > 0) {
    try {
      availableMonthsLoading.value = true
      if (availableMonthsController.value) {
        availableMonthsController.value.abort()
      }
      availableMonthsController.value = new AbortController()
      availableMonths.value = await getAvailableMonthsForYear(props.siteId, year, categories, "ASC", availableMonthsController.value.signal)
    } catch (error) {
      if (error instanceof ApiError) {
        console.log("ERROR av months", error)
        showError(error, false)
      }
    } finally {
      availableMonthsLoading.value = false
    }
  }
}

const fetchAvailableDays = async(year: number, month:number, categories: DataCategory[]) => {
  if (categories.length > 0) {
    try {
      availableDaysLoading.value = true
      if (availableDaysController.value) {
        availableDaysController.value.abort()
      }
      availableDaysController.value = new AbortController()
      availableDays.value = await getAvailableDaysForMonthInYear(props.siteId, year, month, categories, "ASC", availableDaysController.value.signal)
    } catch (error) {
      if (error instanceof ApiError) {
        console.log("ERROR av days", error)
        showError(error, false)
      }
    } finally {
      availableDaysLoading.value = false
    }
  }
}


watch(() => selection.value.categories, async (newCategories, oldCategories) => {
  if (newCategories.length == 0) {
    clearFetchedData()
    selection.value.year = undefined
    selection.value.month = undefined
    selection.value.day = undefined
    return
  }
  await fetchAvailableYears(newCategories)
  if (availableYears.value.length > 0){
    if (selection.value.year == undefined || !availableYears.value.includes(selection.value.year)){
      clearFetchedData()
      selection.value.year = availableYears.value[0]
    } else { //the year is set right, but it also needs to be checked if month and day corresponds
      const added = newCategories.filter(cat => !oldCategories.includes(cat));
      const removed = oldCategories.filter(cat => !newCategories.includes(cat));
      clearFetchedDataForCategories(removed)
      if (selection.value.month && (selection.value.day !== undefined)) {
        await fetchAvailableMonths(selection.value.year, selection.value.categories)
        await fetchAvailableDays(selection.value.year, selection.value.month, selection.value.categories)
        if (availableMonths.value.includes(selection.value.month) && canKeepSelectedDay()) { //the date is set right but data needs update
          await fetchData(selection.value.year, selection.value.month, selection.value.day, added)
        } else if (!canKeepSelectedDay()) { //can keep only the month
          selection.value.day = availableDays.value.at(-1)
        } else {
          if (availableMonths.value.length > 0){
            selection.value.day = undefined
            selection.value.month = availableMonths.value.at(-1)
          } else {
            clearFetchedData()
            selection.value.month = undefined
            selection.value.day = undefined
          }
        }
      }
    }
  } else {
    clearFetchedData()
    selection.value.year = undefined
    selection.value.month = undefined
    selection.value.day = undefined
  }
})

watch(() => selection.value.year, async (newYear) => {
  if (newYear == undefined){
    availableMonths.value = []
    availableDays.value = []
    return
  }
  const selectedMonth = selection.value.month
  const selectedDay = selection.value.day
  await fetchAvailableMonths(newYear, selection.value.categories)
  if (availableMonths.value.length > 0){
    if (selectedMonth == undefined || !availableMonths.value.includes(selectedMonth)){
      clearFetchedData()
      selection.value.month = availableMonths.value.at(-1)
    } else { //the month is set right, but it needs to be checked if day is also valid
      await fetchAvailableDays(newYear, selectedMonth, selection.value.categories)
      if (selectedDay != undefined && canKeepSelectedDay()) { //the date is set right but data needs update
        await fetchData(newYear, selection.value.month!, selection.value.day!, selection.value.categories)
      } else {
        clearFetchedData()
        selection.value.day = undefined
      }
    }
  } else {
    clearFetchedData()
    selection.value.month = undefined
    selection.value.day = undefined
  }
})

watch(() => selection.value.month, async (newMonth) => {
  if (selection.value.year == undefined || newMonth == undefined){
    availableDays.value = []
    return
  }
  await fetchAvailableDays(selection.value.year, newMonth, selection.value.categories)
  if (availableDays.value.length > 0){
    if (selection.value.day == undefined || !canKeepSelectedDay()){
      clearFetchedData()
      selection.value.day = availableDays.value.at(-1)
    } else { //the day is set right but data needs update
      await fetchData(selection.value.year, selection.value.month!, selection.value.day!, selection.value.categories)
    }
  } else {
    clearFetchedData()
    selection.value.day = undefined
  }
})

watch(() => selection.value.day, async (newDay) => {
  if (selection.value.year == undefined || selection.value.month == undefined || newDay == undefined){
    return
  }
  await fetchData(selection.value.year, selection.value.month, newDay, selection.value.categories)
})

const chartHeading = computed(() => {
  const { year, month, day } = selection.value

  if (year == undefined || month == undefined || day == undefined ) return 'Select categories and a date above'

  if (day !== 0) {
    return format(new Date(year, month - 1, day), 'EEEE, MMM dd yyyy')
  }
  return format(new Date(year, month - 1), 'MMMM yyyy')
})


const isSharedTooltipPossible = computed(() => {
  let isShareable = true
  Object.entries(fetchedData.value)
      .filter(([_, response]) => !!response)
      .forEach(([_, response]) => {
        if (isShareable){
          isShareable = response.allDataPresent
        }
      })
  return isShareable
})


const chartOptions = computed(() => {
  const allTimestamps = chartSeries.value.flatMap(s => s.data.map(d => d.x))
  const minTime = allTimestamps.length ? Math.min(...allTimestamps) : undefined
  const maxTime = allTimestamps.length ? Math.max(...allTimestamps) : undefined
  const isShareable = isSharedTooltipPossible.value

  return {
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
            filename: `energy-stats-${selection.value.year}-${selection.value.month}-${(selection.value.day && selection.value.day > 0) ? selection.value.day : 'all'}`
          },
          svg: {
            filename: `energy-stats-${selection.value.year}-${selection.value.month}-${(selection.value.day && selection.value.day > 0) ? selection.value.day : 'all'}`
          },
          csv: {
            filename: `energy-stats-${selection.value.year}-${selection.value.month}-${(selection.value.day && selection.value.day > 0) ? selection.value.day : 'all'}`
          }
        }
      },
      zoom: {
        enabled: true,
        allowMouseWheelZoom: false
      },
      animations: { enabled: true },
      events: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        beforeZoom: (chartContext: any, zoomInfo: any) => {
          const xaxis = zoomInfo?.xaxis;
          if (!xaxis) return;

          const minDistance = selection.value.day === 0 ? 3600000*48 : 3600000*2;
          const initialRange = (maxTime ?? 0) - (minTime ?? 0);
          const zoomDistance = xaxis.max - xaxis.min;

          if (zoomDistance < minDistance || zoomDistance > initialRange) {
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
    dataLabels: {
      enabled: false
    },
    xaxis: {
      type: 'datetime',
      min: minTime,
      max: maxTime,
      labels: {
        datetimeUTC: false,
        format: selection.value.day === 0 ? 'dd MMM' : 'HH:mm'
      },
      tickAmount: selection.value.day === 0 ? undefined : 24,
      crosshairs: {
        show: true,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 2
      }
    },
    yaxis: {
      title: {text: 'Energy (kWh)'}
    },
    tooltip: {
      x: {format: selection.value.day === 0 ? 'dd.MM.yyyy' : 'dd.MM.yyyy HH:mm'},
      shared: isShareable,
      intersect: !isShareable,
      y: {
        formatter: (val: number) => `${val.toFixed(3)} kWh`,
        title: {
          formatter: (seriesName: string) => {
            return DataCategoryInfo[seriesName as DataCategory] || seriesName
          }
        }
      }
    },

    colors: chartSeries.value.map(series => categoryColors[series.name as DataCategory] || '#3b82f6'),
    legend: {
      formatter: (seriesName: string) => DataCategoryInfo[seriesName as DataCategory] || seriesName
    },
    scroller: {
      enabled: true,
      scrollByX: true,
    },
  }
})

const chartSeries = computed(() => {
  return Object.entries(fetchedData.value)
      .filter(([_, response]) => !!response)
      .map(([category, response]) => {
    return {
      name: category,
      data: Object.entries(response?.entries || {}).map(([dateString, value]) => ({
        x: new Date(dateString).getTime(),
        y: Number(value.toFixed(3))
      })).sort((a, b) => a.x - b.x)
    }
  })
})

const handleChartLoaded = () => {
  setTimeout(() => {
    loadingCharts.value = false
  }, 1000)
}


</script>

<template>

  <UCard class="w-full max-w-7xl">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted flex items-center"><UIcon name="i-lucide-chart-column" class="mr-2"/> Display charts and statistics</h2>
      </div>
    </template>

    <div class="flex flex-col lg:flex-row lg:justify-between gap-6">
      <div class="flex flex-wrap gap-2">
        <span class="text-sm font-medium text-toned">1. Select one or more data categories:</span>
        <span v-if="availableCategories.length == 0" class="text-sm font-medium text-amber-600 italic">No categories configured for this site</span>

        <UCheckboxGroup
              v-model="selection.categories"
              variant="list"
              :items="availableCategories.sort().map(cat => ({
              value: cat,
              }))"
              class="w-full"
              :ui="{
                container: 'flex flex-row flex-wrap gap-4 items-center w-full',
                wrapper: 'flex-none'
              }"
              :disabled = "disableSelection"
          >
            <template #label="{ item }">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-sun" class="w-5 h-5 shrink-0" :style="{ color: categoryColors[item.value as DataCategory] }"/>
                  <span class="font-bold text-highlighted">{{ DataCategoryInfo[item.value as DataCategory] }}
                  <span class="text-toned italic font-normal"> (access type {{ dataCategoryAccessType.get(item.value as DataCategory) }})</span>
                  </span>
              </div>
            </template>
          </UCheckboxGroup>
        <span v-if="!availableYearsLoading && availableYears.length === 0 && selection.categories.length > 0" class="text-amber-600 italic">
          There are no <span v-if="selection.categories.length > 1">common</span> dates available for the selected categor<span v-if="selection.categories.length == 1">y</span><span v-if="selection.categories.length > 1">ies</span>
        </span>
      </div>
      <div class="border-l border-default sm:ml-6 border"/>
      <div class="w-full flex flex-col gap-1 text-sm lg:max-w-[50%] lg:text-right sm:mt-6 mb-4 lg:items-end">
        <span class="italic text-toned opacity-90">For categories with data access type <span class="font-bold">FILE</span>, data only becomes available after uploading files.</span>
        <span class="italic text-toned opacity-90">For categories with data access type <span class="font-bold">CALCULATED</span>, data only becomes available after all required data is collected. </span>
      </div>
    </div>


    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
      <UFormField label="2. Select year:" name="year" class="w-full">
        <USelectMenu
            v-model="selection.year"
            :items="availableYears"
            placeholder="Select a year"
            :disabled="selection.categories.length == 0 || disableSelection"
            :ui="{ base: 'min-w-[120px] w-full' }"
            :loading="availableYearsLoading"
        />
      </UFormField>

      <UFormField label="3. Select month:" name="month" class="w-full">
      <USelectMenu
          v-model="selection.month"
          value-key="value"
          :items="monthItems"
          placeholder="Select a month"
          :disabled="!selection.year || disableSelection"
          :ui="{ base: 'min-w-[120px] w-full' }"
          :loading="availableMonthsLoading"
      />
      </UFormField>

      <UFormField label="4. Select day:" name="day" class="w-full">
      <USelectMenu
          v-model="selection.day"
          value-key="value"
          :items="[{ label: 'The whole month', value: 0 }, ...availableDays.map((day) => ({
            label: String(day),
            value: day,
          }))]"
          placeholder="Select a day"
          :disabled="!selection.month || disableSelection"
          :ui="{ base: 'min-w-[120px] w-full' }"
          :loading="availableDaysLoading"
      />
      </UFormField>

    </div>
  </UCard>


  <UCard class="mt-4 w-full max-w-7xl">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-highlighted">{{chartHeading}}</h3>
        <div v-if="loadingCharts" class="h-full flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin w-5 h-5 text-gray-400" />
        </div>
      </div>
    </template>

    <div class="h-100 w-full">
      <ClientOnly>
        <apexchart
            v-if="dataFetched && chartSeries.length > 0"
            type="bar"
            height="100%"
            width="100%"
            :options="chartOptions"
            :series="chartSeries || []"
            @mounted="handleChartLoaded"
            @updated="handleChartLoaded"
        />
      </ClientOnly>
    </div>
  </UCard>

  <UCard class="mt-4 w-full max-w-7xl">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base"> <span class="font-semibold text-highlighted">Statistics</span> <span v-if="dataFetched">for {{chartHeading}}</span></h3>
        <div v-if="Object.keys(activeStatistics).length > 0" class="flex items-center gap-1.5 relative z-60" @click.prevent>
          <UPopover mode="click" :popper="{ placement: 'top-start', strategy: 'fixed'}">
            <template #default>
              <UIcon
                  name="i-lucide-circle-question-mark"
                  class="w-4 h-4 text-toned hover:text-primary cursor-help"
              />
            </template>
            <template #content>
              <div class="mt-2 flex flex-col max-w-[60vw] p-4">
                    <span>Statistics hint:</span>
                    <span v-if="Object.values(activeStatistics).some(stats => 'totalValue' in stats)" class="italic">
                      <span class="font-bold">Total</span> = the total produced/consumed energy during the selected period
                    </span>
                    <span v-if="Object.values(activeStatistics).some(stats => 'dailyAverage' in stats)" class="italic">
                      <span class="font-bold">Daily Average</span> = the average produced/consumed energy per day during the selected period
                    </span>

                    <span v-if="Object.values(activeStatistics).some(stats => 'maxDays' in stats)" class="italic">
                      <span class="font-bold">Max Day(s)</span> = the day during which the value was the highest during the selected period, displayed along with the maximum value achieved
                    </span>
                    <span v-if="Object.values(activeStatistics).some(stats => 'maxHours' in stats)" class="italic">
                      <span class="font-bold">Max Hour(s)</span>  = the hour during which the value was the highest period, displayed along with the maximum value achieved
                    </span>
                    <span v-if="Object.values(activeStatistics).some(stats => 'peakHours' in stats)" class="italic">
                      <span class="font-bold">Peak hour(s)</span> = the hour during which the daily maximum was reached the most times during the selected period.<br>
                      Example of how peak hour(s) are evaluated:<br> during 01.01.2025, the max hour was 12:00 (e.g. with 2 kWh)<br>
                               during 02.01.2025, the max hour was 13:00 (e.g. with 3 kWh)<br>
                               during 03.01.3035, the max hour was 12:00 (e.g. with 1kWh)<br>
                               => as 12:00 was the maximum most often, the peak hour is 12:00 for period 01.-02.01.2025
                    </span>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </template>
    <div
v-if="dataFetched && Object.keys(selection.categories).length > 0"
         class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

      <div
v-for="cat in selection.categories.sort()" :key="cat"
           class="p-4 rounded-lg border border-default bg-gray-50/50">

        <div class="flex items-center gap-2 mb-3">
          <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: categoryColors[cat] }"/>
          <span class="font-bold text-sm text-highlighted uppercase">
            {{ categoryName(cat) }}
          </span>

          <div v-if="statsDataLoading.get(cat)">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
          </div>

          <UPopover v-if="fetchedData[cat]" mode="click">
            <UIcon
                v-if="!fetchedData[cat].allDataPresent"
                name="i-heroicons-exclamation-triangle"
                class="w-4 h-4 text-orange-500 animate-pulse cursor-pointer"
            />

            <template #content>
              <div class="p-3 max-w-xs">
                <p class="text-xs font-bold text-orange-500 mb-1 flex items-center gap-1">
                  <UIcon name="i-heroicons-exclamation-triangle" />
                  Not all data available
                </p>
                <p class="text-xs text-toned">
                  {{fetchedData[cat as DataCategory]?.message ?? "not all data is available"}}
                </p>
              </div>
            </template>
          </UPopover>
        </div>

        <div v-if="activeStatistics[cat]" class="grid grid-cols-2 gap-y-4 gap-x-2">
          <div>
            <p class="text-xs text-toned uppercase">Total</p>
            <p class="text-lg font-semibold">{{ activeStatistics[cat].totalValue.toFixed(2) }} <span class="text-xs font-normal">kWh</span></p>
          </div>
          <div v-if="'dailyAverage' in activeStatistics[cat]">
            <p class="text-xs text-toned uppercase">Daily Average</p>
            <p class="text-lg font-semibold">{{ activeStatistics[cat].dailyAverage.toFixed(2) }} <span class="text-xs font-normal">kWh</span></p>
          </div>

          <div class="col-span-2 border-t border-default pt-2 mt-1">
            <div class="flex justify-between items-stretch">

              <div v-if="'peakHours' in activeStatistics[cat]" class="flex-1 border-r border-default pl-4">
                <p class="text-[10px] text-toned uppercase font-bold">Peak Hour(s)</p>
                <p class="text-sm font-medium">
                  {{ activeStatistics[cat].peakHours.hours.map(hour => `${hour}:00`).join(', ')  }}
                </p>
              </div>

              <div v-if="'maxDays' in activeStatistics[cat]" class="flex-1 border-r border-default pl-4">
                <p class="text-[10px] text-toned uppercase font-bold">Max Day(s)</p>
                <p class="text-sm font-medium">
                  {{ activeStatistics[cat].maxDays.days.map((day: string) => format(new Date(day), 'dd.MM.yyyy')).join(', ') }}
                </p>
                <p class="text-xs text-primary font-bold">{{ activeStatistics[cat].maxDays.value.toFixed(2) }} kWh</p>
              </div>

              <div class="flex-1 pl-4">
                <p class="text-[10px] text-toned uppercase font-bold">Max Hour(s)</p>
                <p v-if="displayStatisticsForOneDayOnly" class="text-sm font-medium">
                  {{ activeStatistics[cat].maxHours.hours.map((hour: string) => format(new Date(hour), 'HH:mm')).join(', ') }}
                </p>
                <p v-else class="text-sm font-medium">
                  {{ activeStatistics[cat].maxHours.hours.map((hour: string) => format(new Date(hour), 'HH:mm (dd.MM.)')).join(', ') }}
                </p>
                <p class="text-xs text-primary font-bold">{{ activeStatistics[cat].maxHours.value.toFixed(2) }} kWh</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="dataFetched">
      <SolarEdgeLogo/>
    </div>

  </UCard>

</template>

<style scoped>

</style>