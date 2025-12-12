<template>
  <div class="receive-address">
    <h2>Receive XEC</h2>
    <div class="address-card">
      <p class="instruction">
        Share this address to receive eCash (XEC)
      </p>

      <div class="address-box">
        <code class="address-text">{{ address }}</code>
      </div>

      <div class="actions">
        <button @click="copyAddress" class="btn-copy">
          {{ copied ? '✓ Copied' : '📋 Copy Address' }}
        </button>
      </div>

      <div class="qr-container">
        <canvas ref="qrCanvas" class="qr-code"></canvas>
        <p class="qr-caption">
          Scan this QR code to get the address
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import QRCode from 'qrcode';

const props = defineProps({
  address: {
    type: String,
    required: true
  }
});

const copied = ref(false);
const qrCanvas = ref(null);

const generateQR = async () => {
  if (!qrCanvas.value || !props.address) return;
  
  try {
    await QRCode.toCanvas(qrCanvas.value, props.address, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR:', error);
  }
};

// Generate QR code when the component is mounted
onMounted(() => {
  generateQR();
});

// Regenerate QR code if the address changes
watch(() => props.address, () => {
  generateQR();
});

const copyAddress = async () => {
  try {
    await navigator.clipboard.writeText(props.address);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    console.error('Error copying:', error);
    alert('Error copying to clipboard');
  }
};
</script>

<style scoped>
.receive-address {
  margin: 20px 0;
}

h2 {
  color: #333;
  margin-bottom: 15px;
}

.address-card {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 12px;
  border: 2px solid #e9ecef;
}

.instruction {
  text-align: center;
  color: #6c757d;
  margin-bottom: 20px;
  font-size: 14px;
}

.address-box {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  margin-bottom: 15px;
  overflow-x: auto;
}

.address-text {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #212529;
  word-break: break-all;
  display: block;
}

.actions {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.btn-copy {
  background: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.3s;
}

.btn-copy:hover {
  background: #218838;
}

.qr-container {
  background: white;
  padding: 30px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.qr-code {
  border: 4px solid #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-caption {
  color: #6c757d;
  font-size: 13px;
  margin: 0;
  font-style: italic;
}

.qr-canvas {
  margin: 0 auto 10px;
  max-width: 100%;
}
</style>
