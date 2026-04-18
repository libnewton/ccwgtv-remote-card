window.customCards = window.customCards || [];
window.customCards.push({
    type: 'ccwgtv-remote-card',
    name: 'CCwGTV Remote Card',
    description: 'A compact Google TV remote control for Home Assistant',
    preview: true,
});

class CCwGTVRemoteCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.buttonAliases = {
            star: ['input'],
        };
        this.handleClick = this.handleClick.bind(this);
        this.applyStyles();
    }

    applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                --ccwgtv-scale: 1;
                --ccwgtv-text: var(--primary-text-color, #ffffff);
                --ccwgtv-muted: var(--secondary-text-color, rgba(255, 255, 255, 0.72));
                --ccwgtv-surface: rgba(255, 255, 255, 0.08);
                --ccwgtv-surface-strong: rgba(255, 255, 255, 0.12);
                --ccwgtv-surface-soft: rgba(255, 255, 255, 0.05);
                --ccwgtv-ring: rgba(255, 255, 255, 0.08);
                --ccwgtv-press: rgba(255, 255, 255, 0.16);
                --ccwgtv-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
            }

            ha-card {
                background: transparent;
                border: 0;
                box-shadow: none;
                padding: 0;
            }

            .card {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: calc(8px * var(--ccwgtv-scale));
                color: var(--ccwgtv-text);
            }

            .title {
                margin: 0;
                color: var(--ccwgtv-muted);
                font-size: calc(14px * var(--ccwgtv-scale));
                font-weight: 500;
                line-height: 1.2;
                text-align: center;
            }

            .remote {
                width: calc(196px * var(--ccwgtv-scale));
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: calc(10px * var(--ccwgtv-scale));
            }

            .dpad-shell {
                width: calc(138px * var(--ccwgtv-scale));
                height: calc(138px * var(--ccwgtv-scale));
                padding: calc(8px * var(--ccwgtv-scale));
                border-radius: 50%;
                background: var(--ccwgtv-surface-soft);
                box-shadow: inset 0 0 0 1px var(--ccwgtv-ring);
            }

            .dpad-grid {
                width: 100%;
                height: 100%;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-template-rows: repeat(3, 1fr);
                gap: calc(6px * var(--ccwgtv-scale));
            }

            .row {
                width: 100%;
                display: flex;
                justify-content: center;
                gap: calc(10px * var(--ccwgtv-scale));
            }

            button {
                appearance: none;
                -webkit-appearance: none;
                border: 0;
                outline: 0;
                padding: 0;
                margin: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: var(--ccwgtv-text);
                background: var(--ccwgtv-surface);
                cursor: pointer;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                transition: transform 120ms ease, background-color 120ms ease, opacity 120ms ease;
            }

            button:hover {
                background: var(--ccwgtv-surface-strong);
            }

            button:active {
                background: var(--ccwgtv-press);
                transform: scale(0.96);
            }

            button:disabled {
                opacity: 0.38;
                cursor: default;
            }

            .key {
                width: calc(56px * var(--ccwgtv-scale));
                height: calc(56px * var(--ccwgtv-scale));
                border-radius: 50%;
                box-shadow: var(--ccwgtv-shadow);
            }

            .key--dpad {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: var(--ccwgtv-surface-strong);
                box-shadow: none;
            }

            .key--dpad-center {
                background: rgba(255, 255, 255, 0.18);
            }

            .key--bottom {
                width: calc(42px * var(--ccwgtv-scale));
                height: calc(42px * var(--ccwgtv-scale));
                box-shadow: none;
            }

            .spacer {
                width: 100%;
                height: 100%;
            }

            ha-icon {
                --mdc-icon-size: calc(24px * var(--ccwgtv-scale));
                color: currentColor;
            }

            .key--dpad ha-icon {
                --mdc-icon-size: calc(22px * var(--ccwgtv-scale));
            }

            .key--bottom ha-icon {
                --mdc-icon-size: calc(19px * var(--ccwgtv-scale));
            }
        `;
        this.shadowRoot.appendChild(style);
    }

    static getStubConfig() {
        return { title: 'Google TV Streamer Remote', scale: 0.87, actions: 'add below as per documentation' };
    }

    setConfig(config) {
        this.config = config;
        this.scale = Math.max(0.5, Math.min(this.config.scale || 0.87, 1.5));
        this.style.setProperty('--ccwgtv-scale', String(this.scale));

        if (!this.card) {
            this.card = document.createElement('ha-card');
            this.card.className = 'card';

            this.titleElement = document.createElement('h2');
            this.titleElement.className = 'title';
            this.card.appendChild(this.titleElement);

            this.content = document.createElement('div');
            this.content.className = 'remote';
            this.content.addEventListener('click', this.handleClick);
            this.card.appendChild(this.content);

            this.shadowRoot.appendChild(this.card);
        }

        this.updateTitle();
        this.renderRemote();
        this.updateButtonStates();
    }

    disconnectedCallback() {
        if (this.content) {
            this.content.removeEventListener('click', this.handleClick);
        }
    }

    updateTitle() {
        if (!this.titleElement) {
            return;
        }

        const title = this.config?.title;
        this.titleElement.hidden = !title;
        this.titleElement.textContent = title || '';
    }

    getActionConfig(action) {
        const keys = [action, ...(this.buttonAliases[action] || [])];

        for (const key of keys) {
            if (this.config?.[key]) {
                return this.config[key];
            }
        }

        return null;
    }

    renderRemote() {
        if (!this.content) {
            return;
        }

        this.content.innerHTML = `
            <div class="dpad-shell">
                <div class="dpad-grid">
                    <div class="spacer"></div>
                    ${this.renderButton('up', 'mdi:menu-up', 'key key--dpad')}
                    <div class="spacer"></div>
                    ${this.renderButton('left', 'mdi:menu-left', 'key key--dpad')}
                    ${this.renderButton('select', 'mdi:circle-small', 'key key--dpad key--dpad-center')}
                    ${this.renderButton('right', 'mdi:menu-right', 'key key--dpad')}
                    <div class="spacer"></div>
                    ${this.renderButton('down', 'mdi:menu-down', 'key key--dpad')}
                    <div class="spacer"></div>
                </div>
            </div>
            <div class="row">
                ${this.renderButton('back', 'mdi:arrow-left', 'key')}
                ${this.renderButton('home', 'mdi:home', 'key')}
            </div>
            <div class="row">
                ${this.renderButton('assistant', 'mdi:microphone', 'key')}
                ${this.renderButton('volume_up', 'mdi:volume-plus', 'key')}
            </div>
            <div class="row">
                ${this.renderButton('volume_mute', 'mdi:volume-off', 'key')}
                ${this.renderButton('volume_down', 'mdi:volume-minus', 'key')}
            </div>
            <div class="row">
                ${this.renderButton('youtube', 'mdi:youtube', 'key')}
                ${this.renderButton('netflix', 'mdi:netflix', 'key')}
            </div>
            <div class="row">
                ${this.renderButton('power', 'mdi:power', 'key key--bottom')}
                ${this.renderButton('star', 'mdi:star-outline', 'key key--bottom')}
            </div>
        `;
    }

    renderButton(action, icon, className) {
        return `
            <button
                type="button"
                class="${className}"
                data-action="${action}"
                aria-label="${action.replace('_', ' ')}"
                title="${action.replace('_', ' ')}"
            >
                <ha-icon icon="${icon}"></ha-icon>
            </button>
        `;
    }

    updateButtonStates() {
        if (!this.content) {
            return;
        }

        this.content.querySelectorAll('button[data-action]').forEach((button) => {
            button.disabled = !this.getActionConfig(button.dataset.action);
        });
    }

    handleClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button || button.disabled || !this._hass) {
            return;
        }

        const actionConfig = this.getActionConfig(button.dataset.action);
        if (!actionConfig) {
            return;
        }

        this._hass.callService(
            actionConfig.domain,
            actionConfig.service,
            actionConfig.service_data || {}
        );
    }

    set hass(hass) {
        this._hass = hass;
        this.updateButtonStates();
    }

    getCardSize() {
        return 4;
    }
}

customElements.define('ccwgtv-remote-card', CCwGTVRemoteCard);
