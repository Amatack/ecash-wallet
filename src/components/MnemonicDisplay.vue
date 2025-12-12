<template>
  <div class="mnemonic-display">
    <h2>Your Recovery Phrase (Mnemonic)</h2>
    <div class="warning">
      <p>⚠️ IMPORTANT: Keep these words in a safe place.</p>
      <p>You'll need this phrase to get your wallet back..</p>
      <p>Never share these words with anyone.</p>
    </div>

    <div class="mnemonic-words" v-if="mnemonic">
      <div
        v-for="(word, index) in mnemonicWords"
        :key="index"
        class="word-item"
      >
        <span class="word-number">{{ index + 1 }}</span>
        <span class="word-text">{{ word }}</span>
      </div>
    </div>

    <div class="actions">
      <button @click="copyToClipboard" class="btn-copy">
        {{ copied ? '✓ Copied' : '📋 Copy' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  mnemonic: {
    type: String,
    required: true
  }
});

const copied = ref(false);

const mnemonicWords = computed(() => {
  return props.mnemonic.split(' ');
});

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.mnemonic);
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
.mnemonic-display {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

h2 {
  color: #333;
  margin-bottom: 15px;
}

.warning {
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.warning p {
  margin: 5px 0;
  color: #856404;
  font-size: 14px;
}

.mnemonic-words {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
  background: white;
  padding: 20px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.word-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.word-number {
  font-size: 12px;
  color: #6c757d;
  margin-right: 8px;
  min-width: 20px;
}

.word-text {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #212529;
}

.actions {
  display: flex;
  justify-content: center;
}

.btn-copy {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.3s;
}

.btn-copy:hover {
  background: #0056b3;
}
</style>
