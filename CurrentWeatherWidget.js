import { UIComponent } from './UIComponent.js';

export class CurrentWeatherWidget extends UIComponent {
    constructor(city = 'Moscow', apiKey) {
        super(`Погода в ${city}`, `weather-${city}-${Date.now()}`);
        this.city = city;
        this.apiKey = apiKey;
        this.isLoading = false;
        this.useDemoData = false;
        this.geoCache = {};
        
        this.REQUEST_TIMEOUT = 5000;
    }

    render() {
        const widget = super.render();
        
        // Показываем индикатор загрузки
        this.showLoading(true);
        
        // Загружаем данные
        this.loadWeatherData();
        
        return widget;
    }

    async loadWeatherData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            // ★★★★ ИЗМЕНЕНО: Проверка API ключа ★★★★
            if (!this.apiKey || this.apiKey.trim() === '') {
                throw new Error('API ключ не предоставлен');
            }
            
            // Проверяем формат ключа (примерно 32 символа)
            if (this.apiKey.length < 20 || this.apiKey.length > 50) {
                console.warn('API ключ имеет нестандартную длину');
            }
            
            // 1. Получаем координаты города
            const coordinates = await this.getCityCoordinates();
            
            if (!coordinates) {
                throw new Error(`Не удалось найти координаты для города: ${this.city}`);
            }
            
            // 2. Получаем погодные данные по координатам
            const weatherData = await this.fetchWeather(coordinates.lat, coordinates.lon);
            
            // 3. Отображаем данные
            this.useDemoData = false; // Успешная загрузка API
            this.displayWeather(weatherData);
            
            console.log(`✅ Реальная погода загружена для ${this.city}`);
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки данных для ${this.city}:`, error);
            
            // Fallback на демо-данные при ошибке 
            console.log('🔄 Используем демо-данные из-за ошибки API');
            this.useDemoData = true;
            this.displayDemoWeather();
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    async getCityCoordinates() {
        // Проверка кэша
        if (this.geoCache[this.city]) {
            return this.geoCache[this.city];
        }
        
        //  Проверка перед запросом 
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
            throw error; // Пробрасываем ошибку дальше
        }
    }

    async fetchWeather(latitude, longitude) {
        // API погоды OpenWeather (требует ключа)
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric&lang=ru`;
        
        const response = await this.fetchWithTimeout(weatherUrl);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Ошибка погодного API ${response.status}: ${errorData.message || response.statusText}`);
        }
        
        return await response.json();
    }

    displayWeather(apiData) {
        const temp = Math.round(apiData.main.temp);
        const condition = apiData.weather[0].description;
        const humidity = Math.round(apiData.main.humidity);
        const windSpeed = apiData.wind.speed;
        const cityName = apiData.name || this.city;
        const weatherIcon = this.getWeatherIcon(apiData.weather[0].icon);
        const feelsLike = Math.round(apiData.main.feels_like);
        
        const html = `
            <div style="text-align: center; padding: 20px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-cloud-sun" style="color: #3B82F6;"></i>
                        <h3 style="margin: 0; color: #1E293B;">Погода в ${cityName}</h3>
                    </div>
                    <div style="font-size: 12px; color: #64748B; background: #F8FAFC; padding: 4px 8px; border-radius: 4px;">
                        <i class="fas fa-sync-alt"></i> Обновлено: ${new Date().toLocaleTimeString()}
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
                    <i class="fas ${weatherIcon}" style="font-size: 60px; color: #3B82F6;"></i>
                    <div style="font-size: 60px; color: #3B82F6; font-weight: bold;">
                        ${temp}°C
                    </div>
                </div>
                
                <div style="font-size: 20px; color: #1E293B; margin: 10px 0; text-transform: capitalize;">
                    ${condition}
                </div>
                
                <div style="color: #64748B; margin: 5px 0; font-size: 14px;">
                    <i class="fas fa-temperature-low"></i> Ощущается как: ${feelsLike}°C
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                    <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; border-left: 4px solid #60A5FA;">
                        <div style="color: #64748B; font-size: 14px; margin-bottom: 5px;">
                            <i class="fas fa-tint"></i> Влажность
                        </div>
                        <div style="font-weight: bold; color: #1E293B; font-size: 18px;">
                            ${humidity}%
                        </div>
                    </div>
                    
