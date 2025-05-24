document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const imageUrlInput = document.getElementById('imageUrl');
    const promptInput = document.getElementById('prompt');
    const changeBackgroundBtn = document.getElementById('changeBackground');
    const previewImage = document.getElementById('previewImage');
    const resultImage = document.getElementById('resultImage');
    const noImageText = document.getElementById('noImageText');
    const noResultText = document.getElementById('noResultText');
    const statusDiv = document.getElementById('status');

    // Advanced Rate Limiter Configuration
    const RateLimiter = {
        // Configuration
        maxRequestsPerMinute: 5,
        maxRequestsPerHour: 20,
        
        // Storage for tracking requests
        requests: {
            minute: [],
            hour: []
        },
        
        // Check if request is allowed
        isRequestAllowed: function() {
            const now = Date.now();
            
            // Clean up old requests
            this.requests.minute = this.requests.minute.filter(time => now - time < 60000);
            this.requests.hour = this.requests.hour.filter(time => now - time < 3600000);
            
            // Check minute limit
            if (this.requests.minute.length >= this.maxRequestsPerMinute) {
                const oldestMinuteRequest = this.requests.minute[0];
                const secondsToWait = Math.ceil((60000 - (now - oldestMinuteRequest)) / 1000);
                throw new Error(`Too many requests. Please wait ${secondsToWait} seconds.`);
            }
            
            // Check hourly limit
            if (this.requests.hour.length >= this.maxRequestsPerHour) {
                const oldestHourRequest = this.requests.hour[0];
                const minutesToWait = Math.ceil((3600000 - (now - oldestHourRequest)) / 60000);
                throw new Error(`Hourly limit reached. Please wait ${minutesToWait} minutes.`);
            }
            
            // Record the request
            this.requests.minute.push(now);
            this.requests.hour.push(now);
            
            return true;
        },
        
        // Reset limits (optional, can be used for testing or admin purposes)
        reset: function() {
            this.requests.minute = [];
            this.requests.hour = [];
        }
    };

    // Cache Configuration
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

    // Status Message Function
    function showStatus(type, message) {
        statusDiv.textContent = message;
        statusDiv.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-blue-100', 'text-blue-700');
        
        switch(type) {
            case 'success':
                statusDiv.classList.add('bg-green-100', 'text-green-700');
                break;
            case 'error':
                statusDiv.classList.add('bg-red-100', 'text-red-700');
                break;
            case 'loading':
                statusDiv.classList.add('bg-blue-100', 'text-blue-700');
                break;
        }
        
        // Auto-hide status after 5 seconds for error messages
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, type === 'error' ? 5000 : 3000);
    }

    // Image Preview Functionality
    imageUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        
        // Reset preview
        previewImage.src = '';
        previewImage.classList.add('hidden');
        noImageText.classList.remove('hidden');
        
        if (!url) return;

        // Create a new image to test loading
        const img = new Image();
        
        // Show loading status
        showStatus('loading', 'Checking image URL...');
        
        img.onload = function() {
            // Successfully loaded image
            previewImage.src = url;
            previewImage.classList.remove('hidden');
            noImageText.classList.add('hidden');
            showStatus('success', 'Image loaded successfully');
        };
        
        img.onerror = function() {
            // Failed to load image
            showStatus('error', 'Failed to load image. Please check the URL.');
        };
        
        // Trigger image loading
        img.src = url;
    });

    // Change Background Functionality
    changeBackgroundBtn.addEventListener('click', async function() {
        // Get input values
        const imageUrl = imageUrlInput.value.trim();
        const prompt = promptInput.value.trim();

        // Validate inputs
        if (!imageUrl) {
            showStatus('error', 'Please enter an image URL');
            return;
        }

        if (!prompt) {
            showStatus('error', 'Please describe the background');
            return;
        }

        try {
            // Check rate limit
            RateLimiter.isRequestAllowed();

            // Disable button and show loading state
            changeBackgroundBtn.disabled = true;
            changeBackgroundBtn.innerHTML = `
                <svg class="animate-spin w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Changing Background...
            `;

            // Show loading status
            showStatus('loading', 'Processing image...');

            // Generate cache key
            const cacheKey = `${imageUrl}-${prompt}`;

            // Check cache first
            const cachedResult = cache.get(cacheKey);
            if (cachedResult) {
                showStatus('success', 'Retrieved from cache!');
                displayResult(cachedResult);
                return;
            }

            // Construct API URL
            const apiUrl = `https://fastrestapis.fasturl.cloud/imgedit/aibackground?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;

            // Make API request
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Convert response to blob
            const blob = await response.blob();
            const resultUrl = URL.createObjectURL(blob);

            // Store in cache
            cache.set(cacheKey, resultUrl);

            // Display result
            displayResult(resultUrl);

        } catch (error) {
            // Handle errors
            console.error('Background change error:', error);
            
            // Differentiate between rate limit and other errors
            if (error.message.includes('Too many requests') || error.message.includes('Hourly limit')) {
                showStatus('error', error.message);
            } else {
                showStatus('error', 'Failed to change background. Please try again later.');
            }
        } finally {
            // Reset button state
            changeBackgroundBtn.disabled = false;
            changeBackgroundBtn.innerHTML = 'Change Background';
        }
    });

    // Display Result Function
    function displayResult(imageUrl) {
        // Show result image
        resultImage.src = imageUrl;
        resultImage.classList.remove('hidden');
        noResultText.classList.add('hidden');

        // Show success status
        showStatus('success', 'Background changed successfully!');
    }
}); 