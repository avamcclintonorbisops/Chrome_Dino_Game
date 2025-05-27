import React from 'react';
import { createRoot } from 'react-dom/client';
import DinoGame from './components/DinoGame';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <DinoGame />
  </React.StrictMode>
); 