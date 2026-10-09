# Dokumentasi Use Case - Aplikasi Pelaporan "Melati"

Dokumentasi ini disusun berdasarkan analisis langsung terhadap kode sumber proyek aplikasi pelaporan **Melati** (Laravel + Inertia + React).

---

## 1. Identifikasi Aktor & Hak Akses

Berdasarkan pemeriksaan middleware (`EnsureUserHasRole`, `EnsureApiKeyIsValid`), rute (`routes/web.php`, `routes/api.php`), controller, dan perintah konsol (`tickets:auto-close`), berikut adalah aktor-aktor yang terlibat dalam sistem:

| Aktor | Jenis | Deskripsi | Hak Akses |
| --- | --- | --- | --- |
| **Pelapor / Publik** | Pengguna Eksternal | Masyarakat / pengguna umum yang mengajukan atau memantau laporan tanpa memerlukan akun login. | - Membuat laporan publik (Pengaduan, Aspirasi, Permintaan Informasi)<br>- Mengunggah file lampiran tiket<br>- Mengecek status tiket via Nomor Tiket<br>- Membalas tanggapan petugas BPS<br>- Menandai tiket selesai secara mandiri |
| **Operator** | Pengguna Internal | Petugas penanganan laporan BPS dengan rute `/dashboard/operator`. | - Akses Ringkasan & Tren Dashboard Operator<br>- Input data laporan manual (sumber admin)<br>- Mengelola & merespon Laporan Masuk (Respon Awal / Respon Substantif)<br>- Mengirim email tanggapan ke pelapor<br>- Melihat & memfilter Laporan Selesai<br>- Melihat, mencetak (PDF view), dan mengunduh Excel Rekap (Bulanan, Semesteran, Tahunan)<br>- Mengubah Pengaturan Aplikasi (Penanda Tangan & Auto-Close Days)<br>- Mengubah Password & Tampilan Profil Akun |
| **Admin** | Pengguna Internal | Pengelola sistem utama dengan role `admin` dan rute `/dashboard/admin`. | - Memiliki seluruh hak akses **Operator**<br>- Mengelola Pengguna/Operator (Tambah, Edit, Hapus akun)<br>- Mengedit data Laporan Masuk (Ubah pelapor, judul, isi)<br>- Menghapus data Tiket beserta seluruh lampirannya |
| **Klien API (Aplikasi Eksternal)** | Pengguna Sistem Eksternal | Aplikasi pihak ketiga (misal: Flutter/Android) yang berkomunikasi via rute `/api/*` dengan autenfikasi `X-API-KEY`. | - Membuat tiket via API (`POST /api/tickets`)<br>- Memeriksa status tiket (`GET /api/check`)<br>- Mengirim balasan pelapor (`POST /api/check/{ticket}/reply`)<br>- Menandai tiket selesai (`POST /api/check/{ticket}/complete`) |
| **Sistem (Cron Scheduler)** | Aktor Otomatis | Perintah terjadwal Artisan (`tickets:auto-close`) yang dijalankan setiap jam (`hourly`). | - Memeriksa tiket aktif yang sudah ditanggapi petugas<br>- Menutup tiket secara otomatis jika melampaui batas hari auto-close |

---

## 2. Diagram Use Case Keseluruhan

Diagram di bawah menggambarkan seluruh interaksi antara aktor dan modul-modul utama sistem Melati.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Pelapor / Publik" as pelapor
actor "Operator" as operator
actor "Admin" as admin
actor "Klien API" as api_client
actor "Sistem (Cron)" as system

