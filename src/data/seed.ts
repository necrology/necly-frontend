import type {
  AssetRecord,
  AuditRecord,
  Customer,
  DashboardOrder,
  InventoryAccount,
  NotificationItem,
  Payment,
  SubscriptionProduct,
  Voucher,
} from "@/lib/types";
import { formatIDR } from "@/lib/money";

export type {
  AssetRecord,
  AuditRecord,
  Customer,
  DashboardOrder,
  InventoryAccount,
  NotificationItem,
  Payment,
  SubscriptionProduct,
  Voucher,
};
export { formatIDR };

const invitationTerms =
  "Akses diberikan melalui undangan anggota atau kursi resmi. Ketersediaan hanya berlaku bila paket, domisili, dan syarat penyedia mengizinkan penambahan anggota; kami tidak menjual kata sandi.";

export const services: SubscriptionProduct[] = [
  {
    id: "prd-streamflix",
    slug: "streamflix-family-slot",
    name: "StreamFlix Slot Keluarga",
    eyebrow: "Tontonan tanpa berbagi kata sandi",
    category: "Streaming",
    price: 39_000,
    stock: 7,
    duration: "30 hari",
    summary: "Slot anggota pada paket keluarga fiktif StreamFlix, dibagikan lewat undangan anggota ke email Anda.",
    description: "Gunakan satu slot akun langganan bersama agar biaya menonton lebih hemat, dengan profil anggota Anda sendiri. Tim Necly mengirim undangan resmi setelah pembayaran terverifikasi dan membantu bila undangan belum masuk.",
    accessType: "Undangan anggota",
    benefits: ["Profil anggota terpisah", "Undangan ke email pribadi", "Bantuan akses selama masa langganan", "Pengingat sebelum masa akses berakhir"],
    activationSteps: [
      { title: "Pilih durasi", description: "Tentukan masa akses dan pastikan slot masih tersedia." },
      { title: "Terima undangan", description: "Undangan anggota dikirim ke email pesanan, tanpa pertukaran kata sandi." },
      { title: "Aktifkan profil", description: "Terima undangan lalu gunakan akun pribadi Anda selama masa akses." },
    ],
    operator: { name: "Tim Akses Necly", role: "Operator terverifikasi", initials: "NA" },
    accent: "indigo",
    featured: true,
    priceOptions: [
      { id: "price-streamflix-30", label: "1 bulan", duration: "30 hari", days: 30, price: 39_000 },
      { id: "price-streamflix-90", label: "3 bulan", duration: "90 hari", days: 90, price: 109_000 },
      { id: "price-streamflix-180", label: "6 bulan", duration: "180 hari", days: 180, price: 205_000 },
    ],
    termsNote: invitationTerms,
  },
  {
    id: "prd-cinemax",
    slug: "cinemax-family-member",
    name: "CineMax Anggota Keluarga",
    eyebrow: "Satu kursi, profil milik Anda",
    category: "Streaming",
    price: 32_000,
    stock: 3,
    duration: "30 hari",
    summary: "Akses anggota paket keluarga CineMax melalui tautan undangan resmi ke akun pribadi.",
    description: "Berbagi paket keluarga membuat biaya menonton lebih hemat, sementara profil tetap milik Anda. Tidak ada kredensial akun induk yang dibagikan kepada pembeli.",
    accessType: "Undangan anggota",
    benefits: ["Undangan melalui email", "Profil dan daftar tontonan pribadi", "Bantuan penggantian undangan", "Masa akses tercatat di pesanan"],
    activationSteps: [
      { title: "Pesan slot", description: "Pilih durasi sesuai kebutuhan." },
      { title: "Cek email", description: "Operator mengirim undangan anggota resmi." },
      { title: "Mulai menonton", description: "Masuk dengan akun pribadi dan terima undangan." },
    ],
    operator: { name: "Tim Streaming Necly", role: "Operator streaming", initials: "DO" },
    accent: "violet",
    featured: true,
    priceOptions: [
      { id: "price-cinemax-30", label: "1 bulan", duration: "30 hari", days: 30, price: 32_000 },
      { id: "price-cinemax-90", label: "3 bulan", duration: "90 hari", days: 90, price: 89_000 },
    ],
    termsNote: invitationTerms,
  },
  {
    id: "prd-musicflow",
    slug: "musicflow-family-slot",
    name: "MusicFlow Slot Keluarga",
    eyebrow: "Musik di akun pribadi",
    category: "Streaming",
    price: 24_000,
    stock: 9,
    duration: "30 hari",
    summary: "Slot anggota paket musik keluarga dengan playlist dan riwayat dengar yang tetap pribadi.",
    description: "Akses sharing dikirim sebagai undangan anggota agar biaya berlangganan lebih hemat. Anda menggunakan akun sendiri sehingga playlist, rekomendasi, dan perangkat tidak tercampur.",
    accessType: "Undangan anggota",
    benefits: ["Playlist tetap pribadi", "Tanpa berbagi kredensial", "Akses melalui akun pribadi", "Pengingat perpanjangan"],
    activationSteps: [
      { title: "Konfirmasi email", description: "Gunakan email yang terhubung ke akun musik Anda." },
      { title: "Terima undangan", description: "Buka tautan anggota yang dikirim operator." },
      { title: "Dengarkan", description: "Akses aktif sampai tanggal yang tercantum pada pesanan." },
    ],
    operator: { name: "Tim Akses Necly", role: "Operator terverifikasi", initials: "NA" },
    accent: "sky",
    featured: true,
    priceOptions: [
      { id: "price-musicflow-30", label: "1 bulan", duration: "30 hari", days: 30, price: 24_000 },
      { id: "price-musicflow-90", label: "3 bulan", duration: "90 hari", days: 90, price: 67_000 },
      { id: "price-musicflow-365", label: "12 bulan", duration: "365 hari", days: 365, price: 249_000 },
    ],
    termsNote: invitationTerms,
  },
  {
    id: "prd-officecloud",
    slug: "officecloud-family-seat",
    name: "OfficeCloud Kursi Keluarga",
    eyebrow: "Produktif dengan kursi resmi",
    category: "Produktivitas",
    price: 49_000,
    stock: 5,
    duration: "30 hari",
    summary: "Kursi anggota untuk aplikasi dokumen dan penyimpanan awan pada paket keluarga yang memenuhi syarat.",
    description: "Kursi paket keluarga dibagikan ke akun Anda agar biaya aplikasi lebih hemat. Dokumen tidak terlihat oleh operator Necly atau anggota lain; jangan unggah data yang melanggar kebijakan organisasi Anda.",
    accessType: "Kursi tim",
    benefits: ["Identitas pengguna terpisah", "Aplikasi produktivitas lengkap", "Penyimpanan sesuai paket", "Bantuan akses"],
    activationSteps: [
      { title: "Pilih kursi", description: "Pilih durasi yang tersedia." },
      { title: "Gabung paket", description: "Terima undangan pada akun pribadi Anda." },
      { title: "Verifikasi akses", description: "Operator memastikan lisensi muncul tanpa melihat dokumen Anda." },
    ],
    operator: { name: "Tim Lisensi Necly", role: "Operator produktivitas", initials: "FL" },
    accent: "blue",
    priceOptions: [
      { id: "price-officecloud-30", label: "1 bulan", duration: "30 hari", days: 30, price: 49_000 },
      { id: "price-officecloud-365", label: "12 bulan", duration: "365 hari", days: 365, price: 499_000 },
    ],
    termsNote: invitationTerms,
  },
  {
    id: "prd-designpro",
    slug: "designpro-team-seat",
    name: "DesignPro Kursi Tim",
    eyebrow: "Ruang desain untuk satu anggota",
    category: "Kreatif",
    price: 45_000,
    stock: 2,
    duration: "30 hari",
    summary: "Kursi tim pada aplikasi desain fiktif DesignPro, ditambahkan ke akun pribadi Anda.",
    description: "Kursi tim dipakai bersama agar biaya aplikasi desain lebih hemat. Kursi hanya dialokasikan pada paket yang memperbolehkan anggota tambahan dan tidak mencakup jual-beli kredensial.",
    accessType: "Kursi tim",
    benefits: ["Masuk dengan akun sendiri", "Aset pribadi terpisah", "Kursi dapat diverifikasi", "Dukungan selama masa akses"],
    activationSteps: [
      { title: "Pilih durasi", description: "Periksa stok kursi tim saat ini." },
      { title: "Terima kursi", description: "Undangan ruang kerja dikirim ke email pesanan." },
      { title: "Mulai berkarya", description: "Gunakan ruang pribadi sesuai kebijakan penyedia." },
    ],
    operator: { name: "Tim Kreatif Necly", role: "Operator kursi kreatif", initials: "LC" },
    accent: "violet",
    priceOptions: [
      { id: "price-designpro-30", label: "1 bulan", duration: "30 hari", days: 30, price: 45_000 },
      { id: "price-designpro-90", label: "3 bulan", duration: "90 hari", days: 90, price: 125_000 },
    ],
    termsNote: invitationTerms,
  },
  {
    id: "prd-aistudio",
    slug: "ai-studio-team-seat",
    name: "AI Studio Kursi Tim",
    eyebrow: "Kursi AI untuk alur kerja Anda",
    category: "Produktivitas",
    price: 79_000,
    stock: 0,
    duration: "30 hari",
    summary: "Kursi tim aplikasi AI generatif fiktif, dibagikan sebagai kursi tim saat slot tersedia.",
    description: "Kursi tim dipakai bersama agar biaya akses AI lebih hemat, dengan batas penggunaan sesuai paket penyedia. Jangan mengirim data sensitif, rahasia perusahaan, atau materi tanpa hak penggunaan.",
    accessType: "Kursi tim",
    benefits: ["Akun pengguna terpisah", "Batas penggunaan transparan", "Status slot tersedia", "Bantuan akses"],
    activationSteps: [
      { title: "Masuk daftar tunggu", description: "Stok baru diumumkan pada halaman pesanan." },
      { title: "Terima undangan", description: "Kursi ditautkan ke email Anda saat tersedia." },
      { title: "Gunakan secara aman", description: "Patuhi kebijakan konten dan privasi penyedia." },
    ],
    operator: { name: "Tim Lisensi Necly", role: "Operator produktivitas", initials: "FL" },
    accent: "indigo",
    priceOptions: [{ id: "price-aistudio-30", label: "1 bulan", duration: "30 hari", days: 30, price: 79_000 }],
    termsNote: invitationTerms,
  },
  {
    id: "prd-learnlab",
    slug: "learnlab-plus-member",
    name: "LearnLab Plus Anggota",
    eyebrow: "Belajar dari akun sendiri",
    category: "Edukasi",
    price: 35_000,
    stock: 8,
    duration: "30 hari",
    summary: "Kursi anggota untuk katalog kelas LearnLab dengan progres belajar yang tersimpan di akun Anda.",
    description: "Paket belajar dipakai bersama agar lebih hemat, sedangkan sertifikat dan progres tetap terhubung ke identitas pribadi, selama paket penyedia mengizinkan anggota tambahan.",
    accessType: "Undangan anggota",
    benefits: ["Progres belajar pribadi", "Riwayat kelas terpisah", "Undangan berbasis email", "Bantuan akses"],
    activationSteps: [
      { title: "Pilih masa belajar", description: "Ambil durasi yang sesuai target Anda." },
      { title: "Terima undangan", description: "Gabung sebagai anggota menggunakan akun pribadi." },
      { title: "Mulai kelas", description: "Progres tersimpan hingga akses berakhir." },
    ],
    operator: { name: "Tim Edukasi Necly", role: "Operator edukasi", initials: "NL" },
    accent: "sky",
    priceOptions: [
      { id: "price-learnlab-30", label: "1 bulan", duration: "30 hari", days: 30, price: 35_000 },
      { id: "price-learnlab-180", label: "6 bulan", duration: "180 hari", days: 180, price: 185_000 },
    ],
    termsNote: invitationTerms,
  },
  {
    id: "prd-vaultpass",
    slug: "vaultpass-family-member",
    name: "VaultPass Anggota Keluarga",
    eyebrow: "Brankas pribadi, kursi resmi",
    category: "Keamanan",
    price: 28_000,
    stock: 6,
    duration: "30 hari",
    summary: "Keanggotaan paket keluarga pengelola sandi dengan brankas terenkripsi yang tetap terpisah.",
    description: "Paket keluarga dipakai bersama agar lebih hemat; pengelola hanya menangani undangan dan tidak dapat melihat isi brankas. Gunakan kata sandi utama yang unik dan aktifkan autentikasi multifaktor.",
    accessType: "Undangan anggota",
    benefits: ["Brankas terenkripsi pribadi", "Autentikasi multifaktor", "Pemulihan sesuai kebijakan", "Tanpa berbagi kata sandi utama"],
    activationSteps: [
      { title: "Siapkan akun", description: "Buat akun pribadi dengan MFA aktif." },
      { title: "Terima undangan", description: "Gabung ke paket keluarga melalui email." },
      { title: "Amankan brankas", description: "Simpan kunci pemulihan secara offline." },
    ],
    operator: { name: "Tim Keamanan Necly", role: "Operator keamanan", initials: "RS" },
    accent: "blue",
    priceOptions: [
      { id: "price-vaultpass-30", label: "1 bulan", duration: "30 hari", days: 30, price: 28_000 },
      { id: "price-vaultpass-365", label: "12 bulan", duration: "365 hari", days: 365, price: 279_000 },
    ],
    termsNote: invitationTerms,
  },
  {
    id: "prd-readly",
    slug: "readly-family-slot",
    name: "Readly Slot Keluarga",
    eyebrow: "Bacaan digital di profil Anda",
    category: "Edukasi",
    price: 21_000,
    stock: 11,
    duration: "30 hari",
    summary: "Slot anggota perpustakaan digital fiktif dengan rak bacaan dan penanda pribadi.",
    description: "Akses dibagikan melalui undangan resmi paket keluarga agar biaya membaca lebih hemat. Hak cipta dan batas unduhan mengikuti aturan penyedia.",
    accessType: "Undangan anggota",
    benefits: ["Rak bacaan pribadi", "Sinkronisasi penanda", "Undangan email", "Pengingat akhir akses"],
    activationSteps: [
      { title: "Pilih durasi", description: "Pilih satu atau tiga bulan." },
      { title: "Gabung keluarga", description: "Terima undangan menggunakan akun Anda." },
      { title: "Mulai membaca", description: "Gunakan konten sesuai lisensi penyedia." },
    ],
    operator: { name: "Tim Edukasi Necly", role: "Operator edukasi", initials: "NL" },
    accent: "violet",
    priceOptions: [
      { id: "price-readly-30", label: "1 bulan", duration: "30 hari", days: 30, price: 21_000 },
      { id: "price-readly-90", label: "3 bulan", duration: "90 hari", days: 90, price: 58_000 },
    ],
    termsNote: invitationTerms,
  },
];

