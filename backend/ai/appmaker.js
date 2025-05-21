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
    const nameInput = document.getElementById('nameInput');
    const emailInput = document.getElementById('emailInput');
    const appIconInput = document.getElementById('appIconInput');
    const splashIconInput = document.getElementById('splashIconInput');
    const toolbarColorInput = document.getElementById('toolbarColorInput');
    const toolbarTitleColorInput = document.getElementById('toolbarTitleColorInput');
    const useToolbarCheckbox = document.getElementById('useToolbarCheckbox');
    const createAppBtn = document.getElementById('createAppBtn');
    const checkStatusBtn = document.getElementById('checkStatusBtn');
    const appIdInput = document.getElementById('appIdInput');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const resultText = document.getElementById('resultText');
    const resultLink = document.getElementById('resultLink');
    const apiKeyInput = document.getElementById('apiKeyInput');

    // Handle create app button click
    createAppBtn.addEventListener('click', createApp);
    
    // Handle check status button click
    checkStatusBtn.addEventListener('click', checkAppStatus);

    // Initialize color picker with default values
    if (toolbarColorInput) {
        toolbarColorInput.value = "#5303f4";
    }
    
    if (toolbarTitleColorInput) {
        toolbarTitleColorInput.value = "#FFFFFF";
    }
    
    // Initialize email field with default value
    if (emailInput) {
        emailInput.value = "fasturl.cloud@gmail.com";
    }

    async function createApp() {
        const url = urlInput.value.trim();
        if (!url) {
            showStatus('Please enter a website URL', 'error');
            return;
        }

        const name = nameInput.value.trim() || 'FastURL';
        const email = emailInput.value.trim() || 'fasturl.cloud@gmail.com';
        const appIcon = appIconInput.value.trim() || 'https://fastmanager.fasturl.cloud/Uploads/FastURL/FastURL---Favicon-Logo.png';
        const splashIcon = splashIconInput.value.trim() || 'https://fastmanager.fasturl.cloud/Uploads/FastURL/FastURL---Thumbnail-Website.png';
        const toolbarColor = toolbarColorInput.value.trim().replace('#', '%23') || '%235303f4';
        const toolbarTitleColor = toolbarTitleColorInput.value.trim().replace('#', '%23') || '%23FFFFFF';
        const useToolbar = useToolbarCheckbox.checked;
        const apiKey = apiKeyInput.value.trim();

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            createAppBtn.disabled = true;
            resultContainer.classList.add('hidden');
            showStatus('Creating web app...', 'info');

            // Generate a random appId
            const appId = generateRandomAppId();

            // Build the API URL
            const apiUrl = `https://fastrestapis.fasturl.cloud/tool/appmaker?action=create&appId=${appId}&url=${encodeURIComponent(url)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&appIcon=${encodeURIComponent(appIcon)}&splashIcon=${encodeURIComponent(splashIcon)}&useToolbar=${useToolbar}&toolbarColor=${toolbarColor}&toolbarTitleColor=${toolbarTitleColor}`;
            
            const headers = {
                'Accept': 'application/json'
            };
            
            // Add API key if provided
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || `Failed to create app (${response.status})`);
            }

            // Show result
            resultText.textContent = `App created successfully! App ID: ${appId}`;
            appIdInput.value = appId;  // Set the appId for status checking
            
            if (data.result && data.result.downloadUrl) {
                resultLink.href = data.result.downloadUrl;
                resultLink.classList.remove('hidden');
            } else {
                resultLink.classList.add('hidden');
            }
            
            resultContainer.classList.remove('hidden');
            showStatus('Web app created successfully!', 'success');

            // Cache the result
            cache.set(appId, data);
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to create web app. Please try again.', 'error');
            resultContainer.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            createAppBtn.disabled = false;
        }
    }

    async function checkAppStatus() {
        const appId = appIdInput.value.trim();
        if (!appId) {
            showStatus('Please enter an App ID', 'error');
            return;
        }

        const apiKey = apiKeyInput.value.trim();

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            checkStatusBtn.disabled = true;
            resultContainer.classList.add('hidden');
            showStatus('Checking app status...', 'info');

            // Check cache first
            const cachedResult = cache.get(appId);
            if (cachedResult) {
                // Update UI with cached data
                resultText.textContent = `App Status: ${cachedResult.status || 'Ready'}`;
                
                if (cachedResult.result && cachedResult.result.downloadUrl) {
                    resultLink.href = cachedResult.result.downloadUrl;
                    resultLink.classList.remove('hidden');
                } else {
                    resultLink.classList.add('hidden');
                }
                
                resultContainer.classList.remove('hidden');
                showStatus('Status loaded from cache!', 'success');
                loadingIcon.classList.add('hidden');
                checkStatusBtn.disabled = false;
                return;
            }

            // Build the API URL
            const apiUrl = `https://fastrestapis.fasturl.cloud/tool/appmaker?action=check&appId=${appId}`;
            
            const headers = {
                'Accept': 'application/json'
            };
            
            // Add API key if provided
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || `Failed to check app status (${response.status})`);
            }

            // Show result
            resultText.textContent = `App Status: ${data.status || 'Ready'}`;
            
            if (data.result && data.result.downloadUrl) {
                resultLink.href = data.result.downloadUrl;
                resultLink.classList.remove('hidden');
            } else {
                resultLink.classList.add('hidden');
            }
            
            resultContainer.classList.remove('hidden');
            showStatus('App status checked successfully!', 'success');

            // Cache the result
            cache.set(appId, data);
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to check app status. Please try again.', 'error');
            resultContainer.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            checkStatusBtn.disabled = false;
        }
    }

    function generateRandomAppId() {
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
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