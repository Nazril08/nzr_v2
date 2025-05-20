// Rate limiter configuration
const rateLimiter = {
    maxRequests: 5,
    timeWindow: 60000,
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
    maxSize: 50, // Maximum number of cached items
    timeToLive: 3600000, // Cache TTL in milliseconds (1 hour)
    
    set: function(key, value) {
        if (this.data.size >= this.maxSize) {
            // Remove oldest entry if cache is full
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
        
        // Check if cache entry has expired
        if (Date.now() - item.timestamp > this.timeToLive) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    }
};

class TextToPDFConverter {
    constructor() {
        this.form = {};
        this.elements = {};
        this.currentPdfBlob = null;
        this.API_URL = 'https://fastrestapis.fasturl.cloud/tool/texttopdf';
    }

    initialize() {
        this.initializeFormElements();
        this.setupEventListeners();
    }

    initializeFormElements() {
        // Form fields
        this.form = {
            text: document.getElementById('text'),
            font: document.getElementById('font'),
            fontSize: document.getElementById('fontSize'),
            align: document.getElementById('align'),
            title: document.getElementById('title'),
            header: document.getElementById('header'),
            footer: document.getElementById('footer'),
            watermark: document.getElementById('watermark'),
            wmSize: document.getElementById('wmSize')
        };

        // UI elements
        this.elements = {
            generateBtn: document.getElementById('generateBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            pdfViewer: document.getElementById('pdfViewer'),
            status: document.getElementById('status'),
            result: document.getElementById('result')
        };
    }

    setupEventListeners() {
        if (this.elements.generateBtn) {
            this.elements.generateBtn.addEventListener('click', () => this.generatePDF());
        }
        if (this.elements.downloadBtn) {
            this.elements.downloadBtn.addEventListener('click', () => this.downloadPDF());
        }
    }

    async generatePDF() {
        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading status
            this.showStatus('Generating PDF...', 'info');

            // Get form values
            const params = {
                text: this.form.text.value,
                font: this.form.font.value || 'Helvetica',
                fontSize: this.form.fontSize.value || '12',
                align: this.form.align.value || 'left',
                title: this.form.title.value || '',
                header: this.form.header.value || '',
                footer: this.form.footer.value || '',
                watermark: this.form.watermark.value || '',
                wmSize: this.form.wmSize.value || '30'
            };

            // Check cache
            const cacheKey = JSON.stringify(params);
            const cachedPdf = cache.get(cacheKey);
            if (cachedPdf) {
                this.currentPdfBlob = cachedPdf;
                this.displayPDF(cachedPdf);
                this.showStatus('PDF retrieved from cache!', 'success');
                return;
            }

            // Make API request
            const response = await fetch(`${this.API_URL}?${new URLSearchParams(params)}`);
            
            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            const pdfBlob = await response.blob();
            this.currentPdfBlob = pdfBlob;

            // Store in cache
            cache.set(cacheKey, pdfBlob);

            // Display PDF
            this.displayPDF(pdfBlob);
            this.showStatus('PDF generated successfully!', 'success');

        } catch (error) {
            if (error.message.includes('Rate limit exceeded')) {
                this.showStatus(error.message, 'error');
            } else {
                this.showStatus('Failed to generate PDF: ' + error.message, 'error');
            }
            console.error('Error:', error);
        }
    }

    displayPDF(pdfBlob) {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        if (this.elements.pdfViewer) {
            this.elements.pdfViewer.src = pdfUrl;
        }
        if (this.elements.result) {
            this.elements.result.classList.remove('hidden');
        }
        if (this.elements.downloadBtn) {
            this.elements.downloadBtn.classList.remove('hidden');
        }
    }

    async downloadPDF() {
        if (!this.currentPdfBlob) {
            this.showStatus('No PDF available for download', 'error');
            return;
        }

        const downloadUrl = URL.createObjectURL(this.currentPdfBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }

    showStatus(message, type = 'info') {
        if (!this.elements.status) return;
        
        this.elements.status.textContent = message;
        this.elements.status.className = 'mt-4 text-center p-3 rounded-lg';
        
        switch(type) {
            case 'info':
                this.elements.status.classList.add('bg-blue-100', 'text-blue-700');
                break;
            case 'success':
                this.elements.status.classList.add('bg-green-100', 'text-green-700');
                break;
            case 'error':
                this.elements.status.classList.add('bg-red-100', 'text-red-700');
                break;
        }
        
        this.elements.status.classList.remove('hidden');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const converter = new TextToPDFConverter();
    converter.initialize();
}); 