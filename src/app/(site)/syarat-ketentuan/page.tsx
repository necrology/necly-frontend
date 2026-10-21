import type { Metadata } from "next";
import Link from "next/link";
import { contact } from "@/data/contact";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan",
  description: "Ketentuan penggunaan layanan langganan patungan Necly Services: akun, pesanan, pembayaran, masa aktif, dan kewajiban pengguna.",
};

// Halaman ini juga menjadi "Application terms of service link" yang diminta
// Google untuk aplikasi OAuth. Form Daftar dan Checkout meminta pengguna
// menyetujui dokumen ini, jadi tautannya harus ada dan dapat dibaca.
export default function TermsOfServicePage() {
  return (
    <>
      <section className="support-hero">
        <div className="container">
          <span className="eyebrow">Ketentuan layanan</span>
          <h1 className="h1">Syarat dan Ketentuan</h1>
          <p>Aturan yang berlaku saat Anda menggunakan layanan Necly Services.</p>
        </div>
      </section>

      <section className="container legal-page">
        <p className="legal-meta">Berlaku sejak 16 Oktober 2026.</p>

        <p>
          Syarat dan Ketentuan ini mengatur penggunaan situs dan layanan Necly Services (&ldquo;kami&rdquo;). Dengan
          membuat akun, memesan, atau memakai layanan kami, Anda dianggap telah membaca dan menyetujui ketentuan ini.
          Bila Anda tidak menyetujuinya, mohon tidak menggunakan layanan kami.
        </p>

        <h2>1. Akun</h2>
        <ul>
          <li>Anda wajib memberikan nama dan alamat email yang benar serta aktif. Alamat email harus diverifikasi sebelum akun dapat digunakan.</li>
          <li>Anda bertanggung jawab menjaga kerahasiaan kata sandi dan seluruh aktivitas yang terjadi pada akun Anda. Halaman <Link href="/akun">Akun &amp; keamanan</Link> memungkinkan Anda melihat perangkat yang sedang masuk dan mengakhirinya.</li>
          <li>Akun bersifat perorangan dan tidak boleh dipindah-tangankan tanpa persetujuan kami.</li>
          <li>Anda harus berusia cukup menurut hukum yang berlaku untuk mengadakan perjanjian. Bila Anda belum cukup umur, layanan hanya boleh digunakan dengan izin dan pengawasan orang tua atau wali.</li>
        </ul>

        <h2>2. Layanan yang kami sediakan</h2>
        <ul>
          <li>Kami menyediakan akses ke layanan digital berlangganan melalui skema pembagian akun (patungan) antar anggota.</li>
          <li>Akses diberikan melalui undangan anggota resmi atau kursi tim yang sah. Kami <strong>tidak pernah</strong> meminta kata sandi akun pribadi Anda, dan Anda tidak perlu membagikannya kepada kami.</li>
          <li>Jumlah perangkat atau pengguna yang dapat mengakses layanan mengikuti pilihan yang Anda tetapkan saat memesan.</li>
          <li>Necly Services bukan afiliasi, perwakilan, maupun mitra resmi dari penyedia layanan yang kami sediakan (misalnya Netflix, Disney+, Spotify, Google, Microsoft, atau lainnya). Merek tersebut milik pemegang haknya masing-masing, dan ketentuan penggunaan dari penyedia tetap berlaku bagi Anda.</li>
        </ul>

        <h2>3. Pesanan dan pembayaran</h2>
        <ul>
          <li>Pesanan diproses setelah pembayaran terkonfirmasi. Pembayaran diproses melalui penyedia pembayaran pihak ketiga (Xendit); kami tidak menyimpan data kartu atau perbankan Anda.</li>
          <li>Harga, durasi, dan ketersediaan stok ditampilkan pada halaman produk dan dapat berubah sewaktu-waktu sebelum pesanan dibuat.</li>
          <li>Nominal akhir dapat mencakup kode unik sebagai penanda pembayaran. Kode voucher yang tidak dikenali tidak memberikan potongan.</li>
          <li>Pesanan yang belum dibayar sampai batas waktu yang tertera akan kedaluwarsa dengan sendirinya, dan akses yang sempat ditahan akan dilepas.</li>
        </ul>

        <h2>4. Masa aktif dan perpanjangan</h2>
        <ul>
          <li>Masa aktif layanan mengikuti durasi yang Anda pilih pada saat pemesanan.</li>
          <li>Untuk layanan tertentu, akses berakhir otomatis satu bulan setelah tanggal checkout sebagaimana dijelaskan pada halaman produk. Anda disarankan memeriksa masa aktif secara berkala agar dapat memperpanjang lebih awal.</li>
          <li>Perpanjangan dilakukan dengan membuat pesanan baru sebelum masa aktif berakhir.</li>
        </ul>

        <h2>5. Kewajiban Anda</h2>
        <ul>
          <li>Tidak membagikan akses kepada lebih banyak orang daripada jumlah perangkat yang Anda pilih.</li>
          <li>Tidak menjual ulang, menyewakan, atau mengalihkan akses tanpa persetujuan tertulis dari kami.</li>
          <li>Tidak mengubah data akun layanan, memindahkan profil, atau mengubah pengaturan yang dapat merugikan anggota lain dalam satu grup.</li>
          <li>Tidak menggunakan layanan untuk tindakan yang melanggar hukum atau melanggar ketentuan penyedia layanan.</li>
        </ul>

        <h2>6. Kendala dan pengembalian dana</h2>
        <ul>
          <li>Kendala pada pesanan, pembayaran, atau akses dapat dilaporkan melalui halaman <Link href="/laporan-kendala">Laporan Kendala</Link> dengan menyertakan nomor pesanan dan email pemesan.</li>
          <li>Kami akan berupaya menyelesaikan kendala dengan memulihkan atau menggantikan akses terlebih dahulu.</li>
          <li>Bila layanan tidak dapat kami sediakan sesuai pesanan dan tidak ada penggantinya, Anda dapat mengajukan pengembalian dana melalui kanal yang sama. Besaran dan kelayakannya ditinjau berdasarkan kondisi pesanan serta ketentuan hukum yang berlaku.</li>
          <li>Pengembalian dana tidak diberikan untuk pelanggaran ketentuan pada bagian 5.</li>
        </ul>

        <h2>7. Penangguhan dan penghapusan akun</h2>
        <p>
          Kami dapat menangguhkan atau menghapus akun yang melanggar ketentuan ini, melakukan penipuan, atau
          menyalahgunakan layanan. Bila hal itu terjadi, Anda dapat menghubungi kami untuk menanyakan alasannya.
        </p>

        <h2>8. Batasan tanggung jawab</h2>
        <ul>
          <li>Layanan disediakan sebagaimana adanya. Kami tidak menjamin layanan pihak ketiga selalu bebas gangguan, karena ketersediaannya berada di luar kendali kami.</li>
          <li>Kami tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan layanan, sejauh diizinkan oleh hukum yang berlaku.</li>
          <li>Tanggung jawab kami atas suatu pesanan dibatasi paling banyak sebesar nilai yang Anda bayarkan untuk pesanan tersebut.</li>
        </ul>

        <h2>9. Kekayaan intelektual</h2>
        <p>
          Nama, logo, dan materi situs Necly Services milik kami dan tidak boleh dipakai tanpa izin. Hak atas merek dan
          konten layanan pihak ketiga tetap melekat pada pemegang haknya masing-masing.
        </p>

        <h2>10. Perubahan ketentuan</h2>
        <p>
          Kami dapat memperbarui ketentuan ini sewaktu-waktu. Versi terbaru selalu tersedia di halaman ini dengan
          tanggal berlaku di bagian atas. Penggunaan layanan setelah pembaruan berarti Anda menyetujui ketentuan yang
          berlaku saat itu.
        </p>

        <h2>11. Hukum yang berlaku</h2>
        <p>
          Ketentuan ini diatur dan ditafsirkan berdasarkan hukum Republik Indonesia. Sengketa akan diupayakan
          diselesaikan secara musyawarah terlebih dahulu.
        </p>

        <h2>12. Hubungi kami</h2>
        <p>
          Pertanyaan mengenai ketentuan ini dapat disampaikan melalui email{" "}
          <a href={`mailto:${contact.email}`}>{contact.email}</a>, WhatsApp{" "}
          <a href={`https://wa.me/${contact.whatsappNumber}`} target="_blank" rel="noreferrer">{contact.whatsappLabel}</a>,
          atau halaman <Link href="/laporan-kendala">Laporan Kendala</Link>.
        </p>
      </section>
    </>
  );
}
