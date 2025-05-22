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
    const judul = document.getElementById('judul');
    const namaPenulis = document.getElementById('namaPenulis');
    const nim = document.getElementById('nim');
    const programStudi = document.getElementById('programStudi');
    const fakultas = document.getElementById('fakultas');
    const universitas = document.getElementById('universitas');
    const tahun = document.getElementById('tahun');
    const mataKuliah = document.getElementById('mataKuliah');
    const referensi = document.getElementById('referensi');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadingIcon = document.getElementById('loadingIcon');
    const status = document.getElementById('status');
    const resultContainer = document.getElementById('resultContainer');
    const paperContent = document.getElementById('paperContent');
    const sessionIdInput = document.getElementById('sessionIdInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
    
    // New download format related elements
    const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const downloadDocxBtn = document.getElementById('downloadDocxBtn');
    
    // Set default year if empty
    if (tahun) {
        tahun.value = new Date().getFullYear();
    }
    
    // Load previous session content if session ID exists
    const savedSessionId = localStorage.getItem('makalah_session_id');
    if (savedSessionId && sessionIdInput.value) {
        loadPreviousSession(savedSessionId);
    }

    // Function to load previous session content
    async function loadPreviousSession(sessionId) {
        try {
            showStatus('Memuat hasil sesi sebelumnya...', 'info');
            loadingIcon.classList.remove('hidden');
            
            // Gemini API with fetchOnly parameter
            const apiUrl = `https://api.ryzumi.vip/api/ai/gemini?sessionId=${sessionId}&fetchOnly=true`;
            
            const headers = {
                'Accept': 'application/json'
            };
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: headers
            });
            
            const data = await response.json();
            
            if (data.result && data.result.trim() !== '') {
                // Display the previous session content
                paperContent.innerHTML = formatText(data.result);
                resultContainer.classList.remove('hidden');
                showStatus('Sesi sebelumnya berhasil dimuat!', 'success');
            } else {
                showStatus('Tidak ada konten dari sesi sebelumnya.', 'info');
            }
        } catch (error) {
            console.error('Error loading previous session:', error);
            showStatus('Gagal memuat sesi sebelumnya.', 'error');
        } finally {
            loadingIcon.classList.add('hidden');
        }
    }

    // Handle generate button click
    generateBtn.addEventListener('click', generatePaper);
    
    // Listen for loadPreviousSession custom event
    document.addEventListener('loadPreviousSession', function(e) {
        if (e.detail && e.detail.sessionId) {
            loadPreviousSession(e.detail.sessionId);
        }
    });
    
    // Handle copy button click
    if (copyBtn) {
        copyBtn.addEventListener('click', copyContent);
    }
    
    // Handle download buttons click
    if (downloadHtmlBtn) {
        downloadHtmlBtn.addEventListener('click', function() {
            downloadContent('html');
        });
    }
    
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', function() {
            downloadContent('pdf');
        });
    }
    
    if (downloadDocxBtn) {
        downloadDocxBtn.addEventListener('click', function() {
            downloadContent('docx');
        });
    }
    
    // Legacy download button for backward compatibility
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            downloadContent('html');
        });
    }

    async function generatePaper() {
        // Validate required fields
        if (!judul.value.trim()) {
            showStatus('Judul makalah harus diisi', 'error');
            return;
        }

        // Get all input values
        const judulValue = judul.value.trim();
        const namaPenulisValue = namaPenulis.value.trim();
        const nimValue = nim.value.trim();
        const programStudiValue = programStudi.value.trim();
        const fakultasValue = fakultas.value.trim();
        const universitasValue = universitas.value.trim();
        const tahunValue = tahun.value.trim() || new Date().getFullYear();
        const mataKuliahValue = mataKuliah.value.trim();
        const referensiValue = referensi.value.trim();
        const apiKey = apiKeyInput.value.trim();

        try {
            // Check rate limit
            rateLimiter.checkLimit();

            // Show loading state
            loadingIcon.classList.remove('hidden');
            generateBtn.disabled = true;
            showStatus('Generating academic paper with Gemini...', 'info');

            // Build the prompt for Gemini
            let prompt = `Kamu adalah asisten penulisan akademik. Buatkan makalah ilmiah LENGKAP dengan konten substantif (BUKAN template atau kerangka dengan placeholder) untuk judul "${judulValue || "[Judul Makalah]"}".

SANGAT PENTING: Hasilkan makalah lengkap dengan konten asli yang informatif dan bermakna, bukan hanya template dengan placeholder dalam kurung siku. Semua bagian harus berisi konten yang relevan dan meyakinkan seolah-olah ditulis oleh seorang akademisi, bukan hanya kerangka.

PERBAIKAN FORMAT UG:
1. Jangan gunakan penomoran markdown (# atau ##) untuk heading. Gunakan judul kapital atau tebal tanpa nomor.
2. Setiap tabel harus memiliki judul di atas (contoh: "Tabel 1. Judul Tabel"), konten rata tengah, dan sumber di bawah.
3. Format dokumen harus ketat mengikuti: Times New Roman 12pt, spasi 1.5, margin 2.54cm di semua sisi.
4. Gunakan bahasa ilmiah formal dengan struktur kalimat padat, hindari narasi ringan atau gaya storytelling.
5. Makalah harus memiliki panjang 12-16 halaman, dengan minimal 10 referensi (lebih baik 15-20) format APA.
6. Bagian Metode Penelitian harus mengikuti format UG dengan 6 sub-subjudul spesifik: Jenis Penelitian, Populasi, Teknik Sampling, Teknik Pengumpulan Data, Validitas & Reliabilitas, dan Teknik Analisis Data + Etika Penelitian.

Struktur makalah:

1. HALAMAN JUDUL
- Judul: ${judulValue || "[Judul Makalah]"}
- Nama: ${namaPenulisValue || "[Nama Penulis]"}
- NIM: ${nimValue || "[NIM]"}
- Program Studi: ${programStudiValue || "[Program Studi]"}
- Fakultas: ${fakultasValue || "[Fakultas]"}
- Universitas: ${universitasValue || "[Universitas]"}
- Tahun: ${tahunValue || new Date().getFullYear()}
- Mata Kuliah: ${mataKuliahValue || "[Mata Kuliah]"}

2. ABSTRAK
- Satu paragraf (maksimum 200 kata) berisi tujuan, metode, hasil, dan kesimpulan penelitian
- 5 kata kunci yang relevan dengan penelitian
- Font: Times New Roman, 12 pt, justified

3. PENDAHULUAN
- Latar Belakang: Konteks penelitian, urgensi masalah, gambaran umum fenomena
- Identifikasi Masalah: Penjabaran spesifik masalah yang ingin dipecahkan
- Tujuan Penelitian: Tujuan umum dan khusus secara terukur
- Pertanyaan Penelitian: 2-3 pertanyaan yang menjadi dasar penelitian
- Manfaat Penelitian: Kontribusi teoretis dan praktis
- Batasan Penelitian: Ruang lingkup yang jelas tentang cakupan penelitian

4. LANDASAN TEORI
- Penjelasan konsep dan teori yang relevan dengan topik
- Referensi dari sumber tepercaya (jurnal, buku, publikasi resmi)
- Kajian tentang variabel penelitian
- Hubungan antar variabel dan kerangka pemikiran

5. METODE PENELITIAN (Dengan sub-subjudul berikut)
- Jenis Penelitian: Kualitatif/kuantitatif/campuran dengan justifikasi detail
- Populasi dan Sampel: Deskripsi populasi, ukuran sampel, dan kriteria inklusi/eksklusi
- Teknik Sampling: Metode spesifik (purposive, random, stratified, dll) dengan alasan pemilihan
- Teknik Pengumpulan Data: Instrumen spesifik (kuesioner tervalidasi, protokol wawancara, perangkat observasi)
- Validitas dan Reliabilitas: Metode pengujian validitas data (triangulasi, member checking, dll)
- Teknik Analisis Data: Langkah-langkah analisis dan software yang digunakan (bila ada)
- Etika Penelitian: Pertimbangan etis (jika melibatkan manusia/data sensitif)

6. HASIL DAN PEMBAHASAN
- Penyajian data dalam bentuk tabel/grafik dengan format lengkap (judul di atas, konten rata tengah, sumber di bawah)
- Analisis data sesuai metode yang digunakan
- Interpretasi hasil (minimal 60% dari bagian ini)
- Pengaitan dengan teori pada bagian landasan teori
- Implikasi teoretis dan praktis dari temuan

7. KESIMPULAN DAN SARAN
- Kesimpulan: Ringkasan temuan utama yang menjawab pertanyaan penelitian
- Saran: Rekomendasi berdasarkan hasil penelitian

8. DAFTAR PUSTAKA
- Format APA edisi ke-7 dengan minimal 10 referensi (idealnya 15-20)
- Minimal 70% dari jurnal ilmiah terakreditasi
- Pastikan semua referensi yang dikutip tercantum dalam daftar
- Contoh format:
  * Jurnal: Penulis. (Tahun). Judul artikel. Nama Jurnal, Volume(Issue), halaman. DOI/URL
  * Buku: Penulis. (Tahun). Judul Buku. Penerbit.
  * Website: Penulis/Organisasi. (Tahun). Judul Halaman. URL

KETENTUAN UMUM:
- Ditulis dalam Bahasa Indonesia baku dan formal sesuai PUEBI
- Struktur kalimat padat dan formal dengan terminologi akademik yang tepat
- Kutipan asing diterjemahkan ke Bahasa Indonesia
- Format A4, spasi 1.5, margin 2.54 cm di semua sisi
- Times New Roman 12pt
- Panjang makalah 12-16 halaman

CATATAN TAMBAHAN:
1. Halaman judul harus ditulis dalam format resmi akademik, tanpa bullet point. Semua elemen ditata secara rata tengah (centered) pada halaman, dengan urutan sebagai berikut:
   - Judul Makalah (huruf kapital, tebal, dan ukuran font lebih besar)
   - Nama Lengkap Penulis
   - NIM
   - Program Studi
   - Fakultas
   - Universitas
   - Tahun
   - Mata Kuliah

2. Setiap tabel harus memiliki: 
   - Judul di bagian atas (contoh: "Tabel 1. Judul Tabel")
   - Konten dengan format rapi dan rata tengah
   - Sumber yang jelas di bagian bawah tabel
   - Konsistensi format di seluruh dokumen

3. Untuk gambar/diagram:
   - Judul di bagian bawah (contoh: "Gambar 1. Nama Gambar")
   - Resolusi yang jelas dan terbaca
   - Sumber referensi yang jelas

INGAT: Jangan gunakan placeholder [seperti ini]. Tuliskan KONTEN LENGKAP untuk setiap bagian. Gunakan bahasa ilmiah formal, hindari narasi ringan atau gaya storytelling. Format visual seperti tabel dan gambar harus lengkap dengan judul dan sumber.`;

            // Add referensi if provided
            if (referensiValue) {
                prompt += `\n\nReferensi yang harus diintegrasikan dalam makalah:\n${referensiValue}`;
            }

            // Encode the prompt
            const encodedPrompt = encodeURIComponent(prompt);

            // Get session ID
            const sessionIdValue = sessionIdInput.value.trim() || localStorage.getItem('makalah_session_id') || `session_${Date.now()}`;
            
            // Save session ID for future use
            sessionIdInput.value = sessionIdValue;
            localStorage.setItem('makalah_session_id', sessionIdValue);

            // Build the API URL for Gemini
            let apiUrl = `https://api.ryzumi.vip/api/ai/gemini?text=${encodedPrompt}&sessionId=${sessionIdValue}`;
            
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
                throw new Error(data.error || `Failed to generate paper (${response.status})`);
            }

            // Show result
            if (data.result) {
                paperContent.innerHTML = formatText(data.result);
                resultContainer.classList.remove('hidden');
            } else {
                showStatus('No content generated. Please try again.', 'error');
            }

            // Cache the result
            const cacheKey = judulValue;
            cache.set(cacheKey, data);
            
            showStatus('Paper generated successfully with Gemini!', 'success');
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message || 'Failed to generate paper. Please try again.', 'error');
        } finally {
            loadingIcon.classList.add('hidden');
            generateBtn.disabled = false;
        }
    }

    function formatText(text) {
        // Enhanced text formatting for academic papers
        return text
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^(BAB [IVX]+:?.*)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
            .replace(/^([A-Z][\.\s].*)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/\(([A-Za-z]+,\s\d{4})\)/g, '<span class="text-gray-600">($1)</span>')
            .replace(/DAFTAR PUSTAKA/g, '<h2 class="text-xl font-bold mt-8 mb-4">DAFTAR PUSTAKA</h2>')
            .replace(/KATA PENGANTAR/g, '<h2 class="text-xl font-bold mt-8 mb-4 text-center">KATA PENGANTAR</h2>')
            .replace(/DAFTAR ISI/g, '<h2 class="text-xl font-bold mt-8 mb-4 text-center">DAFTAR ISI</h2>');
    }

    function copyContent() {
        if (!paperContent.textContent) return;
        
        const textToCopy = paperContent.textContent;
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showStatus('Content copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                showStatus('Failed to copy text. Please try manually.', 'error');
            });
    }

    function downloadContent(format = 'html') {
        if (!paperContent.innerHTML) return;
        
        const judulValue = judul.value.trim() || 'Makalah';
        const sanitizedTitle = judulValue.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Deteksi jika berjalan di perangkat mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Create the HTML content for the document with improved formatting
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${judulValue}</title>
            <style>
                @page {
                    size: A4;
                    margin: 2cm;
                }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                    font-size: 12pt;
                    color: #000000;
                }
                .container {
                    max-width: 21cm;
                    margin: 2cm auto;
                    padding: 0 1cm;
                }
                h1, h2, h3, h4 {
                    font-weight: bold;
                    margin-top: 1.5em;
                    margin-bottom: 0.8em;
                    page-break-after: avoid;
                    color: #000000;
                }
                h1 {
                    font-size: 16pt;
                    text-align: center;
                }
                h2 {
                    font-size: 14pt;
                    text-align: left;
                }
                h3 {
                    font-size: 12pt;
                    text-align: left;
                }
                p {
                    text-align: justify;
                    margin-bottom: 0.8em;
                    orphans: 3;
                    widows: 3;
                }
                .cover {
                    text-align: center;
                    margin: 5cm 0;
                }
                .cover h1 {
                    font-size: 16pt;
                    margin-bottom: 2cm;
                }
                .author-info {
                    margin-top: 3cm;
                    line-height: 1.8;
                }
                .page-break {
                    page-break-after: always;
                }
                .table-of-contents {
                    margin: 2cm 0;
                }
                .indent {
                    text-indent: 1.27cm;
                }
                ul, ol {
                    margin-top: 0.5em;
                    margin-bottom: 0.5em;
                }
                li {
                    margin-bottom: 0.3em;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 1em 0;
                }
                table, th, td {
                    border: 1px solid #000000;
                }
                th, td {
                    padding: 8px;
                    text-align: left;
                }
                @media print {
                    .page-break {
                        page-break-after: always;
                    }
                    body {
                        font-size: 12pt;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                ${paperContent.innerHTML}
            </div>
        </body>
        </html>
        `;
        
        if (format === 'html') {
            // Download as HTML
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sanitizedTitle}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showStatus('File HTML berhasil diunduh!', 'success');
        } 
        else if (format === 'pdf') {
            showStatus('Membuat file PDF...', 'info');
            
            if (isMobile) {
                // Untuk perangkat mobile, beri pengguna HTML yang dapat dikonversi ke PDF
                const pdfReadyHtml = `
                <!DOCTYPE html>
                <html lang="id">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${judulValue}</title>
                    <style>
                        @page {
                            size: A4;
                            margin: 2cm;
                        }
                        body {
                            font-family: 'Times New Roman', Times, serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            font-size: 12pt;
                            color: #000000;
                        }
                        .container {
                            max-width: 21cm;
                            margin: 2cm auto;
                            padding: 0 1cm;
                        }
                        h1, h2, h3, h4 {
                            font-weight: bold;
                            margin-top: 1.5em;
                            margin-bottom: 0.8em;
                            page-break-after: avoid;
                            color: #000000;
                        }
                        h1 {
                            font-size: 16pt;
                            text-align: center;
                        }
                        h2 {
                            font-size: 14pt;
                            text-align: left;
                        }
                        h3 {
                            font-size: 12pt;
                            text-align: left;
                        }
                        p {
                            text-align: justify;
                            margin-bottom: 0.8em;
                            orphans: 3;
                            widows: 3;
                        }
                        ul, ol {
                            margin-top: 0.5em;
                            margin-bottom: 0.5em;
                            margin-left: 2em;
                        }
                        li {
                            margin-bottom: 0.3em;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        ${paperContent.innerHTML}
                    </div>
                    <div style="text-align:center; margin-top:20px; font-size:10pt; color:#666;">
                        <p>Catatan: Untuk mengubah file ini menjadi PDF, gunakan fitur "Cetak" di browser dan pilih "Simpan sebagai PDF".</p>
                    </div>
                </body>
                </html>`;
                
                const htmlBlob = new Blob([pdfReadyHtml], { type: 'text/html' });
                const htmlUrl = URL.createObjectURL(htmlBlob);
                const a = document.createElement('a');
                a.href = htmlUrl;
                a.download = `${sanitizedTitle}_for_pdf.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(htmlUrl);
                
                showStatus('File HTML untuk PDF berhasil diunduh! Untuk mengubah ke PDF, buka file dengan browser dan gunakan fitur "Cetak ke PDF".', 'success');
            } else {
                // Di desktop, gunakan html2pdf.js
                // Create a temporary container for PDF generation
                const tempDiv = document.createElement('div');
                tempDiv.style.width = '210mm'; // A4 width
                tempDiv.style.margin = '0';
                tempDiv.style.padding = '20mm';
                tempDiv.style.visibility = 'hidden';
                tempDiv.style.position = 'absolute';
                tempDiv.style.fontFamily = 'Times New Roman, Times, serif';
                tempDiv.innerHTML = paperContent.innerHTML;
                document.body.appendChild(tempDiv);
                
                // Use html2pdf.js to generate PDF
                html2pdf()
                    .set({
                        margin: [20, 20, 20, 20],
                        filename: `${sanitizedTitle}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { 
                            scale: 2,
                            useCORS: true,
                            letterRendering: true
                        },
                        jsPDF: { 
                            unit: 'mm', 
                            format: 'a4', 
                            orientation: 'portrait',
                            compress: true
                        }
                    })
                    .from(tempDiv)
                    .save()
                    .then(() => {
                        document.body.removeChild(tempDiv);
                        showStatus('File PDF berhasil diunduh!', 'success');
                    })
                    .catch(err => {
                        console.error('Error generating PDF:', err);
                        document.body.removeChild(tempDiv);
                        showStatus('Gagal membuat PDF. Coba unduh sebagai HTML.', 'error');
                    });
            }
        } 
        else if (format === 'docx') {
            showStatus('Membuat file Word...', 'info');
            
            try {
                // Buat HTML yang lebih sederhana untuk konversi Word
                const simpleContent = `
                <!DOCTYPE html>
                <html lang="id">
                <head>
                    <meta charset="UTF-8">
                    <title>${judulValue}</title>
                    <style>
                        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; }
                        h1, h2, h3, h4 { font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
                        h1 { font-size: 16pt; text-align: center; }
                        h2 { font-size: 14pt; text-align: left; }
                        h3 { font-size: 12pt; text-align: left; }
                        p { text-align: justify; margin-bottom: 0.8em; }
                        ul, ol { margin-left: 2em; margin-bottom: 0.8em; }
                        li { margin-bottom: 0.3em; }
                    </style>
                </head>
                <body>
                    <div style="max-width: 800px; margin: 0 auto;">
                        ${paperContent.innerHTML}
                    </div>
                </body>
                </html>`;
                
                // Deteksi jika berjalan di perangkat mobile
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                // Coba konversi dan unduh
                try {
                    // Pastikan library tersedia
                    if (typeof window.htmlDocx === 'undefined') {
                        throw new Error("Library html-to-docx tidak tersedia");
                    }
                    
                    if (isMobile) {
                        // Untuk mobile, gunakan pendekatan alternatif
                        showStatus('Perangkat mobile terdeteksi. Menggunakan metode alternatif...', 'info');
                        
                        // Unduh sebagai HTML saja di perangkat mobile
                        const htmlBlob = new Blob([simpleContent], { type: 'text/html' });
                        const htmlUrl = URL.createObjectURL(htmlBlob);
                        const a = document.createElement('a');
                        a.href = htmlUrl;
                        a.download = `${sanitizedTitle}.html`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(htmlUrl);
                        
                        showStatus('File HTML berhasil diunduh! Anda dapat membukanya dengan aplikasi Word di perangkat Anda.', 'success');
                    } else {
                        // Konversi ke DOCX di desktop
                        const converted = window.htmlDocx.asBlob(simpleContent);
                        saveAs(converted, `${sanitizedTitle}.docx`);
                        showStatus('File Word berhasil diunduh!', 'success');
                    }
                } catch (convErr) {
                    console.error('Kesalahan konversi:', convErr);
                    
                    // Jika gagal, tawarkan HTML sebagai fallback
                    const htmlBlob = new Blob([simpleContent], { type: 'text/html' });
                    const htmlUrl = URL.createObjectURL(htmlBlob);
                    const a = document.createElement('a');
                    a.href = htmlUrl;
                    a.download = `${sanitizedTitle}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(htmlUrl);
                    
                    showStatus('Konversi ke Word gagal. File HTML telah diunduh sebagai alternatif.', 'warning');
                }
            } catch (err) {
                console.error('Kesalahan umum:', err);
                showStatus('Gagal membuat file Word. Coba unduh sebagai HTML.', 'error');
            }
        }
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