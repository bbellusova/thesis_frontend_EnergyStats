
export interface ErrorShape{
    status?: number;
    statusCode?: number;
    message: string;
    data?: string | { message?: string };
    response?: {
        status?: number;
        data?: string | { message?: string };
    };
}

export class ApiError extends Error {
    status?: number

    constructor(message: string, status?: number) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}