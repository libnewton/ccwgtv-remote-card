window.customCards = window.customCards || [];
window.customCards.push({
    type: "ccwgtv-remote-card",
    name: "CCwGTV Remote Card",
    description: "A custom remote control for Google TV",
    preview: true,
});

class CCwGTVRemoteCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.styleElement = document.createElement('style');
        this.shadowRoot.appendChild(this.styleElement);

        this.buttonPressState = {};
        this.buttonAliases = {
            star: ['input'],
        };
        this.boundResizeCanvas = this.resizeCanvas.bind(this);

        this.applyStyles();
        this.preloadIcons();
    }

    applyStyles() {
        this.styleElement.textContent = `
            :host {
                display: block;
                --ccwgtv-shell-top: rgba(25, 31, 41, 0.96);
                --ccwgtv-shell-bottom: rgba(9, 12, 18, 0.98);
                --ccwgtv-shell-border: rgba(255, 255, 255, 0.08);
                --ccwgtv-title-bg: rgba(255, 255, 255, 0.07);
                --ccwgtv-title-color: var(--primary-text-color, #f5f7fa);
                --ccwgtv-remote-body-start: #394250;
                --ccwgtv-remote-body-end: #242b36;
                --ccwgtv-remote-edge: rgba(255, 255, 255, 0.12);
                --ccwgtv-button-top: #eef2f7;
                --ccwgtv-button-bottom: #c3ccd8;
                --ccwgtv-button-top-muted: #d9e3f5;
                --ccwgtv-button-bottom-muted: #a9b7cf;
                --ccwgtv-center-top: #d8dee8;
                --ccwgtv-center-bottom: #aeb7c5;
                --ccwgtv-dpad-ring: rgba(255, 255, 255, 0.2);
                --ccwgtv-shadow: rgba(0, 0, 0, 0.34);
            }

            .card {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 14px;
                padding: 18px 14px 20px;
                background: linear-gradient(180deg, var(--ccwgtv-shell-top), var(--ccwgtv-shell-bottom));
                border: 1px solid var(--ccwgtv-shell-border);
                border-radius: 32px;
                box-shadow: 0 18px 40px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.04);
                overflow: hidden;
            }

            .title {
                margin: 0;
                padding: 8px 14px;
                font-size: 0.95rem;
                line-height: 1.1;
                font-weight: 600;
                letter-spacing: 0.02em;
                text-align: center;
                color: var(--ccwgtv-title-color);
                background: var(--ccwgtv-title-bg);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 999px;
                backdrop-filter: blur(12px);
            }

            .content {
                display: flex;
                justify-content: center;
                width: 100%;
            }

            .canvas {
                display: block;
                background: transparent;
            }
        `;
    }

    preloadIcons() {
        this.icons = {};
        const iconPaths = {
            up: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/menu-up.svg',
            down: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/menu-down.svg',
            left: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/menu-left.svg',
            right: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/menu-right.svg',
            select: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/circle-small.svg',
            back: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/arrow-left.svg',
            home: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/home.svg',
            assistant: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/microphone.svg',
            volume_mute: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/volume-off.svg',
            volume_down: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/volume-minus.svg',
            volume_up: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/volume-plus.svg',
            youtube: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/youtube.svg',
            netflix: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/netflix.svg',
            power: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/power.svg',
            star: 'https://cdn.jsdelivr.net/npm/@mdi/svg/svg/star-outline.svg',
        };

        const promises = Object.keys(iconPaths).map((key) => new Promise((resolve, reject) => {
            const img = new Image();
            img.src = iconPaths[key];
            img.onload = () => {
                this.icons[key] = img;
                resolve();
            };
            img.onerror = reject;
        }));

        Promise.all(promises).then(() => {
            if (this.content) {
                this.drawRemoteControl();
            }
        }).catch((err) => {
            console.error('Error loading icons', err);
        });
    }

    static getStubConfig() {
        return { title: 'Google TV Streamer Remote', scale: 0.87, actions: 'add below as per documentation' };
    }

    setConfig(config) {
        this.config = config;
        this.scale = Math.max(0.5, Math.min(this.config.scale || 0.87, 1.5));

        if (!this.content) {
            const card = document.createElement('ha-card');
            card.classList.add('card');

            this.titleElement = document.createElement('h2');
            this.titleElement.classList.add('title');
            card.appendChild(this.titleElement);

            this.content = document.createElement('div');
            this.content.classList.add('content');
            card.appendChild(this.content);
            this.shadowRoot.appendChild(card);

            window.addEventListener('resize', this.boundResizeCanvas);
        }

        this.updateTitle();
        this.buttonRegions = [];
        this.drawRemoteControl();
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.boundResizeCanvas);
    }

    updateTitle() {
        if (!this.titleElement) {
            return;
        }

        const title = this.config?.title;
        this.titleElement.hidden = !title;
        this.titleElement.textContent = title || '';
    }

    resizeCanvas() {
        if (this.content) {
            this.drawRemoteControl();
        }
    }

    getThemeValue(name, fallback) {
        const value = getComputedStyle(this).getPropertyValue(name).trim();
        return value || fallback;
    }

    getPalette() {
        return {
            remoteBodyStart: this.getThemeValue('--ccwgtv-remote-body-start', '#394250'),
            remoteBodyEnd: this.getThemeValue('--ccwgtv-remote-body-end', '#242b36'),
            remoteEdge: this.getThemeValue('--ccwgtv-remote-edge', 'rgba(255, 255, 255, 0.12)'),
            buttonTop: this.getThemeValue('--ccwgtv-button-top', '#eef2f7'),
            buttonBottom: this.getThemeValue('--ccwgtv-button-bottom', '#c3ccd8'),
            assistantTop: this.getThemeValue('--ccwgtv-button-top-muted', '#d9e3f5'),
            assistantBottom: this.getThemeValue('--ccwgtv-button-bottom-muted', '#a9b7cf'),
            centerTop: this.getThemeValue('--ccwgtv-center-top', '#d8dee8'),
            centerBottom: this.getThemeValue('--ccwgtv-center-bottom', '#aeb7c5'),
            dpadRing: this.getThemeValue('--ccwgtv-dpad-ring', 'rgba(255, 255, 255, 0.2)'),
            shadow: this.getThemeValue('--ccwgtv-shadow', 'rgba(0, 0, 0, 0.34)'),
        };
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

    handleButtonPress(action, buttonIndex) {
        const actionConfig = this.getActionConfig(action);
        if (actionConfig && this._hass) {
            this._hass.callService(actionConfig.domain, actionConfig.service, actionConfig.service_data || {});
            this.triggerButtonFade(buttonIndex);
        }
    }

    triggerButtonFade(buttonIndex) {
        this.buttonPressState[buttonIndex] = { opacity: 1.0 };
        this.animateFade(buttonIndex);
    }

    animateFade(buttonIndex) {
        const fadeDuration = 250;
        const fadeSteps = 30;
        const stepDuration = fadeDuration / fadeSteps;

        const fadeStep = () => {
            if (!this.buttonPressState[buttonIndex]) {
                return;
            }

            this.buttonPressState[buttonIndex].opacity -= 1 / fadeSteps;
            if (this.buttonPressState[buttonIndex].opacity <= 0) {
                delete this.buttonPressState[buttonIndex];
            } else {
                setTimeout(fadeStep, stepDuration);
            }

            this.drawRemoteControl();
        };

        fadeStep();
    }

    drawRemoteControl() {
        if (!this.content) {
            return;
        }

        this.content.innerHTML = '<canvas id="remoteCanvas" class="canvas"></canvas>';
        const canvas = this.content.querySelector('#remoteCanvas');

        const bodyWidth = 216 * this.scale;
        const bodyHeight = bodyWidth * 10 / 3;
        canvas.width = bodyWidth;
        canvas.height = bodyHeight;
        canvas.style.width = `${bodyWidth}px`;
        canvas.style.height = `${bodyHeight}px`;

        const ctx = canvas.getContext('2d');
        const palette = this.getPalette();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        this.buttonRegions = [];

        const drawCircleButton = (x, y, radius, colors, iconKey, action, buttonIndex) => {
            const opacity = this.buttonPressState[buttonIndex]?.opacity || 1.0;
            const gradient = ctx.createLinearGradient(x, y - radius, x, y + radius);
            gradient.addColorStop(0, colors.top);
            gradient.addColorStop(1, colors.bottom);

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = gradient;
            ctx.shadowColor = palette.shadow;
            ctx.shadowBlur = radius * 0.45;
            ctx.shadowOffsetY = radius * 0.18;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.strokeStyle = palette.remoteEdge;
            ctx.lineWidth = Math.max(1, radius * 0.08);
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();

            if (iconKey && this.icons[iconKey]) {
                const iconSize = radius * 1.02;
                ctx.drawImage(this.icons[iconKey], x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
            }
            ctx.restore();

            this.buttonRegions.push({ type: 'circle', x, y, radius, action });
        };

        const handleCanvasClick = (event) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            for (const [index, button] of this.buttonRegions.entries()) {
                const distance = Math.sqrt((mouseX - button.x) ** 2 + (mouseY - button.y) ** 2);
                if (distance < button.radius) {
                    this.handleButtonPress(button.action, index);
                    break;
                }
            }
        };

        const handleCanvasHover = (event) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const isHovering = this.buttonRegions.some((button) => {
                const distance = Math.sqrt((mouseX - button.x) ** 2 + (mouseY - button.y) ** 2);
                return distance < button.radius;
            });

            canvas.style.cursor = isHovering ? 'pointer' : 'default';
        };

        canvas.addEventListener('click', handleCanvasClick.bind(this));
        canvas.addEventListener('mousemove', handleCanvasHover);

        const drawRemoteBody = () => {
            const x = centerX - bodyWidth / 2;
            const y = centerY - bodyHeight / 2;
            const radius = bodyWidth * 0.46;
            const gradient = ctx.createLinearGradient(0, y, 0, y + bodyHeight);
            gradient.addColorStop(0, palette.remoteBodyStart);
            gradient.addColorStop(1, palette.remoteBodyEnd);

            ctx.save();
            ctx.shadowColor = palette.shadow;
            ctx.shadowBlur = bodyWidth * 0.2;
            ctx.shadowOffsetY = bodyWidth * 0.08;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, bodyWidth, bodyHeight, radius);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = palette.remoteEdge;
            ctx.lineWidth = Math.max(1.25, bodyWidth * 0.012);
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, bodyWidth - 2, bodyHeight - 2, radius - 1);
            ctx.stroke();
        };

        const drawDPad = () => {
            const dPadRadius = bodyWidth * 0.46;
            const buttonRadius = bodyWidth * 0.142;
            const dPadCenterY = centerY - bodyHeight * 0.345;
            const outerGradient = ctx.createLinearGradient(0, dPadCenterY - dPadRadius, 0, dPadCenterY + dPadRadius);
            outerGradient.addColorStop(0, '#e8edf4');
            outerGradient.addColorStop(1, '#b8c2d0');

            ctx.save();
            ctx.fillStyle = outerGradient;
            ctx.shadowColor = palette.shadow;
            ctx.shadowBlur = bodyWidth * 0.08;
            ctx.shadowOffsetY = bodyWidth * 0.03;
            ctx.beginPath();
            ctx.arc(centerX, dPadCenterY, dPadRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = palette.dpadRing;
            ctx.lineWidth = Math.max(2, bodyWidth * 0.012);
            ctx.beginPath();
            ctx.arc(centerX, dPadCenterY, dPadRadius, 0, Math.PI * 2);
            ctx.stroke();

            drawCircleButton(centerX, dPadCenterY - bodyHeight * 0.09, buttonRadius, { top: palette.buttonTop, bottom: palette.buttonBottom }, 'up', 'up', 0);
            drawCircleButton(centerX, dPadCenterY + bodyHeight * 0.09, buttonRadius, { top: palette.buttonTop, bottom: palette.buttonBottom }, 'down', 'down', 1);
            drawCircleButton(centerX - bodyWidth * 0.3, dPadCenterY, buttonRadius, { top: palette.buttonTop, bottom: palette.buttonBottom }, 'left', 'left', 2);
            drawCircleButton(centerX + bodyWidth * 0.3, dPadCenterY, buttonRadius, { top: palette.buttonTop, bottom: palette.buttonBottom }, 'right', 'right', 3);
            drawCircleButton(centerX, dPadCenterY, buttonRadius, { top: palette.centerTop, bottom: palette.centerBottom }, 'select', 'select', 4);
        };

        const drawControlButtons = () => {
            const buttonRadius = bodyWidth / 6;
            const leftX = centerX - bodyWidth / 4;
            const rightX = centerX + bodyWidth / 4;
            const startY = centerY - bodyHeight * 0.11;
            const rowGap = bodyHeight * 0.115;
            const buttons = [
                { x: leftX, y: startY, icon: 'back', action: 'back', colors: { top: palette.buttonTop, bottom: palette.buttonBottom } },
                { x: rightX, y: startY, icon: 'home', action: 'home', colors: { top: palette.buttonTop, bottom: palette.buttonBottom } },
                { x: leftX, y: startY + rowGap, icon: 'assistant', action: 'assistant', colors: { top: palette.assistantTop, bottom: palette.assistantBottom } },
                { x: rightX, y: startY + rowGap, icon: 'volume_up', action: 'volume_up', colors: { top: palette.buttonTop, bottom: palette.buttonBottom } },
                { x: leftX, y: startY + rowGap * 2, icon: 'volume_mute', action: 'volume_mute', colors: { top: palette.buttonTop, bottom: palette.buttonBottom } },
                { x: rightX, y: startY + rowGap * 2, icon: 'volume_down', action: 'volume_down', colors: { top: palette.buttonTop, bottom: palette.buttonBottom } },
                { x: leftX, y: startY + rowGap * 3, icon: 'youtube', action: 'youtube', colors: { top: palette.buttonTop, bottom: palette.buttonBottom } },
                { x: rightX, y: startY + rowGap * 3, icon: 'netflix', action: 'netflix', colors: { top: palette.buttonTop, bottom: palette.buttonBottom } },
            ];

            buttons.forEach((button, index) => {
                drawCircleButton(button.x, button.y, buttonRadius, button.colors, button.icon, button.action, 5 + index);
            });
        };

        const drawBottomButtons = () => {
            const buttonRadius = bodyWidth / 10;
            const rowY = centerY + bodyHeight * 0.345;
            const capsuleWidth = bodyWidth * 0.72;
            const capsuleHeight = bodyHeight * 0.088;
            const capsuleX = centerX - capsuleWidth / 2;
            const capsuleY = rowY - capsuleHeight / 2;

            ctx.save();
            ctx.strokeStyle = palette.dpadRing;
            ctx.lineWidth = Math.max(2, bodyWidth * 0.011);
            ctx.beginPath();
            ctx.roundRect(capsuleX, capsuleY, capsuleWidth, capsuleHeight, capsuleHeight / 2);
            ctx.stroke();
            ctx.restore();

            drawCircleButton(centerX - bodyWidth / 4, rowY, buttonRadius, { top: palette.buttonTop, bottom: palette.buttonBottom }, 'power', 'power', 13);
            drawCircleButton(centerX + bodyWidth / 4, rowY, buttonRadius, { top: palette.buttonTop, bottom: palette.buttonBottom }, 'star', 'star', 14);
        };

        drawRemoteBody();
        drawDPad();
        drawControlButtons();
        drawBottomButtons();
    }

    set hass(hass) {
        this._hass = hass;
        if (this.content) {
            this.drawRemoteControl();
        }
    }

    getCardSize() {
        return 6;
    }
}

customElements.define('ccwgtv-remote-card', CCwGTVRemoteCard);
