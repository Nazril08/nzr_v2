document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initTimelineControls();
    initTownHallLevelSelector(); // Initialize Town Hall level selector
});

// Town Hall level selector functionality
function initTownHallLevelSelector() {
    const townHallSelector = document.getElementById('townHallSelector');
    const thLevelDataContainer = document.getElementById('thLevelDataContainer');
    const thLevelTitle = document.getElementById('thLevelTitle');
    const thLevelData = document.getElementById('thLevelData');
    const thLevelDataError = document.getElementById('thLevelDataError');
    const loadAllDefensesBtn = document.getElementById('loadAllDefensesBtn');
    const addSelectedToQueueBtn = document.getElementById('addSelectedToQueueBtn');
    
    // Current state
    let currentTHLevel = null;
    let selectedDefenses = [];
    
    // Add event listener to TH level dropdown
    townHallSelector.addEventListener('change', () => {
        // Get selected TH level
        const level = townHallSelector.value;
        currentTHLevel = parseInt(level);
        
        // Update title
        thLevelTitle.querySelector('span').textContent = level;
        
        // Show data container
        thLevelDataContainer.classList.remove('hidden');
        
        // Reset selected defenses
        selectedDefenses = [];
        updateAddToQueueButton();
        
        // Load all defenses
        loadAllDefenses();
    });
    
    // Add event listener to defense button
    loadAllDefensesBtn.addEventListener('click', loadAllDefenses);
    
    // Add selected defenses to queue
    addSelectedToQueueBtn.addEventListener('click', addSelectedDefensesToQueue);
    
    // Load all defenses for current TH level
    async function loadAllDefenses() {
        if (!currentTHLevel) return;
        
        try {
            // Show loading state
            showLoading();
            
            // Get all defenses data
            const allDefenses = await cocApi.getAllDefenses(currentTHLevel);
            
            // Render all defenses
            renderDefenses(allDefenses);
        } catch (error) {
            console.error('Error loading all defenses:', error);
            showError();
        }
    }
    
    // Render defenses in the data container
    function renderDefenses(defenses) {
        // Clear previous data
        thLevelData.innerHTML = '';
        thLevelDataError.classList.add('hidden');
        
        // If no defenses found
        if (!defenses || defenses.length === 0) {
            thLevelData.innerHTML = `
                <div class="col-span-full text-center py-6 text-gray-500">
                    No defense upgrades available for Town Hall level ${currentTHLevel}.
                </div>
            `;
            return;
        }
        
        // Sort defenses by name and level
        defenses.sort((a, b) => {
            if (a.name !== b.name) {
                return a.name.localeCompare(b.name);
            }
            return a.level - b.level;
        });
        
        // Render each defense item
        defenses.forEach(defense => {
            const type = defense.type || 'unknown';
            const name = defense.name || 'Defense';
            const level = defense.level || '1';
            const upgradeTime = defense.upgradeTime || '1d';
            const upgradeCost = defense.upgradeCost || '1000';
            const damagePerSecond = defense.damagePerSecond || 'N/A';
            const damagePerShot = defense.damagePerShot || defense.damagePerAttack || 'N/A';
            const hitpoints = defense.hitpoints || 'N/A';
            const damagePerAttack = defense.damagePerAttack || 'N/A';
            
            // Create defense card
            const card = document.createElement('div');
            card.className = 'p-4 rounded-lg border transition-all hover:shadow-md defense-card';
            
            // Set defense type specific styling
            let typeClass = '';
            let damageDisplay = '';
            
            switch (type) {
                case 'cannon':
                    typeClass = 'cannon';
                    damageDisplay = `DPS: ${damagePerSecond}`;
                    break;
                case 'archerTower':
                    typeClass = 'archer-tower';
                    damageDisplay = `DPS: ${damagePerSecond}`;
                    break;
                case 'mortar':
                    typeClass = 'mortar';
                    damageDisplay = `DPS: ${damagePerSecond} | Damage/Shot: ${defense.damagePerShot || 'N/A'}`;
                    break;
                case 'airDefense':
                    typeClass = 'air-defense';
                    damageDisplay = `DPS: ${damagePerSecond} | Damage/Attack: ${defense.damagePerAttack || 'N/A'}`;
                    break;
            }
            
            if (typeClass) {
                card.classList.add(typeClass);
            }
            
            card.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h4 class="text-lg font-medium text-gray-900 mb-1">${name} Level ${level}</h4>
                        <div class="grid grid-cols-2 gap-x-2 gap-y-1">
                            <p class="text-sm text-gray-700"><span class="font-medium">DPS:</span> ${damagePerSecond}</p>
                            <p class="text-sm text-gray-700"><span class="font-medium">HP:</span> ${hitpoints}</p>
                            ${damagePerShot !== 'N/A' ? `<p class="text-sm text-gray-700"><span class="font-medium">Damage/Shot:</span> ${damagePerShot}</p>` : ''}
                            ${damagePerAttack !== 'N/A' && damagePerAttack !== damagePerSecond ? `<p class="text-sm text-gray-700"><span class="font-medium">Damage/Attack:</span> ${damagePerAttack}</p>` : ''}
                        </div>
                        <div class="mt-2 pt-2 border-t border-gray-200">
                            <p class="text-sm text-indigo-700 font-medium">Upgrade Time: ${upgradeTime}</p>
                            <p class="text-sm text-amber-700 font-medium">Cost: ${upgradeCost}</p>
                        </div>
                    </div>
                    <div class="ml-4 flex items-center">
                        <input type="checkbox" class="defense-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded cursor-pointer focus:ring-indigo-500"
                            data-name="${name}"
                            data-level="${level}"
                            data-type="${type}"
                            data-time="${upgradeTime}"
                            data-cost="${upgradeCost}">
                    </div>
                </div>
            `;
            
            // Add event listener to checkbox
            const checkbox = card.querySelector('.defense-checkbox');
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    selectedDefenses.push({
                        name: this.dataset.name,
                        level: this.dataset.level,
                        type: this.dataset.type,
                        upgradeTime: this.dataset.time,
                        upgradeCost: this.dataset.cost
                    });
                } else {
                    selectedDefenses = selectedDefenses.filter(d => 
                        !(d.name === this.dataset.name && 
                          d.level === this.dataset.level && 
                          d.type === this.dataset.type));
                }
                
                updateAddToQueueButton();
            });
            
            thLevelData.appendChild(card);
        });
    }
    
    // Show loading state
    function showLoading() {
        thLevelData.innerHTML = `
            <div class="p-3 rounded-lg border border-gray-200 bg-gray-50 animate-pulse">
                <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
                <div class="h-3 bg-gray-300 rounded w-2/3"></div>
            </div>
            <div class="p-3 rounded-lg border border-gray-200 bg-gray-50 animate-pulse">
                <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
                <div class="h-3 bg-gray-300 rounded w-2/3"></div>
            </div>
            <div class="p-3 rounded-lg border border-gray-200 bg-gray-50 animate-pulse">
                <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
                <div class="h-3 bg-gray-300 rounded w-2/3"></div>
            </div>
        `;
        thLevelDataError.classList.add('hidden');
    }
    
    // Show error state
    function showError() {
        thLevelData.innerHTML = '';
        thLevelDataError.classList.remove('hidden');
    }
    
    // Update add to queue button state
    function updateAddToQueueButton() {
        if (selectedDefenses.length > 0) {
            addSelectedToQueueBtn.disabled = false;
            addSelectedToQueueBtn.innerHTML = `
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add ${selectedDefenses.length} Defense${selectedDefenses.length > 1 ? 's' : ''} to Queue
            `;
        } else {
            addSelectedToQueueBtn.disabled = true;
            addSelectedToQueueBtn.innerHTML = `
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Selected to Queue
            `;
        }
    }
    
    // Add selected defenses to queue
    function addSelectedDefensesToQueue() {
        if (selectedDefenses.length === 0) return;
        
        const defensesCount = selectedDefenses.length;
        
        // Process each selected defense
        selectedDefenses.forEach(defense => {
            // Parse upgrade time
            const timeRegex = /(\d+)([dhm])/;
            const timeMatch = defense.upgradeTime.match(timeRegex);
            
            let days = 0, hours = 0, minutes = 0;
            
            if (timeMatch) {
                const value = parseInt(timeMatch[1]);
                const unit = timeMatch[2];
                
                if (unit === 'd') days = value;
                else if (unit === 'h') hours = value;
                else if (unit === 'm') minutes = value;
            }
            
            // Add to building queue
            const nameInput = document.getElementById('buildingName');
            const categorySelect = document.getElementById('buildingCategory');
            const daysInput = document.getElementById('upgradeDays');
            const hoursInput = document.getElementById('upgradeHours');
            const minutesInput = document.getElementById('upgradeMinutes');
            const prioritySelect = document.getElementById('buildingPriority');
            const quantityInput = document.getElementById('buildingQuantity');
            
            // Set form values
            nameInput.value = `${defense.name} Level ${defense.level}`;
            categorySelect.value = 'defense';
            daysInput.value = days;
            hoursInput.value = hours;
            minutesInput.value = minutes;
            prioritySelect.value = 'medium';
            quantityInput.value = 1;
            
            // Trigger add building
            document.getElementById('addBuildingBtn').click();
        });
        
        // Reset selected defenses
        selectedDefenses = [];
        
        // Uncheck all checkboxes
        const checkboxes = document.querySelectorAll('.defense-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        
        // Update button state
        updateAddToQueueButton();
        
        // Show success message
        alert(`Added ${defensesCount} defense(s) to the queue!`);
    }
}
