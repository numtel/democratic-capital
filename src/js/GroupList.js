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
      ${this._loading ? html`
        <main><p>Loading...</p></main>
      ` : html`
        <h2>
          <button class="right" @click="${this.createGroup}">Create New Group</button>
          All Groups
        </h2>
        <main>
          <paginated-list
            updateIndex="${this._updateList}"
            .count=${this.groupCount.bind(this)}
            .fetchOne=${this.fetchGroup.bind(this)}
            .renderer=${this.renderGroups.bind(this)}
            .emptyRenderer=${this.renderEmpty.bind(this)}
            .loadingRenderer=${this.renderLoading.bind(this)}
          ></paginated-list>
        </main>
      `}
    `;
  }
  async groupCount() {
    return Number(await this.contract.methods.count().call());
  }
  async fetchGroup(index) {
    const address = await this.contract.methods.groups(index).call();
    const group = await this.loadContract('IVerifiedGroup', address);
    const name = await group.methods.name().call();
    const memberCount = Number(await group.methods.registeredCount().call());
    return { address, name, memberCount };

  }
  renderGroups(groups) {
    return html`
      <ul>
        ${groups.map(group => html`
          <li><a @click="${this.route}" href="/group/${group.address}">${group.name} (${this.ellipseAddress(group.address)})</a> ${group.memberCount} ${group.memberCount === 1 ? 'member' : 'members'}</li>
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
    const name = prompt('Group name?');
    if(!name) return;
    const contract = await this.contract;
    try {
      await this.send(contract.methods.createGroup(
        window.config.contracts.MockVerification.address, name));
      this._updateList++;
    } catch(error) {
      this.displayError(error);
    }
  }
}

customElements.define('group-list', GroupList);
