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
    // Form elements
    const textNoteForm = document.getElementById('textNoteForm');
    const nameInput = document.getElementById('name');
    const classroomInput = document.getElementById('classroom');
    const subjectInput = document.getElementById('subject');
    const dateInput = document.getElementById('date');
    const contentInput = document.getElementById('content');
    const fontSelect = document.getElementById('font');
    const formatSelect = document.getElementById('format');
    const generateBtn = document.getElementById('generateBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    const noteImage = document.getElementById('noteImage');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Initialize current date
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
    
    // Form validation
    function validateForm() {
        // Check if required fields are filled
        if (!nameInput.value.trim()) {
            showStatus('Please enter a name', 'error');
            return false;
        }
        if (!classroomInput.value.trim()) {
            showStatus('Please enter a classroom', 'error');
            return false;
        }
        if (!subjectInput.value.trim()) {
            showStatus('Please enter a subject', 'error');
            return false;
        }
        if (!dateInput.value) {
            showStatus('Please enter a date', 'error');
            return false;
        }
        if (!contentInput.value.trim()) {
            showStatus('Please enter content for the note', 'error');
            return false;
        }
        
        return true;
    }
    
    // Handle form submission
    textNoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        try {
            // Check rate limit
            rateLimiter.checkLimit();
            
            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            result.classList.add('hidden');
            showStatus('Generating handwritten note...', 'info');
            
            // Generate cache key
            const cacheKey = `${nameInput.value}-${classroomInput.value}-${subjectInput.value}-${dateInput.value}-${contentInput.value}-${fontSelect.value}-${formatSelect.value}`;
            
            // Check cache
            const cachedResult = cache.get(cacheKey);
            if (cachedResult) {
                noteImage.src = cachedResult;
                result.classList.remove('hidden');
                setTimeout(() => {
                    result.classList.add('show');
                }, 100);
                
                downloadBtn.href = cachedResult;
                downloadBtn.download = `note_${dateInput.value}.${formatSelect.value}`;
                
                showStatus('Note generated from cache!', 'success');
                generateBtn.disabled = false;
                loadingIcon.classList.add('hidden');
                return;
            }
            
            // Construct URL with parameters
            const baseUrl = 'https://fastrestapis.fasturl.cloud/tool/texttonote';
            const params = new URLSearchParams({
                name: nameInput.value,
                classroom: classroomInput.value,
                subject: subjectInput.value,
                date: dateInput.value,
                content: contentInput.value,
                font: fontSelect.value || 'HandwritingCR-2.ttf',
                format: formatSelect.value || 'png'
            });
            
            // Fetch the note image
            const response = await fetch(`${baseUrl}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'image/*'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to generate note (${response.status})`);
            }
            
            // Get the note image blob
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            
            // Update UI with the generated note
            noteImage.src = imageUrl;
            downloadBtn.href = imageUrl;
            downloadBtn.download = `note_${dateInput.value}.${formatSelect.value}`;
            
            // Show result
            result.classList.remove('hidden');
            setTimeout(() => {
                result.classList.add('show');
            }, 100);
            
            showStatus('Note generated successfully!', 'success');
            
            // Cache the result
            cache.set(cacheKey, imageUrl);
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to generate note. Please try again.', 'error');
            result.classList.add('hidden');
        } finally {
            loadingIcon.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });
    
    // Show status message
    function showStatus(message, type) {
        status.textContent = message;
        status.classList.remove('hidden');
        
        // Reset classes
        status.className = 'mt-4 text-center p-3 rounded-lg status-message';
        
        // Add appropriate color class
        status.classList.add(type);
    }
    
    // Reset form button
    document.getElementById('resetBtn').addEventListener('click', () => {
        textNoteForm.reset();
        result.classList.add('hidden');
        status.classList.add('hidden');
        // Reset date to today
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    });
    
    // Note image load error handler
    noteImage.addEventListener('error', () => {
        showStatus('Failed to load the generated note. Please try again.', 'error');
        result.classList.add('hidden');
    });
}); 