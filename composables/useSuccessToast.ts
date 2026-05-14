

export const useSuccessToast = () => {
    const toast = useToast()

    const showSuccess = (message: string) => {

        toast.add({
            title: 'Success',
            description: message,
            color: 'success',
        })
    }

    return { showSuccess }
}