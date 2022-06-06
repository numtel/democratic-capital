import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {PaginatedList} from './PaginatedList.js';
import {AppTabs} from './AppTabs.js';
import {GroupComments} from './GroupComments.js'

export class GroupDetails extends BaseElement {
  static properties = {
    address: {type: String},
    _loading: {state: true},
    _details: {state: true},
  };
  constructor() {
    super();
    this._loading = true;
    this._details = {};
    this.contract = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    this.contract = await this.loadContract('VerifiedGroup', this.address);
    await this.fetchDetails();
  }
  async fetchDetails() {
    this._loading = true;
    this._details.error = false;
    try {
      this._details.name = await this.contract.methods.name().call();
      this._details.isMember = app.connected ? await this.contract.methods.isRegistered(app.accounts[0]).call() : false;
      this._details.memberCount = Number(await this.contract.methods.registeredCount().call());
      this._details.factories =  [];
      this._details.hasChildren = false;
      for(let typeName of Object.keys(this.childTypes)) {
        const factoryName = this.childTypes[typeName].factory;
        const count = await this.factoryCount(factoryName);
        if(count) this._details.hasChildren = true;
        this._details.factories.push({
          name: typeName,
          factoryName,
          count,
        });
      }
    } catch(error) {
      console.error(error);
      this._details.error = true;
    }
    this._loading = false;
  }
  async allowedCount() {
    return Number(await this.contract.methods.allowedContractCount().call());
  }
  async fetchAllowed(index) {
    const address = await this.contract.methods.allowedContractIndex(index).call();
    const self = address === this.address;
    const interfaceName = await this.childType(address);
    return { address, self, interfaceName };
  }
  renderAllowed(allowed) {
    return html`
      <ul>
        ${allowed.map(contract => html`
          <li>
            ${contract.interfaceName ? html`
                <a @click="${this.route}"
                    href="/group/${this.address}/${contract.interfaceName}/${contract.address}">
                  ${contract.address} (${contract.interfaceName})
                </a>
            ` : html`
              ${contract.address}
            `}
          </li>
        `)}
      </ul>
    `;
  }
  renderEmpty() {
    return html`
      <p>No Contracts Yet!</p>
    `;
  }
  renderLoading() {
    return html`
      <p>Loading...</p>
    `;
  }
  async factoryCount(factoryName) {
    const factory = await this.loadContract(factoryName, window.config.contracts[factoryName].address);
    return Number(await factory.methods.groupCount(this.address).call());
  }
  async factoryFetch(factoryName, index) {
    const factory = await this.loadContract(factoryName, window.config.contracts[factoryName].address);
    return await factory.methods.deployedByGroup(this.address, index).call();
  }
  renderFactoryList(interfaceName, contracts) {
    return html`
      <ul>
        ${contracts.map(address => html`
          <li>
            <a @click="${this.route}"
                href="/group/${this.address}/${interfaceName}/${address}">
              ${address}
            </a>
          </li>
        `)}
      </ul>
    `;
  }
  async register() {
    const address = prompt('Account address?');
    if(this.isAddress(address)) {
      try {
        await this.send(this.contract.methods.register(address));
        await this.fetchDetails();
      } catch(error) {
        this.displayError(error);
      }
    }
  }
  async unregister() {
    const address = prompt('Account address?');
    if(this.isAddress(address)) {
      try {
        await this.send(this.contract.methods.unregister(address));
        await this.fetchDetails();
      } catch(error) {
        this.displayError(error);
      }
    }
  }
  async allowContract() {
    const address = prompt('Contract address?');
    if(this.isAddress(address)) {
      try {
        await this.send(this.contract.methods.allowContract(address));
        await this.fetchDetails();
      } catch(error) {
        this.displayError(error);
      }
    }
  }
  async disallowContract() {
    const address = prompt('Contract address?');
    if(this.isAddress(address)) {
      try {
        await this.send(this.contract.methods.disallowContract(address));
        await this.fetchDetails();
      } catch(error) {
        this.displayError(error);
      }
    }
  }
  async setName() {
    const name = prompt('New group name?');
    if(name) {
      try {
        await this.send(this.contract.methods.setName(name));
        await this.fetchDetails();
      } catch(error) {
        this.displayError(error);
      }
    }
  }
  render() {
    return html`
      <nav class="breadcrumbs">
        <ol>
          <li><a @click="${this.route}" href="/groups">Groups</a></li>
          <li>${this.ellipseAddress(this.address)}</li>
        </ol>
      </nav>
      ${this._loading ? html`
        <main><p>Loading...</p></main>
      ` : this._details.error ? html`
        <main><p>Invalid group</p></main>
      ` : html`
        <h2>${this._details.name || this.address}</h2>
        ${this._details.memberCount === 1 ? html`
          <p class="notice">
            This group only has one member. When a group only has one member, that person can perform any administrative action on the group contract directly.<br><br>Before another member is registered into the group, it is <strong>very</strong> important to allow a contract that has the capability to perform administrative actions, such as an elections contract or by allowing an individual's account as an allowed contract.
          </p>
        ` : ''}

        <main>
        <h3>Overview</h3>
        <dl>
        <dt>Contract</dt>
        <dd><a href="${this.explorer(this.address)}" @click="${this.open}">${this.address}</a></dd>
        <dt>Member Count</dt>
        <dd>
          ${this._details.memberCount} ${this._details.memberCount === 1 ? 'member' : 'members'}
        </dd>
        <dt>Connected As Member</dt>
        <dd>
          ${this._details.isMember ? 'Account is Member' : 'Not a Member'}
        </dd>
        </dl>
        </main>
        <main>
          <app-tabs .tabs=${this.tabSections()}></app-tabs>
        </main>
        <group-comments groupAddress="${this.address}" itemAddress="${this.address}"></group-comments>
      `}
    `;
  }
  tabSections() {
    const adminMode = (this._details.isMember && this._details.memberCount === 1)
      || (this._details.allowedContracts
          && this._details.allowedContracts
              .filter(x => x.address === app.accounts[0]).length > 0);
    const tabs = [
      { name: 'Allowed Contracts',
        render: () => html`
          <paginated-list
            .count=${this.allowedCount.bind(this)}
            .fetchOne=${this.fetchAllowed.bind(this)}
            .renderer=${this.renderAllowed.bind(this)}
            .emptyRenderer=${this.renderEmpty.bind(this)}
            .loadingRenderer=${this.renderLoading.bind(this)}
          ></paginated-list>
      `},
      { name: 'Deployed Children',
        render: () => html`
          <button class="right" @click="${this.route}" href="/group/${this.address}/deploy-child">Deploy New...</button>
          ${this._details.hasChildren ? html`
            ${this._details.factories.map(factory => html`
              ${factory.count > 0 ? html`
                <h4>${factory.name}</h4>
                <paginated-list
                  .count=${this.factoryCount.bind(this, factory.factoryName)}
                  .fetchOne=${this.factoryFetch.bind(this, factory.factoryName)}
                  .renderer=${this.renderFactoryList.bind(this, factory.name)}
                  .emptyRenderer=${this.renderEmpty.bind(this)}
                  .loadingRenderer=${this.renderLoading.bind(this)}
                ></paginated-list>
              ` : ''}
            `)}
          ` : html`
            <p>No Children yet!</p>
          `}
        `},
    ];
    if(adminMode) {
      tabs.push({
        name: 'Adminstrator',
        render: () => html`
          <button @click="${this.register.bind(this)}">Register user...</button>
          <button @click="${this.unregister.bind(this)}">Unregister user...</button>
          <button @click="${this.allowContract.bind(this)}">Allow Contract...</button>
          <button @click="${this.disallowContract.bind(this)}">Disallow Contract...</button>
          <button @click="${this.setName.bind(this)}">Set Name...</button>
        `
      });
    }
    return tabs;
  }
}
customElements.define('group-details', GroupDetails);
