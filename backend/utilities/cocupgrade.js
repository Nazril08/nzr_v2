// Constants
const NUM_BUILDERS = 5; // Default number of builders

// DOM Elements
const builderContainer = document.getElementById('builderContainer');
const buildingQueue = document.getElementById('buildingQueue');
const emptyQueueMessage = document.getElementById('emptyQueueMessage');
const scheduleContainer = document.getElementById('scheduleContainer');
const timelineViewport = document.getElementById('timelineViewport');

// State
let builders = [];
let buildings = [];
let schedule = [];
let userBuilderCount = NUM_BUILDERS; // Track user's builder count
let selectedScheduleTasks = {}; // Track which schedule task is selected per builder
let firstCheckedTaskIndices = {}; // Track the index of the first checked task per builder

// Initialize the app
function initApp() {
    // Get builder count from localStorage or use default
    userBuilderCount = parseInt(localStorage.getItem('cocBuilderCount')) || NUM_BUILDERS;
    
    // Initialize builders
    initBuilders(userBuilderCount);
    
    // Render builder inputs
    renderBuilders();
    
    // Add event listeners
    document.getElementById('addBuildingBtn').addEventListener('click', addBuilding);
    document.getElementById('generateScheduleBtn').addEventListener('click', generateSchedule);
    document.getElementById('clearScheduleBtn').addEventListener('click', clearSchedule);
    document.getElementById('recommendBtn').addEventListener('click', recommendUpgrades);
    document.getElementById('manageQueueBtn').addEventListener('click', showQueueManagementModal);
    
    // Show/hide floating home button on scroll
    window.addEventListener('scroll', function() {
        const floatingBtn = document.getElementById('floatingHomeBtn');
        if (window.scrollY > 300) {
            floatingBtn.classList.remove('opacity-0', 'invisible');
            floatingBtn.classList.add('opacity-100', 'visible');
        } else {
            floatingBtn.classList.add('opacity-0', 'invisible');
            floatingBtn.classList.remove('opacity-100', 'visible');
        }
    });
    
    // Load data from localStorage if available
    loadFromLocalStorage();
    
    // Add builder count selector
    addBuilderCountSelector();
}

// Initialize builders array
function initBuilders(count) {
    builders = [];
    for (let i = 0; i < count; i++) {
        builders.push({
            id: i + 1,
            name: `Builder ${i + 1}`,
            status: 'idle', // 'idle' or 'busy'
            availableAt: new Date(),
            currentTask: null,
            inputValues: null // Initialize as null for idle builders
        });
    }
}

// Add builder count selector
function addBuilderCountSelector() {
    const sleepTimeDiv = document.querySelector('.mt-6'); // The div containing sleep time
    
    // Create builder count selector
    const builderCountDiv = document.createElement('div');
    builderCountDiv.className = 'mt-6';
    builderCountDiv.innerHTML = `
        <label class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
            <svg class="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            Jumlah Builder
        </label>
        <div class="flex items-center space-x-2">
            <select id="builderCount" class="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 input-focus">
                <option value="1" ${userBuilderCount === 1 ? 'selected' : ''}>1 Builder</option>
                <option value="2" ${userBuilderCount === 2 ? 'selected' : ''}>2 Builders</option>
                <option value="3" ${userBuilderCount === 3 ? 'selected' : ''}>3 Builders</option>
                <option value="4" ${userBuilderCount === 4 ? 'selected' : ''}>4 Builders</option>
                <option value="5" ${userBuilderCount === 5 ? 'selected' : ''}>5 Builders</option>
                <option value="6" ${userBuilderCount === 6 ? 'selected' : ''}>6 Builders (with O.T.T.O)</option>
            </select>
            <div class="tooltip" data-tip="Pilih jumlah builder yang Anda miliki di game">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
        </div>
    `;
    
    // Insert before sleep time div
    sleepTimeDiv.parentNode.insertBefore(builderCountDiv, sleepTimeDiv);
    
    // Add event listener for builder count change
    document.getElementById('builderCount').addEventListener('change', function() {
        const newCount = parseInt(this.value);
        updateBuilderCount(newCount);
    });
}

// Update builder count
function updateBuilderCount(newCount) {
    userBuilderCount = newCount;
    
    // Save to localStorage
    localStorage.setItem('cocBuilderCount', newCount);
    
    // Keep existing builders' data if possible
    const existingBuilders = [...builders];
    
    // Initialize new builder array
    initBuilders(newCount);
    
    // Copy existing builder data
    for (let i = 0; i < Math.min(existingBuilders.length, newCount); i++) {
        builders[i] = existingBuilders[i];
    }
    
    // Re-render builders
    renderBuilders();
    saveToLocalStorage();
}

