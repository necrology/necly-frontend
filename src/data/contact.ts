// Satu sumber untuk kontak publik supaya sekali ubah langsung berlaku di semua halaman.
// Nomor WhatsApp memakai nomor sementara dari pemilik (08999228241). Nomor lama
// (6282115297376) tidak terdaftar di WhatsApp menurut QA.
export const contact = {
  email: "necly.services@gmail.com",
  whatsappNumber: "628999228241",
  whatsappLabel: "+62 899-9228-241",
} as const;

export const whatsappLink = (message: string) => `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(message)}`;

export const openingHours = "Senin – Sabtu, 09.00 – 21.00 WIB";
