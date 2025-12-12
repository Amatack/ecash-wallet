<template>
  <div class="balance-display">
    <div class="balance-header">
      <h2>Balance</h2>
      <div class="live-indicator" title="Real-time updates active">
        <span class="pulse"></span>
        Online
      </div>
    </div>
    <div class="balance-card">
      <div class="balance-amount">
        <span class="amount">{{ formattedBalance }}</span>
        <span class="currency">XEC</span>
      </div>
      <div class="balance-subtext">
        {{ balanceSatoshis }} satoshis
      </div>
      <button @click="refreshBalance" class="btn-refresh" :disabled="loading">
        {{ loading ? '🔄 Updating...' : '🔄 Update manually' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  balance: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['refresh']);

const loading = ref(false);

const balanceSatoshis = computed(() => {
  return props.balance.toLocaleString();
});

const formattedBalance = computed(() => {
  // On eCash, 1 XEC = 100 satoshis
  const xec = props.balance / 100;
  return xec.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
});

const refreshBalance = async () => {
  loading.value = true;
  try {
    await emit('refresh');
  } finally {
    setTimeout(() => {
      loading.value = false;
    }, 500);
  }
};
</script>

<style scoped>
.balance-display {
  margin: 20px 0;
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.balance-header h2 {
  color: #333;
  margin: 0;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #e7f9f0;
  color: #28a745;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #b3e5c7;
}

.pulse {
  width: 8px;
  height: 8px;
  background: #28a745;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

h2 {
  color: #333;
  margin-bottom: 15px;
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  color: white;
}

.balance-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 10px;
}

.amount {
  font-size: 48px;
  font-weight: 700;
  margin-right: 10px;
}

.currency {
  font-size: 24px;
  font-weight: 600;
  opacity: 0.9;
}

.balance-subtext {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 20px;
}

.btn-refresh {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.5);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-refresh:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.8);
}

.btn-refresh:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
