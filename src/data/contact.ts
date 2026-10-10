// Satu sumber untuk kontak publik supaya sekali ubah langsung berlaku di semua halaman.
// Nomor WhatsApp masih menunggu konfirmasi: sheet QA menyebut +6289524547106 sebagai contoh,
// sedangkan nomor lama (6282115297376) menurut QA tidak terdaftar di WhatsApp.
export const contact = {
  email: "neclyservice@gmail.com",
  whatsappNumber: "6289524547106",
  whatsappLabel: "+62 895-2454-7106",
} as const;

export const whatsappLink = (message: string) => `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