// Render builder status inputs
function renderBuilders() {
    builderContainer.innerHTML = '';
    
    builders.forEach((builder, index) => {
        const builderDiv = document.createElement('div');
        builderDiv.className = 'p-3 rounded-lg mb-2 builder-card ' + 
            (builder.status === 'busy' ? 'builder-busy' : 'builder-available');
        
        const builderContent = `
            <div class="flex justify-between items-center mb-2">
                <label class="block text-gray-700 font-medium">${builder.name}</label>
                <span class="px-2 py-1 text-xs rounded-full ${builder.status === 'busy' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
                    ${builder.status === 'busy' ? 'Sibuk' : 'Tersedia'}
                </span>
            </div>
            
            <div class="space-y-2">
                <div class="flex items-center space-x-2">
                    <input type="radio" id="builder${index}_idle" name="builder${index}_status" value="idle" 
                        ${builder.status === 'idle' ? 'checked' : ''} 
                        onchange="updateBuilderStatus(${index}, 'idle')">
                    <label for="builder${index}_idle" class="text-sm">Tersedia sekarang</label>
                </div>
                
                <div class="flex items-center space-x-2">
                    <input type="radio" id="builder${index}_busy" name="builder${index}_status" value="busy" 
                        ${builder.status === 'busy' ? 'checked' : ''} 
                        onchange="updateBuilderStatus(${index}, 'busy')">
                    <label for="builder${index}_busy" class="text-sm">Sibuk sampai (tanggal & menit)</label>
                </div>
                
                <div class="grid grid-cols-3 gap-2 ${builder.status === 'busy' ? '' : 'opacity-50 pointer-events-none'}">
                    <div class="relative">
                        <input type="number" id="builder${index}_days" placeholder="0" min="0" 
                            ${getBuilderRemainingTime(builder).days > 0 ? `value="${getBuilderRemainingTime(builder).days}"` : ''}
                            onchange="updateBuilderDaysHoursMinutes(${index})"
                            class="w-full pl-2 pr-8 py-1 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 input-focus no-spinner">
                        <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">Hari</span>
                    </div>
                    <div class="relative">
                        <input type="number" id="builder${index}_hours" placeholder="0" min="0" max="23" 
                            ${getBuilderRemainingTime(builder).hours > 0 ? `value="${getBuilderRemainingTime(builder).hours}"` : ''}
                            onchange="updateBuilderDaysHoursMinutes(${index})"
                            class="w-full pl-2 pr-8 py-1 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 input-focus no-spinner">
                        <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">Jam</span>
                    </div>
                    <div class="relative">
                        <input type="number" id="builder${index}_minutes" placeholder="0" min="0" max="59" 
                            ${getBuilderRemainingTime(builder).minutes > 0 ? `value="${getBuilderRemainingTime(builder).minutes}"` : ''}
                            onchange="updateBuilderDaysHoursMinutes(${index})"
                            class="w-full pl-2 pr-8 py-1 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 input-focus no-spinner">
                        <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">Menit</span>
                    </div>
                </div>
                
                <div class="${builder.status === 'busy' ? '' : 'hidden'}">
                    <input type="text" id="builder${index}_task" placeholder="Upgrade saat ini" 
                        value="${builder.currentTask || ''}" 
                        onchange="updateBuilderTask(${index}, this.value)"
                        class="w-full px-2 py-1 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 input-focus">
                </div>
            </div>
        `;
        
        builderDiv.innerHTML = builderContent;
        builderContainer.appendChild(builderDiv);
    });
}

// Update builder status (idle/busy)
function updateBuilderStatus(index, status) {
    builders[index].status = status;
    if (status === 'idle') {
        builders[index].availableAt = new Date();
        builders[index].currentTask = null;
        builders[index].inputValues = null; // Reset input values
    } else if (status === 'busy' && !builders[index].inputValues) {
        // Initialize input values for a new busy builder
        builders[index].inputValues = {
            days: 0,
            hours: 0,
            minutes: 0
        };
    }
    renderBuilders();
    saveToLocalStorage();
}

// Update builder available time
function updateBuilderTime(index, timeValue) {
    if (timeValue) {
        builders[index].availableAt = new Date(timeValue);
        renderBuilders();
        saveToLocalStorage();
    }
}

// Get builder remaining time in days, hours, minutes
function getBuilderRemainingTime(builder) {
    const now = new Date();
    const availableAt = new Date(builder.availableAt);
    
    // If builder is idle or available time is in the past, return 0s
    if (builder.status === 'idle' || availableAt <= now) {
        return { days: 0, hours: 0, minutes: 0 };
    }
    
    // If builder has custom input values, use those
    if (builder.inputValues) {
        return builder.inputValues;
    }
    
    // Calculate remaining time
    const diffMs = availableAt - now;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    
    return {
        days: days,
        hours: hours,
        minutes: minutes
    };
}

// Update builder time from days, hours, minutes inputs
function updateBuilderDaysHoursMinutes(index) {
    const daysInput = document.getElementById(`builder${index}_days`);
    const hoursInput = document.getElementById(`builder${index}_hours`);
    const minutesInput = document.getElementById(`builder${index}_minutes`);
    
    const days = parseInt(daysInput.value) || 0;
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    
    // Store the exact input values
    if (!builders[index].inputValues) {
        builders[index].inputValues = {};
    }
    
    builders[index].inputValues = {
        days: days,
        hours: hours,
        minutes: minutes
    };
    
    // Calculate new available time
    const now = new Date();
    const newAvailableAt = new Date(
        now.getTime() + 
        (days * 24 * 60 * 60 * 1000) + 
        (hours * 60 * 60 * 1000) + 
        (minutes * 60 * 1000)
    );
    
    // Update builder
    builders[index].availableAt = newAvailableAt;
    renderBuilders();
    saveToLocalStorage();
}

// Update builder current task
function updateBuilderTask(index, task) {
    builders[index].currentTask = task;
    saveToLocalStorage();
}

// Add building to queue
function addBuilding() {
    const nameInput = document.getElementById('buildingName');
    const categorySelect = document.getElementById('buildingCategory');
    const daysInput = document.getElementById('upgradeDays');
    const hoursInput = document.getElementById('upgradeHours');
    const minutesInput = document.getElementById('upgradeMinutes');
    const prioritySelect = document.getElementById('buildingPriority');
    const quantityInput = document.getElementById('buildingQuantity');
    
    const name = nameInput.value.trim();
    const category = categorySelect.value;
    const days = parseInt(daysInput.value) || 0;
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const priority = prioritySelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    
    if (name === '' || (days === 0 && hours === 0 && minutes === 0)) {
        alert('Silakan masukkan nama bangunan dan durasi');
        return;
    }
    
    // Validate quantity
    if (quantity < 1 || quantity > 100) {
        alert('Quantity harus antara 1 dan 100');
        return;
    }
    
    // Calculate duration in milliseconds
    const durationMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
    
    // Add multiple buildings based on quantity
    for (let i = 0; i < quantity; i++) {
    // Create building object
    const building = {
            id: Date.now() + i, // Unique ID for each building
            name: quantity > 1 ? `${name} (${i+1}/${quantity})` : name,
        category: category,
        duration: durationMs,
        durationText: formatDuration(days, hours, minutes),
        priority: priority
    };
    
    // Add to buildings array
    buildings.push(building);
    }
    
    // Clear inputs
    nameInput.value = '';
    daysInput.value = '';
    hoursInput.value = '';
    minutesInput.value = '';
    quantityInput.value = '1'; // Reset quantity to 1
    
    // Update UI
    renderBuildingQueue();
    saveToLocalStorage();
}

