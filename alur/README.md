# Dokumentasi Alur Sistem, Use Case, dan ERD - Aplikasi "Melati"

Folder ini berisi dokumentasi teknis sistem pelaporan **Melati** (Laravel 11 + Inertia.js + React) yang disusun berdasarkan analisis langsung terhadap kode sumber proyek.

---

## 📄 File Dokumentasi

1. **`alur/usecase.md`**  
   Memuat identifikasi aktor dan hak akses, diagram use case keseluruhan, diagram use case per aktor, pengelompokan per modul (`rectangle`), relasi `<<include>>`/`<<extend>>`, serta tabel deskripsi terperinci per use case (ID, nama, aktor, prasyarat, alur utama, hasil).

2. **`alur/erd.md`**  
   Memuat diagram relasi entitas ringkas (high-level), diagram ERD detail (lengkap kolom, tipe data, PK, FK, nullable, default value, index, dan notation Crow's Foot), serta kamus data lengkap per entitas.

3. **`alur/flowchart-pelapor.md`**  
   Memuat diagram flowchart PlantUML alur kerja pelapor (publik/user), penjelasan rinci 5 tahapan alur (form pengajuan, validasi & generasi tiket sekuensial, cek status, loop tanggapan/balasan, serta penyelesaian manual & auto-close), matriks validasi, dan asumsi.

4. **`alur/README.md`** (File ini)  
   Ringkasan sistem, daftar asumsi berbasis analisis kode sumber, dan panduan cara render kode PlantUML.

---

## 📌 Asumsi & Temuan Analisis Kode

Berikut adalah asumsi dan aturan bisnis yang didapatkan secara langsung dari analisis kode program:

1. **Struktur Role Pengguna (`app/UserRole.php` & `EnsureUserHasRole.php`)**:
   - Sistem hanya mengenal dua role internal: `admin` dan `operator`.
   - Pengguna dengan role `admin` memiliki akses penuh termasuk manajemen akun pengguna (`/dashboard/admin/operator`), edit isi laporan masuk, dan hapus tiket beserta lampiran.
   - Pengguna dengan role `operator` memiliki akses menginput data, mengelola laporan masuk, merespon laporan, melihat laporan selesai, serta mencetak/mengunduh rekapitulasi.

2. **Skema Penomoran Tiket (`app/Models/Ticket.php`)**:
   - **Tiket Publik / API**: Menggunakan format `P-1400/MMYYYY/XX01` di mana:
     - `P`: Prefix klasifikasi (`L` = Pengaduan, `A` = Aspirasi, `I` = Permintaan Informasi).
     - `1400`: Kode stempel BPS.
     - `MMYYYY`: Bulan dan tahun pembuatan.
     - `XX`: 2 huruf kapital acak (misal: `AB`, `XY`).
     - `01`: Nomor urut sekuensial yang di-generate menggunakan Redis lock dan tabel `ticket_counters`.
   - **Tiket Input Admin/Operator**: Menggunakan format `NamaPembuat/DDMMYYYY/Sequence` (misal: `Administrator/09102026/01`).

3. **Aturan Penutupan Tiket Otomatis (Auto-Close)**:
   - Tiket yang telah dibalas oleh petugas BPS (`user_id != null`) akan berubah status menjadi `selesai` secara otomatis apabila pelapor tidak memberikan balasan hingga melewati batas hari kedaluwarsa.
   - Batas hari dikonfigurasi di tabel `settings`:
     - `auto_close_pengaduan_days` (default: 3 hari)
     - `auto_close_aspirasi_days` (default: 1 hari)
     - `auto_close_permintaan_informasi_days` (default: 5 hari)
   - Proses penutupan dijalankan setiap jam melalui Cron Laravel Scheduler (`tickets:auto-close`) dan dipicu secara instan setiap kali detail tiket diakses di rute `/check` atau `/api/check`.

4. **Integrasi API (`routes/api.php` & `EnsureApiKeyIsValid.php`)**:
   - Rute API dilindungi oleh middleware `api.key` (mengecek header `X-API-KEY` atau token Authorization Bearer) dan diset pembatasan laju (*rate limiting*) `throttle:30,1`.

5. **Hierarki Kanal & Agregasi Rekapitulasi (`app/Support/RekapReport.php`)**:
   - Kanal pendukung memiliki 2 level (kanal induk dan sub-kanal via `parent_id`).
   - Pada rekapitulasi (Bulanan, Semesteran, Tahunan) dan statistik dashboard, jumlah tiket pada sub-kanal diakumulasikan ke kanal induknya.

---

## 🎨 Cara Render Kode PlantUML

Semua diagram dalam file `usecase.md` dan `erd.md` ditulis menggunakan sintaks standar PlantUML yang diawali `@startuml` dan diakhiri `@enduml`.

### Cara 1: Menggunakan Web Server PlantUML (Tanpa Instalasi)
1. Salin seluruh isi blok kode `plantuml` (mulai dari `@startuml` hingga `@enduml`).
2. Buka situs [https://www.plantuml.com/plantuml/uml/](https://www.plantuml.com/plantuml/uml/).
3. Tempelkan (*paste*) kode ke dalam teks area dan klik **Submit**.
4. Diagram akan di-render secara otomatis dan dapat diunduh dalam format PNG, SVG, atau TXT.

### Cara 2: Menggunakan Ekstensi VS Code
1. Install ekstensi **PlantUML** (oleh *jebbs*) di Visual Studio Code.
2. Install **Graphviz** di sistem Anda (diperlukan untuk tata letak diagram).
3. Buka file `.md` di VS Code, posisikan kursor pada blok kode PlantUML.
4. Tekan `Alt + D` untuk melihat pratinjau diagram secara langsung.

### Cara 3: Menggunakan PlantUML CLI (Command Line)
Jika Anda memiliki PlantUML JAR dan Graphviz terpasang:
```bash
java -jar plantuml.jar alur/usecase.md
java -jar plantuml.jar alur/erd.md
```
Perintah ini akan secara otomatis menghasilkan file gambar PNG/SVG untuk setiap diagram yang terdapat di dalam file Markdown.
