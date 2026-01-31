import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sanitizeAnonKey = (value?: string) => {
	if (!value) return value;
	const marker = 'C_SUPABASE_ANON_KEY=';
	const markerIndex = value.indexOf(marker);
	if (markerIndex >= 0) {
		return value.slice(0, markerIndex);
	}
	return value;
};

const supabaseUrl = rawSupabaseUrl?.trim();
const supabaseAnonKey = sanitizeAnonKey(rawSupabaseAnonKey)?.trim();

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = () => {
	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Supabase environment variables are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
	}
	if (!cachedClient) {
		cachedClient = createClient(supabaseUrl, supabaseAnonKey);
	}
	return cachedClient;
};
