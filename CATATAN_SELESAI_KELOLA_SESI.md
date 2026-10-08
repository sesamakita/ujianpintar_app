# Catatan Debugging & Perbaikan Fitur Kelola Sesi (Submit Paksa / Kirim Pesan)

> Disusun otomatis dari sesi percakapan debugging — 5 Oktober 2026
> Aplikasi: `guru_hebat_2` (Expo/React Native, APK siswa)
> Web dashboard guru: `guru_hebat` (React + Vite + Tailwind)

---

## 1. Ringkasan Masalah

| Gejala | Detail |
|---|---|
| "Submit Paksa" (Paksa Kumpul) di Kelola Sesi tidak bereaksi | Dari web dashboard guru, aksi dijalankan tapi HP siswa tidak menampilkan hasil / tidak pindah layar |
| Fitur lain di Kelola Sesi kadang lambat | Reset sesi, +5/+10 menit, Kunci Semua, Kirim pesan — respons lambat atau tidak tampak |
| "Kirim pesan" (warning) dari web tidak muncul di APK | Siswa tidak melihat modal peringatan pengawas |

---

## 2. Arsitektur & Alur Data (yang perlu dipahami)

```
[Web dashboard guru]  ──REST──▶  [Supabase DB (api.ujianpintar.online)]
       │                                  │
       └──Realtime Broadcast (WebSocket)──┘
                                            │  postgres_changes (jika Realtime aktif)
                                            ▼
[APK Siswa]  ──REST polling (5s)──▶  Supabase  ◀── Realtime subscribe
```

**Kunci masalah:** Semua aksi guru (submit paksa, kirim pesan, lock, add-time) ditulis ke DB, lalu disampaikan ke siswa lewat **dua jalur**:
1. **Realtime broadcast / postgres_changes** (WebSocket) — cepat tapi **tidak aktif di environment ini** (channel selalu `CLOSED`/`CHANNEL_ERROR`).
2. **Polling REST** (query langsung `student_sessions` & `violation_logs`) — andal selama internet aktif, **inilah jaring pengaman utama**.

---

## 3. Temuan Kunci (Bukti dari Log & DB)

### 3.1 Web → DB → Polling: SEMUA BEKERJA
- Pesan warning yang dikirim dari web **tercatat di `violation_logs`** (bukti query langsung):
  - Contoh baris baru: `Peringatan Pengawas: "📵 Dilarang membuka aplikasi / catatan lain!"` → NISN `96484` (Giono) jam `09.37.28`.
- `student_sessions` berisi status & `remaining_seconds` yang benar.
- Jadi **jalur web → Supabase tidak bermasalah**.

### 3.2 APK tidak memuat kode terbaru (penyebab inti)
- Log Metro (`start.log`):
  - **Tidak ada satu pun baris `[Poll]`** (debug log yang ditambahkan ke polling 5 detik) → bundle baru tidak pernah dijalankan di HP.
  - Hanya ada `[Realtime] personalChannel 96484 ... CLOSED` berulang setiap ~1 detik (loop reconnect WebSocket gagal).
- `Android Bundled` tidak muncul untuk sesi terakhir → **Expo Go tidak berhasil me-load bundle project SDK 57** (kemungkinan versi Expo Go di HP lebih lama / tidak kompatibel dengan SDK 57).

### 3.3 Realtime WebSocket mati total di environment ini
- Channel `student-alerts-{nisn}` & `exam-alerts-{examId}` selalu `CLOSED`/`CHANNEL_ERROR`, **tidak pernah `SUBSCRIBED`**.
- Penyebab dugaan: kustom domain `api.ujianpintar.online` tidak meneruskan WebSocket `/realtime/v1/websocket` dengan benar, atau Realtime/publication tidak diaktifkan penuh di server.
- Implikasi: **kirim pesan & submit paksa yang bergantung broadcast tidak akan sampai** — hanya polling REST yang bisa menyelamatkan.