rectangle "Aplikasi Pelaporan Melati" {

  package "Modul Autentikasi & Akun" {
    usecase "UC-01: Login Sistem" as UC01
    usecase "UC-02: Logout Sistem" as UC02
    usecase "UC-03: Lupa & Reset Password" as UC03
    usecase "UC-04: Ubah Password Akun" as UC04
  }

  package "Modul Manajemen Operator (Khusus Admin)" {
    usecase "UC-05: Kelola Pengguna/Operator" as UC05
  }

  package "Modul Pelaporan Publik & API" {
    usecase "UC-06: Buat Tiket Pelaporan" as UC06
    usecase "UC-07: Unggah Lampiran Tiket" as UC07
    usecase "UC-08: Cek Status Tiket" as UC08
    usecase "UC-09: Balas Tanggapan Petugas" as UC09
    usecase "UC-10: Tandai Tiket Selesai (Pelapor)" as UC10
  }

  package "Modul Input Data Manual" {
    usecase "UC-11: Input Tiket Manual (Admin/Op)" as UC11
    usecase "UC-12: Respon Langsung Saat Input" as UC12
  }

  package "Modul Kelola Laporan Masuk" {
    usecase "UC-13: Lihat Daftar Laporan Masuk" as UC13
    usecase "UC-14: Detail Laporan Masuk" as UC14
    usecase "UC-15: Kirim Tanggapan Petugas" as UC15
    usecase "UC-16: Kirim Email Notifikasi Tanggapan" as UC16
    usecase "UC-17: Edit Laporan Masuk (Admin)" as UC17
    usecase "UC-18: Hapus Tiket (Admin)" as UC18
  }

  package "Modul Kelola Laporan Selesai" {
    usecase "UC-19: Lihat Daftar Laporan Selesai" as UC19
    usecase "UC-20: Detail Laporan Selesai" as UC20
  }

  package "Modul Rekap & Laporan" {
    usecase "UC-21: Lihat Rekap Bulanan/Semesteran/Tahunan" as UC21
    usecase "UC-22: Cetak Rekap (PDF View)" as UC22
    usecase "UC-23: Export Rekap Excel" as UC23
  }

  package "Modul Pengaturan & Otomatisasi" {
    usecase "UC-24: Kelola Pengaturan Aplikasi" as UC24
    usecase "UC-25: Auto-Close Tiket Kedaluwarsa" as UC25
  }

}

' Relasi Include & Extend
UC06 <.. UC07 : <<include>>
UC08 <.. UC25 : <<include>> (single check)
UC11 <.. UC12 : <<extend>>
UC15 <.. UC16 : <<include>> (jika ada email)

' Interaksi Aktor
pelapor -- UC06
pelapor -- UC08
pelapor -- UC09
pelapor -- UC10

api_client -- UC06
api_client -- UC08
api_client -- UC09
api_client -- UC10

operator -- UC01
operator -- UC02
operator -- UC04
operator -- UC11
operator -- UC13
operator -- UC14
operator -- UC15
operator -- UC19
operator -- UC20
operator -- UC21
operator -- UC22
operator -- UC23
operator -- UC24

admin -- UC01
admin -- UC02
admin -- UC03
admin -- UC04
admin -- UC05
admin -- UC11
admin -- UC13
admin -- UC14
admin -- UC15
admin -- UC17
admin -- UC18
admin -- UC19
admin -- UC20
admin -- UC21
admin -- UC22
admin -- UC23
admin -- UC24

system -- UC25

@enduml
```

---

## 3. Diagram Use Case Per Aktor

### 3.1 Use Case Aktor Pelapor / Publik & Klien API

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Pelapor / Publik" as pelapor
actor "Klien API" as api_client

rectangle "Layanan Pelaporan Publik & API" {
  usecase "Buat Tiket Pelaporan" as UC_Create
  usecase "Unggah Lampiran Tiket" as UC_Attach
  usecase "Cek Status Tiket" as UC_Check
  usecase "Balas Tanggapan Petugas" as UC_Reply
  usecase "Tandai Tiket Selesai" as UC_Complete
  usecase "Auto-Close Check Single Ticket" as UC_AutoSingle
}

UC_Create <.. UC_Attach : <<include>>
UC_Check <.. UC_AutoSingle : <<include>>

pelapor -- UC_Create
pelapor -- UC_Check
pelapor -- UC_Reply
pelapor -- UC_Complete

api_client -- UC_Create
api_client -- UC_Check
api_client -- UC_Reply
api_client -- UC_Complete
@enduml
```

