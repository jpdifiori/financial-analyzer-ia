
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or SERVICE_ROLE if needed, but ANON usually works for reading if RLS allows or checks user

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data) {
        console.log('Found', data.length, 'analyses');
        data.forEach(a => {
            console.log('--- Analysis ID:', a.id);
            console.log('Summary:', a.summary);
        });
    }
}

check();
