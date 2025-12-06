import { UIComponent } from './UIComponent.js';

export class ForecastWidget extends UIComponent {
    constructor(city = 'Москва', apiKey) {
        super(`Прогноз - ${city}`);
        this.city = city;
        this.apiKey = apiKey;
        this.useDemoData = false;
        this.geoCache = {};
        this.REQUEST_TIMEOUT = 5000;
        this.daysToShow = 3; 
    }

    render() {
        const widget = super.render();
        
        // Показываем индикатор загрузки
        this.showLoading(true);
        
        // Загружаем прогноз
        this.loadForecast();
        
        return widget;
    }

    async loadForecast() {
        try {
            //  Проверка API ключа 
            if (!this.apiKey || this.apiKey.trim() === '') {
                throw new Error('API ключ не предоставлен');
            }
            
            if (this.apiKey.length < 20 || this.apiKey.length > 50) {
                console.warn('API ключ имеет нестандартную длину');
            }
            
            // Получаем координаты города
            const coordinates = await this.getCityCoordinates();
            
            if (!coordinates) {
                throw new Error(`Не удалось найти координаты для города: ${this.city}`);
            }
            
            // Получаем прогноз погоды
            const forecastData = await this.fetchForecast(coordinates.lat, coordinates.lon);
            
            this.useDemoData = false; // Успешная загрузка API
            this.displayForecast(forecastData);
            
            console.log(`✅ Прогноз погоды загружен для ${this.city}`);
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки прогноза для ${this.city}:`, error);
            
            console.log('🔄 Используем демо-данные из-за ошибки API');
            this.useDemoData = true;
            this.displayDemoForecast();
        } finally {
            this.showLoading(false);
        }
    }

    async getCityCoordinates() {
        if (this.geoCache[this.city]) {
            return this.geoCache[this.city];
        }
        
        if (!this.apiKey || this.apiKey.trim() === '' || this.useDemoData) {
            throw new Error('API ключ отсутствует или невалиден');
        }

        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(this.city)}&limit=1&appid=${this.apiKey}`;
        
        try {
            const response = await this.fetchWithTimeout(geoUrl);
            
            if (!response.ok) {
                throw new Error(`Ошибка геокодирования: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error(`Город "${this.city}" не найден`);
            }
            
            const coords = {
                lat: data[0].lat,
                lon: data[0].lon,
                cityName: data[0].name
            };
            
            this.geoCache[this.city] = coords;
            return coords;
            
        } catch (error) {
            console.error('Ошибка геокодинга:', error);
            throw error;
        }
    }

    async fetchForecast(lat, lon) {
        // Получаем прогноз на 5 дней с интервалом 3 часа
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=ru&cnt=40`;
        
        const response = await this.fetchWithTimeout(forecastUrl);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Ошибка API прогноза ${response.status}: ${errorData.message || response.statusText}`);
        }
        
        return await response.json();
    }

    displayForecast(forecastData) {
        const cityName = forecastData.city?.name || this.city;
        
        // Группируем прогноз по дням
        const dailyForecast = this.groupForecastByDays(forecastData);
        
        // Берем только нужное количество дней для отображения
        const daysToShow = Math.min(this.daysToShow, dailyForecast.length);
        const forecastDays = dailyForecast.slice(0, daysToShow);
        
        // Определяем сегодняшний день
        const today = new Date();
        const dayNames = ['Сегодня', 'Завтра', 'Послезавтра', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        
        const forecastHtml = forecastDays.map((day, index) => {
            const dayName = index === 0 ? 'Сегодня' : 
                          index === 1 ? 'Завтра' : 
                          index === 2 ? 'Послезавтра' : 
                          this.getDayName(today, index);
            
            const icon = this.getWeatherIcon(day.icon);
            const precipitation = day.precipitation || 0;
            
            return `
                <div style="background: #F8FAFC; border-radius: 10px; padding: 15px; text-align: center;">
                    <div style="font-weight: bold; color: #1E40AF; margin-bottom: 5px;">${dayName}</div>
                    <div style="font-size: 20px; color: #3B82F6; margin: 5px 0;">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div style="font-size: 24px; font-weight: bold; color: #3B82F6; margin: 5px 0;">
                        ${Math.round(day.maxTemp)}° / ${Math.round(day.minTemp)}°
                    </div>
                    <div style="color: #64748B; margin: 5px 0; font-size: 14px;">
                        ${day.description}
                    </div>
                    <div style="display: flex; justify-content: space-around; margin-top: 10px; font-size: 12px; color: #94A3B8;">
                        <div>
                            <i class="fas fa-cloud-rain"></i> ${precipitation}%
                        </div>
                        <div>
                            <i class="fas fa-wind"></i> ${day.windSpeed.toFixed(1)} м/с
                        </div>
                    </div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 5px;">
                        Влажность: ${day.humidity}%
                    </div>
                </div>
            `;
        }).join('');
        
        const hourlyHtml = this.generateHourlyForecast(forecastData);
        
        const html = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-map-marker-alt" style="color: #EF4444;"></i>
                        <h3 style="margin: 0; color: #1E293B;">${cityName} - прогноз на ${daysToShow} дня</h3>
                    </div>
                    <div style="font-size: 12px; color: #64748B; background: #F8FAFC; padding: 4px 8px; border-radius: 4px;">
                        <i class="fas fa-sync-alt"></i> Обновлено: ${new Date().toLocaleTimeString()}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(${daysToShow}, 1fr); gap: 15px; margin-bottom: 20px;">
                    ${forecastHtml}
                </div>
                
                ${hourlyHtml}
                
                <div style="margin-top: 20px; padding: 15px; background: #EFF6FF; border-radius: 10px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <i class="fas fa-info-circle" style="color: #3B82F6;"></i>
                        <strong style="color: #1E40AF;">Прогноз на неделю</strong>
                    </div>
                    <p style="color: #64748B; margin: 0; font-size: 14px;">
                        ${this.getForecastSummary(forecastDays)}
                    </p>
                </div>
                
                <div style="text-align: center; padding-top: 15px; border-top: 1px solid #E2E8F0;">

                    <div style="font-size: 11px; color: #94A3B8; margin-top: 10px;">
                        Данные предоставлены OpenWeather Forecast API
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(html);
        
        // Добавляем обработчики событий
        setTimeout(() => {
            // Кнопка обновления
            document.getElementById('refreshForecastBtn')?.addEventListener('click', () => {
                this.refresh();
            });
        }, 100);
        
        console.log(`📅 Реальный прогноз для ${cityName} отображен`);
    }

    //  ДОБАВЛЕНО: Метод для демо-данных 
    displayDemoForecast() {
        // Генерация демо-прогноза на 3 дня
        const days = ['Сегодня', 'Завтра', 'Послезавтра'];
        const conditions = [
            { text: 'Ясно', icon: 'fa-sun', color: '#F59E0B' },
            { text: 'Малооблачно', icon: 'fa-cloud-sun', color: '#F59E0B' },
            { text: 'Облачно', icon: 'fa-cloud', color: '#94A3B8' },
            { text: 'Пасмурно', icon: 'fa-cloud', color: '#64748B' },
            { text: 'Небольшой дождь', icon: 'fa-cloud-rain', color: '#60A5FA' },
            { text: 'Дождь', icon: 'fa-cloud-showers-heavy', color: '#3B82F6' },
            { text: 'Снег', icon: 'fa-snowflake', color: '#60A5FA' },
            { text: 'Гроза', icon: 'fa-bolt', color: '#8B5CF6' }
        ];
        
        const forecast = days.map(day => {
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            return {
                day,
                tempDay: Math.floor(Math.random() * 25) - 5,
                tempNight: Math.floor(Math.random() * 20) - 8,
                condition,
                precipitation: Math.floor(Math.random() * 90),
                wind: (Math.random() * 12).toFixed(1),
                humidity: Math.floor(Math.random() * 50) + 50
            };
        });
        
        const forecastHtml = forecast.map(day => `
            <div style="background: #F8FAFC; border-radius: 10px; padding: 15px; text-align: center;">
                <div style="font-weight: bold; color: #1E40AF; margin-bottom: 5px;">${day.day}</div>
                <div style="font-size: 20px; color: ${day.condition.color}; margin: 5px 0;">
                    <i class="fas ${day.condition.icon}"></i>
                </div>
                <div style="font-size: 24px; font-weight: bold; color: #3B82F6; margin: 5px 0;">
                    ${day.tempDay}° / ${day.tempNight}°
                </div>
                <div style="color: #64748B; margin: 5px 0; font-size: 14px;">
                    ${day.condition.text}
                </div>
                <div style="display: flex; justify-content: space-around; margin-top: 10px; font-size: 12px; color: #94A3B8;">
                    <div>
                        <i class="fas fa-cloud-rain"></i> ${day.precipitation}%
                    </div>
                    <div>
                        <i class="fas fa-wind"></i> ${day.wind} м/с
                    </div>
                </div>
                <div style="font-size: 11px; color: #64748B; margin-top: 5px;">
                    Влажность: ${day.humidity}%
                </div>
            </div>
        `).join('');
        
        const html = `
            <div>
                <!-- Предупреждение о демо-данных -->
                <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); 
                     border: 2px solid #F59E0B; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-exclamation-triangle" style="color: #D97706;"></i>
                        <div>
                            <strong style="color: #92400E;">Используются демо-данные</strong>
                            <p style="color: #92400E; margin: 5px 0 0 0; font-size: 14px;">
                                Введите корректный API ключ OpenWeather для получения реальных данных
                            </p>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-map-marker-alt" style="color: #EF4444;"></i>
                        <h3 style="margin: 0; color: #1E293B;">${this.city} - прогноз на 3 дня (демо)</h3>
                    </div>
                    <div style="font-size: 12px; color: #64748B; background: #F8FAFC; padding: 4px 8px; border-radius: 4px;">
                        <i class="fas fa-database"></i> Демо-данные
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                    ${forecastHtml}
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #EFF6FF; border-radius: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <i class="fas fa-info-circle" style="color: #3B82F6;"></i>
                        <strong style="color: #1E40AF;">Прогноз на неделю (демо)</strong>
                    </div>
                    <p style="color: #64748B; margin: 0; font-size: 14px;">
                        ${this.getDemoForecastSummary(forecast)}
                    </p>
                </div>
                
                <div style="text-align: center; padding-top: 15px; border-top: 1px solid #E2E8F0;">
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 10px;">
                        Для реального прогноза погоды требуется API ключ OpenWeather
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(html);
        console.log(`📅 Демо-прогноз для ${this.city} отображен`);
    }

    groupForecastByDays(forecastData) {
        if (!forecastData || !forecastData.list) return [];
        
        const dailyData = {};
        const today = new Date();
        
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();
            
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    date,
                    temps: [],
                    icons: [],
                    descriptions: [],
                    humidity: [],
                    windSpeed: [],
                    precipitation: 0
                };
            }
            
            dailyData[dateKey].temps.push(item.main.temp);
            dailyData[dateKey].icons.push(item.weather[0].icon);
            dailyData[dateKey].descriptions.push(item.weather[0].description);
            dailyData[dateKey].humidity.push(item.main.humidity);
            dailyData[dateKey].windSpeed.push(item.wind.speed);
            
            // Суммируем осадки
            if (item.rain && item.rain['3h']) {
                dailyData[dateKey].precipitation += item.rain['3h'];
            }
            if (item.snow && item.snow['3h']) {
                dailyData[dateKey].precipitation += item.snow['3h'];
            }
        });
        
