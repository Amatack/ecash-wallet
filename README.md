# eCash (XEC) Educational Wallet

A simple eCash wallet built with Vue.js, Vite.js and chronik-client for educational purposes.

## Features

- 12-word mnemonic generation (BIP39)
- Automatic wallet creation on first use
- View XEC balance in real-time using Chronik
- Receive XEC (display address with QR code)
- Send signed transactions to the eCash network
- Local mnemonic storage (localStorage)
- No backend - completely client-side
- Import existing wallets

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── services/
│   └── wallet.js          # Wallet logic (keys, transactions, WebSocket)
├── components/
│   ├── MnemonicDisplay.vue    # Display recovery phrase
│   ├── BalanceDisplay.vue     # Display balance
│   ├── ReceiveAddress.vue     # Display address to receive (with QR)
│   └── SendTransaction.vue    # Form to send XEC
├── App.vue                # Main component
└── main.js                # Entry point
```

## Important Warnings

⚠️ **FOR EDUCATIONAL PURPOSES ONLY**

- This wallet is an educational demonstration
- DO NOT use it to store large amounts of XEC
- The mnemonic is saved in the browser's localStorage
- If you clear browser data, you'll lose access to the wallet
- There is no password recovery or support
- The code is simplified to facilitate learning


## How It Works

1. **Wallet Generation**: A random 128-bit mnemonic (12 words) is generated
2. **Key Derivation**: A seed is derived from the mnemonic, from which the private key is generated
3. **Address**: The public key is calculated and a P2PKH address is generated in eCash format
4. **Balance**: Chronik is queried to get the UTXOs of the address
5. **Sending**: A transaction is built, signed and broadcast using TxBuilder and P2PKHSignatory
6. **Real-time Updates**: WebSocket connection monitors address for incoming transactions

## License

MIT - Free for educational use

## Resources

- [eCash (XEC)](https://e.cash/)
- [Chronik Client Documentation](https://www.npmjs.com/package/chronik-client)
- [ecash-lib](https://www.npmjs.com/package/ecash-lib)
- [BIP39 Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
