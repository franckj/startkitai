import 'dotenv/config';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// remove the slash from the URL if there is one
// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	define: {
		__API_URL__: JSON.stringify((process.env.VITE_API_URL ?? '').replace(/\/$/, '')),
		__VITE_DEMO_PDF_CONTEXT_ID__: JSON.stringify(process.env.VITE_DEMO_PDF_CONTEXT_ID)
	}
});