// Format duration text
function formatDuration(days, hours, minutes) {
    let result = '';
    if (days > 0) result += `${days}h `;
    if (hours > 0) result += `${hours}j `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim();
}

// Render building queue
function renderBuildingQueue() {
if (buildings.length === 0) {
buildingQueue.innerHTML = '';
emptyQueueMessage.classList.remove('hidden');
return;
}

emptyQueueMessage.classList.add('hidden');
buildingQueue.innerHTML = '';
    
    // Group buildings by name and category for quantity display
    const groupedBuildings = {};

buildings.forEach(building => {
        // Create a key that doesn't include the (x/y) part if it exists
        const baseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
        const key = `${baseName}-${building.category}-${building.duration}`;
        
        if (!groupedBuildings[key]) {
            groupedBuildings[key] = {
                baseBuilding: {...building},
                count: 1
            };
            // Store the base name without the (x/y) suffix
            groupedBuildings[key].baseBuilding.baseName = baseName;
        } else {
            groupedBuildings[key].count++;
        }
    });
    
    // Render each group
    Object.values(groupedBuildings).forEach(group => {
        const building = group.baseBuilding;
        const count = group.count;
        
const row = document.createElement('tr');
row.className = 'hover:bg-gray-50 transition-colors';

// Set category color and name
let categoryColor = '';
let categoryName = '';
switch(building.category) {
    case 'defense': 
        categoryColor = 'border-l-4 border-red-400'; 
        categoryName = 'Pertahanan';
        break;
    case 'resource': 
        categoryColor = 'border-l-4 border-yellow-400'; 
        categoryName = 'Sumber Daya';
        break;
    case 'army': 
        categoryColor = 'border-l-4 border-purple-400'; 
        categoryName = 'Pasukan';
        break;
    case 'wall': 
        categoryColor = 'border-l-4 border-blue-400'; 
        categoryName = 'Dinding';
        break;
    default: 
        categoryColor = 'border-l-4 border-gray-400';
        categoryName = 'Lainnya';
}

row.className += ' ' + categoryColor;

// Set priority badge
let priorityBadge = '';
let priorityName = '';
switch(building.priority) {
    case 'high': 
        priorityBadge = 'bg-red-100 text-red-800'; 
        priorityName = 'Tinggi';
        break;
    case 'medium': 
        priorityBadge = 'bg-yellow-100 text-yellow-800'; 
        priorityName = 'Sedang';
        break;
    case 'low': 
        priorityBadge = 'bg-green-100 text-green-800'; 
        priorityName = 'Rendah';
        break;
}

row.innerHTML = `
    <td class="px-4 py-3">
                <div class="font-medium text-gray-900">
                    ${building.baseName}
                    ${count > 1 ? `<span class="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full tooltip" title="${count} identical buildings of the same level">x${count}</span>` : ''}
                </div>
        <div class="text-xs text-gray-500">${categoryName}</div>
    </td>
    <td class="px-4 py-3">
        <div class="font-medium">${building.durationText}</div>
    </td>
    <td class="px-4 py-3">
        <span class="px-3 py-1 text-xs rounded-full ${priorityBadge}">
            ${priorityName}
        </span>
    </td>
    <td class="px-4 py-3 text-right">
                <button onclick="removeBuilding('${building.baseName}', '${building.category}', ${building.duration})" class="text-red-600 hover:text-red-900 transition-colors p-1 rounded-full hover:bg-red-50">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
        </button>
    </td>
`;

buildingQueue.appendChild(row);
});
}

// Format duration text
function formatDuration(days, hours, minutes) {
let parts = [];
if (days > 0) parts.push(`${days}h`);
if (hours > 0) parts.push(`${hours}j`);
if (minutes > 0) parts.push(`${minutes}m`);
return parts.length > 0 ? parts.join(' ') : '0m';
}

// Remove building from queue
function removeBuilding(baseName, category, duration) {
    // Find all buildings that match these criteria
    const matchingBuildings = buildings.filter(building => {
        // Extract base name from building name (removing any (x/y) suffix)
        const buildingBaseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
        return buildingBaseName === baseName && 
               building.category === category && 
               building.duration === duration;
    });
    
    if (matchingBuildings.length > 1) {
        // If there are multiple buildings, ask if user wants to remove all or just one
        const confirmAll = confirm(`Hapus semua ${matchingBuildings.length} bangunan "${baseName}" atau hanya satu?\n\nKlik OK untuk menghapus semua, Batal untuk menghapus satu.`);
        
        if (confirmAll) {
            // Remove all matching buildings
            buildings = buildings.filter(building => {
                const buildingBaseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
                return !(buildingBaseName === baseName && 
                       building.category === category && 
                       building.duration === duration);
            });
        } else {
            // Remove just one (the first one found)
            const indexToRemove = buildings.findIndex(building => {
                const buildingBaseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
                return buildingBaseName === baseName && 
                       building.category === category && 
                       building.duration === duration;
            });
            
            if (indexToRemove !== -1) {
                buildings.splice(indexToRemove, 1);
            }
        }
    } else {
        // If there's only one, remove it directly
        buildings = buildings.filter(building => {
            const buildingBaseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
            return !(buildingBaseName === baseName && 
                   building.category === category && 
                   building.duration === duration);
        });
    }
    
    renderBuildingQueue();
    saveToLocalStorage();
}

