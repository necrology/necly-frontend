import type { Metadata } from "next";
import Link from "next/link";
import { contact } from "@/data/contact";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Data apa yang dikumpulkan Necly Services, untuk apa dipakai, berapa lama disimpan, dan bagaimana Anda mengendalikannya.",
};

// Halaman ini juga menjadi "Application privacy policy link" yang diminta Google
// untuk aplikasi OAuth, jadi isinya harus mencakup: data yang dikumpulkan, cara
// pemakaian, pihak ketiga, masa simpan, dan cara menghubungi kami.
export default function PrivacyPolicyPage() {
  return (
    <>
      <section className="support-hero">
        <div className="container">
          <span className="eyebrow">Ketentuan layanan</span>
          <h1 className="h1">Kebijakan Privasi</h1>
          <p>Data apa yang kami kumpulkan, untuk apa dipakai, dan bagaimana Anda mengendalikannya.</p>
        </div>
      </section>

      <section className="container legal-page">
        <p className="legal-meta">Berlaku sejak 16 Oktober 2026.</p>

        <p>
          Kebijakan ini menjelaskan bagaimana Necly Services (&ldquo;kami&rdquo;) menangani data pribadi Anda saat
          menggunakan situs dan layanan langganan kami. Dengan membuat akun atau memesan layanan, Anda menyetujui
          praktik yang dijelaskan di halaman ini.
        </p>

        <h2>1. Data yang kami kumpulkan</h2>
        <ul>
          <li><strong>Data akun</strong> — nama, alamat email, dan kata sandi. Kata sandi disimpan hanya sebagai hash bcrypt; kami tidak pernah menyimpan atau dapat membaca kata sandi asli Anda.</li>
          <li><strong>Masuk dengan Google</strong> (opsional) — bila Anda memakainya, kami menerima ID akun Google, nama, dan alamat email dari profil Google Anda. Kami tidak mengakses data lain di akun Google Anda.</li>
          <li><strong>Data sesi dan perangkat</strong> — token sesi (disimpan sebagai hash), alamat IP, dan keterangan peramban/perangkat setiap kali Anda masuk. Halaman <Link href="/akun">Akun &amp; keamanan</Link> menampilkan daftar ini dan Anda dapat mengakhirinya sendiri kapan saja.</li>
          <li><strong>Data pesanan dan pembayaran</strong> — nomor pesanan, produk dan paket, durasi, jumlah perangkat, nominal biaya, status pembayaran, dan referensi transaksi dari penyedia pembayaran.</li>
          <li><strong>Laporan kendala</strong> — nama, email, nomor pesanan, kategori, isi laporan, dan alamat IP saat laporan dikirim.</li>
          <li><strong>Testimoni</strong> (bila Anda mengirimkan) — judul, isi, rating, nama penampil, dan produk terkait. Hanya testimoni yang disetujui yang tampil di halaman publik.</li>
          <li><strong>Catatan keamanan</strong> — waktu dan alamat IP untuk peristiwa penting seperti masuk yang berhasil maupun gagal, verifikasi email, dan perubahan kata sandi. Catatan ini kami pakai untuk mendeteksi penyalahgunaan.</li>
          <li><strong>Keranjang belanja</strong> — disimpan di penyimpanan lokal peramban Anda, bukan di server kami, sampai Anda menyelesaikan checkout.</li>
        </ul>

        <h2>2. Untuk apa data itu dipakai</h2>
        <ul>
          <li>Membuat dan mengamankan akun, termasuk verifikasi email dan pemulihan kata sandi.</li>
          <li>Memproses pesanan, mengonfirmasi pembayaran, dan menyediakan akses layanan yang Anda beli.</li>
          <li>Menangani laporan kendala dan permintaan dukungan.</li>
          <li>Menjaga keamanan layanan, misalnya membatasi percobaan masuk berulang.</li>
          <li>Memenuhi kewajiban pembukuan dan hukum yang berlaku.</li>
        </ul>
        <p>Kami tidak menjual data pribadi Anda, dan tidak memakainya untuk periklanan pihak ketiga.</p>

        <h2>3. Cookie dan penyimpanan peramban</h2>
        <ul>
          <li><strong>Cookie sesi (<code>refresh_token</code>)</strong> — dipasang saat Anda masuk, bersifat <em>httpOnly</em> dan <em>Secure</em> sehingga tidak dapat dibaca JavaScript, serta berlaku maksimal 7 hari atau sampai Anda keluar. Cookie ini hanya dipakai untuk menjaga sesi masuk Anda.</li>
          <li><strong>Penyimpanan lokal</strong> — keranjang belanja dan status sesi di peramban Anda.</li>
          <li>Kami <strong>tidak</strong> memakai cookie periklanan atau pelacakan lintas situs.</li>
        </ul>

        <h2>4. Pihak ketiga yang menerima data</h2>
        <ul>
          <li><strong>Xendit</strong> — penyedia pembayaran. Nominal dan detail transaksi dikirim ke Xendit untuk memproses pembayaran Anda. Kami tidak menyimpan nomor kartu, PIN, atau kredensial perbankan Anda.</li>
          <li><strong>Google</strong> — hanya bila Anda memilih Masuk dengan Google, untuk memverifikasi identitas Anda.</li>
          <li><strong>Cloudflare</strong> — jaringan, keamanan, dan pengukuran trafik agregat situs.</li>
          <li><strong>Google Workspace (Gmail)</strong> — pengiriman email transaksional seperti tautan verifikasi, tautan atur ulang kata sandi, dan notifikasi laporan kendala.</li>
        </ul>
        <p>Penyedia layanan pihak ketiga tersebut memproses data sesuai kebijakan privasi mereka masing-masing.</p>

        <h2>5. Berapa lama data disimpan</h2>
        <ul>
          <li>Tautan verifikasi email berlaku 24 jam; tautan atur ulang kata sandi berlaku 45 menit. Keduanya hangus setelah dipakai.</li>
          <li>Sesi masuk berakhir saat Anda keluar, saat Anda mengakhirinya dari halaman Akun, atau saat masa berlakunya habis.</li>
          <li>Data akun, pesanan, dan laporan kendala kami simpan selama akun Anda aktif dan selama masih diperlukan untuk penanganan sengketa serta pembukuan.</li>
        </ul>

        <h2>6. Keamanan</h2>
        <p>
          Kata sandi disimpan sebagai hash bcrypt, token sesi dan token atur ulang disimpan sebagai hash, cookie sesi
          bersifat httpOnly, dan percobaan masuk dibatasi lajunya. Meski demikian, tidak ada sistem yang sepenuhnya
          bebas risiko — jagalah kerahasiaan kata sandi Anda dan laporkan segera bila mencurigai adanya akses yang
          tidak Anda kenal melalui halaman <Link href="/laporan-kendala">Laporan Kendala</Link>.
        </p>

        <h2>7. Hak Anda</h2>
        <ul>
          <li><strong>Melihat dan mengakhiri sesi</strong> — halaman <Link href="/akun">Akun &amp; keamanan</Link> menampilkan perangkat yang sedang masuk dan menyediakan tombol untuk mengakhirinya.</li>
          <li><strong>Mengubah kata sandi</strong> — dapat dilakukan sendiri kapan saja dari halaman Akun.</li>
          <li><strong>Meminta salinan, perbaikan, atau penghapusan data</strong> — ajukan melalui kontak di bawah. Sebagian data pesanan mungkin tetap kami simpan bila diperlukan untuk pembukuan atau penyelesaian sengketa.</li>
        </ul>

        <h2>8. Perubahan kebijakan</h2>
        <p>
          Kami dapat memperbarui kebijakan ini bila layanan atau ketentuan hukum berubah. Versi terbaru selalu
          tersedia di halaman ini, dengan tanggal berlaku di bagian atas.
        </p>

        <h2>9. Hubungi kami</h2>
        <p>
          Pertanyaan tentang kebijakan ini atau permintaan terkait data pribadi Anda dapat disampaikan melalui email{" "}
          <a href={`mailto:${contact.email}`}>{contact.email}</a>, WhatsApp{" "}
          <a href={`https://wa.me/${contact.whatsappNumber}`} target="_blank" rel="noreferrer">{contact.whatsappLabel}</a>,
          atau halaman <Link href="/laporan-kendala">Laporan Kendala</Link>.
        </p>
      </section>
    </>
  );
}
