export class UIComponent {
    constructor(title, id) {
        this.title = title;
        this.id = id || `widget-${Date.now()}`;
        this.element = null;
    }

    render() {
        const widget = document.createElement('div');
        widget.className = 'widget';
        widget.id = this.id;
        widget.dataset.widgetId = this.id;
        
        widget.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">${this.title}</h3>
                <button class="widget-close-btn" data-widget-id="${this.id}">×</button>
            </div>
            <div class="widget-content">
                <div class="widget-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Загрузка погодных данных...</p>
                </div>
            </div>
        `;
        
        this.element = widget;
        console.log(`📊 Виджет "${this.title}" создан`);
        return widget;
    }

    updateContent(html) {
        if (this.element) {
            const content = this.element.querySelector('.widget-content');
            if (content) {
                content.innerHTML = html;
            }
        }
    }

    showLoading(show) {
        const content = this.element?.querySelector('.widget-content');
        if (content) {
            content.style.opacity = show ? '0.5' : '1';
        }
    }

    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }
}