// Generate upgrade schedule
function generateSchedule() {
    if (buildings.length === 0) {
        alert('Silakan tambahkan bangunan ke antrean terlebih dahulu');
        return;
    }
    
    // Check if we have any builders
    if (userBuilderCount === 0) {
        alert('Anda harus memiliki minimal 1 builder untuk membuat jadwal');
        return;
    }
    
    // Store the current selected tasks before clearing the schedule
    const previousSelectedTasks = {...selectedScheduleTasks};
    
    // Sort buildings by priority and duration
    const sortedBuildings = [...buildings].sort((a, b) => {
        // First sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        // Then by duration (longer first)
        return b.duration - a.duration;
    });
    
    // Get sleep time
    const sleepTimeInput = document.getElementById('sleepTime').value;
    const [sleepHours, sleepMinutes] = sleepTimeInput.split(':').map(Number);
    
    // Create a copy of builders for scheduling
    const scheduleBuilders = JSON.parse(JSON.stringify(builders));
    
    // Clear previous schedule
    schedule = [];
    // Reset selected tasks since the building IDs will change
    selectedScheduleTasks = {};
    
    // Assign buildings to builders
    sortedBuildings.forEach(building => {
        // Extract base name for display
        const baseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
        
        // Find the earliest available builder
        scheduleBuilders.sort((a, b) => new Date(a.availableAt) - new Date(b.availableAt));
        const builder = scheduleBuilders[0];
        
        // Calculate start and end times
        const startTime = new Date(builder.availableAt);
        const endTime = new Date(startTime.getTime() + building.duration);
        
        // Check if this is a good time based on sleep schedule
        const startHour = startTime.getHours();
        const isGoodTime = checkUpgradeTime(building.duration, startHour, sleepHours);
        
        // Update builder availability
        builder.availableAt = endTime;
        builder.currentTask = baseName;
        builder.status = 'busy';
        
        // Add to schedule
        schedule.push({
            buildingId: building.id,
            buildingName: baseName,
            buildingCategory: building.category,
            builderId: builder.id,
            builderName: builder.name,
            startTime: startTime,
            endTime: endTime,
            duration: building.duration,
            durationText: building.durationText,
            isGoodTime: isGoodTime
        });
    });
    
    // Render the schedule
    renderSchedule();
    renderTimeline();
    saveToLocalStorage();
}

// Check if upgrade time is good based on sleep schedule
function checkUpgradeTime(duration, startHour, sleepHour) {
    const durationHours = duration / (60 * 60 * 1000);
    
    // For long upgrades (>8h), starting before sleep is good
    if (durationHours > 8) {
        // If it starts 0-3 hours before sleep time, it's good
        const hoursBeforeSleep = (sleepHour - startHour + 24) % 24;
        return hoursBeforeSleep <= 3 && hoursBeforeSleep >= 0;
    }
    
    // For short upgrades, starting after waking up is good
    return Math.abs(startHour - sleepHour) > 8;
}

// Render schedule
function renderSchedule() {
    scheduleContainer.innerHTML = '';
    
    if (schedule.length === 0) {
        scheduleContainer.innerHTML = '<p class="text-center text-gray-500">Belum ada jadwal yang dibuat.</p>';
        return;
    }
    
    // Group schedule by builder
    const builderSchedules = {};
    schedule.forEach(item => {
        if (!builderSchedules[item.builderId]) {
            builderSchedules[item.builderId] = [];
        }
        builderSchedules[item.builderId].push(item);
    });
    
    // Render each builder's schedule
    Object.keys(builderSchedules).forEach(builderId => {
        const builderItems = builderSchedules[builderId];
        const builderDiv = document.createElement('div');
        builderDiv.className = 'border rounded-lg p-4 bg-gradient-to-r from-indigo-50 to-blue-50';
        
        // Get the builder's initial task from builder status
        const builder = builders.find(b => b.id === parseInt(builderId));
        const initialTask = builder ? builder.currentTask : null;
        
        // Determine the builder display name
        const baseBuilderName = builderItems[0].builderName;
        let builderDisplayName = baseBuilderName;
        
        // If we have a selected task for this builder, use that for the name
        if (selectedScheduleTasks[builderId]) {
            const selectedTask = builderItems.find(item => item.buildingId === selectedScheduleTasks[builderId]);
            if (selectedTask) {
                builderDisplayName = `${baseBuilderName} - ${selectedTask.buildingName}`;
            }
        // Otherwise, if there's an initial task from builder status, use that
        } else if (initialTask) {
            builderDisplayName = `${baseBuilderName} - ${initialTask}`;
        }
        
        // Builder header
        const builderHeader = document.createElement('h3');
        builderHeader.className = 'font-semibold text-gray-800 mb-2 flex items-center';
        builderHeader.id = `builderScheduleHeader_${builderId}`;
        builderHeader.innerHTML = `
            <svg class="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            ${builderDisplayName}
        `;
        builderDiv.appendChild(builderHeader);
        
        // Builder schedule items
        const scheduleList = document.createElement('ul');
        scheduleList.className = 'space-y-2';
        
        builderItems.forEach((item, index) => {
            const scheduleItem = document.createElement('li');
            scheduleItem.className = 'flex items-center space-x-2 p-2 rounded-lg ' + 
                (item.isGoodTime ? 'bg-green-50 border border-green-100' : 'bg-yellow-50 border border-yellow-100');
            
            let categoryIcon = '';
            switch(item.buildingCategory) {
                case 'defense': 
                    categoryIcon = `<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>
                    </svg>`;
                    break;
                case 'resource': 
                    categoryIcon = `<svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>`;
                    break;
                case 'army': 
                    categoryIcon = `<svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>`;
                    break;
                case 'wall': 
                    categoryIcon = `<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
                    </svg>`;
                    break;
                default: 
                    categoryIcon = `<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                    </svg>`;
            }
            
            // Create checkbox input
            const isChecked = selectedScheduleTasks[builderId] === item.buildingId;
            const checkboxId = `scheduleTask_${builderId}_${item.buildingId}`;
            
            scheduleItem.innerHTML = `
                <div class="flex-shrink-0">
                    <input type="checkbox" id="${checkboxId}" 
                        class="schedule-task-checkbox h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        data-builder-id="${builderId}" 
                        data-building-id="${item.buildingId}"
                        data-building-name="${item.buildingName}"
                        data-task-index="${index}"
                        ${isChecked ? 'checked' : ''}>
                </div>
                <div class="flex-shrink-0 ml-2">
                    ${categoryIcon}
                </div>
                <div class="flex-grow">
                    <div class="font-medium">${item.buildingName}</div>
                    <div class="text-xs text-gray-500">
                        ${formatDate(item.startTime)} - ${formatDate(item.endTime)} (${item.durationText})
                    </div>
                </div>
                <div class="flex-shrink-0">
                    <span class="px-2 py-1 text-xs rounded-full ${item.isGoodTime ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${item.isGoodTime ? 'Optimal' : 'Suboptimal'}
                    </span>
                </div>
            `;
            
            scheduleList.appendChild(scheduleItem);
        });
        
        builderDiv.appendChild(scheduleList);
        scheduleContainer.appendChild(builderDiv);
    });
    
    // Add event listeners to all checkboxes
    document.querySelectorAll('.schedule-task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleScheduleTaskSelection);
    });
}

