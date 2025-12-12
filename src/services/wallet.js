import * as bip39 from 'bip39';
import { ChronikClient } from 'chronik-client';
import {
  Ecc,
  fromHex,
  toHex,
  Script,
  TxBuilder,
  P2PKHSignatory,
  shaRmd160,
  ALL_BIP143,
  Address
} from 'ecash-lib';

// Constants
const STORAGE_KEY = 'ecash_wallet_mnemonic';
const CHRONIK_URL = 'https://chronik-native1.fabien.cash';

// Initialize Chronik
const chronik = new ChronikClient([CHRONIK_URL]);

// WebSocket for real-time updates
let ws = null;
let balanceUpdateCallback = null;

// Global wallet state
let walletState = {
  mnemonic: null,
  privateKey: null,
  publicKey: null,
  address: null,
  balance: 0,
  initialized: false
};

/**
 * Initializes the wallet
 * Note: ecash-lib auto-initializes on import
 */
export async function initializeWallet() {
  try {
    // Check if there's a saved mnemonic
    const savedMnemonic = localStorage.getItem(STORAGE_KEY);

    if (savedMnemonic) {
      await loadWalletFromMnemonic(savedMnemonic);
    }
    
    return walletState;
  } catch (error) {
    console.error('Error initializing wallet:', error);
    throw error;
  }
}

/**
 * Generates a new 12-word mnemonic
 */
export function generateMnemonic() {
  try {
    const mnemonic = bip39.generateMnemonic(128); // 128 bits = 12 words
    return mnemonic;
  } catch (error) {
    console.error('Error generating mnemonic:', error);
    throw error;
  }
}

/**
 * Creates a new wallet with a generated mnemonic
 */
export async function createNewWallet() {
  try {
    console.log('Creating new wallet...');
    const mnemonic = generateMnemonic();
    console.log('Mnemonic generated, loading wallet...');

    await loadWalletFromMnemonic(mnemonic);

    console.log('Saving mnemonic to localStorage...');
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, mnemonic);

    console.log('New wallet created successfully');
    return walletState;
  } catch (error) {
    console.error('Error creating new wallet:', error);
    throw error;
  }
}

/**
 * Loads wallet from a mnemonic
 */
export async function loadWalletFromMnemonic(mnemonic) {
  try {
    console.log('Starting wallet load...');

    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    console.log('Mnemonic validated, generating seed...');
    // Generate seed from mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic);
    console.log('Seed generated');

    // Derive private key (using simple path for education)
    // In production, BIP32/BIP44 would be used
    const seedBytes = new Uint8Array(seed.slice(0, 32)); // First 32 bytes
    console.log('Initializing ECC...');
    const ecc = new Ecc();

    // Create private key from seed
    const privateKey = seedBytes;
    console.log('Deriving public key...');
    const publicKey = ecc.derivePubkey(privateKey);
    console.log('Public key derived');

    // Generate eCash address (P2PKH format)
    console.log('Generating address...');
    const pkHash = shaRmd160(publicKey);
    const script = Script.p2pkh(pkHash);
    const addressObj = Address.fromScript(script);
    const address = addressObj.toString();
    console.log('Address generated:', address);

    walletState = {
      mnemonic,
      privateKey,
      publicKey,
      pkHash,
      address,
      balance: 0,
      initialized: true
    };

    console.log('Wallet state saved, updating balance...');

    // Update balance before returning
    try {
      await updateBalance();
      console.log('Initial balance updated');
    } catch (err) {
      console.warn('Could not update initial balance:', err.message);
      // Not critical, continue
    }

    console.log('Wallet loaded successfully');
    return walletState;
  } catch (error) {
    console.error('Error loading wallet:', error);
    throw error;
  }
}

/**
 * Gets the current wallet balance
 */
export async function updateBalance() {
  try {
    if (!walletState.address) {
      throw new Error('Wallet not initialized');
    }

    console.log('Updating balance for address:', walletState.address);

    try {
      // Use chronik to get UTXOs
      const pkHashHex = toHex(walletState.pkHash);
      console.log('Querying Chronik with pkHash:', pkHashHex);

      const scriptEndpoint = chronik.script('p2pkh', pkHashHex);

      // Add timeout to avoid blocking
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout querying Chronik')), 10000);
      });

      const utxos = await Promise.race([
        scriptEndpoint.utxos(),
        timeoutPromise
      ]);

      console.log('UTXOs received:', utxos);

      // Calculate total balance (only pure XEC, no tokens)
      let totalBalance = 0;
      if (utxos && utxos.utxos && utxos.utxos.length > 0) {
        // Filter only UTXOs without tokens
        const xecOnlyUtxos = utxos.utxos.filter(utxo => !utxo.token);
        
        totalBalance = xecOnlyUtxos.reduce((sum, utxo) => {
          return sum + parseInt(utxo.sats);
        }, 0);

        console.log(`Total UTXOs: ${utxos.utxos.length}, XEC-only UTXOs: ${xecOnlyUtxos.length}`);
      }

      walletState.balance = totalBalance;
      console.log('Balance updated:', totalBalance);
      return totalBalance;
    } catch (error) {
      // If error getting UTXOs (e.g.: address with no funds), balance is 0
      console.warn('Error getting UTXOs, assuming balance 0:', error);
      walletState.balance = 0;
      return 0;
    }
  } catch (error) {
    console.error('Error updating balance:', error);
    walletState.balance = 0;
    return 0;
  }
}

