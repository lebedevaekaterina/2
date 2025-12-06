import { Dashboard } from './Dashboard.js';

class WeatherDashboard {
    constructor() {
        console.log('=== ПОГОДНЫЙ ДАШБОРД v3.0 ЗАПУЩЕН ===');
        this.dashboard = new Dashboard();
        this.currentCity = 'Москва';
        this.apiKey = ''; //  хранилище для API ключа
        this.initEventListeners();
        this.initClock();
        this.initApiKey(); //  инициализация API ключа
    }

    //  Метод для получения API ключа 
    initApiKey() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        
        // Загрузка сохраненного ключа из localStorage
        const savedApiKey = localStorage.getItem('openweather_api_key');
        if (savedApiKey && apiKeyInput) {
            apiKeyInput.value = savedApiKey;
            this.apiKey = savedApiKey;
            console.log('✅ API ключ загружен из localStorage');
        }
        
        // Автосохранение при вводе
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', (e) => {
                this.apiKey = e.target.value.trim();
                
                // Сохраняем в localStorage
                if (this.apiKey) {
                    localStorage.setItem('openweather_api_key', this.apiKey);
                    console.log('API ключ сохранен');
                }
            });
            
            // Тумблер показа/скрытия пароля
            this.initPasswordToggle();
        }
    }


    initPasswordToggle() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        toggleBtn.style.cssText = `
            position: absolute;
            right: 12px;
            top: 32%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #64748B;
            cursor: pointer;
            padding: 5px;
        `;
        
        const inputWrapper = apiKeyInput.parentElement;
        if (inputWrapper) {
            inputWrapper.style.position = 'relative';
            inputWrapper.appendChild(toggleBtn);
            
            toggleBtn.addEventListener('click', () => {
                const type = apiKeyInput.type === 'password' ? 'text' : 'password';
                apiKeyInput.type = type;
                toggleBtn.innerHTML = type === 'password' ? 
                    '<i class="fas fa-eye"></i>' : 
                    '<i class="fas fa-eye-slash"></i>';
            });
        }
    }

    //  Проверка API ключа перед действиями 
    checkApiKey(widgetName) {
        const apiKeyInput = document.getElementById('apiKeyInput');
        
        if (!apiKeyInput) {
            console.error('Поле API ключа не найдено!');
            alert('❌ Ошибка: поле для API ключа отсутствует');
            return false;
        }
        
        this.apiKey = apiKeyInput.value.trim();
        
        if (!this.apiKey) {
            alert(`⚠️ Для добавления виджета "${widgetName}" необходимо ввести API ключ OpenWeather.\n\nПолучите ключ на сайте: https://openweathermap.org/api`);
            
            // Фокусируемся на поле ввода
            apiKeyInput.focus();
            apiKeyInput.style.borderColor = '#EF4444';
            apiKeyInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
            
            setTimeout(() => {
                apiKeyInput.style.borderColor = '';
                apiKeyInput.style.boxShadow = '';
            }, 2000);
            
            return false;
        }
        
        // Проверка формата ключа (примерно 32 символа)
        if (this.apiKey.length < 20 || this.apiKey.length > 50) {
            console.warn('API ключ имеет нестандартную длину:', this.apiKey.length);
        }
        
        return true;
    }

    //  Метод для передачи API ключа в виджеты 
    getApiKey() {
        return this.apiKey;
    }

    initEventListeners() {
        console.log('Инициализация обработчиков...');
        
        // Кнопки добавления виджетов
        const buttons = [
            { id: 'addCurrentWeatherBtn', type: 'currentWeather', name: 'Текущая погода' },
            { id: 'addForecastBtn', type: 'forecast', name: 'Прогноз' },
            { id: 'addAirQualityBtn', type: 'airQuality', name: 'Качество воздуха' },
            { id: 'addStatsBtn', type: 'stats', name: 'Статистика' }
        ];
        
        buttons.forEach(btn => {
            const element = document.getElementById(btn.id);
            if (element) {
                element.addEventListener('click', () => {
                    console.log(`Добавляем виджет: ${btn.name}`);
                    
                    //  Проверка API ключа 
                    if (!this.checkApiKey(btn.name)) {
                        return;
                    }
                    
                    //  Передача API ключа в дашборд 
                    this.dashboard.addWidget(btn.type, this.currentCity, this.apiKey);
                });
            } else {
                console.error(`Кнопка ${btn.id} не найдена!`);
            }
        });

        // Управление
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            if (confirm('Очистить все виджеты?')) {
                this.dashboard.reset();
            }
        });

        document.getElementById('autoArrangeBtn')?.addEventListener('click', () => {
            this.dashboard.autoArrange();
        });

        document.getElementById('refreshAllBtn')?.addEventListener('click', () => {
            // Передача API ключа при обновлении 
            this.dashboard.refreshAll(this.apiKey);
        });

        // Удаление виджетов
        document.getElementById('dashboard')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('widget-close-btn')) {
                const widgetId = e.target.dataset.widgetId;
                this.dashboard.removeWidget(widgetId);
            }
        });
    }

    initClock() {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const timeElement = document.getElementById('currentTime');
            if (timeElement) {
                timeElement.textContent = timeStr;
            }
        };
        
        updateTime();
        setInterval(updateTime, 60000);
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен');
    window.weatherDashboard = new WeatherDashboard();
    console.log('✅ Дашборд готов к работе!');
});