// Handle schedule task selection (checkbox change)
function handleScheduleTaskSelection(event) {
    const builderId = this.dataset.builderId;
    const buildingId = this.dataset.buildingId;
    const buildingName = this.dataset.buildingName;
    const taskIndex = parseInt(this.dataset.taskIndex);
    const baseBuilderName = schedule.find(item => item.builderId === parseInt(builderId))?.builderName || '';
    const scheduleHeaderElement = document.getElementById(`builderScheduleHeader_${builderId}`);
    const timelineHeaderElement = document.getElementById(`timelineBuilderHeader_${builderId}`);
    
    // Uncheck all other checkboxes for this builder
    if (this.checked) {
        document.querySelectorAll(`.schedule-task-checkbox[data-builder-id="${builderId}"]`).forEach(cb => {
            if (cb !== this) {
                cb.checked = false;
            }
        });
        
        // Store the selected task
        selectedScheduleTasks[builderId] = buildingId;
        
        // Store the index of this task
        firstCheckedTaskIndices[builderId] = taskIndex;
        
        // Update the schedule builder header
        if (scheduleHeaderElement) {
            scheduleHeaderElement.innerHTML = `
                <svg class="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                ${baseBuilderName} - ${buildingName}
            `;
        }
        
        // Update the timeline builder header
        if (timelineHeaderElement) {
            timelineHeaderElement.innerHTML = `
                <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                ${baseBuilderName} - ${buildingName}
            `;
        }
    } else {
        // Clear the selected task
        delete selectedScheduleTasks[builderId];
        
        // Clear the first checked task index
        delete firstCheckedTaskIndices[builderId];
        
        // Reset the builder header to the initial task or just the builder name
        const builder = builders.find(b => b.id === parseInt(builderId));
        const initialTask = builder ? builder.currentTask : null;
        
        // Update the schedule builder header
        if (scheduleHeaderElement) {
            if (initialTask) {
                scheduleHeaderElement.innerHTML = `
                    <svg class="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    ${baseBuilderName} - ${initialTask}
                `;
            } else {
                scheduleHeaderElement.innerHTML = `
                    <svg class="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    ${baseBuilderName}
                `;
            }
        }
        
        // Update the timeline builder header
        if (timelineHeaderElement) {
            if (initialTask) {
                timelineHeaderElement.innerHTML = `
                    <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    ${baseBuilderName} - ${initialTask}
                `;
            } else {
                timelineHeaderElement.innerHTML = `
                    <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    ${baseBuilderName}
                `;
            }
        }
    }
    
    // Update the timeline to show tasks from the first checked task forward
    renderTimeline();
    
    // Save to localStorage to persist the changes
    saveToLocalStorage();
}