export const categories = ["Semua", "Streaming", "Produktivitas", "Kreatif", "Edukasi", "Keamanan"] as const;

export const dashboardOrders: DashboardOrder[] = [
  { id: "NCL-260906-091", customer: "Nabila Rahma", customerEmail: "nabila@example.id", product: "StreamFlix Slot Keluarga", service: "StreamFlix Slot Keluarga", duration: "3 bulan", amount: 109_000, status: "Diproses", date: "06 Sep 2026", due: "06 Sep · 10:20" },
  { id: "NCL-260906-090", customer: "Rafi Akbar", customerEmail: "rafi@example.id", product: "CineMax Anggota Keluarga", service: "CineMax Anggota Keluarga", duration: "1 bulan", amount: 32_000, status: "Dibayar", date: "06 Sep 2026", due: "06 Sep · 10:35" },
  { id: "NCL-260905-089", customer: "Andra Kurnia", customerEmail: "andra@example.id", product: "OfficeCloud Kursi Keluarga", service: "OfficeCloud Kursi Keluarga", duration: "12 bulan", amount: 499_000, status: "Aktif", date: "05 Sep 2026", due: "05 Sep · 16:08" },
  { id: "NCL-260905-088", customer: "Tio Hadi", customerEmail: "tio@example.id", product: "AI Studio Kursi Tim", service: "AI Studio Kursi Tim", duration: "1 bulan", amount: 79_000, status: "Menunggu pembayaran", date: "05 Sep 2026", due: "—" },
  { id: "NCL-260904-087", customer: "Dewi Sari", customerEmail: "dewi@example.id", product: "LearnLab Plus Anggota", service: "LearnLab Plus Anggota", duration: "6 bulan", amount: 185_000, status: "Aktif", date: "04 Sep 2026", due: "04 Sep · 14:21" },
  { id: "NCL-260903-086", customer: "Bagas Wira", customerEmail: "bagas@example.id", product: "VaultPass Anggota Keluarga", service: "VaultPass Anggota Keluarga", duration: "12 bulan", amount: 279_000, status: "Aktif", date: "03 Sep 2026", due: "03 Sep · 09:44" },
  { id: "NCL-260902-085", customer: "Mila Dewanti", customerEmail: "mila@example.id", product: "DesignPro Kursi Tim", service: "DesignPro Kursi Tim", duration: "3 bulan", amount: 125_000, status: "Dibatalkan", date: "02 Sep 2026", due: "—" },
];

