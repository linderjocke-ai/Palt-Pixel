/*
 * Inställningar för inloggning och sparning på kontot.
 * Fyll i från Supabase: Project Settings → API.
 * Anon-nyckeln är publik och får ligga här. Lägg ALDRIG in service_role-nyckeln.
 * Så länge fälten är tomma fungerar sidan och spelen som vanligt, men utan inloggning.
 */
window.PP_KONFIG = {
  supabaseUrl: "https://yxvecdddlgbrguywhqkk.supabase.co",
  supabaseAnonKey: "sb_publishable_G8KrodzJwfO2lWvkoz0kug_ik-cLthj",
  // Inloggningssätt som är påslagna i Supabase (Authentication → Providers)
  inloggning: ["google", "azure", "epost"]
};
