import {html, css, LitElement} from 'lit';
import {app} from './Web3App.js';

export class BaseElement extends LitElement {
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
  async loadAbi(abiFilename) {
    const response = await fetch('/' + abiFilename + '.abi');
    return await response.json();
  }
  async loadContract(abiFilename, address) {
    const abi = await this.loadAbi(abiFilename);
    await app.initialized;
    return new app.web3.eth.Contract(abi, address);
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
          || (error.data && error.data.reason === 'Not Verified')) {
        this.route('/verify');
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

