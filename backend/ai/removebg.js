document.addEventListener('DOMContentLoaded', () => {
    const removeBgForm = document.getElementById('removeBgForm');
    const imageUrlInput = document.getElementById('imageUrl');
    const imageUpload = document.getElementById('imageUpload');
    const originalImagePreview = document.getElementById('originalImagePreview');
    const processedImageResult = document.getElementById('processedImageResult');
    const downloadBtn = document.getElementById('downloadBtn');
    const copyBtn = document.getElementById('copyBtn');
    const submitBtn = document.querySelector('button[type="submit"]');
    let originalImageUrl = null;
    let processedImageUrl = null;

    // Fungsi untuk validasi URL gambar
    function isValidImageUrl(url) {
        // Longgar validasi URL
        return /\.(jpg|jpeg|png|gif|bmp|webp|jfif)$/i.test(url) || 
               url.includes('visual') || 
               url.includes('images');
    }

    // Fungsi untuk menampilkan preview gambar
    function displayOriginalImage(imageUrl) {
        originalImagePreview.innerHTML = `
            <img src="${imageUrl}" alt="Original Image" class="max-w-full max-h-[300px] mx-auto object-contain">
        `;
        originalImageUrl = imageUrl;
    }

    // Event listener untuk input URL
    imageUrlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        
        // Cek apakah URL valid
        if (isValidImageUrl(url)) {
            // Tambahkan protokol dan domain jika tidak ada
            const fullUrl = url.startsWith('http') 
                ? url 
                : `https://awsimages.detik.net.id/visual/2024/09/05/${url}`;
            
            // Buat objek gambar untuk validasi
            const img = new Image();
            img.onload = () => {
                displayOriginalImage(fullUrl);
                console.log('Image loaded:', fullUrl);
            };
            img.onerror = () => {
                console.error('Failed to load image:', fullUrl);
                originalImagePreview.innerHTML = `
                    <p class="text-red-500">Invalid image URL</p>
                `;
            };
            img.src = fullUrl;
        }
    });

    // Drag and drop file upload
    const uploadSection = document.getElementById('uploadSection');
    uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.classList.add('dragover');
    });

    uploadSection.addEventListener('dragleave', () => {
        uploadSection.classList.remove('dragover');
    });

    uploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSection.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFileInput(files[0]);
    });

    function handleFileUpload(event) {
        const file = event.target.files[0];
        handleFileInput(file);
    }

    function handleFileInput(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imageUrlInput.value = e.target.result;
                displayOriginalImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    function displayProcessedImage(imageUrl) {
        processedImageResult.innerHTML = `
            <img src="${imageUrl}" alt="Processed Image" class="max-w-full max-h-[300px] mx-auto object-contain">
        `;
        processedImageUrl = imageUrl;
        downloadBtn.classList.remove('hidden');
        copyBtn.classList.remove('hidden');
    }

    function downloadImage() {
        if (processedImageUrl) {
            const link = document.createElement('a');
            link.href = processedImageUrl;
            link.download = 'background_removed.png';
            link.click();
        }
    }

    async function copyImageToClipboard() {
        try {
            const response = await fetch(processedImageUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            alert('Image copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy image: ', err);
            alert('Failed to copy image');
        }
    }

    removeBgForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageUrl = imageUrlInput.value.trim();

        if (!imageUrl) {
            alert('Please enter an image URL or upload an image');
            return;
        }

        // Tambahkan animasi loading
        submitBtn.classList.add('loading');
        processedImageResult.innerHTML = `
            <p class="text-gray-500 text-center">Processing image...</p>
        `;

        try {
            // Tambahkan protokol dan domain jika tidak ada
            const fullUrl = imageUrl.startsWith('http') 
                ? imageUrl 
                : `https://awsimages.detik.net.id/visual/2024/09/05/${imageUrl}`;
            
            const apiUrl = `https://api.ryzumi.vip/api/ai/removebg?url=${encodeURIComponent(fullUrl)}`;
            console.log('API URL:', apiUrl);
            
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error('Failed to remove background');
            }

            const blob = await response.blob();
            const processedUrl = URL.createObjectURL(blob);
            
            displayProcessedImage(processedUrl);
        } catch (error) {
            console.error('Error:', error);
            processedImageResult.innerHTML = `
                <p class="text-red-500">Failed to remove background. Please check the image URL.</p>
            `;
        } finally {
            // Hapus animasi loading
            submitBtn.classList.remove('loading');
        }
    });

    // Expose functions globally for HTML onclick events
    window.handleFileUpload = handleFileUpload;
    window.downloadImage = downloadImage;
    window.copyImageToClipboard = copyImageToClipboard;
}); 