export const customers: Customer[] = [
  { id: "USR-1142", name: "Nabila Rahma", email: "nabila@example.id", initials: "NR", orders: 4, spend: 348_000, status: "Aktif", role: "Pelanggan", verified: true, joined: "12 Mar 2026" },
  { id: "USR-1138", name: "Rafi Akbar", email: "rafi@example.id", initials: "RA", orders: 2, spend: 121_000, status: "Baru", role: "Pelanggan", verified: true, joined: "29 Agu 2026" },
  { id: "USR-1087", name: "Andra Kurnia", email: "andra@example.id", initials: "AK", orders: 6, spend: 1_238_000, status: "Aktif", role: "Pelanggan", verified: true, joined: "04 Des 2025" },
  { id: "USR-1064", name: "Tim Streaming Necly", email: "dina.ops@necly.id", initials: "DO", orders: 0, spend: 0, status: "Aktif", role: "Penjual", verified: true, joined: "19 Nov 2025" },
  { id: "USR-0991", name: "Ayu Admin", email: "ayu.admin@necly.id", initials: "AA", orders: 0, spend: 0, status: "Aktif", role: "Admin", verified: true, joined: "21 Agu 2025" },
  { id: "USR-0853", name: "Tio Hadi", email: "tio@example.id", initials: "TH", orders: 1, spend: 79_000, status: "Nonaktif", role: "Pelanggan", verified: false, joined: "03 Mei 2025" },
];

