// Rate limiter configuration
const RATE_LIMIT = 5; // requests per minute
const CACHE_SIZE = 50;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Cache implementation
class Cache {
    constructor(maxSize = 50) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    set(key, value, ttl) {
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }
}

// Rate limiter implementation
class RateLimiter {
    constructor(limit, interval = 60000) {
        this.limit = limit;
        this.interval = interval;
        this.requests = [];
    }

    tryRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.interval);
        
        if (this.requests.length >= this.limit) {
            return false;
        }
        
        this.requests.push(now);
        return true;
    }

    getTimeUntilNext() {
        if (this.requests.length === 0) return 0;
        return this.interval - (Date.now() - this.requests[0]);
    }
}

// Initialize cache and rate limiter
const cache = new Cache(CACHE_SIZE);
const rateLimiter = new RateLimiter(RATE_LIMIT);

// DOM Elements
const textInput = document.getElementById('text');
const languageSelect = document.getElementById('language');
const modelSelect = document.getElementById('model');
const speedInput = document.getElementById('speed');
const generateBtn = document.getElementById('convertBtn');
const audioPlayer = document.getElementById('audioPlayer');
const audioContainer = document.getElementById('audioContainer');
const status = document.getElementById('status');

// Helper function to show status message
function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.remove('hidden');
    status.classList.remove('status-success', 'status-error');
    
    if (isError) {
        status.classList.add('status-error');
    } else {
        status.classList.add('status-success');
    }
}

// Helper function to generate cache key
function generateCacheKey(text, language, model, speed) {
    return `${text}|${language}|${model}|${speed}`;
}

// Main function to generate speech
async function generateSpeech() {
    const text = textInput.value.trim();
    const language = languageSelect.value;
    const model = modelSelect.value;
    const speed = speedInput.value;

    // Input validation
    if (!text) {
        showStatus('Please enter some text to convert.', true);
        return;
    }

    // Validate character count
    if (text.length > 150) {
        showStatus('Text must be 150 characters or less.', true);
        return;
    }

    // Validate language
    const languageMap = {
        'English': '3',
        'Japanese': '1',
        'Chinese': '2',
        'Mix': '4'
    };

    // Check rate limit
    if (!rateLimiter.tryRequest()) {
        const waitTime = Math.ceil(rateLimiter.getTimeUntilNext() / 1000);
        showStatus(`Rate limit exceeded. Please wait ${waitTime} seconds.`, true);
        return;
    }

    // Check cache
    const cacheKey = generateCacheKey(text, language, model, speed);
    const cachedAudio = cache.get(cacheKey);
    if (cachedAudio) {
        audioPlayer.src = cachedAudio;
        audioContainer.classList.remove('hidden');
        showStatus('Audio generated from cache.');
        return;
    }

    // Show loading state
    generateBtn.disabled = true;
    status.classList.remove('hidden');
    status.textContent = 'Generating audio...';

    try {
        // Construct URL parameters
        const params = new URLSearchParams({
            text: text,
            language: languageMap[language] || '3',
            model: model,
            speed: parseFloat(speed).toFixed(1)
        });

        const response = await fetch(`https://fastrestapis.fasturl.cloud/tts/anime?${params.toString()}`, {
            method: 'GET',
            headers: {
                'accept': 'audio/mpeg',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Try to parse error response
            const errorText = await response.text();
            console.error('Full error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        // Cache the result
        cache.set(cacheKey, audioUrl, CACHE_TTL);

        // Update audio player
        audioPlayer.src = audioUrl;
        audioContainer.classList.remove('hidden');
        showStatus('Audio generated successfully!');

    } catch (error) {
        console.error('Error:', error);
        showStatus(`Failed to generate audio: ${error.message}`, true);
    } finally {
        generateBtn.disabled = false;
    }
}

// Event Listeners
generateBtn.addEventListener('click', generateSpeech);

// Character counter and auto-expand textarea
textInput.addEventListener('input', function() {
    // Auto-expand textarea
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';

    // Calculate remaining characters
    const remainingChars = 150 - this.value.length;
    
    // Truncate to 150 characters if exceeded
    if (this.value.length > 150) {
        this.value = this.value.slice(0, 150);
    }
    
    // Update character count display
    document.getElementById('charCount').textContent = `${this.value.length}/150 characters (${remainingChars} remaining)`;
});

// Speed slider value display
speedInput.addEventListener('input', function() {
    document.getElementById('speedValue').textContent = this.value;
}); 