import { UIComponent } from './UIComponent.js';

export class AirQualityWidget extends UIComponent {
    constructor(city = 'Москва', apiKey) {
        super(`Воздух - ${city}`);
        this.city = city;
        this.apiKey = apiKey;
        this.geoCache = {};
        this.useDemoData = false;  
        
        this.AQI_LEVELS = [
            { max: 50, name: 'Отличное', color: '#10B981', icon: 'fa-smile', 
              recommendation: 'Воздух чистый. Идеальные условия для outdoor активности.' },
            { max: 100, name: 'Хорошее', color: '#60A5FA', icon: 'fa-smile',
              recommendation: 'Воздух хорошего качества. Можно проводить время на улице.' },
            { max: 150, name: 'Умеренное', color: '#F59E0B', icon: 'fa-meh',
              recommendation: 'Чувствительные группы могут испытывать дискомфорт.' },
            { max: 200, name: 'Вредное', color: '#EF4444', icon: 'fa-frown',
              recommendation: 'Избегайте длительного пребывания на улице.' },
            { max: Infinity, name: 'Опасное', color: '#7C3AED', icon: 'fa-skull-crossbones',
              recommendation: 'Оставайтесь в помещении. Используйте очиститель воздуха.' }
        ];
        
        this.REQUEST_TIMEOUT = 5000;
    }

    render() {
        const widget = super.render();
        
        const loadingHtml = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color: #60A5FA;"></i>
                <p style="margin-top: 15px; color: #64748B;">Загрузка данных...</p>
            </div>
        `;
        this.updateContent(loadingHtml);
        
        this.loadAirQuality();
        
        return widget;
    }

    async loadAirQuality() {
        try {
            //  Проверка API ключа 
            if (!this.apiKey || this.apiKey.trim() === '') {
                throw new Error('API ключ не предоставлен');
            }
            
            // Проверяем формат ключа (примерно 32 символа)
            if (this.apiKey.length < 20 || this.apiKey.length > 50) {
                console.warn('API ключ имеет нестандартную длину');
            }

            const coords = await this.getCityCoordinates();
            if (!coords) {
                throw new Error(`Не удалось найти координаты для города: ${this.city}`);
            }

            const airData = await this.fetchAirQualityData(coords.lat, coords.lon);
            
            this.useDemoData = false; //  Успешная загрузка API 
            this.displayAirQuality(airData);
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            
            //   Показываем демо-данные при ошибке 
            console.log('🔄 Используем демо-данные из-за ошибки API');
            this.useDemoData = true;
            this.displayDemoAirQuality();
        }
    }

    //  Метод для демо-данных 
    displayDemoAirQuality() {
        // Генерируем реалистичные демо-данные
        const aqi = Math.floor(Math.random() * 300) + 1;
        const level = this.getAQILevel(aqi);
        
        // Более реалистичные значения загрязнителей
        const baseValues = {
            'PM2.5': { min: 5, max: 100, safe: 25 },
            'PM10': { min: 10, max: 150, safe: 50 },
            'NO₂': { min: 5, max: 100, safe: 40 },
            'O₃': { min: 10, max: 120, safe: 100 },
            'SO₂': { min: 2, max: 50, safe: 20 },
            'CO': { min: 100, max: 5000, safe: 4000 }
        };
        
        const pollutants = Object.keys(baseValues).map(name => {
            const config = baseValues[name];
            const value = (Math.random() * (config.max - config.min)) + config.min;
            return {
                name,
                value: parseFloat(value.toFixed(1)),
                unit: name === 'CO' ? 'μg/m³' : 'μg/m³',
                safeLimit: config.safe
            };
        });
        
        // Генерация HTML с предупреждением о демо-данных
        const pollutantsHtml = pollutants.map(p => `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #64748B;">${p.name}</span>
                    <span style="font-weight: bold; color: ${this.getPollutantColor(p.value, p.name)};">
                        ${p.value.toFixed(1)} ${p.unit}
                    </span>
                </div>
                <div style="height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.min(100, (p.value / (p.safeLimit * 2)) * 100)}%; 
                          background: ${this.getPollutantColor(p.value, p.name)}; border-radius: 3px;">
                    </div>
                </div>
                <div style="font-size: 12px; color: #94A3B8; margin-top: 3px;">
                    Безопасный предел: ${p.safeLimit} ${p.unit}
                </div>
            </div>
        `).join('');
        
        const html = `
            <div>
                <!-- Предупреждение о демо-данных  -->
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
                        <i class="fas fa-wind" style="color: #10B981;"></i>
                        <h3 style="margin: 0; color: #1E293B;">Качество воздуха в ${this.city}</h3>
                    </div>
                    <div style="font-size: 12px; color: #64748B; background: #F8FAFC; padding: 4px 8px; border-radius: 4px;">
                        <i class="fas fa-database"></i> Демо-данные
                    </div>
                </div>
                
                <div style="text-align: center; background: ${level.color}10; border-radius: 15px; padding: 20px; margin-bottom: 20px;">
                    <div style="font-size: 48px; font-weight: bold; color: ${level.color}; margin: 10px 0;">
                        ${aqi}
                        <div style="font-size: 16px; color: #64748B;">AQI индекс</div>
                    </div>
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: white; padding: 8px 16px; border-radius: 20px; margin-top: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <i class="fas ${level.icon}" style="color: ${level.color};"></i>
                        <span style="font-weight: bold; color: ${level.color};">${level.name}</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <i class="fas fa-chart-bar" style="color: #8B5CF6;"></i>
                        <strong style="color: #1E40AF;">Концентрации загрязнителей (демо)</strong>
                    </div>
                    ${pollutantsHtml}
                </div>
                
                <div style="background: #F0F9FF; border-radius: 10px; padding: 15px; border-left: 4px solid ${level.color};">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <i class="fas fa-info-circle" style="color: ${level.color};"></i>
                        <strong style="color: #1E40AF;">Рекомендации</strong>
                    </div>
                    <p style="color: #64748B; margin: 0; font-size: 14px;">
                        ${level.recommendation}
                    </p>
                </div>
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #E2E8F0; text-align: center;">
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 10px;">

                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(html);
        
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refresh());
        
