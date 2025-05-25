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
    const nameInput = document.getElementById('nameInput');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const resultContainer = document.getElementById('resultContainer');
    const khodamResult = document.getElementById('khodamResult');
    const status = document.getElementById('status');
    
    // Handle generate button click
    generateBtn.addEventListener('click', generateKhodam);
    
    async function generateKhodam() {
        const name = nameInput.value.trim();
        
        // Validate input
        if (!name) {
            showStatus('Please enter a name', 'error');
            return;
        }
        
        try {
            // Check rate limit
            rateLimiter.checkLimit();
            
            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            resultContainer.classList.add('hidden');
            showStatus('Checking khodam...', 'info');
            
            // Generate cache key
            const cacheKey = name.toLowerCase();
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                // Use cached result
                displayKhodam(cachedResult);
                showStatus('Khodam loaded from cache!', 'success');
                return;
            }
            
            // Build the API URL
            const apiUrl = `https://cekkhodam-api.vercel.app/api/cekkhodam?name=${encodeURIComponent(name)}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch khodam (${response.status})`);
            }
            
            const data = await response.json();
            
            // Log the full response for debugging
            console.log('Khodam API Response:', data);
            
            if (!data || !data.khodam || !data.khodam.name) {
                throw new Error('Invalid response from API');
            }
            
            // Cache the result
            cache.set(cacheKey, data);
            
            // Display the result
            displayKhodam(data);
            
            showStatus('Khodam generated successfully!', 'success');
        } catch (error) {
            console.error('Error generating khodam:', error);
            showStatus(error.message || 'Failed to generate khodam', 'error');
            
            // Fallback display
            khodamResult.innerHTML = `
                <div class="space-y-4 text-center">
                    <h2 class="text-2xl font-bold text-gray-900">${name}</h2>
                    <p class="text-xl text-red-600 font-semibold">Khodam tidak ditemukan</p>
                    <p class="text-gray-600">Coba nama lain atau periksa koneksi internet Anda</p>
                </div>
            `;
            resultContainer.classList.remove('hidden');
        } finally {
            // Reset UI
            loadingIcon.classList.add('hidden');
            generateBtn.disabled = false;
        }
    }
    
    function displayKhodam(data) {
        // Safely extract nested khodam information
        const name = data.name || 'Unknown';
        const khodamInfo = data.khodam || {};
        const khodamName = khodamInfo.name || 'Mysterious Khodam';
        const originalImageUrl = khodamInfo.image || '';
        const description = khodamInfo.description || 'No description available';

        // Detailed logging of image URL
        console.log('Original Image URL:', originalImageUrl);

        // Resolve relative URL to absolute URL with more comprehensive handling
        const imageUrl = originalImageUrl 
            ? (originalImageUrl.startsWith('http') 
                ? originalImageUrl 
                : originalImageUrl.startsWith('/')
                    ? `https://cekkhodam-api.vercel.app${originalImageUrl}`
                    : originalImageUrl)
            : '';

        console.log('Processed Image URL:', imageUrl);

        // Display the khodam result with fallback for image
        khodamResult.innerHTML = `
            <div class="space-y-4">
                ${imageUrl ? `
                    <img 
                        src="${imageUrl}" 
                        alt="${khodamName}" 
                        onerror="
                            this.onerror=null; 
                            this.classList.add('hidden'); 
                            console.error('Image failed to load:', this.src);
                            document.getElementById('imageErrorMessage').textContent = 'Failed to load image: ' + this.src;
                        "
                        class="mx-auto max-w-[200px] max-h-[200px] object-cover rounded-lg shadow-md mb-4"
                    >
                ` : ''}
                <h2 class="text-2xl font-bold text-gray-900">${name}</h2>
                <p class="text-xl text-indigo-600 font-semibold">${khodamName}</p>
                <p class="text-gray-600">${description}</p>
                ${originalImageUrl ? `
                    <p class="text-xs text-gray-500 text-center">
                        Original image URL: ${originalImageUrl}
                    </p>
                ` : ''}
                <p id="imageErrorMessage" class="text-red-500 text-center"></p>
            </div>
        `;
        resultContainer.classList.remove('hidden');

        // Attempt to fetch image and log details
        if (imageUrl) {
            fetch(imageUrl, { 
                method: 'HEAD',
                mode: 'no-cors'
            })
            .then(response => {
                console.log('Image fetch response:', response);
            })
            .catch(error => {
                console.error('Image fetch error:', error);
            });
        }
    }
    
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status-${type}`;
    }
}); 