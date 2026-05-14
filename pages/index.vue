<script setup lang="ts">
import LoginScreen from '~/components/LoginScreen.vue'
import {loginAndRedirect} from "~/composables/loginRedirect";
import {useErrorToast} from "~/composables/useErrorToast";
import {useSuccessToast} from "~/composables/useSuccessToast";
import {useSiteFormInitialDataStore} from "~/composables/types/siteTypes";
import {useSiteAccessMethodMapStore} from "~/composables/types/dataAccessTypes";

const { showError } = useErrorToast()
const {showSuccess} = useSuccessToast()

const accessMethodStore = useSiteAccessMethodMapStore()
const siteFormInitialDataStore = useSiteFormInitialDataStore()


onMounted(() => {
  accessMethodStore.clearAccessMethods()
  siteFormInitialDataStore.clearInitialData()
})

const loginLoading = ref(false)

const handleSignIn = async (payload: { siteName: string; password: string }) => {
  loginLoading.value = true
  try {
    await loginAndRedirect(payload)
    showSuccess("Login successful")
  } catch (error) {
    loginLoading.value = false
    showError(error)
  }
}

const handleCreate = () => {
  console.log('Create site requested')
  navigateTo('/sites/search')
}

</script>

<template>
  <LoginScreen
    :login-loading="loginLoading"
    @sign-in="handleSignIn"
    @create="handleCreate"
  />
</template>
