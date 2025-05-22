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
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const imageResult = document.getElementById('imageResult');
    const downloadBtn = document.getElementById('downloadBtn');
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    // Handle generate button click
    generateBtn.addEventListener('click', generateImage);
    
    // Handle clear button click
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            promptInput.value = '';
            resultContainer.classList.add('hidden');
        });
    }
    
    // Handle preset buttons
    if (presetButtons) {
        presetButtons.forEach(button => {
            button.addEventListener('click', function() {
                promptInput.value = this.getAttribute('data-prompt');
            });
        });
    }
    
    // Handle download button click
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadImage);
    }

    async function generateImage() {
        // Validate prompt
        if (!promptInput.value.trim()) {
            showStatus('Prompt harus diisi', 'error');
            return;
        }

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            showStatus('Generating image...', 'info');

            // Get the prompt
            const promptValue = promptInput.value.trim();
            
            // Check cache first
            const cachedResult = cache.get(promptValue);
            if (cachedResult) {
                displayResult(cachedResult.imageUrl);
                showStatus('Image generated from cache!', 'success');
                generateBtn.disabled = false;
                loadingIcon.classList.add('hidden');
                return;
            }

            // Encode the prompt
            const encodedPrompt = encodeURIComponent(promptValue);

            // Build the API URL for Animagine
            const apiUrl = `https://api.ryzumi.vip/api/ai/animagine?prompt=${encodedPrompt}`;
            
            const headers = {
                'Accept': 'image/png'
            };
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`Failed to generate image (${response.status})`);
            }

            // Get the image blob
            const imageBlob = await response.blob();
            
            // Create a URL for the blob
            const imageUrl = URL.createObjectURL(imageBlob);
            
            // Display the result
            displayResult(imageUrl);
            
            // Cache the result
            cache.set(promptValue, { imageUrl: imageUrl, blob: imageBlob });
            
            showStatus('Image generated successfully!', 'success');
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to generate image. Please try again.', 'error');
        } finally {
            loadingIcon.classList.add('hidden');
            generateBtn.disabled = false;
        }
    }

    function displayResult(imageUrl) {
        imageResult.src = imageUrl;
        resultContainer.classList.remove('hidden');
    }

    function downloadImage() {
        // Get the currently displayed image
        const imageUrl = imageResult.src;
        if (!imageUrl) return;
        
        // Create a temporary link
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `animagine_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showStatus('Image downloaded successfully!', 'success');
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = 'mt-2 text-sm font-medium';
        
        if (type === 'error') {
            status.classList.add('text-red-600');
        } else if (type === 'success') {
            status.classList.add('text-green-600');
        } else {
            status.classList.add('text-gray-600');
        }
        
        // Automatically hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                status.textContent = '';
            }, 5000);
        }
    }
}); 