### 3.2 Use Case Aktor Operator

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Operator" as operator

rectangle "Portal Operator BPS" {
  usecase "Login & Authenticate" as UC_Login
  usecase "Kelola Password Akun" as UC_Pass
  usecase "Input Tiket Manual" as UC_Input
  usecase "Lihat Laporan Masuk" as UC_Masuk
  usecase "Kirim Tanggapan (Awal/Substantif)" as UC_Response
  usecase "Kirim Email Tanggapan" as UC_Mail
  usecase "Lihat Laporan Selesai" as UC_Selesai
  usecase "Lihat Rekapitulasi Laporan" as UC_Rekap
  usecase "Cetak / Export Excel Rekap" as UC_Export
  usecase "Kelola Pengaturan (Penanda Tangan & Auto-Close)" as UC_Setting
}

UC_Response <.. UC_Mail : <<include>>

operator -- UC_Login
operator -- UC_Pass
operator -- UC_Input
operator -- UC_Masuk
operator -- UC_Response
operator -- UC_Selesai
operator -- UC_Rekap
operator -- UC_Export
operator -- UC_Setting
@enduml
```

### 3.3 Use Case Aktor Admin

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Admin" as admin

rectangle "Portal Administrator BPS" {
  usecase "Kelola Pengguna / Operator" as UC_Op
  usecase "Edit Data Laporan Masuk" as UC_Edit
  usecase "Hapus Tiket & Lampiran" as UC_Delete
  usecase "Input Data Tiket Manual" as UC_Input
  usecase "Kirim Tanggapan Tiket" as UC_Response
  usecase "Kelola Rekap & Export" as UC_Rekap
  usecase "Kelola Pengaturan Sistem" as UC_Setting
}

admin -- UC_Op
admin -- UC_Edit
admin -- UC_Delete
admin -- UC_Input
admin -- UC_Response
admin -- UC_Rekap
admin -- UC_Setting
@enduml
```

### 3.4 Use Case Aktor Sistem (Cron Scheduler)

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Sistem (Cron Scheduler)" as system

rectangle "Otomatisasi Latar Belakang" {
  usecase "Jalankan Command tickets:auto-close" as UC_Cron
  usecase "Hitung Selisih Hari Respon Terakhir" as UC_Calc
  usecase "Ubah Status Tiket Jadi Selesai" as UC_Update
}

UC_Cron <.. UC_Calc : <<include>>
UC_Calc <.. UC_Update : <<include>>

