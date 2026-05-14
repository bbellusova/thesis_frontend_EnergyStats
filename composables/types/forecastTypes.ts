

export interface ProductionForecastDataResp {
    todayData: Record<string, number>;
    todayTotal: number;
    tomorrowData: Record<string, number>;
    tomorrowTotal: number;
}

export interface WeatherForecastResp {
    todayWeather: DailyWeatherResp;
    todayHourly: Record<number, HourlyWeatherResp>;
    tomorrowWeather: DailyWeatherResp;
    tomorrowHourly: Record<number, HourlyWeatherResp>;
}

export interface DailyWeatherResp {
    date: string;
    temperatureUnit: string;
    temperatureMin: number;
    temperatureMax: number;
    sunrise: string;
    sunset: string;
    weatherCode: number;
    sunshineDuration: number;
    daylightDuration: number;
}

export interface HourlyWeatherResp {
    cloudiness: number;
    irradiance: number;
    weatherCode: number;
    humidity: number;
}