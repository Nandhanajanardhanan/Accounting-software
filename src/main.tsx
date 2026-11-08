import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/app.css';
import { AppRoot } from './screens/AppRoutes';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
);
