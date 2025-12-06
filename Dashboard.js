export class Dashboard {
    constructor() {
        this.widgets = [];
        this.container = document.getElementById('dashboard');
        this.currentCity = 'Москва';
        console.log('✅ Dashboard инициализирован (погодная версия)');
    }

    //  Добавлен параметр apiKey 
    async addWidget(type, city = this.currentCity, apiKey) {
        console.log(`➕ Добавляем виджет: ${type} для ${city}`);
        
        try {
            //  ДОБАВЛЕНО: Проверка API ключа для виджетов, требующих API 
            const requiresApiKey = ['currentWeather', 'forecast', 'airQuality', 'stats'];
            
            if (requiresApiKey.includes(type) && (!apiKey || apiKey.trim() === '')) {
                console.error('❌ API ключ не предоставлен для виджета:', type);
                this.showApiKeyWarning();
                return;
            }
            
            let widget;
            
            switch(type) {
                case 'currentWeather':
                    const { CurrentWeatherWidget } = await import('./CurrentWeatherWidget.js');
                    widget = new CurrentWeatherWidget(city, apiKey); 
                    break;
                case 'forecast':
                    const { ForecastWidget } = await import('./ForecastWidget.js');
                    widget = new ForecastWidget(city, apiKey); 
                    break;
                case 'airQuality':
                    const { AirQualityWidget } = await import('./AirQualityWidget.js');
                    widget = new AirQualityWidget(city, apiKey); 
                    break;
                case 'stats':
                    const { WeatherStatsWidget } = await import('./WeatherStatsWidget.js');
                    widget = new WeatherStatsWidget(city, apiKey); 
                    break;
                default:
                    console.error('Неизвестный тип виджета:', type);
                    return;
            }
            
            const element = widget.render();
            this.container.appendChild(element);
            this.widgets.push(widget);
            
            this.updateWidgetCount();
            this.updateEmptyState();
            
            console.log(`✅ Виджет ${type} добавлен с API ключом`);
            
        } catch (error) {
            console.error('❌ Ошибка добавления виджета:', error);
            this.showError(error.message);
        }
    }

    //  Метод для обновления всех виджетов с API ключом 
    refreshAll(apiKey) {
        console.log('🔄 Обновление всех виджетов с API ключом');
        this.widgets.forEach(w => {
            if (w.refresh && typeof w.refresh === 'function') {
                //  ПЕРЕДАЕМ API КЛЮЧ ПРИ ОБНОВЛЕНИИ 
                if (apiKey) {
                    w.apiKey = apiKey; // Обновляем ключ в виджете
                }
                w.refresh();
            }
        });
    }

    //  Предупреждение об отсутствии API ключа 
    showApiKeyWarning() {
        const warning = document.createElement('div');
        warning.className = 'api-key-warning';
        warning.style.cssText = `
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 10px auto;
            max-width: 500px;
            color: #92400e;
            position: relative;
            animation: slideIn 0.3s ease;
        `;
        
        warning.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 20px;"></i>
                <strong style="font-size: 16px;">Требуется API ключ</strong>
            </div>
            <p style="margin: 0 0 10px 0; font-size: 14px;">
                Для работы погодных виджетов необходим API ключ OpenWeather.
            </p>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button id="focusApiKeyBtn" style="
                    background: #3B82F6;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">
                    <i class="fas fa-key"></i> Ввести ключ
                </button>
                <a href="https://openweathermap.org/api" target="_blank" style="
                    color: #3B82F6;
                    text-decoration: none;
                    font-size: 14px;
                ">
                    <i class="fas fa-external-link-alt"></i> Получить ключ
                </a>
                <button id="closeWarningBtn" style="
                    margin-left: auto;
                    background: none;
                    border: none;
                    color: #64748B;
                    cursor: pointer;
                    padding: 5px;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Вставляем предупреждение в контейнер
        this.container.insertBefore(warning, this.container.firstChild);
        
        // Обработчики событий
        document.getElementById('focusApiKeyBtn')?.addEventListener('click', () => {
            const apiKeyInput = document.getElementById('apiKeyInput');
            if (apiKeyInput) {
                apiKeyInput.focus();
                apiKeyInput.scrollIntoView({ behavior: 'smooth' });
                apiKeyInput.style.borderColor = '#3B82F6';
                apiKeyInput.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                
                setTimeout(() => {
                    apiKeyInput.style.borderColor = '';
                    apiKeyInput.style.boxShadow = '';
                }, 2000);
            }
            warning.remove();
        });
        
        document.getElementById('closeWarningBtn')?.addEventListener('click', () => {
            warning.remove();
        });
        
        // Автоматическое удаление через 10 секунд
        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
            }
        }, 10000);
    }

    // Отображение ошибок 
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'widget-error';
        errorDiv.style.cssText = `
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            border: 2px solid #ef4444;
            border-radius: 8px;
            padding: 15px;
            margin: 10px auto;
            max-width: 500px;
            color: #991b1b;
            position: relative;
            animation: slideIn 0.3s ease;
        `;
        
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-times-circle" style="font-size: 20px;"></i>
                <strong style="font-size: 16px;">Ошибка загрузки</strong>
            </div>
            <p style="margin: 0 0 10px 0; font-size: 14px;">${message}</p>
            <div style="display: flex; justify-content: flex-end;">
                <button class="close-error-btn" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">
                    Закрыть
                </button>
            </div>
        `;
        
        this.container.insertBefore(errorDiv, this.container.firstChild);
        
        errorDiv.querySelector('.close-error-btn').addEventListener('click', () => {
            errorDiv.remove();
        });
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 8000);
    }

    //  Метод для обновления API ключа во всех виджетах 
    updateAllApiKeys(newApiKey) {
        console.log('🔑 Обновление API ключа во всех виджетах');
        this.widgets.forEach(widget => {
            if (widget.apiKey !== undefined) {
                widget.apiKey = newApiKey;
                console.log(`Ключ обновлен для виджета ${widget.constructor.name}`);
            }
        });
    }

    //  Валидация API ключа 
    validateApiKey(apiKey) {
        if (!apiKey) return false;
        
        const trimmedKey = apiKey.trim();
        if (trimmedKey.length === 0) return false;
        
        // Проверка на минимальную длину (OpenWeather ключи обычно 32 символа)
        if (trimmedKey.length < 20) {
            console.warn('API ключ слишком короткий:', trimmedKey.length);
            return false;
        }
        
        return true;
    }

    //  ОСТАЛЬНЫЕ МЕТОДЫ БЕЗ ИЗМЕНЕНИЙ 
    removeWidget(widgetId) {
        const index = this.widgets.findIndex(w => w.id === widgetId);
        if (index !== -1) {
            this.widgets[index].destroy();
            this.widgets.splice(index, 1);
            this.updateWidgetCount();
            this.updateEmptyState();
            console.log(`🗑️ Удален виджет: ${widgetId}`);
        }
    }

    reset() {
        this.widgets.forEach(w => w.destroy());
        this.widgets = [];
        this.updateWidgetCount();
        this.updateEmptyState();
        console.log('♻️ Все виджеты удалены');
    }

    autoArrange() {
        console.log('🔄 Авторазмещение виджетов');
        // Простая реализация
        this.container.style.display = 'grid';
        this.container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
        this.container.style.gap = '20px';
    }

    updateWidgetCount() {
        const countElement = document.getElementById('widgetCount');
        if (countElement) {
            countElement.textContent = this.widgets.length;
        }
    }

    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = this.widgets.length === 0 ? 'flex' : 'none';
        }
    }
}

//  Анимации CSS 
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);