import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/doto';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import AsterApp from './aster/AsterApp';
import './index.css';

const mount = document.getElementById('root');
if (!mount) throw new Error('Aster application root is missing.');
createRoot(mount).render(<React.StrictMode><AsterApp /></React.StrictMode>);
