import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // server: {
  //   host: '0.0.0.0', // เปิดให้เข้าถึงผ่าน IP Address
  //   port: 3000
  // },
  base: '/SmartparkingV3/',
})
