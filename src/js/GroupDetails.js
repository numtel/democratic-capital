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
      this._details.isMember = await this.contract.methods.isRegistered(app.accounts[0]).call();
      this._details.memberCount = Number(await this.contract.methods.registeredCount().call());
      this._details.factories =  [];
      for(let typeName of Object.keys(DeployChild.types)) {
        const factoryName = DeployChild.types[typeName].factory;
        this._details.factories.push({
          name: typeName,
          factoryName,
          count: await this.factoryCount(factoryName),
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
        console.error(error);
        alert(error.reason);
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
        console.error(error);
        alert(error.reason);
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
        console.error(error);
        alert(error.reason);
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
        console.error(error);
        alert(error.reason);
      }
    }
  }
  render() {
    const adminMode = (this._details.isMember && this._details.memberCount === 1)
      || (this._details.allowedContracts
          && this._details.allowedContracts
              .filter(x => x.address === app.accounts[0]).length > 0);
    return html`
      <a @click="${this.route}" href="/">Home</a>
      <a @click="${this.route}" href="/group/${this.address}/deploy-child">Deploy Child Contract</a>
      <h2>Group: ${this.address}</h2>
      ${this._loading ? html`
        <p>Loading...</p>
      ` : this._details.error ? html`
        <p>Invalid group</p>
      ` : html`
        <dl>
          <dt>Membership</dt>
          <dd>
            Count: ${this._details.memberCount},
            ${this._details.isMember ? 'Account is Member' : 'Not a Member'}
          </dd>
          <dt>Allowed Contracts</dt>
          <dd>
            <paginated-list
              .count=${this.allowedCount.bind(this)}
              .fetchOne=${this.fetchAllowed.bind(this)}
              .renderer=${this.renderAllowed.bind(this)}
              .emptyRenderer=${this.renderEmpty.bind(this)}
              .loadingRenderer=${this.renderLoading.bind(this)}
            ></paginated-list>
          </dd>
          <dt>Deployed Children</dt>
          <dd>
            <ul>
              ${this._details.factories.map(factory => html`
                ${factory.count > 0 ? html`
                  <li>
                    <span>${factory.name}</span>
                    <paginated-list
                      .count=${this.factoryCount.bind(this, factory.factoryName)}
                      .fetchOne=${this.factoryFetch.bind(this, factory.factoryName)}
                      .renderer=${this.renderFactoryList.bind(this, factory.name)}
                      .emptyRenderer=${this.renderEmpty.bind(this)}
                      .loadingRenderer=${this.renderLoading.bind(this)}
                    ></paginated-list>
                  </li>
                ` : ''}
              `)}
            </ul>
          </dd>
        </dl>
        ${adminMode ? html`
          <h3>Admin Mode</h3>
          <button @click="${this.register}">Register user...</button>
          <button @click="${this.unregister}">Register user...</button>
          <button @click="${this.allowContract}">Allow Contract...</button>
          <button @click="${this.disallowContract}">Disallow Contract...</button>
        ` : ''}
      `}
    `;
  }
}
customElements.define('group-details', GroupDetails);
