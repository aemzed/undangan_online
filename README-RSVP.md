# Setup RSVP ke Supabase

## 1) Buat tabel di Supabase
1. Buka Supabase Dashboard.
2. Masuk ke project Anda.
3. Buka menu `SQL Editor`.
4. Jalankan isi file `supabase_rsvp_setup.sql`.

## 2) Ambil kredensial project
1. Buka `Project Settings` -> `API`.
2. Copy:
   - `Project URL` (contoh: `https://xxxx.supabase.co`)
   - `anon public key`

## 3) Isi konfigurasi di `index.html`
Ubah bagian ini:

```html
<script>
  window.RSVP_CONFIG = {
    supabaseUrl: '',
    supabaseAnonKey: '',
    tableName: 'rsvp_responses',
  };
</script>
```

Menjadi:

```html
<script>
  window.RSVP_CONFIG = {
    supabaseUrl: 'https://PROJECT_REF.supabase.co',
    supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
    tableName: 'rsvp_responses',
  };
</script>
```

## 4) Jalankan website lokal
Di folder project:

```bash
python3 -m http.server 5500
```

Lalu buka `http://localhost:5500`.

## 5) Cara test RSVP teman
- Contoh link:
  - `http://localhost:5500/?to=Teguh`
  - `http://localhost:5500/?to=Hanum`
- Form nama akan otomatis terisi dari parameter `to`.
- Klik `Kirim Konfirmasi` untuk simpan.

## 6) Cara cek data masuk
Di Supabase:
1. Buka `Table Editor`.
2. Pilih tabel `rsvp_responses`.
3. Data hadir/tidak hadir akan terlihat di kolom `attendance`.

## Catatan perilaku data
- Sistem pakai `upsert` berdasarkan `guest_name`:
  - Nama sama -> data lama di-update.
  - Nama baru -> data baru ditambahkan.
- Jika konfigurasi Supabase kosong atau gagal koneksi, data tetap disimpan lokal di browser (`localStorage`) sebagai fallback.