                    <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981;">
                        <div style="color: #64748B; font-size: 14px; margin-bottom: 5px;">
                            <i class="fas fa-wind"></i> Ветер
                        </div>
                        <div style="font-weight: bold; color: #1E293B; font-size: 18px;">
                            ${windSpeed.toFixed(1)} м/с
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #E2E8F0; text-align: center;">

                    <div style="font-size: 11px; color: #94A3B8; margin-top: 10px;">
                        Данные предоставлены OpenWeather API
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(html);
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refresh());
        console.log(`🌤️ Реальная погода для ${cityName}: ${temp}°C, ${condition}`);
    }

    //  Метод для демо-данных
    displayDemoWeather() {
        // Генерируем реалистичные демо-данные
        const temp = Math.floor(Math.random() * 30) - 5;
        const feelsLike = temp + Math.floor(Math.random() * 5) - 2;
        const conditions = [
            { desc: 'Ясно', icon: 'fa-sun' },
            { desc: 'Облачно', icon: 'fa-cloud' },
            { desc: 'Пасмурно', icon: 'fa-cloud' },
            { desc: 'Небольшой дождь', icon: 'fa-cloud-rain' },
            { desc: 'Дождь', icon: 'fa-cloud-showers-heavy' },
            { desc: 'Снег', icon: 'fa-snowflake' },
            { desc: 'Туман', icon: 'fa-smog' }
        ];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const humidity = Math.floor(Math.random() * 50) + 50;
        const windSpeed = (Math.random() * 10).toFixed(1);
        
        const html = `
            <div style="text-align: center; padding: 20px;">
                <!-- ДОБАВЛЕНО: Предупреждение о демо-данных -->
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
                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-cloud-sun" style="color: #3B82F6;"></i>
                        <h3 style="margin: 0; color: #1E293B;">Погода в ${this.city}</h3>
                    </div>
                    <div style="font-size: 12px; color: #64748B; background: #F8FAFC; padding: 4px 8px; border-radius: 4px;">
                        <i class="fas fa-database"></i> Демо-данные
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
                    <i class="fas ${condition.icon}" style="font-size: 60px; color: #3B82F6;"></i>
                    <div style="font-size: 60px; color: #3B82F6; font-weight: bold;">
                        ${temp}°C
                    </div>
                </div>
                
                <div style="font-size: 20px; color: #1E293B; margin: 10px 0; text-transform: capitalize;">
                    ${condition.desc}
                </div>
                
                <div style="color: #64748B; margin: 5px 0; font-size: 14px;">
                    <i class="fas fa-temperature-low"></i> Ощущается как: ${feelsLike}°C
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                    <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; border-left: 4px solid #60A5FA;">
                        <div style="color: #64748B; font-size: 14px; margin-bottom: 5px;">
                            <i class="fas fa-tint"></i> Влажность
                        </div>
                        <div style="font-weight: bold; color: #1E293B; font-size: 18px;">
                            ${humidity}%
                        </div>
                    </div>
                    
                    <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981;">
                        <div style="color: #64748B; font-size: 14px; margin-bottom: 5px;">
                            <i class="fas fa-wind"></i> Ветер
                        </div>
                        <div style="font-weight: bold; color: #1E293B; font-size: 18px;">
                            ${windSpeed} м/с
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #E2E8F0; text-align: center;">
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 10px;">
                        Для реальных данных требуется API ключ OpenWeather
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(html);
        console.log(`📱 Демо-погода для ${this.city} (${temp}°C, ${condition.desc})`);
    }

    getWeatherIcon(iconCode) {
        // Преобразование кодов иконок OpenWeather в иконки Font Awesome
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
        console.log(`🔄 Обновление погоды для ${this.city}`);
        this.loadWeatherData();
    }

    updateCity(newCity) {
        this.city = newCity;
        this.element.querySelector('.widget-title').textContent = `Погода в ${newCity}`;
        this.loadWeatherData();
    }
}