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
    const countrySelect = document.getElementById('countrySelect');
    const countSelect = document.getElementById('countSelect');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const numbersContainer = document.getElementById('numbersContainer');
    const copyAllBtn = document.getElementById('copyAllBtn');
    
    // Flag image URLs for each country
    const countryFlags = {
        // North America
        'USA': 'https://flagcdn.com/w40/us.png',
        'CA': 'https://flagcdn.com/w40/ca.png',
        'MX': 'https://flagcdn.com/w40/mx.png',
        
        // Europe
        'UK': 'https://flagcdn.com/w40/gb.png',
        'DE': 'https://flagcdn.com/w40/de.png',
        'FR': 'https://flagcdn.com/w40/fr.png',
        'IT': 'https://flagcdn.com/w40/it.png',
        'ES': 'https://flagcdn.com/w40/es.png',
        'NL': 'https://flagcdn.com/w40/nl.png',
        'SE': 'https://flagcdn.com/w40/se.png',
        'CH': 'https://flagcdn.com/w40/ch.png',
        'NO': 'https://flagcdn.com/w40/no.png',
        'PL': 'https://flagcdn.com/w40/pl.png',
        'PT': 'https://flagcdn.com/w40/pt.png',
        'RU': 'https://flagcdn.com/w40/ru.png',
        
        // Asia
        'JP': 'https://flagcdn.com/w40/jp.png',
        'CN': 'https://flagcdn.com/w40/cn.png',
        'IN': 'https://flagcdn.com/w40/in.png',
        'KR': 'https://flagcdn.com/w40/kr.png',
        'SG': 'https://flagcdn.com/w40/sg.png',
        'MY': 'https://flagcdn.com/w40/my.png',
        'ID': 'https://flagcdn.com/w40/id.png',
        'TH': 'https://flagcdn.com/w40/th.png',
        'PH': 'https://flagcdn.com/w40/ph.png',
        
        // Oceania
        'AU': 'https://flagcdn.com/w40/au.png',
        'NZ': 'https://flagcdn.com/w40/nz.png',
        
        // South America
        'BR': 'https://flagcdn.com/w40/br.png',
        'AR': 'https://flagcdn.com/w40/ar.png',
        'CL': 'https://flagcdn.com/w40/cl.png',
        'CO': 'https://flagcdn.com/w40/co.png',
        'PE': 'https://flagcdn.com/w40/pe.png',
        
        // Africa
        'ZA': 'https://flagcdn.com/w40/za.png',
        'EG': 'https://flagcdn.com/w40/eg.png',
        'NG': 'https://flagcdn.com/w40/ng.png',
        'KE': 'https://flagcdn.com/w40/ke.png',
        'MA': 'https://flagcdn.com/w40/ma.png',
        
        // Middle East
        'AE': 'https://flagcdn.com/w40/ae.png',
        'SA': 'https://flagcdn.com/w40/sa.png',
        'TR': 'https://flagcdn.com/w40/tr.png',
        'IL': 'https://flagcdn.com/w40/il.png'
    };
    
    // Handle generate button click
    generateBtn.addEventListener('click', generateNumbers);
    
    // Handle copy all button click
    copyAllBtn.addEventListener('click', copyAllNumbers);
    
    async function generateNumbers() {
        const country = countrySelect.value;
        const count = parseInt(countSelect.value);
        const apiKey = apiKeyInput.value.trim();
        
        try {
            // Check rate limit
            rateLimiter.checkLimit();
            
            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            resultContainer.classList.add('hidden');
            showStatus('Generating phone numbers...', 'info');
            
            // Generate cache key
            const cacheKey = `${country}-${count}`;
            const cachedResult = cache.get(cacheKey);
            
            if (cachedResult) {
                // Use cached result
                displayNumbers(cachedResult, country);
                showStatus('Phone numbers loaded from cache!', 'success');
                return;
            }
            
            // Build the API URL
            const apiUrl = `https://fastrestapis.fasturl.cloud/tool/fakenumber?country=${country}&count=${count}`;
            
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
            
            if (!response.ok) {
                throw new Error(`Failed to generate numbers (${response.status})`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Extract the numbers from the API response
            // First check if data.numbers exists, otherwise check if data itself is an array
            // or try to use data.result if it exists, otherwise create a mock array
            let phoneNumbers;
            
            if (data.numbers && Array.isArray(data.numbers)) {
                phoneNumbers = data.numbers;
            } else if (Array.isArray(data)) {
                phoneNumbers = data;
            } else if (data.result && Array.isArray(data.result)) {
                phoneNumbers = data.result;
            } else if (data.data && Array.isArray(data.data)) {
                phoneNumbers = data.data;
            } else {
                // If none of the above, log the actual structure and create mockup data
                console.log('Unexpected API response structure:', data);
                phoneNumbers = generateMockPhoneNumbers(country, count);
            }
            
            // Cache the result
            cache.set(cacheKey, phoneNumbers);
            
            // Display the phone numbers
            displayNumbers(phoneNumbers, country);
            showStatus('Phone numbers generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to generate phone numbers. Please try again.', 'error');
            resultContainer.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            generateBtn.disabled = false;
        }
    }
    
    // Generate mock phone numbers in case the API fails
    function generateMockPhoneNumbers(country, count) {
        const countryFormats = {
            // North America
            'USA': '+1 (###) ###-####',
            'CA': '+1 (###) ###-####',
            'MX': '+52 ## #### ####',
            
            // Europe
            'UK': '+44 ## #### ####',
            'DE': '+49 ### #######',
            'FR': '+33 # ## ## ## ##',
            'IT': '+39 ### ### ####',
            'ES': '+34 ### ### ###',
            'NL': '+31 ## ### ####',
            'SE': '+46 ## ### ####',
            'CH': '+41 ## ### ####',
            'NO': '+47 ### ## ###',
            'PL': '+48 ## ### ####',
            'PT': '+351 ### ### ###',
            'RU': '+7 ### ### ## ##',
            
            // Asia
            'JP': '+81 ## #### ####',
            'CN': '+86 ### #### ####',
            'IN': '+91 ##### #####',
            'KR': '+82 ## #### ####',
            'SG': '+65 #### ####',
            'MY': '+60 ## ### ####',
            'ID': '+62 ### ### ####',
            'TH': '+66 # ### ####',
            'PH': '+63 ### ### ####',
            
            // Oceania
            'AU': '+61 ### ### ###',
            'NZ': '+64 ## ### ####',
            
            // South America
            'BR': '+55 ## #### ####',
            'AR': '+54 ## #### ####',
            'CL': '+56 # #### ####',
            'CO': '+57 ### ### ####',
            'PE': '+51 ### ### ###',
            
            // Africa
            'ZA': '+27 ## ### ####',
            'EG': '+20 ### ### ####',
            'NG': '+234 ### ### ####',
            'KE': '+254 ### ### ###',
            'MA': '+212 ### ### ###',
            
            // Middle East
            'AE': '+971 ## ### ####',
            'SA': '+966 ## ### ####',
            'TR': '+90 ### ### ####',
            'IL': '+972 ## ### ####'
        };
        
        const format = countryFormats[country] || countryFormats['USA'];
        const numbers = [];
        
        for (let i = 0; i < count; i++) {
            let number = format;
            while (number.includes('#')) {
                number = number.replace('#', Math.floor(Math.random() * 10));
            }
            numbers.push(number);
        }
        
        return numbers;
    }
    
    function displayNumbers(numbers, country) {
        // Clear previous results
        numbersContainer.innerHTML = '';
        
        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            showStatus('No phone numbers were generated. Please try again.', 'error');
            return;
        }
        
        // Get country flag
        const flagUrl = countryFlags[country] || '';
        
        // Add each phone number to the container
        numbers.forEach((number, index) => {
            const card = document.createElement('div');
            card.className = 'number-card bg-white p-4 rounded-lg shadow-sm';
            
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center">
                        ${flagUrl ? `<img src="${flagUrl}" alt="${country}" class="country-flag">` : ''}
                        <span class="font-medium">${number}</span>
                    </div>
                    <button class="copy-btn text-gray-500 hover:text-indigo-600 transition-colors" data-number="${number}">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;
            
            numbersContainer.appendChild(card);
            
            // Add click event for the copy button
            const copyBtn = card.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                copyToClipboard(number);
                showCopyFeedback(copyBtn);
            });
        });
        
        // Show the result container
        resultContainer.classList.remove('hidden');
    }
    
    function copyAllNumbers() {
        const allNumbers = [];
        const numberElements = numbersContainer.querySelectorAll('.number-card span');
        
        numberElements.forEach(el => {
            allNumbers.push(el.textContent);
        });
        
        if (allNumbers.length > 0) {
            const text = allNumbers.join('\n');
            copyToClipboard(text);
            showStatus('All phone numbers copied to clipboard!', 'success');
        }
    }
    
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Failed to copy text:', err);
            
            // Fallback method for copying
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        });
    }
    
    function showCopyFeedback(button) {
        const originalIcon = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check text-green-500"></i>';
        button.disabled = true;
        
        setTimeout(() => {
            button.innerHTML = originalIcon;
            button.disabled = false;
        }, 1500);
    }
    
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