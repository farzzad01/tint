// تنظیمات اولیه
let isDrawing = false;
let startX, startY, endX, endY;
const video = document.getElementById('cameraFeed');
const tintCanvas = document.getElementById('tintCanvas');
const ctx = tintCanvas.getContext('2d');
const selectionBox = document.getElementById('selectionBox');
const tintSlider = document.getElementById('tintSlider');
const tintValue = document.getElementById('tintValue');
const simulateBtn = document.getElementById('simulateBtn');
const resetBtn = document.getElementById('resetBtn');

// 1. دسترسی به دوربین
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            tintCanvas.width = video.videoWidth;
            tintCanvas.height = video.videoHeight;
        };
    } catch (err) {
        alert('خطا در دسترسی به دوربین!');
    }
}

// 2. انتخاب ناحیه شیشه (کشیدن مستطیل)
function handleMouseDown(e) {
    isDrawing = true;
    const rect = video.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    selectionBox.style.display = 'block';
}

function handleMouseMove(e) {
    if (!isDrawing) return;
    const rect = video.getBoundingClientRect();
    endX = e.clientX - rect.left;
    endY = e.clientY - rect.top;
    
    // بروزرسانی مختصات مستطیل
    selectionBox.style.left = Math.min(startX, endX) + 'px';
    selectionBox.style.top = Math.min(startY, endY) + 'px';
    selectionBox.style.width = Math.abs(endX - startX) + 'px';
    selectionBox.style.height = Math.abs(endY - startY) + 'px';
}

function handleMouseUp() {
    isDrawing = false;
    selectionBox.style.display = 'none';
    applyTint();
}

// 3. اعمال تینت
function applyTint() {
    ctx.clearRect(0, 0, tintCanvas.width, tintCanvas.height);
    const opacity = tintSlider.value / 100;
    
    if (startX && startY) {
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.fillRect(
            Math.min(startX, endX),
            Math.min(startY, endY),
            Math.abs(endX - startX),
            Math.abs(endY - startY)
        );
    }
}

// 4. حالت داخل ماشین
function toggleSimulation() {
    document.body.classList.toggle('simulation-mode');
}

// 5. ریست تنظیمات
function resetSelection() {
    startX = startY = endX = endY = null;
    ctx.clearRect(0, 0, tintCanvas.width, tintCanvas.height);
}

// رویدادها
video.addEventListener('mousedown', handleMouseDown);
video.addEventListener('mousemove', handleMouseMove);
video.addEventListener('mouseup', handleMouseUp);

tintSlider.addEventListener('input', (e) => {
    tintValue.textContent = `${e.target.value}%`;
    applyTint();
});

simulateBtn.addEventListener('click', toggleSimulation);
resetBtn.addEventListener('click', resetSelection);

// راه‌اندازی اولیه
initCamera();