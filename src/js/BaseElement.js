import {html, css, LitElement} from 'lit';
import {app} from './Web3App.js';
import abiDecoder from 'abi-decoder';

export class BaseElement extends LitElement {
  childTypes = {
    ElectionsByMedian: {
      factory: 'ElectionsByMedianFactory',
      tpl: parent => html`<new-elections-by-median groupAddress="${parent.groupAddress}"></new-elections-by-median>`,
    },
    ElectionsSimple: {
      factory: 'ElectionsSimpleFactory',
      tpl: parent => html`<new-elections-simple groupAddress="${parent.groupAddress}"></new-elections-simple>`,
    },
    ElectionsSimpleQuadratic: {
      factory: 'ElectionsSimpleQuadraticFactory',
      tpl: parent => html`<new-elections-simple-quadratic groupAddress="${parent.groupAddress}"></new-elections-simple-quadratic>`,
    },
    OpenRegistrations: {
      factory: 'OpenRegistrationsFactory',
      tpl: parent => html`<new-open-registrations></new-open-registrations>`,
    },
    OpenUnregistrations: {
      factory: 'OpenUnregistrationsFactory',
      tpl: parent => html`<new-open-unregistrations></new-open-unregistrations>`,
    },
    ERC20Mintable: {
      factory: 'ERC20MintableFactory',
      tpl: parent => html`<new-erc20-mintable></new-erc20-mintable>`,
    },
    MemberTokenEmissions: {
      factory: 'MemberTokenEmissionsFactory',
      tpl: parent => html`<new-member-token-emissions groupAddress="${parent.groupAddress}"></new-member-token-emissions>`,
    },
    RegistrationsByElection: {
      factory: 'RegistrationsByElectionFactory',
      tpl: parent => html`<new-registrations-by-election groupAddress="${parent.groupAddress}"></new-registrations-by-election>`,
    },
    RegistrationsByFee: {
      factory: 'RegistrationsByFeeFactory',
      tpl: parent => html`<new-registrations-by-fee groupAddress="${parent.groupAddress}"></new-registrations-by-fee>`,
    },
    Fundraiser: {
      factory: 'FundraiserFactory',
      tpl: parent => html`<new-fundraiser groupAddress="${parent.groupAddress}"></new-fundraiser>`,
    },
  };
  constructor() {
    super();
  }
  createRenderRoot() {
    return this;
  }
  async route(event) {
    event.preventDefault && event.preventDefault();
    const newPath = typeof event === 'string' ? event : event.target.attributes.href.value;
    window.history.pushState({}, '', newPath);
    document.querySelector('app-router').path = newPath;
    document.querySelector('app-heading').path = newPath;
    window.scrollTo(0, 0);
  }
  open(event) {
    event.preventDefault && event.preventDefault();
    const newPath = typeof event === 'string' ? event : event.target.href || event.target.attributes.href.value;
    window.open(newPath);
  }
  explorer(address) {
    return window.config.blockExplorer + '/address/' + address;
  }
  async loadAbi(abiFilename, onlyInvokable) {
    const response = await fetch('/' + abiFilename + '.abi');
    const abi = await response.json();
    if(onlyInvokable) {
      return abi.filter(method =>
        method.stateMutability === 'nonpayable' && ('name' in method));
    }
    return abi;
  }
  async decodeAbiFunction(abiFilename, data) {
    const groupAbi = await this.loadAbi(abiFilename);
    abiDecoder.removeABI(abiDecoder.getABIs());
    abiDecoder.addABI(groupAbi);
    return abiDecoder.decodeMethod(data)
  }
  async loadContract(abiFilename, address) {
    const abi = await this.loadAbi(abiFilename);
    await app.initialized;
    return new app.web3.eth.Contract(abi, address);
  }
  async allGroupChildren(groupAddress) {
    const out = {}
    for(let typeName of Object.keys(this.childTypes)) {
      const children = await this.childrenOfType(groupAddress, typeName);
      if(children.length) {
        out[typeName] = children;
      }
    }
    return out;
  }
  async childrenOfType(groupAddress, typeName) {
    const out = [];
    const factoryName = this.childTypes[typeName].factory;
    const factory = await this.loadContract(factoryName, window.config.contracts[factoryName].address);
    const count = Number(await factory.methods.groupCount(groupAddress).call());
    if(count) {
      for(let i = 0; i < count; i++) {
        const thisChild = await factory.methods.deployedByGroup(groupAddress, i).call();
        out.push(thisChild);
      }
    }
    return out;
  }
  async childType(address) {
    const interfaceIdContract = await this.loadContract('IThisInterfaceId', address);
    let interfaceId;
    try {
      // estimateGas first because this error can be caught? metamask/web3js issue?
      await interfaceIdContract.methods.thisInterfaceId().estimateGas();
      interfaceId = await interfaceIdContract.methods.thisInterfaceId().call();
    } catch(error) {
      // Doesn't matter, just checking
    }
    let interfaceName;
    if(interfaceId in window.config.interfaceIds) {
      interfaceName = window.config.interfaceIds[interfaceId];
    }
    return interfaceName;
  }
  isAddress(address) {
    return typeof address === 'string' && address.match(/^0x[a-f0-9]{40}$/i);
  }
  ellipseAddress(address) {
    return address.slice(0, 6) + '...' + address.slice(-4);
  }
  async send(method) {
    if(!app.connected) {
      await app.connect();
      if(!app.connected) {
        alert('Wallet Connection Required');
        return;
      }
    }
    let retval;
    try {
      const gas = await method.estimateGas({ from: app.accounts[0] });
      retval = await method.send({ from: app.accounts[0], gas });
    } catch(error) {
      const internalPrefix = 'Internal JSON-RPC error.\n';
      if(error.message.startsWith(internalPrefix)) {
        const parsed = JSON.parse(error.message.slice(internalPrefix.length));
        error.reason = parsed.reason || (parsed.data && parsed.data.reason);
      }
      if(error.reason === 'Not Verified'
          || error.message.indexOf('Not Verified') !== -1
          || (error.data && error.data.reason === 'Not Verified')) {
        this.route('/verify');
        throw error;
      } else {
        throw error;
      }
    }
    return retval;
  }
  displayError(error) {
    console.error(error);
    alert(error.reason || (error.data && error.data.reason) || error.message || error);
  }
}

