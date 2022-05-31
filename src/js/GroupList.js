import {html, css} from './lit-all.min.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';

export class GroupList extends BaseElement {
  static properties = {
    _groups: {state: true},
  };
  constructor() {
    super();
    this.contract = this.loadContract();
    this._groups = [];
    this.fetchList();
  }
  async loadContract() {
    const response = await fetch('/GroupList.abi');
    const abi = await response.json();
    await app.initialized;
    return new app.web3.eth.Contract(
      abi,
      window.config.contracts.GroupList.address);
  }
  render() {
    return html`
      <button @click="${this.createGroup}">Create New Group</button>
      <ul>
        ${this._groups.map(group => html`
          <li><a @click="${this.route}" href="/group/${group}">${group}</a></li>
        `)}
      </ul>
    `;
  }
  async fetchList() {
    const contract = await this.contract;
    this._groups.splice(0, this._groups.length);
    let fetchError = false;
    while(!fetchError) {
      try {
        this._groups.push(
          await contract.methods.groups(this._groups.length).call());
      } catch(error) {
        fetchError = true;
      }
    }
    this.requestUpdate();
  }
  async createGroup() {
    const contract = await this.contract;
    await app.send(contract.methods.createGroup(
      window.config.contracts.MockVerification.address));
    await this.fetchList();
  }
}

customElements.define('group-list', GroupList);