export const payments: Payment[] = [
  { id: "PAY-88320", orderId: "NCL-260906-091", customer: "Nabila Rahma", method: "QRIS", amount: 109_000, status: "Berhasil", date: "06 Sep, 09:42" },
  { id: "PAY-88319", orderId: "NCL-260906-090", customer: "Rafi Akbar", method: "Virtual account", amount: 32_000, status: "Berhasil", date: "06 Sep, 08:17" },
  { id: "PAY-88318", orderId: "NCL-260905-089", customer: "Andra Kurnia", method: "Kartu", amount: 499_000, status: "Berhasil", date: "05 Sep, 16:05" },
  { id: "PAY-88317", orderId: "NCL-260905-088", customer: "Tio Hadi", method: "Dompet digital", amount: 79_000, status: "Menunggu", date: "05 Sep, 13:28" },
  { id: "PAY-88312", orderId: "NCL-260902-085", customer: "Mila Dewanti", method: "Kartu", amount: 125_000, status: "Dikembalikan", date: "02 Sep, 11:14" },
];

export const vouchers: Voucher[] = [
  { code: "MULAI10", type: "Persen", value: 10, uses: 43, limit: 100, expires: "30 Sep 2026", active: true },
  { code: "HEMAT20K", type: "Nominal", value: 20_000, uses: 18, limit: 50, expires: "15 Sep 2026", active: true },
  { code: "STREAM15", type: "Persen", value: 15, uses: 9, limit: 20, expires: "12 Sep 2026", active: true },
  { code: "SELAMATDATANG", type: "Nominal", value: 15_000, uses: 200, limit: 200, expires: "31 Agu 2026", active: false },
];

