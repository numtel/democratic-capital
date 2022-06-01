import {html, css} from './lit-all.min.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';

export class GroupList extends BaseElement {
  static properties = {
    _groups: {state: true},
    _loading: {state: true},
  };
  constructor() {
    super();
    this._loading = true;
    this.contract = null;
    this._groups = [];
  }
  async connectedCallback() {
    super.connectedCallback();
    this.contract = await this.loadContract(
      'GroupList', window.config.contracts.GroupList.address);
    await this.fetchList();
  }
  render() {
    return html`
      <button @click="${this.createGroup}">Create New Group</button>
      ${this._loading ? html`
        <p>Loading...</p>
      ` : this._groups.length === 0 ? html`
        <p>No groups yet!</p>
      ` : html`
        <ul>
          ${this._groups.map(group => html`
            <li><a @click="${this.route}" href="/group/${group}">${group}</a></li>
          `)}
        </ul>
      `}
    `;
  }
  async fetchList() {
    this._loading = true;
    this._groups.splice(0, this._groups.length);
    let fetchError = false;
    while(!fetchError) {
      try {
        this._groups.push(
          await this.contract.methods.groups(this._groups.length).call());
      } catch(error) {
        fetchError = true;
      }
    }
    this._loading = false;
  }
  async createGroup() {
    const contract = await this.contract;
    try {
      await app.send(contract.methods.createGroup(
        window.config.contracts.MockVerification.address));
      await this.fetchList();
    } catch(error) {
      alert(error.reason);
    }
  }
}

customElements.define('group-list', GroupList);
