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
  async send(method) {
    // TODO prompt for wallet connection
    // TODO prompt if account not verified
    if(!app.connected)
      throw new Error('Wallet not connected');
    return await method.send({ from: app.accounts[0], gas: 20000000 });
  }
}

