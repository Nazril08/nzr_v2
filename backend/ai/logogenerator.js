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
    // Element references
    const brandNameInput = document.getElementById('brandName');
    const promptInput = document.getElementById('prompt');
    const industrySelect = document.getElementById('industry');
    const styleSelect = document.getElementById('style');
    const apiKeyInput = document.getElementById('apiKey');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    const logoImage = document.getElementById('logoImage');
    const downloadBtn = document.getElementById('downloadBtn');

    // Generate logo
    generateBtn.addEventListener('click', generateLogo);

    async function generateLogo() {
        const brandName = brandNameInput.value.trim();
        const prompt = promptInput.value.trim();
        const industry = industrySelect.value;
        const style = styleSelect.value;
        const apiKey = apiKeyInput.value.trim();

        // Validate inputs
        if (!brandName) {
            showStatus('Please enter a brand name', 'error');
            return;
        }

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Check cache first
            const cacheKey = `${brandName}-${prompt}-${industry}-${style}`;
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                logoImage.src = cachedResult;
                result.classList.remove('hidden');
                downloadBtn.href = cachedResult;
                downloadBtn.download = `${brandName.replace(/\s+/g, '_')}_logo.png`;
                showStatus('Logo loaded from cache!', 'success');
                return;
            }

            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            result.classList.add('hidden');
            showStatus('Generating logo...', 'info');

            // Build API URL
            let apiUrl = `https://fastrestapis.fasturl.cloud/aiimage/logogenerator?brandname=${encodeURIComponent(brandName)}&prompt=${encodeURIComponent(prompt)}&industry=${encodeURIComponent(industry)}&style=${encodeURIComponent(style)}`;

            // Call the API
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'image/png',
                    ...(apiKey && { 'x-api-key': apiKey })
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to generate logo (${response.status})`);
            }

            // Get the logo image blob
            const imageBlob = await response.blob();
            const logoUrl = URL.createObjectURL(imageBlob);
            
            // Update UI with generated logo
            logoImage.src = logoUrl;
            downloadBtn.href = logoUrl;
            downloadBtn.download = `${brandName.replace(/\s+/g, '_')}_logo.png`;

            // Show result
            result.classList.remove('hidden');
            setTimeout(() => {
                result.classList.add('show');
            }, 100);

            showStatus('Logo generated successfully!', 'success');

            // Cache the result
            cache.set(cacheKey, logoUrl);

        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to generate logo. Please try again.', 'error');
            result.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            generateBtn.disabled = false;
        }
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

    // Handle image load errors
    logoImage.addEventListener('error', () => {
        showStatus('Failed to load generated logo', 'error');
        result.classList.add('hidden');
    });
}); 