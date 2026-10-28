import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Moviemarks',
    description: 'Film ve dizilerini keşfet, kişisel listende sakla.',
    permissions: ['storage'],
    host_permissions: ['https://api.themoviedb.org/*'],
    icons: { 16: '/icons/icon-16.png', 32: '/icons/icon-32.png', 48: '/icons/icon-48.png', 128: '/icons/icon-128.png' },
    action: { default_title: 'Moviemarks', default_icon: { 16: '/icons/icon-16.png', 32: '/icons/icon-32.png', 48: '/icons/icon-48.png', 128: '/icons/icon-128.png' } },
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