/**
 * Sends a transaction to an address
 */
export async function sendTransaction(toAddress, amount) {
  try {
    if (!walletState.initialized) {
      throw new Error('Wallet not initialized');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > walletState.balance) {
      throw new Error('Insufficient funds');
    }

    // Get available UTXOs
    const scriptEndpoint = chronik.script('p2pkh', toHex(walletState.pkHash));
    const utxosResponse = await scriptEndpoint.utxos();

    if (!utxosResponse.utxos || utxosResponse.utxos.length === 0) {
      throw new Error('No UTXOs available');
    }

    // Filter UTXOs: only use those WITHOUT tokens (pure XEC only)
    const xecOnlyUtxos = utxosResponse.utxos.filter(utxo => {
      // A UTXO has tokens if it has the 'token' property defined
      return !utxo.token;
    });

    console.log(`Total UTXOs: ${utxosResponse.utxos.length}, XEC-only UTXOs: ${xecOnlyUtxos.length}`);

    if (xecOnlyUtxos.length === 0) {
      throw new Error('No XEC UTXOs available (you only have UTXOs with tokens). You need to receive pure XEC to be able to send.');
    }

    // Select necessary UTXOs (simple fee estimation)
    let totalInput = 0n;
    const feePerKb = 1000n; // fee per KB for TxBuilder.sign
    const dustSats = 546n;  // dust limit
    const manualFeeEstimate = 1000n; // margin for UTXO selection
    const selectedUtxos = [];

    for (const utxo of xecOnlyUtxos) {
      selectedUtxos.push(utxo);
      totalInput += BigInt(utxo.sats);
      if (totalInput >= BigInt(amount) + manualFeeEstimate) {
        break;
      }
    }

    if (totalInput < BigInt(amount) + manualFeeEstimate) {
      throw new Error(`Insufficient XEC funds. You need ~${BigInt(amount) + manualFeeEstimate} satoshis but only have ${totalInput} satoshis available in pure XEC.`);
    }

    // Wallet P2PKH script
    const walletP2pkh = Script.p2pkh(walletState.pkHash);

    // Create signatory (included per input according to new API)
    const signatory = P2PKHSignatory(walletState.privateKey, walletState.publicKey, ALL_BIP143);

    // Build inputs array according to new TxBuilder form
    const inputs = selectedUtxos.map(utxo => ({
      input: {
        prevOut: {
          txid: utxo.outpoint.txid,
            outIdx: utxo.outpoint.outIdx,
        },
        signData: {
          sats: BigInt(utxo.sats),
          outputScript: walletP2pkh,
        },
      },
      signatory,
    }));

    // Recipient script
    const toScript = Script.fromAddress(toAddress);

    // Outputs: first the recipient with fixed amount, then the change script (TxBuilder will calculate leftover and omit if dust)
    const outputs = [
      { sats: BigInt(amount), script: toScript },
      walletP2pkh, // automatic change
    ];

    // Create TxBuilder with inputs and outputs
    const txBuilder = new TxBuilder({
      version: 2,
      inputs,
      outputs,
    });

    // Sign and calculate fee/change automatically
    const tx = txBuilder.sign({ feePerKb, dustSats });

    // Serialize transaction
    const rawTx = toHex(tx.ser());

    // Broadcast using chronik
    const response = await chronik.broadcastTx(rawTx);

    // Update balance
    await updateBalance();

    return response.txid;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}

/**
 * Imports a wallet from a user-provided mnemonic
 */
export async function importWallet(mnemonic) {
  try {
    console.log('Importing wallet from mnemonic...');

    // Clean extra spaces from mnemonic
    const cleanMnemonic = mnemonic.trim().replace(/\s+/g, ' ');

    if (!bip39.validateMnemonic(cleanMnemonic)) {
      throw new Error('Invalid mnemonic. Verify that the 12 words are correct.');
    }

    // Load the wallet using the mnemonic
    await loadWalletFromMnemonic(cleanMnemonic);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, cleanMnemonic);

    console.log('Wallet imported successfully');
    return walletState;
  } catch (error) {
    console.error('Error importing wallet:', error);
    throw error;
  }
}

/**
 * Gets the current wallet state
 */
export function getWalletState() {
  return { ...walletState };
}

/**
 * Checks if the wallet is initialized
 */
export function isWalletInitialized() {
  return walletState.initialized;
}

/**
 * Checks if there is a stored wallet
 */
export function hasStoredWallet() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Sets up a callback to receive balance updates
 */
export function onBalanceUpdate(callback) {
  balanceUpdateCallback = callback;
}

/**
 * Starts WebSocket subscription for real-time updates
 */
