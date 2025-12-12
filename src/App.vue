<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import MnemonicDisplay from './components/MnemonicDisplay.vue';
import BalanceDisplay from './components/BalanceDisplay.vue';
import ReceiveAddress from './components/ReceiveAddress.vue';
import SendTransaction from './components/SendTransaction.vue';
import {
  initializeWallet,
  createNewWallet,
  importWallet,
  hasStoredWallet,
  getWalletState,
  updateBalance,
  sendTransaction,
  onBalanceUpdate,
  startWebSocketSubscription,
  stopWebSocketSubscription,
  getWebSocketStatus
} from './services/wallet.js';

// Estado de la aplicación
const loading = ref(true);
const walletInitialized = ref(false);
const showMnemonic = ref(false);
const showImportModal = ref(false);
const importMnemonicInput = ref('');
const wallet = ref({
  mnemonic: '',
  address: '',
  balance: 0
});
const error = ref('');

// Inicializar la aplicación
onMounted(async () => {
  try {
    await initializeWallet();

    if (hasStoredWallet()) {
      // Load existing wallet
      const state = getWalletState();
      wallet.value = state;
      walletInitialized.value = state.initialized;

      // Set up callback for balance updates
      onBalanceUpdate((newBalance) => {
        console.log('Balance automatically updated:', newBalance);
        // Create a new object so Vue detects the reactive change
        wallet.value = { ...wallet.value, balance: newBalance };
      });

      // Start WebSocket subscription for automatic updates
      if (state.initialized) {
        console.log('🚀 Existing wallet detected, starting WebSocket...');
        const statusBefore = getWebSocketStatus();
        console.log('📊 Status before starting WebSocket:', statusBefore);
        
        const wsStarted = await startWebSocketSubscription();
        
        if (wsStarted) {
          console.log('✅✅✅ WebSocket started successfully');
        } else {
          console.error('❌❌❌ Could not start WebSocket');
        }
      }
    }
  } catch (err) {
    console.error('Error initializing:', err);
    error.value = 'Error initializing wallet: ' + err.message;
  } finally {
    loading.value = false;
  }
});

