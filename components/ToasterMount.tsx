// components/ToasterMount.tsx
'use client';

import { mountToaster } from 'gooey-toast';
import 'gooey-toast/styles.css';
import { useEffect } from 'react';

export function ToasterMount() {
    useEffect(() => {
        mountToaster({ position: 'top-right' });
    }, []);
    return null;
}