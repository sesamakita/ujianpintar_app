import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://njwmmigqkvvuujdmtjes.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qd21taWdxa3Z2dXVqZG10amVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjE4NDAsImV4cCI6MjEwMjc5Nzg0MH0.IVTfEtjRvmGlkB_b8lsgHjMTUqJihk_hvlBFCg4cy8Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
