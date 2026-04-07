'use client';

import { supabase } from '../src/lib/supabase';
import { useEffect } from 'react';

export default function Home() {
    useEffect(() => {
        const test = async () => {
            const { data, error } = await supabase.from('test').select('*');
            console.log(data, error);
        };
        test();
    }, []);

    return <div>Check console 👀</div>;
}