// Format date for display
function formatDate(date) {
    return new Date(date).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Render timeline with tasks starting from the first checked task
function renderTimeline() {
    const timelineViewport = document.getElementById('timelineViewport');
    const emptyTimelineMessage = document.getElementById('emptyTimelineMessage');
    timelineViewport.innerHTML = '';
    
    // If no schedule or no checked tasks, show empty message
    if (schedule.length === 0 || Object.keys(selectedScheduleTasks).length === 0) {
        timelineViewport.innerHTML = '';
        emptyTimelineMessage.classList.remove('hidden');
        return;
    }
    
    emptyTimelineMessage.classList.add('hidden');
    
    // Create a container for the timeline
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'space-y-6';
    
    // Group schedule by builder
    const builderSchedules = {};
    schedule.forEach(item => {
        if (!builderSchedules[item.builderId]) {
            builderSchedules[item.builderId] = [];
        }
        builderSchedules[item.builderId].push(item);
    });
    
    // Process each builder that has a checked task
    Object.keys(selectedScheduleTasks).forEach(builderId => {
        const builderItems = builderSchedules[builderId] || [];
        const firstCheckedIndex = firstCheckedTaskIndices[builderId] || 0;
        
        // If no items or invalid index, skip
        if (builderItems.length === 0 || firstCheckedIndex >= builderItems.length) {
            return;
        }
        
        // Get tasks from the first checked one to the end
        const tasksToShow = builderItems.slice(firstCheckedIndex);
        
        // Create builder section
        const builderSection = createBuilderTimelineSection(builderId, tasksToShow);
        if (builderSection) {
            timelineContainer.appendChild(builderSection);
        }
    });
    
    timelineViewport.appendChild(timelineContainer);
}

// Helper function to create a builder timeline section with the given items
function createBuilderTimelineSection(builderId, builderItems) {
    if (!builderItems || builderItems.length === 0) return null;
    
    const baseBuilderName = builderItems[0].builderName;
    
    // Get the builder's initial task from builder status
    const builder = builders.find(b => b.id === parseInt(builderId));
    const initialTask = builder ? builder.currentTask : null;
    
    // Determine the builder display name
    let builderDisplayName = baseBuilderName;
    
    // If we have a selected task for this builder, use that for the name
    if (selectedScheduleTasks[builderId]) {
        const selectedTask = builderItems.find(item => item.buildingId === selectedScheduleTasks[builderId]);
        if (selectedTask) {
            builderDisplayName = `${baseBuilderName} - ${selectedTask.buildingName}`;
        }
    // Otherwise, if there's an initial task from builder status, use that
    } else if (initialTask) {
        builderDisplayName = `${baseBuilderName} - ${initialTask}`;
    }
    
    // Create builder section
    const builderSection = document.createElement('div');
    builderSection.className = 'bg-white rounded-xl shadow-sm p-5 border border-gray-200';
    
    // Builder header
    const builderHeader = document.createElement('div');
    builderHeader.className = 'flex items-center justify-between mb-3';
    
    const builderTitle = document.createElement('h3');
    builderTitle.className = 'font-medium text-gray-800 flex items-center';
    builderTitle.id = `timelineBuilderHeader_${builderId}`;
    builderTitle.innerHTML = `
        <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
        </svg>
        ${builderDisplayName}
    `;
    
    const taskCount = document.createElement('span');
    taskCount.className = 'text-xs font-medium bg-indigo-100 text-indigo-800 py-1 px-3 rounded-full';
    taskCount.textContent = `${builderItems.length} tasks`;
    
    builderHeader.appendChild(builderTitle);
    builderHeader.appendChild(taskCount);
    builderSection.appendChild(builderHeader);
    
    // Builder timeline
    const timeline = document.createElement('div');
    timeline.className = 'space-y-4 mt-3';
    
    // Add individual task items
    builderItems.forEach((item, index) => {
        const taskItem = createTimelineTaskItem(item, index, builderItems.length);
        timeline.appendChild(taskItem);
    });
    
    builderSection.appendChild(timeline);
    return builderSection;
}

// Helper function to create a timeline task item
function createTimelineTaskItem(item, index, totalItems) {
    const taskItem = document.createElement('div');
    taskItem.className = 'relative bg-white rounded-lg border shadow-sm p-4 transition-all hover:shadow-md';
    
    // Determine status class
    let statusClass = 'bg-yellow-100 text-yellow-800'; // Default: In progress
    let statusText = 'Sedang';
    
    if (index === 0) {
        statusClass = 'bg-green-100 text-green-800';
        statusText = 'Aktif';
    } else if (index === totalItems - 1) {
        statusClass = 'bg-blue-100 text-blue-800';
        statusText = 'Terakhir';
    }
    
    // Format dates for display
    const startDate = new Date(item.startTime).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit'
    });
    
    const startTime = new Date(item.startTime).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const endDate = new Date(item.endTime).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit'
    });
    
    const endTime = new Date(item.endTime).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Determine category icon
    let categoryIcon = '';
    switch(item.buildingCategory) {
        case 'defense': 
            categoryIcon = `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>
            </svg>`;
            break;
        case 'resource': 
            categoryIcon = `<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>`;
            break;
        case 'army': 
            categoryIcon = `<svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>`;
            break;
        case 'wall': 
            categoryIcon = `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
            </svg>`;
            break;
        default: 
            categoryIcon = `<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
            </svg>`;
    }
    
    taskItem.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 mt-1">
                ${categoryIcon}
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <h4 class="text-lg font-medium text-gray-800">${item.buildingName}</h4>
                    <span class="px-2 py-1 text-xs rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                <div class="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                    <div class="flex items-center text-sm text-gray-600">
                        <svg class="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        ${startDate} ${startTime}
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                        <svg class="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${item.durationText}
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                        <svg class="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        ${item.builderName}
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                        <svg class="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                        </svg>
                        ${endDate} ${endTime}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return taskItem;
}

// ... existing helper functions ...

// Save data to localStorage
function saveToLocalStorage() {
    localStorage.setItem('cocUpgradePlanner', JSON.stringify({
        builders: builders,
        buildings: buildings,
        schedule: schedule,
        builderCount: userBuilderCount,
        selectedScheduleTasks: selectedScheduleTasks,
        firstCheckedTaskIndices: firstCheckedTaskIndices
    }));
}

// Load data from localStorage
function loadFromLocalStorage() {
    const data = localStorage.getItem('cocUpgradePlanner');
    if (data) {
        const parsed = JSON.parse(data);
        
        // Get builder count if available
        if (parsed.builderCount) {
            userBuilderCount = parsed.builderCount;
            // Update the builder count selector if it exists
            const builderCountSelect = document.getElementById('builderCount');
            if (builderCountSelect) {
                builderCountSelect.value = userBuilderCount;
            }
        }
        
        // Initialize builders with the correct count
        initBuilders(userBuilderCount);
        
        // Convert date strings back to Date objects
        if (parsed.builders) {
            // Only copy data for the number of builders we have
            for (let i = 0; i < Math.min(parsed.builders.length, userBuilderCount); i++) {
                if (parsed.builders[i]) {
                    builders[i] = {
                        ...parsed.builders[i],
                        availableAt: new Date(parsed.builders[i].availableAt)
                    };
                }
            }
        }
        
        if (parsed.buildings) {
            buildings = parsed.buildings;
        }
        
        if (parsed.schedule) {
            schedule = parsed.schedule.map(item => ({
                ...item,
                startTime: new Date(item.startTime),
                endTime: new Date(item.endTime)
            }));
        }
        
        // Load selected schedule tasks if available
        if (parsed.selectedScheduleTasks) {
            selectedScheduleTasks = parsed.selectedScheduleTasks;
        }
        
        // Load first checked task indices if available
        if (parsed.firstCheckedTaskIndices) {
            firstCheckedTaskIndices = parsed.firstCheckedTaskIndices;
        }
        
        renderBuilders();
        renderBuildingQueue();
        renderSchedule();
        renderTimeline();
    }
}

// Clear schedule
function clearSchedule() {
    schedule = [];
    selectedScheduleTasks = {}; // Clear selected tasks when clearing schedule
    firstCheckedTaskIndices = {}; // Clear first checked task indices when clearing schedule
    renderSchedule();
    renderTimeline();
    saveToLocalStorage();
}

