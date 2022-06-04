import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {DeployChild} from './DeployChild.js';
import {PaginatedList} from './PaginatedList.js';

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
      for(let typeName of Object.keys(DeployChild.types)) {
        const factoryName = DeployChild.types[typeName].factory;
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
    return { address, self, interfaceId, interfaceName };
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
              ${contract.self ? '(Self reference)' : ''}
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
    const adminMode = (this._details.isMember && this._details.memberCount === 1)
      || (this._details.allowedContracts
          && this._details.allowedContracts
              .filter(x => x.address === app.accounts[0]).length > 0);
    return html`
      <nav class="breadcrumbs">
        <ol>
          <li><a @click="${this.route}" href="/groups">Groups</a></li>
          <li>${this.ellipseAddress(this.address)}</li>
        </ol>
      </nav>
      <h2>${this._details.name} <a href="${this.explorer(this.address)}" @click="${this.open}">${this.ellipseAddress(this.address)}</a></h2>
      ${this._loading ? html`
        <p>Loading...</p>
      ` : this._details.error ? html`
        <p>Invalid group</p>
      ` : html`
        <p>
          ${this._details.memberCount} ${this._details.memberCount === 1 ? 'member' : 'members'}
          (${this._details.isMember ? 'Account is Member' : 'Not a Member'})
        </p>
        ${this._details.memberCount === 1 ? html`
          <p class="notice">
            When a group only has one member, that one member can perform any administrative action on the group contract directly.<br><br>Before another member is registered into the group, it is <strong>very</strong> important to allow a contract that has the capability to perform administrative actions, such as an elections contract or by allowing an individual's account as an allowed contract.
          </p>
        ` : ''}
        <h3>Allowed Contracts</h3>
        <paginated-list
          .count=${this.allowedCount.bind(this)}
          .fetchOne=${this.fetchAllowed.bind(this)}
          .renderer=${this.renderAllowed.bind(this)}
          .emptyRenderer=${this.renderEmpty.bind(this)}
          .loadingRenderer=${this.renderLoading.bind(this)}
        ></paginated-list>
        <h3>Deployed Children</h3>
        <button @click="${this.route}" href="/group/${this.address}/deploy-child">Deploy New Child Contract...</button>
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
        ${adminMode ? html`
          <h3>Admin Mode</h3>
          <button @click="${this.register}">Register user...</button>
          <button @click="${this.unregister}">Register user...</button>
          <button @click="${this.allowContract}">Allow Contract...</button>
          <button @click="${this.disallowContract}">Disallow Contract...</button>
          <button @click="${this.setName}">Set Name...</button>
        ` : ''}
      `}
    `;
  }
}
customElements.define('group-details', GroupDetails);
