// Rate limiter configuration
const rateLimiter = {
    maxRequests: 5,
    timeWindow: 60000, // 1 minute
    requests: [],
    
    checkLimit: function() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const timeToWait = Math.ceil((this.timeWindow - (now - oldestRequest)) / 1000);
            throw new Error(`Rate limit exceeded. Please wait ${timeToWait} seconds before trying again.`);
        }
        
        this.requests.push(now);
        return true;
    }
};

// Cache configuration
const cache = {
    data: new Map(),
    maxSize: 50,
    timeToLive: 3600000, // 1 hour
    
    set: function(key, value) {
        if (this.data.size >= this.maxSize) {
            const firstKey = this.data.keys().next().value;
            this.data.delete(firstKey);
        }
        
        this.data.set(key, {
            value: value,
            timestamp: Date.now()
        });
    },
    
    get: function(key) {
        const item = this.data.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.timeToLive) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const monthSelect = document.getElementById('monthSelect');
    const yearInput = document.getElementById('yearInput');
    const colorSchemeSelect = document.getElementById('colorSchemeSelect');
    const includeHolidays = document.getElementById('includeHolidays');
    const headerStyleSelect = document.getElementById('headerStyleSelect');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const calendarDisplay = document.getElementById('calendarDisplay');
    const downloadBtn = document.getElementById('downloadBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');

    // Set default year to current year
    const currentYear = new Date().getFullYear();
    yearInput.value = currentYear;

    // Handle generate button click
    generateBtn.addEventListener('click', generateCalendar);

    async function generateCalendar() {
        const month = monthSelect.value;
        const year = yearInput.value.trim();
        
        if (!year || isNaN(parseInt(year)) || parseInt(year) < 1900 || parseInt(year) > 2100) {
            showStatus('Please enter a valid year between 1900 and 2100', 'error');
            return;
        }

        const colorScheme = colorSchemeSelect.value;
        const holidays = includeHolidays.checked ? 'true' : 'false';
        const headerStyle = headerStyleSelect.value;
        const apiKey = apiKeyInput.value.trim();

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            resultContainer.classList.add('hidden');
            showStatus('Generating calendar...', 'info');

            // Generate cache key
            const cacheKey = `${month}-${year}-${colorScheme}-${holidays}-${headerStyle}`;
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                // Update UI with cached calendar
                displayCalendar(cachedResult);
                showStatus('Calendar loaded from cache!', 'success');
                loadingIcon.classList.add('hidden');
                generateBtn.disabled = false;
                return;
            }

            // Call the calendar generation API
            const apiUrl = `https://fastrestapis.fasturl.cloud/maker/calendar/advanced?month=${month}&year=${year}&colorScheme=${colorScheme}&includeHolidays=${holidays}&headerStyle=${headerStyle}`;
            
            const headers = {
                'Accept': 'image/png, application/pdf'
            };
            
            // Add API key if provided
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`Failed to generate calendar (${response.status})`);
            }

            // Get the generated calendar blob
            const calendarBlob = await response.blob();
            const calendarUrl = URL.createObjectURL(calendarBlob);
            
            // Display the calendar
            displayCalendar(calendarUrl);
            showStatus('Calendar generated successfully!', 'success');

            // Cache the result
            cache.set(cacheKey, calendarUrl);
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to generate calendar. Please try again.', 'error');
            resultContainer.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            generateBtn.disabled = false;
        }
    }

    function displayCalendar(url) {
        // Check the content type to determine display method
        fetch(url)
            .then(response => {
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/pdf')) {
                    // Display as PDF in an iframe
                    calendarDisplay.innerHTML = `<iframe src="${url}" width="100%" height="500px" frameborder="0"></iframe>`;
                } else {
                    // Display as image
                    calendarDisplay.innerHTML = `<img src="${url}" class="w-full h-auto rounded-lg" alt="Generated calendar">`;
                }
                
                // Set download button
                downloadBtn.href = url;
                downloadBtn.download = `calendar_${monthSelect.options[monthSelect.selectedIndex].text}_${yearInput.value}.png`;
                
                // Show result container
                resultContainer.classList.remove('hidden');
                setTimeout(() => {
                    resultContainer.classList.add('show');
                }, 100);
            })
            .catch(error => {
                console.error('Error determining content type:', error);
                // Default to image display if content type check fails
                calendarDisplay.innerHTML = `<img src="${url}" class="w-full h-auto rounded-lg" alt="Generated calendar">`;
                
                // Set download button
                downloadBtn.href = url;
                downloadBtn.download = `calendar_${monthSelect.options[monthSelect.selectedIndex].text}_${yearInput.value}.png`;
                
                // Show result container
                resultContainer.classList.remove('hidden');
                setTimeout(() => {
                    resultContainer.classList.add('show');
                }, 100);
            });
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.classList.remove('hidden');
        
        // Reset classes
        status.className = 'mt-4 text-center p-3 rounded-lg';
        
        // Add appropriate color class
        switch(type) {
            case 'error':
                status.classList.add('bg-red-100', 'text-red-700');
                break;
            case 'success':
                status.classList.add('bg-green-100', 'text-green-700');
                break;
            case 'info':
                status.classList.add('bg-blue-100', 'text-blue-700');
                break;
        }
    }
}); 