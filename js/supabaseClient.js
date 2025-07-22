import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://xqaoxqnngsdxiwykrcjd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxYW94cW5uZ3NkeGl3eWtyY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNTQ4MzAsImV4cCI6MjA2NzgzMDgzMH0.-ZEbBC9lyECb1DOOwbqBVY9AvYFzcFgLe20yrI2E-44'; // already stored in your context

export const supabase = createClient(supabaseUrl, supabaseKey);
