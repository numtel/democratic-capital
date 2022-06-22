import {delay} from '/utils/index.js';

export default class Wallet {
  constructor() {
    this.web3Modal = null;
    this.web3Provider = null;
    this.connected = false;
    this.accounts = ['0x0000000000000000000000000000000000000000'];
    this.chainId = null;
    this.onStatusChange = null;
    this.init();
  }
  async init() {
    await delay(0);
    app.web3.eth.handleRevert = true;
    if(!this.connected && localStorage.getItem("WEB3_CONNECT_CACHED_PROVIDER")) {
      await this.connect();
      return;
    }

    if(this.web3Provider) {
      this.chainId = '0x' + (await app.web3.eth.getChainId()).toString(16);
      if(this.chainId !== window.config.chain)
        await this.switchChain();
    }
    this.accounts = this.fetchAccounts();
    await this.triggerStatusHandler();
  }
  async triggerStatusHandler() {
    if(typeof this.onStatusChange === 'function') {
      this.onStatusChange(await this.accounts);
    }
  }
  async fetchAccounts() {
    return await new Promise((resolve, reject) => {
      app.web3.eth.getAccounts((error, accounts) => {
        if(error) reject(error);
        else if(accounts.length === 0)
          resolve(['0x0000000000000000000000000000000000000000']);
        else resolve(accounts);
      });
    });
  }
  async send(method) {
    if(!this.connected) {
      await this.connect();
      if(this.connected)
        throw new Error('Please refresh to submit transaction.');
      else throw new Error('Wallet connection declined.');;
    }
    let retval;
    const accounts = await this.accounts;
    document.body.classList.toggle('wait', true);
    try {
      const block = await app.web3.eth.getBlock("latest");
      const gas = await method.estimateGas({ from: accounts[0] });
      retval = await method.send({ from: accounts[0], gas: block.gasLimit });
    } catch(error) {
      document.body.classList.toggle('wait', false);
      const internalPrefix = 'Internal JSON-RPC error.\n';
      if(error.message.startsWith(internalPrefix)) {
        const parsed = JSON.parse(error.message.slice(internalPrefix.length));
        error.reason = parsed.reason || (parsed.data && parsed.data.reason);
      }
      if(error.reason === 'Not Verified'
          || error.message.indexOf('Not Verified') !== -1
          || (error.data && error.data.reason === 'Not Verified')) {
        app.router.goto('/verify');
        throw error;
      } else {
        throw error;
      }
    }
    document.body.classList.toggle('wait', false);
    return retval;
  }
  async connect() {
    const web3Modal = this.web3Modal = new Web3Modal.default({
      cacheProvider: true,
      providerOptions: {
        coinbasewallet: {
          package: CoinbaseWalletSDK,
          options: {
            appName: 'Democratic Capical',
            rpc: window.config.rpc,
            chainId: Number(window.config.chain),
          }
        },
      }
    });
    let provider;
    try {
      provider = this.web3Provider = await web3Modal.connect();
    } catch(e) {
      console.log("Could not get a wallet connection", e);
      return;
    }

    provider.on("accountsChanged", (accounts) => {
      this.init();
    });

    provider.on("chainChanged", (chainId) => {
      this.init();
    });

    provider.on("networkChanged", (networkId) => {
      this.init();
    });

    app.web3 = new Web3(provider);
    this.connected = true;

    await this.init();
  }

  async disconnect() {
    await this.web3Modal.clearCachedProvider();
    window.location.reload();
  }

  async switchChain() {
    let tryAddChain = false;
    try {
      await this.web3Provider.request({
        method: 'wallet_switchEthereumChain',
        params: [ { chainId: window.config.chain } ]
      });
    } catch(error) {
      if(error.message.match(
          /wallet_addEthereumChain|Chain 0x[0-9a-f]+ hasn't been added/)) {
        tryAddChain = true;
      } else {
        alert(error.message);
      }
    }

    if(tryAddChain) {
      try {
        await this.web3Provider.request({
          method: 'wallet_addEthereumChain',
          params: [ {
            chainId: window.config.chain,
            chainName: window.config.chainName,
            nativeCurrency: window.config.nativeCurrency,
            rpcUrls: [ window.config.rpc ],
            blockExplorerUrls: [ window.config.blockExplorer ]
          } ]
        });
      } catch(error) {
        alert(error.message);
      }
    }
  }
}