// Create new wallet
const handleCreateWallet = async () => {
  try {
    loading.value = true;
    error.value = '';

    const state = await createNewWallet();
    wallet.value = state;
    walletInitialized.value = true;
    showMnemonic.value = true;

    // Set up callback for balance updates
    onBalanceUpdate((newBalance) => {
      console.log('Balance automatically updated:', newBalance);
      // Create a new object so Vue detects the reactive change
      wallet.value = { ...wallet.value, balance: newBalance };
    });

    // Wait a moment to ensure everything is initialized
    console.log('⏳ Waiting 500ms before starting WebSocket...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check status before starting WebSocket
    const statusBefore = getWebSocketStatus();
    console.log('📊 Status before starting WebSocket:', statusBefore);

    // Start WebSocket subscription
    console.log('🚀 Starting WebSocket for new wallet...');
    const wsStarted = await startWebSocketSubscription();
    
    if (wsStarted) {
      console.log('✅✅✅ WebSocket started successfully for new wallet');
      const statusAfter = getWebSocketStatus();
      console.log('📊 Status after starting WebSocket:', statusAfter);
    } else {
      console.error('❌❌❌ Could not start WebSocket');
      const statusAfter = getWebSocketStatus();
      console.log('📊 Status after failing WebSocket:', statusAfter);
    }
  } catch (err) {
    console.error('Error creating wallet:', err);
    error.value = 'Error creating wallet: ' + err.message;
  } finally {
    loading.value = false;
  }
};

// Import existing wallet
const handleImportWallet = async () => {
  try {
    if (!importMnemonicInput.value.trim()) {
      error.value = 'Please enter a valid mnemonic';
      return;
    }

    loading.value = true;
    error.value = '';

    const state = await importWallet(importMnemonicInput.value);
    wallet.value = state;
    walletInitialized.value = true;
    showImportModal.value = false;
    importMnemonicInput.value = '';

    // Set up callback for balance updates
    onBalanceUpdate((newBalance) => {
      console.log('Balance automatically updated:', newBalance);
      // Create a new object so Vue detects the reactive change
      wallet.value = { ...wallet.value, balance: newBalance };
    });

    // Wait a moment to ensure everything is initialized
    console.log('⏳ Waiting 500ms before starting WebSocket...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check status before starting WebSocket
    const statusBefore = getWebSocketStatus();
    console.log('📊 Status before starting WebSocket:', statusBefore);

    // Start WebSocket subscription
    console.log('🚀 Starting WebSocket for imported wallet...');
    const wsStarted = await startWebSocketSubscription();
    
    if (wsStarted) {
      console.log('✅✅✅ WebSocket started successfully for imported wallet');
      const statusAfter = getWebSocketStatus();
      console.log('📊 Status after starting WebSocket:', statusAfter);
    } else {
      console.error('❌❌❌ Could not start WebSocket');
      const statusAfter = getWebSocketStatus();
      console.log('📊 Status after failing WebSocket:', statusAfter);
    }
  } catch (err) {
    console.error('Error importing wallet:', err);
    error.value = 'Error importing wallet: ' + err.message;
  } finally {
    loading.value = false;
  }
};

// Close import modal
const closeImportModal = () => {
  showImportModal.value = false;
  importMnemonicInput.value = '';
  error.value = '';
};

// Update balance
const handleRefreshBalance = async () => {
  try {
    const balance = await updateBalance();
    wallet.value.balance = balance;
  } catch (err) {
    console.error('Error updating balance:', err);
    error.value = 'Error updating balance: ' + err.message;
  }
};

// Send transaction
const handleSendTransaction = async (data) => {
  try {
    const txid = await sendTransaction(data.toAddress, data.amount);

    // Update balance after sending
    const balance = await updateBalance();
    wallet.value.balance = balance;

    return txid;
  } catch (err) {
    console.error('Error sending transaction:', err);
    throw err;
  }
};

// Close mnemonic view
const closeMnemonic = () => {
  showMnemonic.value = false;
};

// Cleanup when unmounting component
onBeforeUnmount(async () => {
  console.log('Unmounting component, closing WebSocket...');
  await stopWebSocketSubscription();
});
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>⚡ eCash Wallet (XEC)</h1>
    </header>

    <main class="container">
      <!-- Loading -->
      <div v-if="loading" class="loading">
        <p>⏳ Loading...</p>
      </div>

      <!-- Error -->
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <!-- No wallet -->
      <div v-if="!loading && !walletInitialized" class="welcome">
        <div class="welcome-card">
          <h2>Welcome</h2>
          <p>You don't have a wallet created yet.</p>
          <p class="warning-text">
            ⚠️ This is an educational wallet. Don't use it for large amounts of real funds.
          </p>
          <div class="button-group">
            <button @click="handleCreateWallet" class="btn-create">
              ✨ Create New Wallet
            </button>
            <button @click="showImportModal = true" class="btn-import">
              📥 Import Wallet
            </button>
          </div>
        </div>
      </div>

      <!-- Import modal -->
      <div v-if="showImportModal" class="mnemonic-modal">
        <div class="modal-content">
          <h2>Import Wallet</h2>
          <p class="import-instructions">
            Enter your 12-word recovery phrase to import an existing wallet.
          </p>
          
          <div class="import-form">
            <label for="mnemonic-input">Recovery Phrase (12 words)</label>
            <textarea
              id="mnemonic-input"
              v-model="importMnemonicInput"
              placeholder="word1 word2 word3 ..."
              rows="4"
              class="mnemonic-input"
            ></textarea>
          </div>

          <div class="modal-buttons">
            <button @click="handleImportWallet" class="btn-confirm">
              Import
            </button>
            <button @click="closeImportModal" class="btn-cancel">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Wallet initialized -->
      <div v-if="!loading && walletInitialized" class="wallet">
        <!-- Show mnemonic if new -->
        <div v-if="showMnemonic" class="mnemonic-modal">
          <div class="modal-content">
            <MnemonicDisplay :mnemonic="wallet.mnemonic" />
            <button @click="closeMnemonic" class="btn-close-mnemonic">
              Continue to Wallet
            </button>
          </div>
        </div>

        <!-- Wallet dashboard -->
        <div v-else>
          <BalanceDisplay
            :balance="wallet.balance"
            @refresh="handleRefreshBalance"
          />

          <ReceiveAddress :address="wallet.address" />

          <SendTransaction
            :balance="wallet.balance"
            @send="handleSendTransaction"
          />

          <!-- Mnemonic section (always available) -->
          <div class="mnemonic-section">
            <h3>Recovery Phrase</h3>
            <button @click="showMnemonic = true" class="btn-show-mnemonic">
              🔑 View Mnemonic
            </button>
          </div>

          <!-- Educational notice -->
          <div class="educational-notice">
            <p>
              📚 This is an educational wallet created for learning purposes.
              Don't use it to store large amounts of XEC.
            </p>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p>Built with Vue.js, Vite.js and chronik-client</p>
      <p class="footer-note">For educational purposes only</p>
      <a 
        href="https://github.com/Amatack/ecash-wallet" 
        target="_blank" 
        rel="noopener noreferrer"
        class="github-link"
        title="View source code on GitHub"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        <span>View on GitHub</span>
      </a>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f7fa;
  color: #333;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 32px;
}

.subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.container {
  flex: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
}

.error-banner {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.welcome {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.welcome-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 500px;
}

.welcome-card h2 {
  margin-bottom: 15px;
  color: #333;
}

.welcome-card p {
  margin-bottom: 15px;
  color: #6c757d;
}

.warning-text {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
}

.btn-create {
  background: #28a745;
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  margin-top: 20px;
  transition: background 0.3s;
}

.btn-create:hover {
  background: #218838;
}

.btn-import {
  background: #007bff;
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  margin-top: 20px;
  transition: background 0.3s;
}

.btn-import:hover {
  background: #0056b3;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.import-instructions {
  margin: 15px 0;
  color: #6c757d;
  font-size: 14px;
  text-align: left;
}

.import-form {
  margin: 20px 0;
  text-align: left;
}

.import-form label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.mnemonic-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: monospace;
  resize: vertical;
  transition: border-color 0.3s;
}

.mnemonic-input:focus {
  outline: none;
  border-color: #007bff;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-confirm {
  flex: 1;
  background: #28a745;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.3s;
}

.btn-confirm:hover {
  background: #218838;
}

.btn-cancel {
  flex: 1;
  background: #6c757d;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.3s;
}

.btn-cancel:hover {
  background: #5a6268;
}

.mnemonic-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.btn-close-mnemonic {
  width: 100%;
  background: #007bff;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  margin-top: 20px;
  transition: background 0.3s;
}

.btn-close-mnemonic:hover {
  background: #0056b3;
}

.wallet {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.mnemonic-section {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.mnemonic-section h3 {
  margin-bottom: 15px;
  color: #333;
}

.btn-show-mnemonic {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.3s;
}

.btn-show-mnemonic:hover {
  background: #5a6268;
}

.educational-notice {
  margin-top: 30px;
  background: #e7f3ff;
  border: 2px solid #b3d7ff;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.educational-notice p {
  color: #004085;
  font-size: 14px;
  margin: 0;
}

.footer {
  background: #343a40;
  color: white;
  text-align: center;
  padding: 20px;
  margin-top: 40px;
}

.footer p {
  margin: 5px 0;
  font-size: 13px;
}

.footer-note {
  opacity: 0.7;
  font-size: 12px;
}

.github-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: white;
  text-decoration: none;
  margin-top: 15px;
  padding: 8px 16px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
  font-size: 14px;
}

.github-link:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.github-link svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 24px;
  }

  .container {
    padding: 15px;
  }

  .wallet {
    padding: 20px;
  }
}
</style>
