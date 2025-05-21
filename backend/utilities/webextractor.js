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
    maxSize: 20,
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
    const urlInput = document.getElementById('urlInput');
    const typeSelect = document.getElementById('typeSelect');
    const extractBtn = document.getElementById('extractBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const resultFrame = document.getElementById('resultFrame');
    const downloadBtn = document.getElementById('downloadBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');

    // Handle extract button click
    extractBtn.addEventListener('click', extractWebsite);

    async function extractWebsite() {
        const url = urlInput.value.trim();
        if (!url) {
            showStatus('Please enter a website URL', 'error');
            return;
        }

        // Ensure URL has http:// or https:// prefix
        let processedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            processedUrl = 'https://' + url;
            console.log('Added https:// prefix to URL:', processedUrl);
        }

        const type = typeSelect.value;
        const apiKey = apiKeyInput.value.trim();

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            extractBtn.disabled = true;
            resultContainer.classList.add('hidden');
            showStatus('Extracting website content...', 'info');

            // Generate cache key
            const cacheKey = `${processedUrl}-${type}`;
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                // Handle cached result based on type
                handleExtractResult(cachedResult, type, processedUrl);
                return;
            }

            // Build the API URL
            const apiUrl = `https://fastrestapis.fasturl.cloud/tool/webextractor?url=${encodeURIComponent(processedUrl)}&type=${type}`;
            
            const headers = {
                'Accept': getAcceptHeaderForType(type)
            };
            
            // Add API key if provided
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }
            
            console.log('Making request to:', apiUrl);
            console.log('Headers:', headers);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`Failed to extract website content (${response.status})`);
            }

            // Get the response based on the requested type
            const result = await getResponseByType(response, type);
            
            // Handle the result
            handleExtractResult(result, type, processedUrl);
            
            // Cache the result
            cache.set(cacheKey, result);
        } catch (error) {
            console.error('Error:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Failed to extract website content. Please try again.';
            
            if (error.message.includes('400')) {
                errorMessage = 'Invalid request. Make sure you entered a valid URL with http:// or https:// prefix.';
            } else if (error.message.includes('403')) {
                errorMessage = 'Access denied. You may need an API key for this operation.';
            } else if (error.message.includes('429')) {
                errorMessage = 'Too many requests. Please wait a moment and try again.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error. This website may not be supported or is currently unavailable.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            showStatus(errorMessage, 'error');
            resultContainer.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            extractBtn.disabled = false;
        }
    }

    function getAcceptHeaderForType(type) {
        switch (type) {
            case 'pdf':
                return 'application/pdf';
            case 'img':
                return 'image/*';
            case 'mhtml':
                return 'text/html';
            default:
                return 'application/pdf';
        }
    }

    async function getResponseByType(response, type) {
        try {
            switch (type) {
                case 'pdf':
                    return URL.createObjectURL(await response.blob());
                case 'img':
                    return URL.createObjectURL(await response.blob());
                case 'mhtml':
                    return await response.text();
                default:
                    return URL.createObjectURL(await response.blob());
            }
        } catch (error) {
            console.error('Error processing response:', error);
            throw new Error('Failed to process the extracted content');
        }
    }

    function handleExtractResult(result, type, url) {
        // Update download button
        const fileName = getFileNameFromUrl(url, type);
        downloadBtn.setAttribute('download', fileName);
        downloadBtn.href = type === 'mhtml' ? createTextFileUrl(result) : result;
        downloadBtn.classList.remove('hidden');

        // For images and PDFs, show in iframe/img
        if (type === 'pdf') {
            resultFrame.src = result;
            resultFrame.classList.remove('hidden');
            resultFrame.nextElementSibling.classList.add('hidden'); // Hide img
        } else if (type === 'img') {
            resultFrame.classList.add('hidden');
            resultFrame.nextElementSibling.src = result; // Update img
            resultFrame.nextElementSibling.classList.remove('hidden');
        } else {
            resultFrame.src = '';
            resultFrame.classList.add('hidden');
            resultFrame.nextElementSibling.classList.add('hidden');
        }

        // Show result container
        resultContainer.classList.remove('hidden');
        showStatus('Website content extracted successfully!', 'success');
    }

    function getFileNameFromUrl(url, type) {
        try {
            const domain = new URL(url).hostname.replace(/\./g, '-');
            switch (type) {
                case 'pdf':
                    return `${domain}-webextractor.pdf`;
                case 'img':
                    return `${domain}-webextractor.png`;
                case 'mhtml':
                    return `${domain}-webextractor.html`;
                default:
                    return `${domain}-webextractor.pdf`;
            }
        } catch (e) {
            return `webextractor-${type}`;
        }
    }

    function createTextFileUrl(text) {
        const blob = new Blob([text], { type: 'text/html' });
        return URL.createObjectURL(blob);
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