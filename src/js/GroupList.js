import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {PaginatedList} from './PaginatedList.js';

export class GroupList extends BaseElement {
  static properties = {
    _groups: {state: true},
    _loading: {state: true},
    _updateList: {state:true},
  };
  constructor() {
    super();
    this._loading = true;
    this._updateList = 0;
    this.contract = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract(
      'VerifiedGroupFactory', window.config.contracts.VerifiedGroupFactory.address);
    this._loading = false;
  }
  render() {
    return html`
      <button @click="${this.createGroup}">Create New Group</button>
      ${this._loading ? html`
        <p>Loading...</p>
      ` : html`
        <paginated-list
          updateIndex="${this._updateList}"
          .count=${this.groupCount.bind(this)}
          .fetchOne=${this.fetchGroup.bind(this)}
          .renderer=${this.renderGroups.bind(this)}
          .emptyRenderer=${this.renderEmpty.bind(this)}
          .loadingRenderer=${this.renderLoading.bind(this)}
        ></paginated-list>
      `}
    `;
  }
  async groupCount() {
    return Number(await this.contract.methods.count().call());
  }
  async fetchGroup(index) {
    return await this.contract.methods.groups(index).call();
  }
  renderGroups(groups) {
    return html`
      <ul>
        ${groups.map(group => html`
          <li><a @click="${this.route}" href="/group/${group}">${group}</a></li>
        `)}
      </ul>
    `;
  }
  renderEmpty() {
    return html`
      <p>No Groups Yet!</p>
    `;
  }
  renderLoading() {
    return html`
      <p>Loading...</p>
    `;
  }
  async createGroup() {
    const contract = await this.contract;
    try {
      await this.send(contract.methods.createGroup(
        window.config.contracts.MockVerification.address));
      this._updateList++;
    } catch(error) {
      console.error(error);
      alert(error.reason);
    }
  }
}

customElements.define('group-list', GroupList);