export async function startWebSocketSubscription() {
  try {
    if (!walletState.initialized || !walletState.pkHash) {
      console.error('❌ Cannot start WebSocket: wallet not initialized');
      console.log('Estado actual:', { 
        initialized: walletState.initialized, 
        hasPkHash: !!walletState.pkHash,
        hasAddress: !!walletState.address 
      });
      return false;
    }

    // Si ya existe una conexión, cerrarla primero
    if (ws) {
      console.log('WebSocket existente detectado, cerrando...');
      await stopWebSocketSubscription();
    }

    const pkHashHex = toHex(walletState.pkHash);
    console.log('🔌 Starting WebSocket subscription...');
    console.log('📍 Address:', walletState.address);
    console.log('🔑 PKHash:', pkHashHex);

    // Create WebSocket
    ws = chronik.ws({
      onMessage: async (msg) => {
        console.log('📨 WebSocket message received:', JSON.stringify(msg, null, 2));
        
        // Chronik messages have:
        // - msg.type: general type ("Tx", "Block", etc.)
        // - msg.msgType: specific type ("TX_ADDED_TO_MEMPOOL", "TX_CONFIRMED", "BLK_CONNECTED", etc.)
        
        // Transaction added to mempool or confirmed
        if (msg.msgType === 'TX_ADDED_TO_MEMPOOL' || msg.msgType === 'TX_CONFIRMED') {
          console.log('💰 Transaction detected for our address!');
          console.log('   - General type:', msg.type);
          console.log('   - Specific type:', msg.msgType);
          console.log('   - TXID:', msg.txid);
          console.log('   Updating balance...');
          
          await updateBalance();
          
          // Notify callback if configured
          if (balanceUpdateCallback) {
            balanceUpdateCallback(walletState.balance);
          }
        }

        // Transaction finalized (also update)
        if (msg.msgType === 'TX_FINALIZED') {
          console.log('✅ Transaction finalized!');
          console.log('   - TXID:', msg.txid);
          console.log('   - Reason:', msg.finalizationReasonType);
          console.log('   Updating balance...');
          
          await updateBalance();
          
          if (balanceUpdateCallback) {
            balanceUpdateCallback(walletState.balance);
          }
        }

        // New block connected
        if (msg.msgType === 'BLK_CONNECTED' || msg.msgType === 'BLK_FINALIZED') {
          console.log('⛏️ New block!');
          console.log('   - Type:', msg.msgType);
          if (msg.blockHash) console.log('   - Hash:', msg.blockHash);
          if (msg.blockHeight) console.log('   - Height:', msg.blockHeight);
          console.log('   Updating balance...');
          
          await updateBalance();
          
          if (balanceUpdateCallback) {
            balanceUpdateCallback(walletState.balance);
          }
        }
      },
      onReconnect: (e) => {
        console.log('🔄 Reconnecting WebSocket...', e);
      },
      onConnect: (e) => {
        console.log('✅ WebSocket connected!', e);
      },
      onEnd: (e) => {
        console.log('🔌 WebSocket disconnected', e);
      },
      // Keep connection alive
      keepAlive: true,
    });

    // Wait for connection
    console.log('⏳ Waiting for WebSocket connection...');
    try {
      await ws.waitForOpen();
      console.log('✅ WebSocket connected and ready');
    } catch (error) {
      console.error('❌ Error waiting for WebSocket connection:', error);
      throw error;
    }

    // Subscribe to wallet script (to receive transaction notifications)
    try {
      ws.subscribeToScript('p2pkh', pkHashHex);
      console.log('✅ Subscribed to P2PKH script:', pkHashHex);
      console.log('👂 Listening for transactions to address:', walletState.address);
    } catch (error) {
      console.error('❌ Error subscribing to script:', error);
      throw error;
    }

    // Also subscribe to blocks to detect confirmations
    try {
      ws.subscribeToBlocks();
      console.log('✅ Subscribed to blocks');
    } catch (error) {
      console.error('❌ Error subscribing to blocks:', error);
      // Not critical, continue
    }

    console.log('🎉 WebSocket fully configured and listening!');
    return true;
  } catch (error) {
    console.error('❌ Error starting WebSocket:', error);
    return false;
  }
}

/**
 * Stops WebSocket subscription
 */
export async function stopWebSocketSubscription() {
  try {
    if (ws) {
      console.log('Stopping WebSocket subscription...');
      
      // Unsubscribe before closing
      if (walletState.pkHash) {
        const pkHashHex = toHex(walletState.pkHash);
        ws.unsubscribeFromScript('p2pkh', pkHashHex);
      }

      // Close WebSocket
      ws.close();
      ws = null;
      console.log('WebSocket closed');
    }
  } catch (error) {
    console.error('Error stopping WebSocket:', error);
  }
}

/**
 * Checks WebSocket status
 */
export function getWebSocketStatus() {
  return {
    isConnected: ws !== null,
    walletInitialized: walletState.initialized,
    hasAddress: !!walletState.address,
    hasPkHash: !!walletState.pkHash,
    address: walletState.address,
  };
}
