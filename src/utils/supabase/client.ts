import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = "https://kthteqppgwgymgjvkjjh.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0aHRlcXBwZ3dneW1nanZrampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTAyNTUsImV4cCI6MjA5NjEyNjI1NX0.KSEC3Hlh-F7A-g3wWa7d20XXWJWv7Rbe1pEm-8eO3ic";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
