<template>
  <div class="send-transaction">
    <h2>Send XEC</h2>
    <div class="send-card">
      <form @submit.prevent="handleSend">
        <div class="form-group">
          <label for="toAddress">Destination Address</label>
          <input
            id="toAddress"
            v-model="toAddress"
            type="text"
            placeholder="ecash:qp..."
            required
            :disabled="sending"
            class="input-field"
          />
        </div>

        <div class="form-group">
          <label for="amount">Amount (XEC)</label>
          <div class="amount-input-wrapper">
            <input
              id="amount"
              v-model.number="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              required
              :disabled="sending"
              class="input-field"
            />
            <button
              type="button"
              @click="setMaxAmount"
              :disabled="sending || maxXEC <= 0"
              class="btn-max"
              title="Set maximum amount"
            >
              MAX
            </button>
          </div>
          <p class="helper-text">
            {{ amountInSatoshis }} satoshis
            <span v-if="maxXEC > 0">(Max: {{ maxXEC }} XEC)</span>
          </p>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="success" class="success-message">
          <p>✅ Transaction sent successfully!</p>
          <p class="txid">TXID: {{ txid }}</p>
        </div>

        <button
          type="submit"
          class="btn-send"
          :disabled="sending || !canSend"
        >
          {{ sending ? '📤 Sending...' : '📤 Send' }}
        </button>
      </form>
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

const emit = defineEmits(['send']);

const toAddress = ref('');
const amount = ref(0);
const sending = ref(false);
const error = ref('');
const success = ref(false);
const txid = ref('');

const amountInSatoshis = computed(() => {
  return Math.floor(amount.value * 100);
});

const maxXEC = computed(() => {
  // Balance in satoshis less fee
  const maxSatoshis = props.balance - 1000;
  return maxSatoshis > 0 ? (maxSatoshis / 100).toFixed(2) : 0;
});

const canSend = computed(() => {
  return (
    toAddress.value.trim() !== '' &&
    amount.value > 0 &&
    amountInSatoshis.value + 1000 <= props.balance
  );
});

const setMaxAmount = () => {
  amount.value = parseFloat(maxXEC.value);
};

const handleSend = async () => {
  error.value = '';
  success.value = false;
  txid.value = '';

  // Validations
  if (!toAddress.value.startsWith('ecash:')) {
    error.value = 'The address must begin with "ecash:"';
    return;
  }

  if (amount.value <= 0) {
    error.value = 'The amount must be greater than 0';
    return;
  }

  if (amountInSatoshis.value + 1000 > props.balance) {
    error.value = 'Insufficient funds (includes network fee of 1000 satoshis)';
    return;
  }

  sending.value = true;

  try {
    const result = await emit('send', {
      toAddress: toAddress.value,
      amount: amountInSatoshis.value
    });

    // Assuming the event returns the txid
    if (result) {
      success.value = true;
      txid.value = result;

      // Clear form after 3 seconds
      setTimeout(() => {
        toAddress.value = '';
        amount.value = 0;
        success.value = false;
        txid.value = '';
      }, 5000);
    }
  } catch (err) {
    error.value = err.message || 'Error sending transaction';
  } finally {
    sending.value = false;
  }
};
</script>

<style scoped>
.send-transaction {
  margin: 20px 0;
}

h2 {
  color: #333;
  margin-bottom: 15px;
}

.send-card {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 12px;
  border: 2px solid #e9ecef;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #495057;
  font-weight: 600;
  font-size: 14px;
}

.amount-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.amount-input-wrapper .input-field {
  flex: 1;
}

.btn-max {
  background: #28a745;
  color: white;
  border: none;
  padding: 0 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.3s;
  white-space: nowrap;
  min-width: 60px;
}

.btn-max:hover:not(:disabled) {
  background: #218838;
  transform: scale(1.05);
}

.btn-max:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.5;
}

.input-field {
  width: 100%;
  padding: 12px;
  border: 2px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
  font-family: 'Courier New', monospace;
}

.input-field:focus {
  outline: none;
  border-color: #007bff;
}

.input-field:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.helper-text {
  margin-top: 5px;
  font-size: 12px;
  color: #6c757d;
}



.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.success-message {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.success-message p {
  margin: 5px 0;
}

.txid {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  word-break: break-all;
}

.btn-send {
  width: 100%;
  background: #007bff;
  color: white;
  border: none;
  padding: 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.3s;
}

.btn-send:hover:not(:disabled) {
  background: #0056b3;
}

.btn-send:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
