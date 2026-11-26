/* Optional contact phone shown as the "help" WhatsApp link. Set VITE_CONTACT_PHONE (in
   frontend/.env.local for local dev) to show it; when it is not set the link is hidden, so no
   phone number has to live in the code or in git. */
export const CONTACT_PHONE: string | undefined = import.meta.env.VITE_CONTACT_PHONE || undefined;

/* wa.me links want international digits only: an Israeli 05X number becomes 9725X... */
export function whatsappDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? "972" + digits.slice(1) : digits;
}
