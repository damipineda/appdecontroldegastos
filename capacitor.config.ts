import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.damipineda.finanzas',
  appName: 'Finanzas Personales',
  webDir: 'www',
  server: {
    url: 'https://appdecontroldegastos.vercel.app/?mobile_app=1',
    cleartext: false
  }
};

export default config;
