# midtermproject
# 🏎️ BMW Global Sales Dashboard (2010–2024)

## Deskripsi Singkat
Dashboard ini menampilkan **analisis interaktif** data penjualan global BMW dari tahun **2010 hingga 2024**.
Visualisasi ini membantu pengguna memahami tren waktu, hubungan antara **harga dan jumlah penjualan**, serta distribusi spesifikasi seperti **jenis transmisi dan bahan bakar**.

Dibangun menggunakan **D3.js v7**, **HTML5**, dan **CSS modern**, dengan fitur:
- 🔄 **Animasi interaktif** (play/pause + slider tahun)
- 🔍 **Filter model & region**
- 📊 **Multi-view visualization** (Line, Scatter, dan Bar chart)

---

## 🎯 Tujuan Proyek
1. Menunjukkan kemampuan implementasi **teknik interaksi dan animasi visualisasi data**.
2. Menyediakan pengalaman eksplorasi data yang intuitif.
3. Menggunakan _dynamic queries_, _details-on-demand_, dan _storytelling_.

---

## 💡 Rationale (Alasan Desain)
| Komponen | Fungsi | Alasan Pemilihan |
|-----------|---------|------------------|
| **Line Chart** | Tren penjualan per tahun | Cocok untuk analisis temporal |
| **Scatter Chart** | Hubungan harga–penjualan | Mudah menunjukkan korelasi |
| **Bar Chart** | Distribusi transmisi/bahan bakar | Efektif untuk kategori |
| **Slider + Play Button** | Navigasi & animasi | Kombinasi eksplorasi & cerita |
| **Dropdown Filter** | Fokus subset data | Dynamic queries |
| **Tooltip Hover** | Detail model dinamis | Details-on-demand |

---

## ⚙️ Proses Pengembangan
**Tahapan kerja:**
1. EDA dan pembersihan data.
2. Desain UI responsif HTML+CSS.
3. Implementasi D3.js dan event interaktif.
4. Testing & optimasi transisi animasi.

---

## 🌐 Cara Menjalankan
1. Letakkan file berikut dalam satu folder:
   ```
   index.html
   style.css
   script.js
   BMW sales data (2010–2024).csv
   ```
2. Jalankan server lokal:
   ```bash
   python -m http.server 8000
   ```
3. Buka di browser: http://localhost:8000

---

## 📊 Struktur Proyek
```
📁 BMW-Dashboard/
 ├── index.html
 ├── style.css
 ├── script.js
 ├── BMW sales data.csv
 └── README.md
```
---

## 📜 Lisensi
- Data: dataset penjualan BMW (2010–2024).
- Library: D3.js v7.
- Desain terinspirasi dari antarmuka BMW modern.
