// ============================================
//  NETWORK MONITOR - Dashboard JS
// ============================================

// ── Reloj en tiempo real ──
function updateClock() {
    const el = document.getElementById('clock');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('es-ES');
    }
}
setInterval(updateClock, 1000);
updateClock();

// ── WebSocket (alertas en tiempo real) ──
function initWebSocket() {
    try {
        const socket = new SockJS('/ws');
        const stompClient = Stomp.over(socket);
        stompClient.debug = null; // Silenciar logs

        stompClient.connect({}, function () {
            console.log('✅ WebSocket conectado');

            stompClient.subscribe('/topic/alerts', function (message) {
                const alert = JSON.parse(message.body);
                showToast(`${alert.title}`);
                refreshSummaryCards();
            });
        }, function (error) {
            console.warn('WebSocket desconectado, reintentando en 5s...', error);
            setTimeout(initWebSocket, 5000);
        });
    } catch (e) {
        console.warn('WebSocket no disponible:', e);
    }
}

// ── Toast de notificación ──
function showToast(message) {
    const toast = document.getElementById('alertToast');
    const msg   = document.getElementById('toastMessage');
    if (toast && msg) {
        msg.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 5000);
    }
}

function closeToast() {
    const toast = document.getElementById('alertToast');
    if (toast) toast.classList.add('hidden');
}

// ── Actualizar tarjetas de resumen ──
async function refreshSummaryCards() {
    try {
        const res = await fetch('/api/summary');
        const data = await res.json();

        setEl('totalHosts',      data.totalHosts);
        setEl('onlineHosts',     data.onlineHosts);
        setEl('offlineHosts',    data.offlineHosts);
        setEl('activeAlertCount', data.activeAlerts);
    } catch (e) {
        console.error('Error actualizando resumen:', e);
    }
}

function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ── Grafico de latencia por host ──
let latencyChart = null;

async function loadLatencyChart() {
    const selector = document.getElementById('hostSelector');
    if (!selector) return;
    const hostId = selector.value;
    if (!hostId) return;

    try {
        const res = await fetch(`/api/hosts/${hostId}/ping-history?hours=6`);
        const data = await res.json();

        const labels = data.map(p => {
            const d = new Date(p.recordedAt);
            return d.getHours().toString().padStart(2,'0') + ':' +
                   d.getMinutes().toString().padStart(2,'0');
        });

        const latencies = data.map(p => p.latencyMs);
        const bgColors  = data.map(p => p.reachable ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.15)');

        const canvas = document.getElementById('latencyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (latencyChart) latencyChart.destroy();

        latencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Latencia (ms)',
                    data: latencies,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: data.map(p => p.reachable ? '#6366f1' : '#ef4444'),
                    spanGaps: false
                }]
            },
            options: {
                responsive: true,
                animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.raw !== null
                                ? `Latencia: ${ctx.raw.toFixed(1)} ms`
                                : 'Sin respuesta'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'ms', color: '#64748b' },
                        grid: { color: 'rgba(255,255,255,0.04)' }
                    },
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { maxTicksLimit: 20 }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Error cargando gráfico de latencia:', e);
    }
}

// ── Modal ──
function toggleModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.toggle('hidden');
}

// ── Refresh general del dashboard ──
function refreshAll() {
    refreshSummaryCards();
    loadLatencyChart();
    location.reload();
}

// ── Auto-refresh cada 30 segundos ──
setInterval(() => {
    refreshSummaryCards();
    loadLatencyChart();
}, 30000);

// ── Inicializar ──
document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    refreshSummaryCards();

    // Si hay selector de host, cargar grafico al primer host disponible
    const sel = document.getElementById('hostSelector');
    if (sel && sel.options.length > 1) {
        sel.selectedIndex = 1;
        loadLatencyChart();
    }
});
