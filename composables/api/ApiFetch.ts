import axios from "axios";
import {ApiError, type ErrorShape} from "~/composables/types/errors";
axios.defaults.withCredentials = true


export const apiFetch = async <T>(url: string, options?: Parameters<typeof $fetch<T>>[1]):Promise<T> => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? config.apiBaseUrl
        : config.public.apiBase;
    const headers = useRequestHeaders(['cookie']);
    const fetch = $fetch.create({
        credentials: 'include',
        baseURL: baseURL,
        headers: {
            ...headers
        },
        onRequest({ options }) {
            const xsrfToken = useCookie('XSRF-TOKEN').value

            if (xsrfToken) {
                options.headers = options.headers || new Headers();
                options.headers.set('X-XSRF-TOKEN', xsrfToken)
            }
        },
        onResponseError({ response }) {
            if (response.status === 401 || response.status === 403) {
                navigateTo('/')
                return
            }
        }
    })
    try {
        return await fetch<T>(url, options)
    } catch (error) {
        return throwError(error)
    }
}

export const fileImportApiFetch = async (endpointUrl: string, file: File) => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? config.apiBaseUrl
        : config.public.apiBase;
    const url = `${baseURL}/${endpointUrl}`
    const xsrfToken = useCookie('XSRF-TOKEN').value;
    const formData = new FormData()
    formData.append('file', file)
    try {
        await axios.post(url, formData, {
            withCredentials: true,
                headers: {
                'X-XSRF-TOKEN': xsrfToken || '',
                'Content-Type': 'multipart/form-data'
            }
        })
    } catch (error) {
        const status = (error as ErrorShape)?.response?.status
        if (status === 401 || status === 403) {
            return navigateTo('/')
        } else {
            throwError(error)
        }
    }
}

const throwError = (err: unknown): never => {
    const e = err as Error;
    if ((e?.cause instanceof DOMException && e.cause.name === 'AbortError') ||
        e.name === 'AbortError'
    ) {
        console.log("err handled")
        throw e.cause;
    }
    if (axios.isCancel(err)) {
        throw err;
    }

    const error = err as ErrorShape;
    const status = error.status
        ?? error.statusCode
        ?? error.response?.status
        ?? 500;

    console.log(err)
    let message = 'An error occurred';
    if (status == 500){
        throw new ApiError(message, status);
    }
    if (status == 403){
        throw new ApiError('Unauthorized', status);
    }

    const responseData = error.response?.data ?? error.data;
    if (typeof responseData === 'string' && responseData.length > 0) {
        message = responseData;
    } else if (typeof responseData === 'object' && responseData?.message) {
        message = responseData.message;
    } else if (error.message) {
        message = error.message;
    }
    throw new ApiError(message, status);
};