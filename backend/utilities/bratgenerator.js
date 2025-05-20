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
    const textInput = document.getElementById('textInput');
    const fontSelect = document.getElementById('fontSelect');
    const fontSizeInput = document.getElementById('fontSizeInput');
    const fontPositionSelect = document.getElementById('fontPositionSelect');
    const fontBlurInput = document.getElementById('fontBlurInput');
    const fontColorInput = document.getElementById('fontColorInput');
    const bgColorInput = document.getElementById('bgColorInput');
    const autoSizeCheck = document.getElementById('autoSizeCheck');
    const fontSizeContainer = document.getElementById('fontSizeContainer');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const resultImage = document.getElementById('resultImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const colorPreview = document.getElementById('colorPreview');
    const bgColorPreview = document.getElementById('bgColorPreview');

    // Set default values
    fontColorInput.value = '#000000';
    bgColorInput.value = '#FFFFFF';
    fontBlurInput.value = 0;
    updateColorPreview();

    // Toggle font size input based on Auto Size checkbox
    autoSizeCheck.addEventListener('change', () => {
        if (autoSizeCheck.checked) {
            fontSizeContainer.classList.add('hidden');
            fontSizeInput.value = '';
        } else {
            fontSizeContainer.classList.remove('hidden');
            if (!fontSizeInput.value) {
                fontSizeInput.value = '24';
            }
        }
    });

    // Update color previews
    fontColorInput.addEventListener('input', updateColorPreview);
    bgColorInput.addEventListener('input', updateColorPreview);

    function updateColorPreview() {
        colorPreview.style.backgroundColor = fontColorInput.value;
        bgColorPreview.style.backgroundColor = bgColorInput.value;
    }

    // Handle generate button click
    generateBtn.addEventListener('click', generateImage);

    async function generateImage() {
        // Validate inputs
        const text = textInput.value.trim();
        if (!text) {
            showStatus('Please enter some text', 'error');
            return;
        }

        const font = fontSelect.value;
        const fontSize = autoSizeCheck.checked ? 'auto' : fontSizeInput.value.trim();
        
        if (!autoSizeCheck.checked && (!fontSize || isNaN(parseInt(fontSize)))) {
            showStatus('Please enter a valid font size', 'error');
            return;
        }

        const fontPosition = fontPositionSelect.value;
        const fontBlur = fontBlurInput.value.trim() || '0';
        const fontColor = fontColorInput.value.trim().replace('#', '%23'); // Encode # as %23
        const bgColor = bgColorInput.value.trim().replace('#', '%23'); // Encode # as %23
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
            const cacheKey = `${text}-${font}-${fontSize}-${fontPosition}-${fontBlur}-${fontColor}-${bgColor}`;
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                // Update UI with cached image
                displayImage(cachedResult);
                showStatus('Image loaded from cache!', 'success');
                loadingIcon.classList.add('hidden');
                generateBtn.disabled = false;
                return;
            }

            // Build the URL with all parameters
            let apiUrl = `https://fastrestapis.fasturl.cloud/maker/brat/advanced?text=${encodeURIComponent(text)}&font=${encodeURIComponent(font)}&fontSize=${encodeURIComponent(fontSize)}&fontPosition=${encodeURIComponent(fontPosition)}&fontBlur=${encodeURIComponent(fontBlur)}&fontColor=${fontColor}&bgColor=${bgColor}`;
            
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
                throw new Error(`Failed to generate image (${response.status})`);
            }

            // Get the generated image blob
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            
            // Display the image
            displayImage(imageUrl);
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

    function displayImage(url) {
        // Set the image source
        resultImage.src = url;
        
        // Set download button
        downloadBtn.href = url;
        downloadBtn.download = `text_image_${Date.now()}.png`;
        
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

    // Handle image load errors
    resultImage.addEventListener('error', () => {
        showStatus('Failed to load generated image. Please try again.', 'error');
        resultContainer.classList.add('hidden');
    });
}); 