export const inventoryAccounts: InventoryAccount[] = [
  { id: "INV-001", product: "StreamFlix Slot Keluarga", reference: "SF-FAM-•••91", totalSlots: 6, usedSlots: 5, status: "Hampir penuh", expires: "31 Des 2026" },
  { id: "INV-002", product: "StreamFlix Slot Keluarga", reference: "SF-FAM-•••42", totalSlots: 6, usedSlots: 4, status: "Aktif", expires: "31 Jan 2027" },
  { id: "INV-003", product: "OfficeCloud Kursi Keluarga", reference: "OC-FAM-•••07", totalSlots: 6, usedSlots: 2, status: "Aktif", expires: "18 Mar 2027" },
  { id: "INV-004", product: "DesignPro Kursi Tim", reference: "DP-TEAM-•••66", totalSlots: 5, usedSlots: 4, status: "Hampir penuh", expires: "11 Nov 2026" },
  { id: "INV-005", product: "VaultPass Anggota Keluarga", reference: "VP-FAM-•••18", totalSlots: 6, usedSlots: 3, status: "Aktif", expires: "07 Feb 2027" },
];


export const assets: AssetRecord[] = [
  { id: "AST-021", name: "necly-services-logo.svg", kind: "Logo", size: "18 KB", usedBy: "Navigasi & footer", updated: "06 Sep 2026" },
  { id: "AST-020", name: "necly-services-logo-icon-only.svg", kind: "Logo", size: "8 KB", usedBy: "Favicon & kartu", updated: "06 Sep 2026" },
  { id: "AST-019", name: "streaming-family-cover.webp", kind: "Gambar mini", size: "124 KB", usedBy: "3 produk", updated: "04 Sep 2026" },
  { id: "AST-018", name: "member-invitation-guide.webp", kind: "Spanduk", size: "206 KB", usedBy: "Pusat bantuan", updated: "02 Sep 2026" },
];

