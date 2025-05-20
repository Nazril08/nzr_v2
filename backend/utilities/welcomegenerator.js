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
    const avatarUrlInput = document.getElementById('avatarUrlInput');
    const previewAvatar = document.getElementById('previewAvatar');
    const avatarPreviewContainer = document.getElementById('avatarPreviewContainer');
    const backgroundUrlInput = document.getElementById('backgroundUrlInput');
    const previewBackground = document.getElementById('previewBackground');
    const backgroundPreviewContainer = document.getElementById('backgroundPreviewContainer');
    const titleInput = document.getElementById('titleInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const borderColorInput = document.getElementById('borderColorInput');
    const avatarBorderColorInput = document.getElementById('avatarBorderColorInput');
    const overlayOpacityInput = document.getElementById('overlayOpacityInput');
    const opacityValue = document.getElementById('opacityValue');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const resultImage = document.getElementById('resultImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const borderColorPreview = document.getElementById('borderColorPreview');
    const avatarBorderColorPreview = document.getElementById('avatarBorderColorPreview');

    // Set default values
    borderColorInput.value = '#2a2e35';
    avatarBorderColorInput.value = '#2a2e35';
    overlayOpacityInput.value = 0.5;
    opacityValue.textContent = '0.5';
    updateColorPreviews();

    // Update the opacity value display
    overlayOpacityInput.addEventListener('input', () => {
        opacityValue.textContent = overlayOpacityInput.value;
    });

    // Preview avatar when URL changes
    avatarUrlInput.addEventListener('input', () => {
        const imageUrl = avatarUrlInput.value.trim();
        if (imageUrl) {
            previewAvatar.src = imageUrl;
            avatarPreviewContainer.classList.remove('hidden');
        } else {
            avatarPreviewContainer.classList.add('hidden');
        }
    });

    // Handle avatar image loading error
    previewAvatar.addEventListener('error', () => {
        avatarPreviewContainer.classList.add('hidden');
        avatarUrlInput.classList.add('border-red-500');
        showStatus('Invalid avatar image URL. Please enter a valid URL.', 'error');
    });

    // Handle avatar image load success
    previewAvatar.addEventListener('load', () => {
        if (avatarUrlInput.value.trim() !== '') {
            avatarUrlInput.classList.remove('border-red-500');
            avatarPreviewContainer.classList.remove('hidden');
        }
    });

    // Preview background when URL changes
    backgroundUrlInput.addEventListener('input', () => {
        const imageUrl = backgroundUrlInput.value.trim();
        if (imageUrl) {
            previewBackground.src = imageUrl;
            backgroundPreviewContainer.classList.remove('hidden');
        } else {
            backgroundPreviewContainer.classList.add('hidden');
        }
    });

    // Handle background image loading error
    previewBackground.addEventListener('error', () => {
        backgroundPreviewContainer.classList.add('hidden');
        backgroundUrlInput.classList.add('border-red-500');
        showStatus('Invalid background image URL. Please enter a valid URL.', 'error');
    });

    // Handle background image load success
    previewBackground.addEventListener('load', () => {
        if (backgroundUrlInput.value.trim() !== '') {
            backgroundUrlInput.classList.remove('border-red-500');
            backgroundPreviewContainer.classList.remove('hidden');
        }
    });

    // Update color previews
    borderColorInput.addEventListener('input', updateColorPreviews);
    avatarBorderColorInput.addEventListener('input', updateColorPreviews);

    function updateColorPreviews() {
        borderColorPreview.style.backgroundColor = borderColorInput.value;
        avatarBorderColorPreview.style.backgroundColor = avatarBorderColorInput.value;
    }

    // Handle generate button click
    generateBtn.addEventListener('click', generateWelcomeImage);

    async function generateWelcomeImage() {
        // Validate inputs
        const avatarUrl = avatarUrlInput.value.trim();
        if (!avatarUrl) {
            showStatus('Please enter an avatar image URL', 'error');
            return;
        }

        const backgroundUrl = backgroundUrlInput.value.trim();
        if (!backgroundUrl) {
            showStatus('Please enter a background image URL', 'error');
            return;
        }

        const title = titleInput.value.trim();
        if (!title) {
            showStatus('Please enter a welcome title', 'error');
            return;
        }

        const description = descriptionInput.value.trim();
        const borderColor = borderColorInput.value.trim().replace('#', '');
        const avatarBorderColor = avatarBorderColorInput.value.trim().replace('#', '');
        const overlayOpacity = overlayOpacityInput.value;
        const apiKey = apiKeyInput.value.trim();

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            resultContainer.classList.add('hidden');
            showStatus('Generating welcome image...', 'info');

            // Generate cache key
            const cacheKey = `${avatarUrl}-${backgroundUrl}-${title}-${description}-${borderColor}-${avatarBorderColor}-${overlayOpacity}`;
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                // Update UI with cached image
                displayWelcomeImage(cachedResult);
                showStatus('Welcome image loaded from cache!', 'success');
                loadingIcon.classList.add('hidden');
                generateBtn.disabled = false;
                return;
            }

            // Build the URL with all parameters
            let apiUrl = `https://fastrestapis.fasturl.cloud/canvas/welcome?avatar=${encodeURIComponent(avatarUrl)}&background=${encodeURIComponent(backgroundUrl)}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&borderColor=${encodeURIComponent(borderColor)}&avatarBorderColor=${encodeURIComponent(avatarBorderColor)}&overlayOpacity=${encodeURIComponent(overlayOpacity)}`;
            
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
                throw new Error(`Failed to generate welcome image (${response.status})`);
            }

            // Get the generated image blob
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            
            // Display the welcome image
            displayWelcomeImage(imageUrl);
            showStatus('Welcome image generated successfully!', 'success');

            // Cache the result
            cache.set(cacheKey, imageUrl);
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to generate welcome image. Please try again.', 'error');
            resultContainer.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            generateBtn.disabled = false;
        }
    }

    function displayWelcomeImage(url) {
        // Set the image source
        resultImage.src = url;
        
        // Set download button
        downloadBtn.href = url;
        downloadBtn.download = `welcome_image_${Date.now()}.png`;
        
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

    // Handle result image load errors
    resultImage.addEventListener('error', () => {
        showStatus('Failed to load generated image. Please try again.', 'error');
        resultContainer.classList.add('hidden');
    });
}); 