        // Преобразуем в массив и обрабатываем каждый день
        return Object.values(dailyData)
            .sort((a, b) => a.date - b.date)
            .map(day => {
                const maxTemp = Math.max(...day.temps);
                const minTemp = Math.min(...day.temps);
                const avgHumidity = Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length);
                const avgWind = day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length;
                
                // Определяем наиболее частую иконку погоды
                const iconCount = {};
                day.icons.forEach(icon => {
                    iconCount[icon] = (iconCount[icon] || 0) + 1;
                });
                const mostCommonIcon = Object.keys(iconCount).reduce((a, b) => iconCount[a] > iconCount[b] ? a : b);
                
                // Определяем наиболее частое описание
                const descCount = {};
                day.descriptions.forEach(desc => {
                    descCount[desc] = (descCount[desc] || 0) + 1;
                });
                const mostCommonDesc = Object.keys(descCount).reduce((a, b) => descCount[a] > descCount[b] ? a : b);
                
                return {
                    date: day.date,
                    maxTemp,
                    minTemp,
                    icon: mostCommonIcon,
                    description: mostCommonDesc,
                    humidity: avgHumidity,
                    windSpeed: avgWind,
                    precipitation: Math.min(100, Math.round(day.precipitation * 10)) // Преобразуем в проценты
                };
            });
    }

    generateHourlyForecast(forecastData) {
        if (!forecastData || !forecastData.list || forecastData.list.length < 8) {
            return '';
        }
        
        // Берем первые 8 записей (24 часа)
        const hourly = forecastData.list.slice(0, 8);
        
        const hourlyHtml = hourly.map((item, index) => {
            const time = new Date(item.dt * 1000);
            const hours = time.getHours().toString().padStart(2, '0');
            const temp = Math.round(item.main.temp);
            const icon = this.getWeatherIcon(item.weather[0].icon);
            
            return `
                <div style="text-align: center; padding: 10px; border-right: ${index < 7 ? '1px solid #E2E8F0' : 'none'}">
                    <div style="color: #64748B; font-size: 12px; margin-bottom: 5px;">${hours}:00</div>
                    <div style="font-size: 16px; color: #3B82F6; margin: 5px 0;">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div style="font-weight: bold; color: #1E293B;">${temp}°</div>
                </div>
            `;
        }).join('');
        
        return `
            <div style="margin: 20px 0;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <i class="fas fa-clock" style="color: #8B5CF6;"></i>
                    <strong style="color: #1E40AF;">Почасовой прогноз</strong>
                </div>
                <div style="display: flex; background: #F8FAFC; border-radius: 10px; padding: 10px; overflow-x: auto;">
                    ${hourlyHtml}
                </div>
            </div>
        `;
    }

    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': 'fa-sun',           // ясно (день)
            '01n': 'fa-moon',          // ясно (ночь)
            '02d': 'fa-cloud-sun',     // малооблачно (день)
            '02n': 'fa-cloud-moon',    // малооблачно (ночь)
            '03d': 'fa-cloud',         // облачно
            '03n': 'fa-cloud',
            '04d': 'fa-cloud',         // пасмурно
            '04n': 'fa-cloud',
            '09d': 'fa-cloud-rain',    // дождь
            '09n': 'fa-cloud-rain',
            '10d': 'fa-cloud-showers-heavy', // ливень
            '10n': 'fa-cloud-showers-heavy',
            '11d': 'fa-bolt',          // гроза
            '11n': 'fa-bolt',
            '13d': 'fa-snowflake',     // снег
            '13n': 'fa-snowflake',
            '50d': 'fa-smog',          // туман
            '50n': 'fa-smog'
        };
        
        return iconMap[iconCode] || 'fa-cloud';
    }

    getDayName(today, offset) {
        const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + offset);
        return days[targetDate.getDay()];
    }

    getForecastSummary(forecastDays) {
        if (forecastDays.length === 0) return 'Нет данных для анализа.';
        
        const avgTemp = Math.round(forecastDays.reduce((sum, day) => sum + (day.maxTemp + day.minTemp) / 2, 0) / forecastDays.length);
        const rainyDays = forecastDays.filter(day => day.precipitation > 30).length;
        
        if (rainyDays === 0) {
            return `Ожидается преимущественно сухая погода со средней температурой ${avgTemp}°C. Идеальные условия для прогулок и мероприятий на свежем воздухе.`;
        } else if (rainyDays === 1) {
            return `В основном ясная погода, возможен кратковременный дождь в один из дней. Средняя температура составит ${avgTemp}°C. Рекомендуется иметь при себе зонт.`;
        } else {
            return `Неустойчивая погода с осадками в ${rainyDays} дней. Средняя температура ${avgTemp}°C. Рекомендуется планировать мероприятия с учетом возможных дождей.`;
        }
    }

    getDemoForecastSummary(forecast) {
        const avgTemp = Math.round(forecast.reduce((sum, day) => sum + (day.tempDay + day.tempNight) / 2, 0) / forecast.length);
        const rainyDays = forecast.filter(day => day.precipitation > 50).length;
        
        if (rainyDays === 0) {
            return `Солнечная погода, средняя температура ${avgTemp}°C. Идеальные условия для прогулок.`;
        } else if (rainyDays === 1) {
            return `Преимущественно ясно, возможен кратковременный дождь. Средняя температура ${avgTemp}°C.`;
        } else {
            return `Неустойчивая погода, ${rainyDays} дня с осадками. Средняя температура ${avgTemp}°C.`;
        }
    }

    async fetchWithTimeout(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);
        
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Запрос превысил таймаут (${this.REQUEST_TIMEOUT}мс)`);
            }
            throw error;
        }
    }

    refresh() {
        console.log(`🔄 Обновление прогноза для ${this.city}`);
        this.loadForecast();
    }
}