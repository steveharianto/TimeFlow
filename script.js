class Stopwatch {
    constructor(id, label = 'Stopwatch') {
        this.id = id;
        this.label = label;
        this.startTime = null;
        this.elapsedTime = 0;
        this.isRunning = false;
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startTime = Date.now() - this.elapsedTime;
        }
    }

    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.elapsedTime = Date.now() - this.startTime;
        }
    }

    getCurrentTime() {
        if (this.isRunning) {
            return Date.now() - this.startTime;
        }
        return this.elapsedTime;
    }

    reset() {
        this.elapsedTime = 0;
        this.isRunning = false;
        this.startTime = null;
    }
}

class StopwatchApp {
    constructor() {
        this.stopwatches = new Map();
        this.nextId = 0;
        this.loadFromSession();
        this.setupEventListeners();
        this.startUpdateLoop();

        // Save state periodically
        setInterval(() => {
            this.saveToSession();
        }, 1000);

        // Save before page unload
        window.addEventListener('beforeunload', () => {
            this.saveToSession();
        });
    }

    setupEventListeners() {
        document.getElementById('addStopwatch').addEventListener('click', () => this.addStopwatch());
    }

    addStopwatch() {
        const stopwatch = new Stopwatch(this.nextId++);
        this.stopwatches.set(stopwatch.id, stopwatch);
        this.renderStopwatch(stopwatch);
        this.saveToSession();
    }

    removeStopwatch(id) {
        this.stopwatches.delete(id);
        document.getElementById(`stopwatch-${id}`).remove();
        this.saveToSession();
    }

    renderStopwatch(stopwatch) {
        const container = document.getElementById('stopwatchContainer');
        const stopwatchElement = document.createElement('div');
        stopwatchElement.id = `stopwatch-${stopwatch.id}`;
        stopwatchElement.className = `stopwatch ${stopwatch.isRunning ? 'running' : 'stopped'}`;
        
        stopwatchElement.innerHTML = `
            <div class="stopwatch-header">
                <input type="text" value="${stopwatch.label}" placeholder="Label">
                <span class="status-indicator">${stopwatch.isRunning ? 'Running' : 'Stopped'}</span>
            </div>
            <div class="time">00:00:00.00</div>
            <div class="controls">
                <button class="start">Start</button>
                <button class="${stopwatch.isRunning ? 'stop' : 'reset'}">${stopwatch.isRunning ? 'Stop' : 'Reset'}</button>
                <button class="remove">Remove</button>
            </div>
        `;

        const input = stopwatchElement.querySelector('input');
        input.addEventListener('change', (e) => {
            stopwatch.label = e.target.value;
            this.saveToSession();
        });

        const startButton = stopwatchElement.querySelector('.start');
        const stopResetButton = stopwatchElement.querySelector('.stop, .reset');

        startButton.addEventListener('click', () => {
            stopwatch.start();
            this.updateStopwatchUI(stopwatchElement, stopwatch);
            this.saveToSession();
        });

        stopResetButton.addEventListener('click', () => {
            if (stopwatch.isRunning) {
                stopwatch.stop();
            } else {
                stopwatch.reset();
            }
            this.updateStopwatchUI(stopwatchElement, stopwatch);
            this.saveToSession();
        });

        stopwatchElement.querySelector('.remove').addEventListener('click', () => {
            this.confirmRemoval(stopwatch.id, stopwatch.label);
        });

        container.appendChild(stopwatchElement);
    }

    confirmRemoval(id, label) {
        const modalHTML = `
            <div class="modal-overlay">
                <div class="modal">
                    <h3>Confirm Removal</h3>
                    <p>Are you sure you want to remove "${label || 'this timer'}"?</p>
                    <div class="modal-buttons">
                        <button class="cancel">Cancel</button>
                        <button class="confirm">Remove</button>
                    </div>
                </div>
            </div>
        `;

        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        document.body.appendChild(modalElement);

        const overlay = modalElement.querySelector('.modal-overlay');
        const cancelBtn = modalElement.querySelector('.cancel');
        const confirmBtn = modalElement.querySelector('.confirm');

        const closeModal = () => {
            modalElement.remove();
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        
        cancelBtn.addEventListener('click', closeModal);
        
        confirmBtn.addEventListener('click', () => {
            this.removeStopwatch(id);
            closeModal();
        });
    }

    updateStopwatchUI(element, stopwatch) {
        element.className = `stopwatch ${stopwatch.isRunning ? 'running' : 'stopped'}`;
        
        const statusIndicator = element.querySelector('.status-indicator');
        statusIndicator.textContent = stopwatch.isRunning ? 'Running' : 'Stopped';
        
        const stopResetButton = element.querySelector('.stop, .reset');
        stopResetButton.textContent = stopwatch.isRunning ? 'Stop' : 'Reset';
        stopResetButton.className = stopwatch.isRunning ? 'stop' : 'reset';
    }

    startUpdateLoop() {
        setInterval(() => {
            this.stopwatches.forEach((stopwatch) => {
                const timeElement = document.querySelector(`#stopwatch-${stopwatch.id} .time`);
                if (timeElement) {
                    timeElement.textContent = this.formatTime(stopwatch.getCurrentTime());
                }
            });
        }, 10);
    }

    saveToSession() {
        const data = Array.from(this.stopwatches.entries()).map(([id, stopwatch]) => ({
            id,
            label: stopwatch.label,
            elapsedTime: stopwatch.getCurrentTime(),
            isRunning: stopwatch.isRunning,
            timestamp: Date.now()
        }));
        sessionStorage.setItem('stopwatches', JSON.stringify(data));
    }

    loadFromSession() {
        const data = JSON.parse(sessionStorage.getItem('stopwatches') || '[]');
        const currentTime = Date.now();

        data.forEach(({ id, label, elapsedTime, isRunning, timestamp }) => {
            const stopwatch = new Stopwatch(id, label);
            
            if (isRunning) {
                // For running stopwatches, set the startTime to maintain the elapsed time
                stopwatch.elapsedTime = elapsedTime;
                stopwatch.isRunning = true;
                stopwatch.startTime = currentTime - elapsedTime;
            } else {
                // For stopped stopwatches, just set the elapsed time
                stopwatch.elapsedTime = elapsedTime;
                stopwatch.isRunning = false;
            }

            this.stopwatches.set(id, stopwatch);
            this.renderStopwatch(stopwatch);
            this.nextId = Math.max(this.nextId, id + 1);
        });
    }

    startStopwatch(id) {
        const stopwatch = this.stopwatches.get(id);
        if (stopwatch) {
            stopwatch.start();
            this.saveToSession();
        }
    }

    stopStopwatch(id) {
        const stopwatch = this.stopwatches.get(id);
        if (stopwatch) {
            stopwatch.stop();
            this.saveToSession();
        }
    }

    formatTime(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);

        return `${hours.toString().padStart(2, '0')}:${
            minutes.toString().padStart(2, '0')}:${
            seconds.toString().padStart(2, '0')}.${
            centiseconds.toString().padStart(2, '0')}`;
    }
}

new StopwatchApp(); 