system -- UC_Cron
@enduml
```

---

## 4. Tabel Deskripsi Use Case

| ID | Nama Use Case | Aktor Utama | Prasyarat | Alur Utama | Hasil / Output |
| --- | --- | --- | --- | --- | --- |
| **UC-01** | Login Sistem | Admin, Operator | Pengguna belum login, akun aktif (`is_active = true`) | 1. Pengguna membuka halaman `/login`.<br>2. Mengisi email dan password.<br>3. Sistem memvalidasi kredensial.<br>4. Sistem mengarahkan Admin ke `/dashboard/admin` atau Operator ke `/dashboard/operator`. | Sesi autentikasi terbentuk. |
| **UC-02** | Logout Sistem | Admin, Operator | Pengguna sedang login | 1. Pengguna menekan tombol Logout.<br>2. Sistem menghapus sesi autentikasi.<br>3. Pengguna diarahkan kembali ke halaman Login. | Sesi autentikasi berakhir. |
| **UC-03** | Lupa & Reset Password | Admin | Email terdaftar | 1. Pengguna meminta link reset password.<br>2. Sistem mengirimkan link reset via email.<br>3. Pengguna membuka link dan memasukkan password baru. | Password akun berhasil diperbarui. |
| **UC-04** | Ubah Password Akun | Admin, Operator | Pengguna sedang login | 1. Pengguna membuka `/settings/password`.<br>2. Memasukkan password lama dan password baru.<br>3. Sistem memverifikasi dan mengupdate password. | Password akun berhasil diperbarui. |
| **UC-05** | Kelola Pengguna/Operator | Admin | Admin sedang login | 1. Admin membuka rute `dashboard/admin/operator`.<br>2. Admin dapat melihat daftar pengguna, menambah pengguna baru (`admin`/`operator`), mengubah data pengguna, atau menghapus pengguna. | Data akun pengguna bertambah, berubah, atau terhapus. |
| **UC-06** | Buat Tiket Pelaporan | Pelapor, Klien API | Tersedia kanal pengaduan aktif | 1. Pelapor memilih klasifikasi (Pengaduan, Aspirasi, Permintaan Informasi).<br>2. Mengisi judul, kanal, data diri, dan isi laporan.<br>3. Sistem men-generate nomor tiket unik (misal: `L-1400/102026/AB01`).<br>4. Sistem menyimpan tiket dan men-dispatch event broadcasting `TicketCreated`. | Tiket baru tersimpan dengan status `baru`. |
| **UC-07** | Unggah Lampiran Tiket | Pelapor, Klien API | Pembuatan tiket sedang berlangsung | 1. Pelapor memilih file (JPG, PNG, PDF, max 2MB).<br>2. Sistem menyimpan file di storage public (`attachments/{ticket_id}`). | Data lampiran tersimpan di `ticket_attachments`. |
| **UC-08** | Cek Status Tiket | Pelapor, Klien API | Nomor tiket valid | 1. Pelapor menginput Nomor Tiket di rute `/check` atau API.<br>2. Sistem menjalankan pengecekan auto-close tiket tersebut.<br>3. Sistem menampilkan detail tiket, status, dan riwayat balasan. | Informasi detail tiket dan riwayat respon tampil. |
| **UC-09** | Balas Tanggapan Petugas | Pelapor, Klien API | Tiket belum berstatus `selesai` | 1. Pelapor mengisi pesan balasan pada detail tiket.<br>2. Sistem menyimpan respon dengan `user_id = null` dan `type = balasan_pelapor`.<br>3. Sistem mengubah `is_read = false` pada tiket agar muncul penanda di admin. | Balasan pelapor tersimpan dan tiket ditandai belum dibaca oleh admin. |
| **UC-10** | Tandai Tiket Selesai (Pelapor) | Pelapor, Klien API | Tiket berstatus aktif | 1. Pelapor menekan tombol "Tandai Selesai".<br>2. Sistem mengupdate `status = selesai` dan mengisi `completed_at`. | Status tiket berubah menjadi `selesai`. |
| **UC-11** | Input Tiket Manual | Admin, Operator | User internal sedang login | 1. Pengguna membuka menu "Input Data".<br>2. Mengisi formulir tiket yang bersumber dari offline/admin.<br>3. Sistem men-generate nomor tiket berbasis nama pembuat (misal: `Administrator/09102026/01`). | Tiket baru tersimpan dengan `source_app = admin`. |
| **UC-12** | Respon Langsung Saat Input | Admin, Operator | Pengguna mengisi input tiket manual | 1. Pengguna secara opsional memilih untuk memberikan tanggapan langsung saat menginput tiket.<br>2. Sistem membuat `ticket_responses` dan langsung mengubah tiket ke status `selesai`. | Tiket langsung tersimpan dalam kondisi selesai direspon. |
| **UC-13** | Lihat Daftar Laporan Masuk | Admin, Operator | User internal sedang login | 1. Pengguna membuka rute `laporan-masuk`.<br>2. Sistem menampilkan tiket dari publik (kecuali `source_app = admin`) beserta statistik tab/filter. | Daftar tiket laporan masuk tampil. |
| **UC-14** | Detail Laporan Masuk | Admin, Operator | User internal sedang login | 1. Pengguna memilih salah satu tiket.<br>2. Sistem otomatis mengubah `is_read = true` jika sebelumnya `false`.<br>3. Menampilkan riwayat percakapan dan lampiran. | Detail tiket tampil & status dibaca diperbarui. |
| **UC-15** | Kirim Tanggapan Petugas | Admin, Operator | User internal sedang login | 1. Pengguna memilih tipe respon (`respon_awal` atau `respon_substantif`) dan menulis pesan.<br>2. Sistem menyimpan respon dengan `user_id = auth()->id()`.<br>3. Status tiket terupdate sesuai tipe respon. | Tanggapan petugas tersimpan dan status tiket terupdate. |
| **UC-16** | Kirim Email Notifikasi Tanggapan | Admin, Operator | Tiket memiliki `reporter_email` | 1. Setelah respon petugas disimpan, sistem memeriksa ketersediaan email pelapor.<br>2. Mengirim email mailable `TicketResponseSubmitted`.<br>3. Catat `email_sent_at` pada respon. | Email tanggapan terkirim ke alamat email pelapor. |
| **UC-17** | Edit Laporan Masuk | Admin | Admin sedang login | 1. Admin membuka detail tiket pada rute `laporan-masuk/{ticketNumber}`.<br>2. Admin memperbarui nama pelapor, email, WA, judul, atau isi content. | Data tiket berhasil diperbarui. |
| **UC-18** | Hapus Tiket | Admin | Admin sedang login | 1. Admin menekan tombol Hapus pada tiket.<br>2. Sistem menghapus seluruh file fisik lampiran tiket dan respon di storage.<br>3. Sistem menghapus record tiket dari database via transaksi DB. | Tiket dan seluruh lampiran terhapus bersih. |
| **UC-19** | Lihat Daftar Laporan Selesai | Admin, Operator | User internal sedang login | 1. Pengguna membuka rute `laporan-selesai`.<br>2. Sistem menampilkan tiket berstatus `respon_awal`, `respon_substantif`, atau `selesai`. | Daftar laporan selesai tampil. |
| **UC-20** | Detail Laporan Selesai | Admin, Operator | User internal sedang login | 1. Pengguna membuka detail laporan selesai.<br>2. Sistem menampilkan seluruh percakapan & berkas lampiran. | Detail laporan selesai tampil read-only. |
| **UC-21** | Lihat Rekapitulasi Laporan | Admin, Operator | User internal sedang login | 1. Pengguna membuka menu Rekap (Bulanan, Semesteran, atau Tahunan).<br>2. Sistem mengagregasikan tiket per kanal (induk & anak) dan per klasifikasi. | Tabel matriks rekapitulasi tampil. |
| **UC-22** | Cetak Rekap (PDF View) | Admin, Operator | User internal sedang login | 1. Pengguna menekan tombol "Cetak".<br>2. Sistem rendernya via blade template print khusus siap cetak/pdf iframe lengkap dengan penanda tangan. | Tampilan dokumen siap cetak/simpan PDF. |
| **UC-23** | Export Rekap Excel | Admin, Operator | User internal sedang login | 1. Pengguna menekan tombol "Export Excel".<br>2. Sistem mengunduh file `.xls` berformat tabel rekap. | File `.xls` terunduh. |
| **UC-24** | Kelola Pengaturan Aplikasi | Admin, Operator | User internal sedang login | 1. Pengguna membuka rute `pengaturan`.<br>2. Mengubah nama, jabatan, kota penanda tangan, serta batas hari auto-close per klasifikasi.<br>3. Sistem mengupdate data di tabel `settings`. | Pengaturan sistem terupdate. |
| **UC-25** | Auto-Close Tiket Kedaluwarsa | Sistem (Cron) | Jadwal hourly tercapai | 1. Perintah `tickets:auto-close` berjalan.<br>2. Sistem mencari tiket aktif yang respon terakhirnya dari petugas BPS.<br>3. Menghitung batas kedaluwarsa sesuai `settings`.<br>4. Mengubah status ke `selesai` jika sudah melampaui batas hari. | Tiket kedaluwarsa otomatis ditutup. |
