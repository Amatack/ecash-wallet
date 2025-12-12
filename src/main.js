import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { Buffer } from 'buffer'

// Polyfill para Buffer en el navegador
window.Buffer = Buffer
globalThis.Buffer = Buffer

createApp(App).mount('#app')
