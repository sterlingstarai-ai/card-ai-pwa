import React from 'react';
import ReactDOM from 'react-dom/client';
import CardBenefitsApp from './App.jsx';
import './index.css';
import { initFirebase } from './lib/firebase';
import { initMixpanel } from './lib/mixpanel';

void initFirebase();
initMixpanel();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CardBenefitsApp />
  </React.StrictMode>
);