// Recommend upgrades during sleep/inactive time
function recommendUpgrades() {
    if (buildings.length === 0) {
        alert('Silakan tambahkan bangunan ke antrean terlebih dahulu');
        return;
    }
    
    // Get sleep time and duration
    const sleepTimeInput = document.getElementById('sleepTime').value;
    const sleepDuration = parseInt(document.getElementById('sleepDuration').value) || 8;
    
    // Parse sleep time
    const [sleepHours, sleepMinutes] = sleepTimeInput.split(':').map(Number);
    
    // Calculate wake up time
    const sleepTime = new Date();
    sleepTime.setHours(sleepHours, sleepMinutes, 0, 0);
    
    const wakeTime = new Date(sleepTime);
    wakeTime.setHours(sleepTime.getHours() + sleepDuration);
    
    // Calculate sleep window in milliseconds
    const sleepWindowMs = sleepDuration * 60 * 60 * 1000;
    
    // Filter buildings by duration (looking for upgrades that take at least 70% of sleep time)
    const minUpgradeTimeMs = sleepWindowMs * 0.7;
    
    // Sort buildings by how well they fit the sleep window
    const suitableBuildings = [...buildings].filter(building => building.duration >= minUpgradeTimeMs);
    
    if (suitableBuildings.length === 0) {
        // Show recommendation modal with no suitable upgrades
        showRecommendationModal([], sleepTime, wakeTime, sleepWindowMs);
        return;
    }
    
    // Sort by how well they fit the sleep window (closest to sleep duration first)
    suitableBuildings.sort((a, b) => {
        const aDiff = Math.abs(a.duration - sleepWindowMs);
        const bDiff = Math.abs(b.duration - sleepWindowMs);
        return aDiff - bDiff;
    });
    
    // Show recommendation modal
    showRecommendationModal(suitableBuildings, sleepTime, wakeTime, sleepWindowMs);
}

// Show recommendation modal
function showRecommendationModal(recommendations, sleepTime, wakeTime, sleepWindowMs) {
    // Create modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modalBackdrop.id = 'recommendationModal';
    
    // Format times for display
    const sleepTimeStr = sleepTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const wakeTimeStr = wakeTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const sleepDurationHours = sleepWindowMs / (60 * 60 * 1000);
    
    // Create modal content
    let modalContent = `
        <div class="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    Recommend Upgrades
                </h3>
                <button id="closeRecommendModal" class="text-gray-400 hover:text-gray-500">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="bg-indigo-50 p-4 rounded-lg mb-4">
                <p class="text-sm text-indigo-800">
                    Based on your sleep time (${sleepTimeStr} - ${wakeTimeStr}, ${sleepDurationHours} hours),
                    here are recommended upgrades suitable for your inactive period.
                </p>
            </div>
    `;
    
    if (recommendations.length === 0) {
        modalContent += `
            <div class="text-center py-6">
                <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-gray-500">No buildings match your sleep duration.</p>
                <p class="text-gray-400 text-sm mt-1">Try adding buildings with longer upgrade duration.</p>
            </div>
        `;
    } else {
        modalContent += `
            <div class="overflow-y-auto max-h-60">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Building</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fit</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;
        
        recommendations.slice(0, 5).forEach(building => {
            const fitPercentage = Math.min(100, Math.round((building.duration / sleepWindowMs) * 100));
            let fitClass = 'bg-green-100 text-green-800';
            
            if (fitPercentage < 80) {
                fitClass = 'bg-yellow-100 text-yellow-800';
            }
            if (fitPercentage > 110) {
                fitClass = 'bg-red-100 text-red-800';
            }
            
            modalContent += `
                <tr>
                    <td class="px-3 py-2">
                        <div class="font-medium text-gray-900">${building.name}</div>
                    </td>
                    <td class="px-3 py-2">
                        <div class="text-sm text-gray-500">${building.durationText}</div>
                    </td>
                    <td class="px-3 py-2">
                        <span class="px-2 py-1 text-xs rounded-full ${fitClass}">
                            ${fitPercentage}%
                        </span>
                    </td>
                </tr>
            `;
        });
        
        modalContent += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    modalContent += `
            <div class="mt-5">
                <button id="closeRecommendBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300">
                    Close
                </button>
            </div>
        </div>
    `;
    
    modalBackdrop.innerHTML = modalContent;
    document.body.appendChild(modalBackdrop);
    
    // Add event listeners for closing
    document.getElementById('closeRecommendModal').addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    document.getElementById('closeRecommendBtn').addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    // Close on backdrop click
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            document.body.removeChild(modalBackdrop);
        }
    });
}

// Show queue management modal for deletion
function showQueueManagementModal() {
    if (buildings.length === 0) {
        alert('No buildings in queue to manage.');
        return;
    }
    
    // Create modal backdrop
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modalBackdrop.id = 'queueManagementModal';
    
    // Group buildings by name, category, and duration
    const groupedBuildings = {};
    
    buildings.forEach(building => {
        // Create a key that doesn't include the (x/y) part if it exists
        const baseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
        const key = `${baseName}-${building.category}-${building.duration}`;
        
        if (!groupedBuildings[key]) {
            groupedBuildings[key] = {
                baseBuilding: {...building},
                count: 1
            };
            // Store the base name without the (x/y) suffix
            groupedBuildings[key].baseBuilding.baseName = baseName;
        } else {
            groupedBuildings[key].count++;
        }
    });
    
    // Create modal content
    let modalContent = `
        <div class="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full mx-4">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                    Manage Building Queue
                </h3>
                <button id="closeQueueModal" class="text-gray-400 hover:text-gray-500">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="bg-indigo-50 p-4 rounded-lg mb-4">
                <p class="text-sm text-indigo-800">
                    Select buildings to remove from the queue or use the bulk actions.
                </p>
            </div>
            
            <div class="mb-4 flex justify-between">
                <button id="selectAllBtn" class="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-lg transition-all duration-200">
                    Select All
                </button>
                <button id="deleteSelectedBtn" class="text-sm bg-red-100 hover:bg-red-200 text-red-700 py-1 px-3 rounded-lg transition-all duration-200 hidden">
                    Delete Selected
                </button>
            </div>
            
            <div class="overflow-y-auto max-h-72">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Building</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200" id="queueModalList">
    `;
    
    Object.values(groupedBuildings).forEach(group => {
        const building = group.baseBuilding;
        const count = group.count;
        const baseName = building.baseName;
        
        // Set category name
        let categoryName = '';
        switch(building.category) {
            case 'defense': categoryName = 'Defense'; break;
            case 'resource': categoryName = 'Resource'; break;
            case 'army': categoryName = 'Army'; break;
            case 'wall': categoryName = 'Wall'; break;
            default: categoryName = 'Other';
        }
        
        modalContent += `
            <tr data-name="${baseName}" data-category="${building.category}" data-duration="${building.duration}">
                <td class="px-3 py-2">
                    <input type="checkbox" class="building-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded">
                </td>
                <td class="px-3 py-2">
                    <div class="font-medium text-gray-900">
                        ${baseName}
                        ${count > 1 ? `<span class="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full tooltip" title="${count} identical buildings of the same level">x${count}</span>` : ''}
                    </div>
                    <div class="text-xs text-gray-500">${categoryName}</div>
                </td>
                <td class="px-3 py-2">
                    <div class="text-sm text-gray-600">${building.durationText}</div>
                </td>
                <td class="px-3 py-2 text-right">
                    <button onclick="deleteBuildingFromModal('${baseName}', '${building.category}', ${building.duration})" class="text-red-600 hover:text-red-900 transition-colors p-1 rounded-full hover:bg-red-50">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    });
    
    modalContent += `
                    </tbody>
                </table>
            </div>
            
            <div class="mt-5">
                <button id="closeQueueBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300">
                    Close
                </button>
            </div>
        </div>
    `;
    
    modalBackdrop.innerHTML = modalContent;
    document.body.appendChild(modalBackdrop);
    
    // Add event listeners
    document.getElementById('closeQueueModal').addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    document.getElementById('closeQueueBtn').addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    // Close on backdrop click
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            document.body.removeChild(modalBackdrop);
        }
    });
    
    // Select all functionality
    document.getElementById('selectAllBtn').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.building-checkbox');
        const isAllSelected = [...checkboxes].every(checkbox => checkbox.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !isAllSelected;
        });
        
        updateDeleteSelectedButton();
    });
    
    // Add checkbox change listeners
    const checkboxes = document.querySelectorAll('.building-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateDeleteSelectedButton);
    });
    
    // Initial state of delete selected button
    updateDeleteSelectedButton();
    
    // Delete selected button functionality
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedBuildings);
}

