import {html, css} from './lit-all.min.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {DeployChild} from './DeployChild.js';

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
      this._details.allowedContracts = await this.allowedContracts();
      this._details.deployedChildren = await this.allFactoriesChildren();
    } catch(error) {
      console.error(error);
      this._details.error = true;
    }
    this._loading = false;
  }
  async allowedContracts() {
    const out = [];
    const count = Number(await this.contract.methods.allowedContractCount().call());
    for(let i = 0; i < count; i++) {
      const address = await this.contract.methods.allowedContractIndex(i).call();
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

      out.push({ address, self, interfaceId, interfaceName });
    }
    return out;
  }
  async allFactoriesChildren() {
    const out = {};
    for(let type of Object.keys(DeployChild.types)) {
      out[type] = await this.factoryDeployedChildren(DeployChild.types[type].factory);
    }
    return out;
  }
  async factoryDeployedChildren(factoryName) {
    const factory = await this.loadContract(factoryName, window.config.contracts[factoryName].address);
    const out = [];
    let fetchError = false;
    while(!fetchError) {
      try {
        out.push(
          await factory.methods.deployedByGroup(this.address, out.length).call());
      } catch(error) {
        fetchError = true;
      }
    }
    return out;
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
            <ul>
              ${this._details.allowedContracts.map(contract => html`
                <li>
                  <dl>
                    <dt>Address</dt>
                    <dd>
                      ${contract.address}
                      ${contract.self ? '(Self reference)' : ''}
                    </dd>
                    ${contract.interfaceName ? html`
                      <dt>Interface Type</dt>
                      <dd>
                        <a @click="${this.route}"
                            href="/group/${this.address}/${contract.interfaceName}/${contract.address}">
                          ${contract.interfaceName}
                        </a>
                      </dd>
                    ` : ''}

                  </dl>
                </li>
              `)}
            </ul>
          </dd>
          <dt>Deployed Children</dt>
          <dd>
            <ul>
              ${Object.keys(this._details.deployedChildren).map(childType => html`
                ${this._details.deployedChildren[childType].length > 0 ? html`
                  <li>
                    <span>${childType}</span>
                    <ul>
                    ${this._details.deployedChildren[childType].map(childAddress => html`
                      <li>
                        <a @click="${this.route}" href="/group/${this.address}/${childType}/${childAddress}">
                          ${childAddress}
                        </a>
                      </li>
                    `)}
                    </ul>
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