export const initialNotifications: NotificationItem[] = [
  { id: "not-1", title: "Pesanan NCL-260906-091 masuk", detail: "StreamFlix Slot Keluarga dibayar melalui QRIS.", type: "order", time: "8 menit lalu", read: false },
  { id: "not-2", title: "Slot perlu perhatian", detail: "DesignPro Kursi Tim tersisa 2 slot.", type: "inventory", time: "34 menit lalu", read: false },
  { id: "not-3", title: "Pembayaran direkonsiliasi", detail: "PAY-88319 sesuai dengan pencairan rekening virtual.", type: "payment", time: "1 jam lalu", read: false },
  { id: "not-4", title: "Laporan mingguan siap", detail: "Ringkasan operasi 31 Agu–6 Sep tersedia.", type: "system", time: "3 jam lalu", read: true },
  { id: "not-5", title: "Slot pelanggan aktif", detail: "OfficeCloud Kursi Keluarga milik Andra telah aktif.", type: "order", time: "Kemarin", read: true },
];

export const auditRecords: AuditRecord[] = [
  { id: "AUD-9021", actor: "Ayu Admin", action: "Mengubah status", resource: "Pesanan NCL-260906-091 → Diproses", ip: "103.87.44.18", time: "06 Sep, 10:04" },
  { id: "AUD-9020", actor: "Sistem", action: "Rekonsiliasi pembayaran", resource: "Pembayaran PAY-88320", ip: "Internal", time: "06 Sep, 09:43" },
  { id: "AUD-9019", actor: "Tim Streaming Necly", action: "Mengubah slot", resource: "DesignPro Kursi Tim: 3 → 2", ip: "103.87.44.18", time: "06 Sep, 09:15" },
  { id: "AUD-9018", actor: "Rafi Ops", action: "Membuat voucher", resource: "Voucher HEMAT20K", ip: "36.72.190.11", time: "05 Sep, 17:40" },
  { id: "AUD-9017", actor: "Sistem", action: "Mengirim notifikasi", resource: "Pesanan NCL-260905-089 aktif", ip: "Internal", time: "05 Sep, 16:24" },
  { id: "AUD-9016", actor: "Ayu Admin", action: "Mengubah produk", resource: "VaultPass Anggota Keluarga", ip: "103.87.44.18", time: "05 Sep, 14:08" },
  { id: "AUD-9015", actor: "Rafi Ops", action: "Memproses pengembalian", resource: "Pembayaran PAY-88312", ip: "36.72.190.11", time: "04 Sep, 11:12" },
];

export const revenueSeries = [
  { label: "Sen", revenue: 1.2, orders: 18 },
  { label: "Sel", revenue: 1.8, orders: 24 },
  { label: "Rab", revenue: 1.4, orders: 21 },
  { label: "Kam", revenue: 2.2, orders: 34 },
  { label: "Jum", revenue: 1.9, orders: 29 },
  { label: "Sab", revenue: 2.6, orders: 41 },
  { label: "Min", revenue: 2.1, orders: 36 },
];

export const categoryPerformance = [
  { category: "Streaming", revenue: 5.8, orders: 128, conversion: "8,4%" },
  { category: "Produktivitas", revenue: 3.1, orders: 42, conversion: "6,9%" },
  { category: "Kreatif", revenue: 1.7, orders: 31, conversion: "6,2%" },
  { category: "Edukasi", revenue: 1.5, orders: 38, conversion: "7,1%" },
  { category: "Keamanan", revenue: 1.1, orders: 26, conversion: "5,8%" },
];

export const activity = [
  { title: "NCL-260906-091 diproses", detail: "Undangan disiapkan oleh Tim Akses", time: "10:04" },
  { title: "PAY-88320 berhasil", detail: "QRIS · Rp109.000", time: "09:43" },
  { title: "Stok slot diperbarui", detail: "DesignPro Kursi Tim · 2 slot", time: "09:15" },
  { title: "NCL-260906-090 dibayar", detail: "Menunggu undangan CineMax", time: "08:22" },
];

export function getService(slug: string) {
  return services.find((product) => product.slug === slug);
}

export function getRelatedServices(product: SubscriptionProduct) {
  return services.filter((candidate) => candidate.category === product.category && candidate.id !== product.id).slice(0, 3);
}

