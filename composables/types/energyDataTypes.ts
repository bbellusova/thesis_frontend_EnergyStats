
export type EnergyDataResponse = {
    entries: Record<string, number>; // key is LocalDate or LocalDateTime
    allDataPresent: boolean;
    message: string;
}

export type PeakHourResponse = {
    hours: number[];
}

export type MaxHourResponse = {
    value: number;
    hours: string[];
}

export type MaxDayResponse = {
    value: number;
    days: string[];
}

export type MonthlyStatisticsResponse = {
    totalValue: number;
    dailyAverage: number;
    peakHours: PeakHourResponse;
    maxHours: MaxHourResponse;
    maxDays: MaxDayResponse;
}

export type DailyStatisticsResponse = {
    totalValue: number;
    maxHours: MaxHourResponse;
}

export type YearlyStatisticsResponse = {
    totalValue: number;
    maxHours: MaxHourResponse;
}