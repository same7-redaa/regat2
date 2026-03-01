import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ejvsfdepfheohdlowuya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdnNmZGVwZmhlb2hkbG93dXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzIxOTUsImV4cCI6MjA4NzgwODE5NX0.3wfhO7JfigSuFiZQEZa-TVTnWLN_4Wqw4DhWRH8eqGs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