        console.log(`📱 Демо-данные о качестве воздуха для ${this.city}`);
    }

    async getCityCoordinates() {
        if (this.geoCache[this.city]) {
            return this.geoCache[this.city];
        }

        // Проверка перед запросом 
        if (!this.apiKey || this.apiKey.trim() === '' || this.useDemoData) {
            throw new Error('API ключ отсутствует или невалиден');
        }

        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(this.city)}&limit=1&appid=${this.apiKey}`;
        
        try {
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) {
                throw new Error(`Геокодинг API ошибка: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data || data.length === 0) {
                throw new Error('Город не найден');
            }
            
            const coords = {
                lat: data[0].lat,
                lon: data[0].lon
            };
            
            this.geoCache[this.city] = coords;
            return coords;
            
        } catch (error) {
            console.error('Ошибка геокодинга:', error);
            throw error; //  Пробрасываем ошибку дальше 
        }
    }

    async fetchAirQualityData(lat, lon) {
        const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
        
        const response = await this.fetchWithTimeout(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API ошибка ${response.status}: ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.list || data.list.length === 0) {
            throw new Error('Нет данных о качестве воздуха');
        }
        
        return data.list[0];
    }

    displayAirQuality(airData) {
        const aqi = airData.main.aqi;
        const normalizedAqi = this.normalizeAQI(aqi);
        const level = this.getAQILevel(normalizedAqi);
        
        const components = airData.components;
        const pollutants = [
            { 
                name: 'PM2.5', 
                value: components.pm2_5, 
                unit: 'μg/m³',
                safeLimit: 25
            },
            { 
                name: 'PM10', 
                value: components.pm10, 
                unit: 'μg/m³',
                safeLimit: 50
            },
            { 
                name: 'NO₂', 
                value: components.no2, 
                unit: 'μg/m³',
                safeLimit: 40
            },
            { 
                name: 'O₃', 
                value: components.o3, 
                unit: 'μg/m³',
                safeLimit: 100
            },
            { 
                name: 'SO₂', 
                value: components.so2, 
                unit: 'μg/m³',
                safeLimit: 20
            },
            { 
                name: 'CO', 
                value: components.co, 
                unit: 'μg/m³',
                safeLimit: 4
            }
        ];
        
        const pollutantsHtml = pollutants.map(p => `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #64748B;">${p.name}</span>
                    <span style="font-weight: bold; color: ${this.getPollutantColor(p.value, p.name)};">
                        ${p.value.toFixed(1)} ${p.unit}
                    </span>
                </div>
                <div style="height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.min(100, (p.value / (p.safeLimit * 2)) * 100)}%; 
                          background: ${this.getPollutantColor(p.value, p.name)}; border-radius: 3px;">
                    </div>
                </div>
                <div style="font-size: 12px; color: #94A3B8; margin-top: 3px;">
                    Безопасный предел: ${p.safeLimit} ${p.unit}
                </div>
            </div>
        `).join('');
        
        const html = `
            <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-wind" style="color: #10B981;"></i>
                        <h3 style="margin: 0; color: #1E293B;">Качество воздуха в ${this.city}</h3>
                    </div>
                    <div style="font-size: 12px; color: #64748B; background: #F8FAFC; padding: 4px 8px; border-radius: 4px;">
                        <i class="fas fa-sync-alt"></i> Обновлено: ${new Date().toLocaleTimeString()}
                    </div>
                </div>
                
                <div style="text-align: center; background: ${level.color}10; border-radius: 15px; padding: 20px; margin-bottom: 20px;">
                    <div style="font-size: 48px; font-weight: bold; color: ${level.color}; margin: 10px 0;">
                        ${normalizedAqi}
                        <div style="font-size: 16px; color: #64748B;">AQI индекс</div>
                    </div>
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: white; padding: 8px 16px; border-radius: 20px; margin-top: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <i class="fas ${level.icon}" style="color: ${level.color};"></i>
                        <span style="font-weight: bold; color: ${level.color};">${level.name}</span>
                    </div>
                    <div style="margin-top: 15px; font-size: 14px; color: #64748B;">
                        Уровень ${aqi}/5 по индексу OpenWeather
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <i class="fas fa-chart-bar" style="color: #8B5CF6;"></i>
                        <strong style="color: #1E40AF;">Концентрации загрязнителей</strong>
                    </div>
                    ${pollutantsHtml}
                </div>
                
                <div style="background: #F0F9FF; border-radius: 10px; padding: 15px; border-left: 4px solid ${level.color};">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <i class="fas fa-info-circle" style="color: ${level.color};"></i>
                        <strong style="color: #1E40AF;">Рекомендации</strong>
                    </div>
                    <p style="color: #64748B; margin: 0; font-size: 14px;">
                        ${level.recommendation}
                    </p>
                </div>
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #E2E8F0; text-align: center;">

                    <div style="font-size: 11px; color: #94A3B8; margin-top: 10px;">
                        Данные предоставлены OpenWeather Air Pollution API
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(html);
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refresh());
        
        console.log(`🌬️ Реальные данные о качестве воздуха для ${this.city} загружены`);
    }

    displayError(message) {
        
        console.log('🔄 Переход на демо-данные из-за ошибки:', message);
        this.useDemoData = true;
        this.displayDemoAirQuality();
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

    normalizeAQI(openWeatherAQI) {
        const mapping = { 1: 30, 2: 80, 3: 130, 4: 180, 5: 250 };
        return mapping[openWeatherAQI] || 100;
    }

    getAQILevel(aqi) {
        return this.AQI_LEVELS.find(level => aqi <= level.max);
    }

    getPollutantColor(value, pollutant) {
        let safeLimit;
        
        switch(pollutant) {
            case 'PM2.5': safeLimit = 25; break;
            case 'PM10': safeLimit = 50; break;
            case 'NO₂': safeLimit = 40; break;
            case 'O₃': safeLimit = 100; break;
            case 'SO₂': safeLimit = 20; break;
            case 'CO': safeLimit = 4; break;
            default: safeLimit = 50;
        }
        
        if (value <= safeLimit) return '#10B981';
        if (value <= safeLimit * 2) return '#F59E0B';
        return '#EF4444';
    }

    refresh() {
        console.log(`🔄 Обновление данных для ${this.city}`);
        this.loadAirQuality();
    }
}