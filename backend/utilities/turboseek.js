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
    // Get DOM elements
    const questionInput = document.getElementById('questionInput');
    const clearBtn = document.getElementById('clearBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const searchBtn = document.getElementById('searchBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const answerText = document.getElementById('answerText');
    const similarQuestionsContainer = document.getElementById('similarQuestionsContainer');
    const similarQuestionsContent = document.getElementById('similarQuestionsContent');
    const sourcesContainer = document.getElementById('sourcesContainer');
    const sourcesContent = document.getElementById('sourcesContent');
    
    // API endpoint
    const API_BASE_URL = 'https://fastrestapis.fasturl.cloud/aiexperience/turboseek';
    
    // Event listeners
    searchBtn.addEventListener('click', searchKnowledge);
    clearBtn.addEventListener('click', clearInput);
    
    // Clear input field
    function clearInput() {
        questionInput.value = '';
        questionInput.focus();
    }
    
    // Main search function
    async function searchKnowledge() {
        const question = questionInput.value.trim();
        
        if (!question) {
            showStatus('Please enter a question to search', 'error');
            return;
        }
        
        try {
            // Check rate limit
            rateLimiter.checkLimit();
            
            // Show loading state
            loadingIcon.classList.remove('hidden');
            searchBtn.disabled = true;
            resultContainer.classList.add('hidden');
            similarQuestionsContainer.classList.add('hidden');
            sourcesContainer.classList.add('hidden');
            showStatus('Searching knowledge databases...', 'info');
            
            // Generate cache key
            const cacheKey = question.toLowerCase();
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                // Use cached result
                displayResults(cachedResult);
                showStatus('Results loaded from cache!', 'success');
                return;
            }
            
            // Build the API URL
            let apiUrl = `${API_BASE_URL}?ask=${encodeURIComponent(question)}`;
            
            const apiKey = apiKeyInput.value.trim();
            const headers = {
                'Accept': 'application/json'
            };
            
            // Add API key if provided
            if (apiKey) {
                headers['x-api-key'] = apiKey;
            }
            
            // Fetch data from API
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get results (${response.status})`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Cache the result
            cache.set(cacheKey, data);
            
            // Display the results
            displayResults(data);
            showStatus('Search completed successfully!', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to get results. Please try again.', 'error');
            resultContainer.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            searchBtn.disabled = false;
        }
    }
    
    // Display search results
    function displayResults(data) {
        // Extract results
        const result = data.result || {};
        
        // Display the answer
        const answer = result.answer || 'No answer found for your question.';
        answerText.innerHTML = formatAnswer(answer);
        resultContainer.classList.remove('hidden');
        
        // Display similar questions if available
        const similarQuestions = result.similarQuestions;
        if (similarQuestions && similarQuestions !== 'No Data' && Array.isArray(similarQuestions) && similarQuestions.length > 0) {
            // Clear previous content
            similarQuestionsContent.innerHTML = '';
            
            // Add each similar question
            similarQuestions.forEach(question => {
                const questionElement = document.createElement('div');
                questionElement.className = 'similar-question p-3 rounded-lg bg-indigo-50 text-gray-800';
                questionElement.innerHTML = `<i class="fas fa-question-circle text-indigo-500 mr-2"></i>${question}`;
                questionElement.addEventListener('click', () => {
                    questionInput.value = question;
                    searchKnowledge();
                });
                similarQuestionsContent.appendChild(questionElement);
            });
            
            similarQuestionsContainer.classList.remove('hidden');
        } else {
            similarQuestionsContainer.classList.add('hidden');
        }
        
        // Display sources if available
        const sources = result.sources;
        if (sources && Array.isArray(sources) && sources.length > 0) {
            // Clear previous content
            sourcesContent.innerHTML = '';
            
            // Add each source
            sources.forEach(source => {
                if (source.name && source.url) {
                    const sourceElement = document.createElement('a');
                    sourceElement.href = source.url;
                    sourceElement.target = '_blank';
                    sourceElement.rel = 'noopener noreferrer';
                    sourceElement.className = 'source-card block bg-white rounded-lg p-4 border border-gray-200';
                    
                    sourceElement.innerHTML = `
                        <div class="flex items-start">
                            <div class="bg-indigo-100 rounded-full p-2 mr-3">
                                <i class="fas fa-link text-indigo-500"></i>
                            </div>
                            <div>
                                <h4 class="font-medium text-gray-900">${escapeHTML(source.name)}</h4>
                                <p class="text-sm text-gray-500 truncate">${formatUrl(source.url)}</p>
                            </div>
                        </div>
                    `;
                    
                    sourcesContent.appendChild(sourceElement);
                }
            });
            
            sourcesContainer.classList.remove('hidden');
        } else {
            sourcesContainer.classList.add('hidden');
        }
    }
    
    // Format the answer for display
    function formatAnswer(text) {
        // Add basic formatting
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }
    
    // Format URL for display
    function formatUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + urlObj.pathname.substring(0, 20) + (urlObj.pathname.length > 20 ? '...' : '');
        } catch (e) {
            return url.substring(0, 30) + (url.length > 30 ? '...' : '');
        }
    }
    
    // Escape HTML to prevent XSS
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    // Show status message
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `p-4 rounded-lg my-6 ${type}-message`;
        status.classList.remove('hidden');
        
        // Auto-hide success and info messages after 5 seconds
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                status.classList.add('hidden');
            }, 5000);
        }
    }
}); 