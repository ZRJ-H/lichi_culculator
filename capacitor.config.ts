import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.riichi.calculator',
  appName: '雀魂麻将计分器',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