### 3.4 Bug di kode asli (sudah diperbaiki)
- `getLatestTeacherWarning` memakai `.limit(1)` **sebelum** filter `exam_id` → bisa mengambil baris dari ujian lain.
- Polling failover siswa lama: interval **20 detik**, hanya cek `status === 'submitted'` → tidak menangkap kasus `remaining_seconds === 0 && submitted_at` (pola yang dibuat force-submit), dan lambat.
- Semua fungsi aksi di service **menelan error** (`catch { console.warn }`) → UI menganggap berhasil padahal DB gagal (NISN/nama mismatch, RLS, offline).
- `addGlobalTimeInDb` melakukan **loop serial** per siswa → lambat di kelas besar.
- `handleForceSubmit` di sisi siswa membaca **state stale** dari closure `useEffect` → jawaban yang dikirim bisa kosong/terlambat.
- Tidak ada **guard idempotency** → broadcast + polling + postgres_changes bisa memicu submit ganda (2 grade record).

---

## 4. Perubahan Kode yang Sudah Dilakukan

### 4.1 Aplikasi `guru_hebat_2` (APK siswa)

| File | Perubahan |
|---|---|
| `src/services/examService.ts` | `forceSubmitStudentInDb`, `resetStudentSessionInDb`, `addGlobalTimeInDb`, `lockAllExamsInDb` kini **mengembalikan `{ success, updatedCount, error }`** + validasi jumlah row ter-update (deteksi NISN/nama mismatch). `sendRealtimeBroadcast` mengembalikan `boolean` (terkirim?) dengan timeout 4 detik. `getStudentSessionStatus` mengembalikan `{ status, remainingSeconds, submittedAt }`. `getLatestTeacherWarning` memindahkan filter `exam_id` **sebelum** `order`/`limit`. |
| `src/hooks/useLiveProctoring.ts` | Fungsi aksi kini me-return hasil dari service (bukan void), error tidak ditelan. |
| `src/components/teacher/TeacherStudentActionModal.tsx` | Modal menunggu hasil server: menampilkan `loading`, jika gagal modal tetap terbuka dengan pesan error; props tipe `Promise<{success,error}>`. |
| `src/components/teacher/TeacherProctoringView.tsx` | Modal +5/+10 & Kunci Semua menunggu hasil, tampilkan error, `refreshRoster()` setelah sukses. |
| `src/components/student/StudentExamSheet.tsx` | Polling failover **5 detik** + deteksi `status==='submitted'` **ATAU** `(remainingSeconds===0 && submittedAt)`; `handleForceSubmit` membaca **state terbaru via `answersRef`** (bukan closure stale); debug `console.log('[Poll] ...')` untuk observasi. |
| `App.tsx` | Tambah **guard idempotency** (`submittedSessionsRef` + `isSubmissionInFlightRef`) di `handleSubmitExam` agar submit tidak dobel; `JoinSessionGate` memblokir siswa yang sudah `submitted` agar tidak tertahan di Lobby. |

### 4.2 Web dashboard guru `guru_hebat`

| File | Perubahan |
|---|---|
| `src/services/examService.ts` | `forceSubmitStudent`, `resetStudentSession`, `addGlobalTime`, `lockAllExams` kini mengembalikan `{ success, updatedCount, error }` + cek row; `addGlobalTime` pakai `Promise.all` (paralel) bukan loop serial; `sendRealtimeBroadcast` mengembalikan `boolean`. |
| `src/components/live-proctoring/LiveProctoringDashboard.tsx` | Handler aksi `async` menunggu hasil server sebelum update state/log; banner error merah di atas; modal Kunci Semua menampilkan `isLoading` & pesan error. |
| `src/components/live-proctoring/StudentActionModal.tsx` | Menunggu hasil server sebelum menampilkan sukses; layar "Aksi Gagal" + tombol Coba Lagi; `isLoading` pada tombol konfirmasi. |

> Catatan: Kode **polling adaptif & watchdog di web** (`App.tsx` web) sudah ada dan tidak diubah — sudah bagus (5s fallback + 8s watchdog).

---

## 5. Validasi yang Sudah Dilakukan

