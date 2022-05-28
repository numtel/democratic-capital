
class DemocraticCapitalApp {
  constructor(element) {
    this.element = element;
    this.web3 = null;
    this.web3Modal = null;
    this.web3Provider = null;
    this.chainId = null;
    this.contracts = {};
    this.abi = {
      GroupList: null,
      VerifiedGroup: null,
      TestChild: null,
    };
    this.bytecode = {
      TestChild: null,
    };
    this.groups = null;
    this.accounts = [];
    this.connected = false;
  }
  async init() {
    if(!this.web3 && localStorage.getItem("WEB3_CONNECT_CACHED_PROVIDER")) {
      await this.connect();
      return;
    } else {
      // Connect to rpc directly if no wallet connected
      this.web3 = new Web3(window.config.rpc);
    }

    if(this.web3Provider) {
      this.connected = true;
      this.chainId = '0x' + (await this.web3.eth.getChainId()).toString(16);
      if(this.chainId !== window.config.chain)
        await this.switchChain();

      this.accounts = await new Promise((resolve, reject) => {
        this.web3.eth.getAccounts((error, accounts) => {
          if(error) reject(error);
          else resolve(accounts);
        });
      });
    } else {
      this.connected = false;
    }

    if(this.groups === null) {
      for(let contractName of Object.keys(this.abi)) {
        const response = await fetch(contractName + '.abi');
        this.abi[contractName] = await response.json();
      }
      for(let contractName of Object.keys(this.bytecode)) {
        this.bytecode[contractName] = async () => {
          const response = await fetch(contractName + '.bin');
          const bytecode = await response.text();
          this.bytecode[contractName] = Promise.resolve(bytecode);
          return bytecode;
        };
      }
      this.groups = new GroupList(this);
    }
    window.eventHandlers.splice(0, window.eventHandlers.length);
    this.element.innerHTML = await window.templates.index.call(this);
  }
  async loadContract(abiUrl, address) {
    const response = await fetch(abiUrl);
    const abi = await response.json();
    return new this.web3.eth.Contract(abi, address);
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

    this.web3 = new Web3(provider);
    this.web3.eth.handleRevert = true;

    await this.init();
  }

  async disconnect() {
    await this.web3Modal.clearCachedProvider();
    window.location.reload();
  }

  async switchChain() {
    if(!this.web3) return;
    let tryAddChain = false;
    try {
      await this.web3Provider.request({
        method: 'wallet_switchEthereumChain',
        params: [ { chainId: window.config.chain } ]
      });
    } catch(error) {
      if(error.message.match(/wallet_addEthereumChain|Chain 0x[0-9a-f]+ hasn't been added/)) {
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
  async send(method) {
    // TODO prompt for wallet connection
    // TODO prompt if account not verified
    if(!this.connected)
      throw new Error('Wallet not connected');
    return method.send({ from: this.accounts[0], gas: 20000000 });
  }
}

window.app = new DemocraticCapitalApp(document.getElementById('app'));
app.init();
