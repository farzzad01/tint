// تنظیمات پیشرفته
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

let selectedAreas = [];
let model = null;
let isEditMode = false;
let currentThreshold = 50;

// 1. راه اندازی دوربین
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            tintCanvas.width = video.videoWidth;
            tintCanvas.height = video.videoHeight;
            initAdvancedFeatures();
        };
    } catch (err) {
        alert('خطا در دسترسی به دوربین!');
        console.error(err);
    }
}

// 2. بارگذاری مدل هوش مصنوعی
async function initAdvancedFeatures() {
    model = await cocoSsd.load();
    console.log('مدل هوش مصنوعی بارگذاری شد');
    setupEventListeners();
}

// 3. سیستم انتخاب دستی
function handleMouseDown(e) {
    if(isEditMode) return;
    
    isDrawing = true;
    const rect = video.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    selectionBox.style.display = 'block';
}

function handleMouseMove(e) {
    if (!isDrawing || isEditMode) return;
    
    const rect = video.getBoundingClientRect();
    endX = e.clientX - rect.left;
    endY = e.clientY - rect.top;
    
    selectionBox.style.left = Math.min(startX, endX) + 'px';
    selectionBox.style.top = Math.min(startY, endY) + 'px';
    selectionBox.style.width = Math.abs(endX - startX) + 'px';
    selectionBox.style.height = Math.abs(endY - startY) + 'px';
}

function handleMouseUp() {
    if(isEditMode) return;
    
    isDrawing = false;
    selectionBox.style.display = 'none';
    
    const newArea = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY)
    };
    
    if(newArea.width > 10 && newArea.height > 10) {
        selectedAreas.push(newArea);
        drawAreas();
    }
}

// 4. سیستم تشخیص خودکار
async function autoDetectWindows() {
    if(!model) return;
    
    const predictions = await model.detect(video);
    selectedAreas = [];
    
    predictions.forEach(prediction => {
        if(['car', 'truck'].includes(prediction.class)) {
            const windowArea = {
                x: prediction.bbox[0],
                y: prediction.bbox[1],
                width: prediction.bbox[2],
                height: prediction.bbox[3] * 0.4,
                isAutoDetected: true
            };
            selectedAreas.push(windowArea);
        }
    });
    
    drawAreas();
    removeOverlappingAreas();
}

// 5. حذف نواحی نامربوط
function removeOverlappingAreas() {
    const cleanedAreas = [];
    selectedAreas.forEach(area => {
        let isOverlapping = false;
        cleanedAreas.forEach(existing => {
            if(checkOverlap(area, existing)) {
                isOverlapping = true;
            }
        });
        if(!isOverlapping) cleanedAreas.push(area);
    });
    selectedAreas = cleanedAreas;
}

function checkOverlap(rect1, rect2) {
    return !(rect1.x > rect2.x + rect2.width || 
           rect1.x + rect1.width < rect2.x || 
           rect1.y > rect2.y + rect2.height || 
           rect1.y + rect1.height < rect2.y);
}

// 6. ویرایش دستی
function toggleEditMode() {
    isEditMode = !isEditMode;
    document.querySelectorAll('.area-handle').forEach(handle => {
        handle.style.display = isEditMode ? 'block' : 'none';
    });
    if(isEditMode) initDraggableAreas();
}

function initDraggableAreas() {
    selectedAreas.forEach((area, index) => {
        const handle = document.createElement('div');
        handle.className = 'area-handle';
        handle.style.left = area.x + 'px';
        handle.style.top = area.y + 'px';
        handle.style.width = area.width + 'px';
        handle.style.height = area.height + 'px';
        handle.dataset.index = index;
        tintCanvas.parentElement.appendChild(handle);
    });

    $(".area-handle").draggable({
        containment: "parent",
        stop: function(event, ui) {
            const index = parseInt(ui.helper.data('index'));
            selectedAreas[index].x = ui.position.left;
            selectedAreas[index].y = ui.position.top;
            drawAreas();
        }
    }).resizable({
        stop: function(event, ui) {
            const index = parseInt(ui.element.data('index'));
            selectedAreas[index].width = ui.size.width;
            selectedAreas[index].height = ui.size.height;
            drawAreas();
        }
    });
}

// 7. اعمال تینت پیشرفته
function drawAreas() {
    ctx.clearRect(0, 0, tintCanvas.width, tintCanvas.height);
    ctx.globalCompositeOperation = 'source-over';
    
    selectedAreas.forEach(area => {
        ctx.fillStyle = `rgba(0, 0, 0, ${currentThreshold/100})`;
        ctx.fillRect(area.x, area.y, area.width, area.height);
    });
    
    applyThresholdEffect();
}

function applyThresholdEffect() {
    const imageData = ctx.getImageData(0, 0, tintCanvas.width, tintCanvas.height);
    
    for(let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i+1];
        const b = imageData.data[i+2];
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        
        imageData.data[i+3] = luminance > (255 - currentThreshold) 
            ? 255 * (currentThreshold/100) 
            : 0;
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// 8. کنترل رویدادها
function setupEventListeners() {
    video.addEventListener('mousedown', handleMouseDown);
    video.addEventListener('mousemove', handleMouseMove);
    video.addEventListener('mouseup', handleMouseUp);

    tintSlider.addEventListener('input', (e) => {
        currentThreshold = e.target.value;
        tintValue.textContent = `${e.target.value}%`;
        drawAreas();
    });

    document.getElementById('autoDetectBtn').addEventListener('click', autoDetectWindows);
    document.getElementById('editModeBtn').addEventListener('click', toggleEditMode);
    document.getElementById('thresholdInput').addEventListener('input', (e) => {
        currentThreshold = e.target.value;
        drawAreas();
    });
    simulateBtn.addEventListener('click', () => {
        document.body.classList.toggle('simulation-mode');
    });
    resetBtn.addEventListener('click', () => {
        selectedAreas = [];
        ctx.clearRect(0, 0, tintCanvas.width, tintCanvas.height);
        document.querySelectorAll('.area-handle').forEach(h => h.remove());
    });
}

// راه اندازی اولیه
initCamera();