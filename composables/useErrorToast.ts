import {ApiError} from "~/composables/types/errors";

export const useErrorToast = () => {
    const toast = useToast()

    const showError = (error: unknown, showUnauthorized: boolean = true) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403) && !showUnauthorized) return
        const message =
            error instanceof ApiError
                ? error.message
                : 'Unexpected error'

        toast.add({
            title: 'Error',
            description: message,
            color: 'error',
        })
    }

    return { showError }
}