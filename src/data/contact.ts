// Satu sumber untuk kontak publik supaya sekali ubah langsung berlaku di semua halaman.
// Nomor WhatsApp masih menunggu konfirmasi: sheet QA menyebut +6289524547106 sebagai contoh,
// sedangkan nomor lama (6282115297376) menurut QA tidak terdaftar di WhatsApp.
export const contact = {
  email: "neclyservice@gmail.com",
  whatsappNumber: "6289524547106",
  whatsappLabel: "+62 895-2454-7106",
} as const;

export const whatsappLink = (message: string) => `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(message)}`;

// Sosmed & jam operasional untuk footer (QA poin 16). Alamat Instagram mengikuti
// username yang tertulis di dokumen QA; URL Facebook dan jam operasional masih
// placeholder dan perlu dikonfirmasi sebelum dianggap final.
export const socials = {
  instagram: { label: "@neclyserviceofficial", href: "https://instagram.com/neclyserviceofficial" },
  facebook: { label: "Necly Service", href: "https://www.facebook.com/neclyserviceofficial" },
} as const;

export const openingHours = "Senin – Sabtu, 09.00 – 21.00 WIB";
