import {useAuthAPI} from '~/composables/api/authAPI'

const {loginToSite} = useAuthAPI()

export async function loginAndRedirect (payload: { siteName: string; password: string }, redirect: boolean = true) {
    console.log('Sign in requested', payload)
    await loginToSite(payload.siteName, payload.password)
    if (redirect) navigateTo(`/site/dashboard`)
}