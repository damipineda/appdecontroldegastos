import type { CapacitorConfig } from '@capacitor/cli';

const liveUrl = process.env.CAP_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.damipineda.finanzas',
  appName: 'Finanzas Personales',
  webDir: 'www',
  ...(liveUrl
    ? {
        server: {
          url: liveUrl,
          cleartext: false
        }
      }
    : {})
};

export default config;