| Check | Hasil |
|---|---|
| `npx tsc --noEmit` (APK) | ✅ exit 0 |
| `npx tsc --noEmit -p tsconfig.app.json` (web) | ✅ exit 0 |
| `npx oxlint` (web, file berubah) | ✅ exit 0 |
| `npx vite build` (web) | ✅ built sukses |
| Query langsung Supabase (`violation_logs`, `student_sessions`) | ✅ data benar |
| Log Metro | ⚠️ Realtime `CLOSED`, **0 baris `[Poll]`** → HP belum menjalankan bundle baru |
| Gradle build APK debug | ❌ gagal **bukan karena kode**, tapi `react-android-0.86.2-debug.aar` tidak bisa di-download dari repositori (jaringan/proxy) |

---

## 6. Kesimpulan Diagnosis

**Akar masalah "tidak bereaksi" = kombinasi:**

1. 🔴 **APK/Expo Go tidak menjalankan kode terbaru** — semua perbaikan (polling 5s, deteksi force-submit, fix query warning) ada di source, tapi HP menggunakan **bundle/APK lama**.
2. 🔴 **Realtime WebSocket mati total** di environment `api.ujianpintar.online` (channel selalu `CLOSED`) → jalur broadcast tidak bisa diandalkan; **polling REST adalah satu-satunya jaring pengaman**.
3. 🟠 **Bug-bug di kode asli** (query warning salah, polling 20s, silent-fail service, state stale, tanpa idempotency) — **sudah diperbaiki** di source.

**Artinya:** Setelah **build ulang APK** yang memuat source terbaru, kirim pesan & submit paksa akan bereaksi **≤ 5 detik** bahkan tanpa Realtime (via polling REST), karena `student_sessions.status`/`violation_logs` sudah ter-update oleh web.

---

## 7. Langkah Berikutnya yang Direkomendasikan

1. **Build ulang APK** dengan source terbaru:
   - Idealnya via **EAS Build** (`eas build --platform android --profile preview`) — butuh akun EAS & keystore production.
   - Atau **gradle lokal** setelah masalah download dependency diselesaikan (perlu akses ke `repo.maven.apache.org` / `dl.google.com`, atau cek proxy/network).
   - Alternatif cepat: **build debug** → `android/app/build/outputs/apk/debug/app-debug.apk`.
2. **Uji skenario lengkap** setelah APK baru terpasang:
   - Login siswa → masuk ujian.
   - Dari web: Kirim pesan → harus muncul modal peringatan ≤5 detik.
   - Dari web: Submit Paksa → HP pindah ke hasil ≤5 detik.
3. **Opsi perbaikan jangka panjang (server):**
   - Aktifkan/migrasi Realtime di Supabase (cek publikasi `supabase_realtime` + proxy WebSocket di domain `api.ujianpintar.online`).
   - Atau tambahkan **polling server-side / push notification** (FCM) untuk skala produksi jika Realtime memang tidak bisa diaktifkan.
4. **Bersihkan debug log** (`console.log('[Poll] ...')`) setelah pengujian selesai.

---

## 8. Referensi File Penting

**Aplikasi (`guru_hebat_2`):**
- `src/services/examService.ts`
- `src/hooks/useLiveProctoring.ts`
- `src/components/teacher/TeacherStudentActionModal.tsx`
- `src/components/teacher/TeacherProctoringView.tsx`
- `src/components/student/StudentExamSheet.tsx`
- `App.tsx`

**Web (`guru_hebat`):**
- `src/services/examService.ts`
- `src/components/live-proctoring/LiveProctoringDashboard.tsx`
- `src/components/live-proctoring/StudentActionModal.tsx`

**Server/Schema:**
- `supabase/schema.sql` (publikasi Realtime & RLS; RLS mengizinkan `all` untuk student_sessions/violation_logs — sudah benar)
- `.env` web: `VITE_SUPABASE_URL=https://api.ujianpintar.online`

---
*Dokumen ini dibuat otomatis dari sesi debugging. Perlu update setelah build APK & uji ulang.*