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
    const quoteTextInput = document.getElementById('quoteTextInput');
    const usernameInput = document.getElementById('usernameInput');
    const profileImageInput = document.getElementById('profileImageInput');
    const previewProfileImage = document.getElementById('previewProfileImage');
    const signatureInput = document.getElementById('signatureInput');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const resultImage = document.getElementById('resultImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const previewImageContainer = document.getElementById('previewImageContainer');

    // Preview profile image when URL changes
    profileImageInput.addEventListener('input', () => {
        const imageUrl = profileImageInput.value.trim();
        if (imageUrl) {
            previewProfileImage.src = imageUrl;
            previewImageContainer.classList.remove('hidden');
        } else {
            previewImageContainer.classList.add('hidden');
        }
    });

    // Handle profile image loading error
    previewProfileImage.addEventListener('error', () => {
        previewImageContainer.classList.add('hidden');
        profileImageInput.classList.add('border-red-500');
        showStatus('Invalid profile image URL. Please enter a valid URL.', 'error');
    });

    // Handle profile image load success
    previewProfileImage.addEventListener('load', () => {
        if (profileImageInput.value.trim() !== '') {
            profileImageInput.classList.remove('border-red-500');
            previewImageContainer.classList.remove('hidden');
        }
    });

    // Handle generate button click
    generateBtn.addEventListener('click', generateQuote);

    async function generateQuote() {
        // Validate inputs
        const quoteText = quoteTextInput.value.trim();
        if (!quoteText) {
            showStatus('Please enter a quote text', 'error');
            return;
        }

        const username = usernameInput.value.trim() || 'Anonymous';
        const profileImageUrl = profileImageInput.value.trim();
        const signature = signatureInput.value.trim() || '@FastURL';
        const apiKey = apiKeyInput.value.trim();

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            resultContainer.classList.add('hidden');
            showStatus('Generating quote image...', 'info');

            // Generate cache key
            const cacheKey = `${quoteText}-${username}-${profileImageUrl}-${signature}`;
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                // Update UI with cached image
                displayQuoteImage(cachedResult);
                showStatus('Quote image loaded from cache!', 'success');
                loadingIcon.classList.add('hidden');
                generateBtn.disabled = false;
                return;
            }

            // Build the URL with all parameters
            let apiUrl = `https://fastrestapis.fasturl.cloud/maker/quote?text=${encodeURIComponent(quoteText)}&username=${encodeURIComponent(username)}&signature=${encodeURIComponent(signature)}`;
            
            // Add profile image URL if provided
            if (profileImageUrl) {
                apiUrl += `&ppUrl=${encodeURIComponent(profileImageUrl)}`;
            }
            
            const headers = {
                'Accept': 'image/png'
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
                throw new Error(`Failed to generate quote image (${response.status})`);
            }

            // Get the generated image blob
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            
            // Display the quote image
            displayQuoteImage(imageUrl);
            showStatus('Quote image generated successfully!', 'success');

            // Cache the result
            cache.set(cacheKey, imageUrl);
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to generate quote image. Please try again.', 'error');
            resultContainer.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            generateBtn.disabled = false;
        }
    }

    function displayQuoteImage(url) {
        // Set the image source
        resultImage.src = url;
        
        // Set download button
        downloadBtn.href = url;
        downloadBtn.download = `quote_${Date.now()}.png`;
        
        // Show result container
        resultContainer.classList.remove('hidden');
        setTimeout(() => {
            resultContainer.classList.add('show');
        }, 100);
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

    // Handle quote image load errors
    resultImage.addEventListener('error', () => {
        showStatus('Failed to load generated image. Please try again.', 'error');
        resultContainer.classList.add('hidden');
    });
}); 