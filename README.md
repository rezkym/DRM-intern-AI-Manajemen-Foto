# AI Photo Manager

Sistem manajemen foto pintar yang menggunakan AI (Google Gemini 2.5 Flash) untuk menganalisis, mengkategorikan, dan mengorganisir foto secara otomatis.

## 🚀 Fitur Utama

- **Upload Batch**: Upload multiple foto sekaligus
- **Analisis AI**: Menggunakan Gemini 2.5 Flash untuk menganalisis konten foto
- **Organisasi Otomatis**: Foto diorganisir ke folder berdasarkan analisis AI
- **Pencarian Cerdas**: Cari foto berdasarkan konten, aktivitas, orang, atau objek
- **Batch Processing**: Memproses foto secara batch untuk menghindari rate limit API
- **Metadata Storage**: Menyimpan hasil analisis AI dalam file JSON
- **Web Interface**: Interface web yang user-friendly dengan responsive design

## 📋 Cara Kerja

1. **Upload Foto**: Pilih dan upload foto melalui web interface
2. **Temporary Storage**: Foto disimpan sementara di folder `temp_photos`
3. **AI Analysis**: Setiap foto dianalisis oleh Gemini AI untuk mendapatkan:
   - Deskripsi konten
   - Objek-objek utama
   - Aktivitas yang sedang dilakukan
   - Lokasi/setting
   - Informasi orang (jumlah, detail)
   - Mood/suasana foto
   - Keywords untuk pencarian
4. **Organization**: Berdasarkan analisis AI, foto dipindahkan ke folder yang sesuai dengan nama file yang descriptive
5. **Search**: Gunakan fitur pencarian untuk menemukan foto berdasarkan konten

## 🛠️ Teknologi yang Digunakan

- **Backend**: Python, FastAPI
- **AI Service**: Google Gemini 2.5 Flash
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **Image Processing**: Pillow (PIL)
- **File Management**: Python pathlib, shutil

## 📦 Instalasi

### 1. Clone Repository
```bash
git clone <repository-url>
cd Project\ Image\ Management
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Setup Environment Variables
Buat file `.env` di root folder dengan isi:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY_2=your_gemini_api_key_2_here
```

### 4. Jalankan Aplikasi
```bash
python main.py
```

Aplikasi akan berjalan di `http://localhost:8000`

## 🔧 Konfigurasi

Edit file `config.py` untuk menyesuaikan pengaturan:

```python
class Config:
    # Folder paths
    TEMP_PHOTO_DIR = "temp_photos"
    ORGANIZED_PHOTO_DIR = "organized_photos"
    
    # Batch processing settings
    BATCH_SIZE = 5  # Process 5 photos at a time
    BATCH_DELAY = 2  # Wait 2 seconds between batches
    
    # Supported image formats
    SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}
    
    # Maximum file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
```

## 📖 API Endpoints

### Upload Foto
```
POST /upload
Content-Type: multipart/form-data

Files: files (multiple image files)
```

### Check Processing Status
```
GET /status
Response: JSON dengan status processing
```

### Search Foto
```
GET /search?q=keyword
Response: JSON dengan hasil pencarian
```

### Browse Foto
```
GET /browse
GET /browse?folder=folder_name
Response: HTML page dengan daftar foto/folder
```

### Statistik
```
GET /stats
Response: JSON dengan statistik foto
```

## 📁 Struktur Folder

```
Project Image Management/
├── main.py                 # Main FastAPI application
├── config.py              # Configuration settings
├── gemini_service.py      # Gemini AI integration
├── file_organizer.py      # File organization logic
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── README.md             # Documentation
├── temp_photos/          # Temporary uploaded photos
├── organized_photos/     # Organized photos by AI
├── static/               # Static web files
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       └── browse.js
└── templates/            # HTML templates
    ├── index.html
    └── browse.html
```

## 🎯 Contoh Penggunaan

### 1. Upload Foto
- Buka http://localhost:8000
- Pilih foto-foto yang ingin diorganisir
- Klik "Upload dan Proses Foto"
- Monitor progress processing

### 2. Pencarian Foto
- Gunakan search box di homepage
- Contoh pencarian:
  - "Budi sedang olahraga"
  - "pertemuan kantor"
  - "pantai sunset"
  - "makanan"

### 3. Browse Foto
- Klik menu "Browse Foto"
- Lihat folder-folder yang sudah diorganisir
- Klik folder untuk melihat foto di dalamnya
- Klik foto untuk melihat detail metadata

## 🔍 Format Metadata

Setiap foto yang diproses akan memiliki file JSON dengan metadata:

```json
{
  "analysis_result": {
    "description": "Deskripsi foto",
    "main_objects": ["objek1", "objek2"],
    "activity": "aktivitas yang dilakukan",
    "location_type": "indoor/outdoor",
    "location_specific": "lokasi spesifik",
    "people_count": 2,
    "people_details": "2 orang dewasa",
    "mood": "bahagia",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "suggested_folder": "nama_folder",
    "suggested_filename": "nama_file"
  },
  "organized_at": "timestamp",
  "original_filename": "nama_file_asli.jpg"
}
```

## ⚙️ Troubleshooting

### Error: "quota exceeded" atau "rate limit"
- Sistem akan otomatis switch ke API key kedua
- Pastikan kedua API key memiliki quota yang cukup
- Sesuaikan `BATCH_DELAY` di config untuk delay yang lebih lama

### Foto tidak muncul di browser
- Pastikan foto sudah selesai diproses
- Check folder `organized_photos`
- Pastikan format foto didukung

### Processing stuck
- Check log di terminal
- Restart aplikasi jika perlu
- Pastikan API key valid dan memiliki quota

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 Lisensi

Project ini menggunakan lisensi MIT. Lihat file `LICENSE` untuk detail lengkap.

## 👨‍💻 Author

Created with ❤️ for better photo management using AI.

---

**Note**: Pastikan untuk tidak commit file `.env` ke repository untuk menjaga keamanan API keys. 