// Update delete selected button visibility
function updateDeleteSelectedButton() {
    const checkboxes = document.querySelectorAll('.building-checkbox');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    
    const hasSelectedItems = [...checkboxes].some(checkbox => checkbox.checked);
    
    if (hasSelectedItems) {
        deleteSelectedBtn.classList.remove('hidden');
    } else {
        deleteSelectedBtn.classList.add('hidden');
    }
}

// Delete building from modal
function deleteBuildingFromModal(baseName, category, duration) {
    // Find all buildings that match these criteria
    const matchingBuildings = buildings.filter(building => {
        // Extract base name from building name (removing any (x/y) suffix)
        const buildingBaseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
        return buildingBaseName === baseName && 
               building.category === category && 
               building.duration === duration;
    });
    
    if (matchingBuildings.length > 1) {
        // If there are multiple buildings, ask if user wants to remove all or just one
        const confirmAll = confirm(`Remove all ${matchingBuildings.length} "${baseName}" buildings or just one?\n\nClick OK to remove all, Cancel to remove just one.`);
        
        if (confirmAll) {
            // Remove all matching buildings
            buildings = buildings.filter(building => {
                const buildingBaseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
                return !(buildingBaseName === baseName && 
                       building.category === category && 
                       building.duration === duration);
            });
        } else {
            // Remove just one (the first one found)
            const indexToRemove = buildings.findIndex(building => {
                const buildingBaseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
                return buildingBaseName === baseName && 
                       building.category === category && 
                       building.duration === duration;
            });
            
            if (indexToRemove !== -1) {
                buildings.splice(indexToRemove, 1);
            }
        }
    } else {
        // If there's only one, remove it directly
        buildings = buildings.filter(building => {
            const buildingBaseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
            return !(buildingBaseName === baseName && 
                   building.category === category && 
                   building.duration === duration);
        });
    }
    
    renderBuildingQueue();
    saveToLocalStorage();
    
    // Update the modal list
    const row = document.querySelector(`tr[data-name="${baseName}"][data-category="${category}"][data-duration="${duration}"]`);
    if (row) {
        row.remove();
    }
    
    // If no buildings left, close the modal
    if (buildings.length === 0) {
        const modal = document.getElementById('queueManagementModal');
        if (modal) {
            document.body.removeChild(modal);
        }
    } else {
        // Refresh the modal to show updated counts
        showQueueManagementModal();
    }
}

// Delete selected buildings
function deleteSelectedBuildings() {
    const checkboxes = document.querySelectorAll('.building-checkbox:checked');
    const selectedItems = [...checkboxes].map(checkbox => {
        const row = checkbox.closest('tr');
        return {
            baseName: row.dataset.name,
            category: row.dataset.category,
            duration: parseInt(row.dataset.duration)
        };
    });
    
    if (selectedItems.length > 0) {
        if (confirm(`Apakah Anda yakin ingin menghapus ${selectedItems.length} kelompok bangunan?`)) {
            // Process each selected group
            selectedItems.forEach(item => {
                // Remove all buildings matching this criteria
                buildings = buildings.filter(building => {
                    const buildingBaseName = building.name.replace(/\s*\(\d+\/\d+\)$/, '');
                    return !(buildingBaseName === item.baseName && 
                           building.category === item.category && 
                           building.duration === item.duration);
                });
            });
            
            renderBuildingQueue();
            saveToLocalStorage();
            
            // Close the modal
            const modal = document.getElementById('queueManagementModal');
            if (modal) {
                document.body.removeChild(modal);
            }
            
            // If buildings remain, show the modal again
            if (buildings.length > 0) {
                showQueueManagementModal();
            }
        }
    }
}

// Initialize the app when the DOM is loaded