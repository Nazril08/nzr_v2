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
    const promptInput = document.getElementById('promptInput');
    const negativePromptInput = document.getElementById('negativePromptInput');
    const styleSelect = document.getElementById('styleSelect');
    const ratioSelect = document.getElementById('ratioSelect');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultImage = document.getElementById('resultImage');
    const resultContainer = document.getElementById('resultContainer');
    const downloadBtn = document.getElementById('downloadBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');

    // Handle generate button click
    generateBtn.addEventListener('click', generateImage);

    async function generateImage() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            showStatus('Please enter a text prompt', 'error');
            return;
        }

        const negativePrompt = negativePromptInput.value.trim() || 'nsfw, nude, uncensored, cleavage, nipples';
        const style = styleSelect.value;
        const ratio = ratioSelect.value;
        const apiKey = apiKeyInput.value.trim();

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            resultContainer.classList.add('hidden');
            showStatus('Generating image...', 'info');

            // Generate cache key
            const cacheKey = `${prompt}-${negativePrompt}-${style}-${ratio}`;
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                // Update UI with cached image
                resultImage.src = cachedResult;
                downloadBtn.href = cachedResult;
                downloadBtn.download = `generated_image_${Date.now()}.png`;

                // Show result
                resultContainer.classList.remove('hidden');
                setTimeout(() => {
                    resultContainer.classList.add('show');
                }, 100);

                showStatus('Image loaded from cache!', 'success');
                loadingIcon.classList.add('hidden');
                generateBtn.disabled = false;
                return;
            }

            // Call the image generation API
            const apiUrl = `https://fastrestapis.fasturl.cloud/aiimage/generativeimage?prompt=${encodeURIComponent(prompt)}&negativePrompt=${encodeURIComponent(negativePrompt)}&style=${encodeURIComponent(style)}&ratio=${encodeURIComponent(ratio)}`;
            
            const headers = {
                'Accept': 'image/*'
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
                throw new Error(`Failed to generate image (${response.status})`);
            }

            // Get the generated image blob
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            
            // Update UI with generated image
            resultImage.src = imageUrl;
            downloadBtn.href = imageUrl;
            downloadBtn.download = `generated_image_${Date.now()}.png`;

            // Show result
            resultContainer.classList.remove('hidden');
            setTimeout(() => {
                resultContainer.classList.add('show');
            }, 100);

            showStatus('Image generated successfully!', 'success');

            // Cache the result
            cache.set(cacheKey, imageUrl);
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to generate image. Please try again.', 'error');
            resultContainer.classList.add('hidden');
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
    resultImage.addEventListener('error', () => {
        showStatus('Failed to load generated image. Please try again.', 'error');
        resultContainer.classList.add('hidden');
    });
}); 