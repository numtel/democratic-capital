import {html, css} from 'lit';
import {ifDefined} from 'lit/directives/if-defined.js';
import {ref} from 'lit/directives/ref.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {PaginatedList} from './PaginatedList.js';
import {AppTabs} from './AppTabs.js';
import {remaining} from './utils.js';

export class ProposalList extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    address: {type: String},
    electionType: {type: String},
    _loading: {state: true},
    _details: {state: true},
    _newProposalMethod: {state: true},
    _proposalMethodLoading: {state: true},
    _updateProposals: {state: true},
    _selInvokeMethod: {state: true},
    _invokeMethod: {state: true},
    invokeMethods: {state: true},
    firstArg: {state: true},
  };
  constructor() {
    super();
    this._loading = true;
    this._details = {};
    this._newProposalMethod = '';
    this._proposalMethodLoading = false;
    this._updateProposals = 0;
    this.contract = null;
    this.firstArg = '';
    this.groupMethods = [];
    this.reverseMethods = {};
    this.groupAddress = null;
    this.groupChildren = {};
    this.invokeMethods = [];
    this._selInvokeMethod = null;
    this._invokeMethod = '';
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract(this.electionType, this.address);
    this._details.invokePrefixes = await this.contract.methods.invokePrefixes().call();
    this.groupMethods = await this.loadAbi('VerifiedGroup', true);
    this.reverseMethods = this.groupMethods.reduce((out, method) => {
        const selector = app.web3.eth.abi.encodeFunctionSignature(method);
        out[selector] = method;
        return out;
      }, {});
    this.groupAddress = this.closest('child-details').groupAddress;
    this.groupChildren = await this.allGroupChildren(this.groupAddress);
    this._details.currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
    this._loading = false;
  }
  async proposalCount() {
    return Number(await this.contract.methods.count().call());
  }
  async fetchProposal(index) {
    const key = await this.contract.methods.atIndex(index).call();
    const details = await this.contract.methods.details(key).call();
    details.key = key;
    details.dataDecoded = await this.decodeAbiFunction('IVerifiedGroup', details.data);
    if(details.dataDecoded.name === 'invoke') {
      details.invokeType = await this.childType(details.dataDecoded.params[0].value);
      if(details.invokeType) {
        details.invokeData = await this.decodeAbiFunction(details.invokeType, details.dataDecoded.params[1].value);
      }
    }
    details.myVote = app.connected
      ? Number(await this.contract.methods.voteValue(key, app.accounts[0]).call())
      : null;
    return details;
  }
  renderProposals(proposals) {
    const proposalsTpl = [];
    for(let proposal of proposals) {
      const timeLeft = Number(proposal.endTime) - this._details.currentTime;
      proposalsTpl.push(html`
        <li>
          <div>
            <a href="${window.location.pathname + '/' + proposal.key}" @click="${this.route}">${this.ellipseAddress(proposal.key)}</a>
          </div>
          <div class="details">
            ${timeLeft > 0 ? html`
              ${remaining(timeLeft)} remaining
            ` : html`
              Election Completed
            `}
            <br>
              ${timeLeft > 0 ?
                  proposal.passing ? html`<span class="proposal-passing">Majority and participation thresholds met</span>`
                    : html`<span class="proposal-not-passing">Proposal will not pass with current support and participation levels</span>`
                  : proposal.processed ? html`<span class="proposal-completed">Proposal passed and already processed</span>`
                    : proposal.passed ? html`<span class="proposal-waiting">Proposal passed and awaiting processing</span>`
                      : html`<span class="proposal-failed">Proposal failed</span>`}
              ${proposal.myVote === 1 ? '(Voted in Support)' :
                proposal.myVote === 2 ? '(Voted Against)' : ''}
            <br>
              ${proposal.dataDecoded.name}
                ${proposal.dataDecoded.params.map(param => html`
                    ${param.name === 'data' && proposal.invokeType ? html`
                      <span class="invoke-name">${proposal.invokeData.name}</span>
                        ${proposal.invokeData.params.map(param => html`
                            ${param.name}
                              ${param.type === 'address' ? html`
                                <a @click="${this.open}" href="${this.explorer(param.value)}">${this.ellipseAddress(param.value)}</a>
                              ` : html`
                                <span class="invoke-value">${param.value}</span>
                              `}
                        `)}
                    ` : html`
                      ${param.name}
                        ${param.type === 'address' ? html`
                          <a @click="${this.open}" href="${this.explorer(param.value)}">${this.ellipseAddress(param.value)}</a>
                        ` : html`
                          <span class="invoke-value">${param.value}</span>
                        `}
                      ${proposal.invokeType}
                    `}
                `)}
          </div>
        </li>
      `);
    }
    return html`
      <ul class="proposals">
        ${proposalsTpl}
      </ul>
    `;
  }
  renderEmpty() {
    return html`
      <p>No Proposals Yet!</p>
    `;
  }
  renderLoading() {
    return html`
      <p>Loading...</p>
    `;
  }
  async update(changed) {
    super.update();
    await app.initialized;
    this._details.currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
    if(changed.has('_newProposalMethod')) {
      this._proposalMethodLoading = true;
      this.firstArg = this._newProposalMethod.split(' ').length > 1
        ? this._newProposalMethod.split(' ')[1].slice(1, -1) : false;
      this.invokeMethods = [];
      if(this.firstArg) {
        const childType = await this.childType(this.firstArg);
        if(childType) {
          this.invokeMethods = await this.loadAbi(childType, true);
        }
      }
      this._proposalMethodLoading = false;
    }
  }
  render() {
    if(this._loading) return html`
      <main><p>Loading...</p></main>
    `;
    const availableMethods = this._details.invokePrefixes.length > 0
      ? this._details.invokePrefixes.map(prefix => {
          let address;
          if(prefix.length > 10) {
            address = '0x' + prefix.slice(34);
          }
          return this.reverseMethods[prefix.slice(0, 10)].name + (address ? ` (${address})` : '');
        })
      : this.groupMethods.map(method => method.name);
    return html`
      <main>
        <app-tabs .tabs=${this.proposalTabs(availableMethods)}></app-tabs>
      </main>
    `
  }
  proposalTabs(availableMethods) {
    const methodName = this._newProposalMethod.split(' ')[0];
    const showContractSelect = this._newProposalMethod.split(' ').length === 1;
    const proposalMethod = this.groupMethods.filter(method => method.name === methodName);
    return [
      { name: 'Existing Proposals',
        render: () => html`
          <paginated-list
            updateIndex="${this._updateProposals}"
            .count=${this.proposalCount.bind(this)}
            .fetchOne=${this.fetchProposal.bind(this)}
            .renderer=${this.renderProposals.bind(this)}
            .emptyRenderer=${this.renderEmpty.bind(this)}
            .loadingRenderer=${this.renderLoading.bind(this)}
          ></paginated-list>
        `},
      { name: 'Submit New Proposal',
        render: () => html`
          <form @submit="${this.propose.bind(this)}">
            <fieldset>
              <div>
                <label>
                  <span>Method to Invoke</span>
                  <select @change="${this.setNewProposalMethod.bind(this)}">
                    <option></option>
                    ${availableMethods.map(method => html`
                      <option selected="${ifDefined(this._newProposalMethod === method ? true : undefined)}">${method}</option>
                    `)}
                  </select>
                </label>
              </div>
              ${this._proposalMethodLoading ? html`
                <p>Loading...</p>
              ` : html`
                ${proposalMethod.length > 0 ? html`
                  ${proposalMethod[0].inputs.map((arg, index) => html`
                    <div>
                      <label>
                        <span>${arg.name}</span>
                        ${index === 0 && this.firstArg ? html`
                          <input name="${arg.name}" value="${this.firstArg}" disabled>
                        ` : html`
                          ${arg.type === 'address' ? html`
                            <input required name="${arg.name}" pattern="^0x[a-fA-F0-9]{40}$">
                          ` : html`
                            <input required name="${arg.name}">
                          `}
                        `}
                      </label>
                    </div>
                    ${proposalMethod[0].name === 'invoke' && index === 0 && showContractSelect ? html`
                      <div>
                        <label>
                          <span>Group Child Contracts</span>
                          <select @change="${this.selContractChange.bind(this)}">
                            <option value=""
                             selected="${ifDefined(this.firstArg === '' ? true : undefined)}"
                            >Select child contract...</option>
                            <optgroup label="VerifiedGroup">
                              <option
                               selected="${ifDefined(this.firstArg === this.groupAddress ? true : undefined)}"
                              >${this.groupAddress}</option>
                            </optgroup>
                            ${Object.keys(this.groupChildren).map(childType => html`
                              <optgroup label="${childType}">
                                ${this.groupChildren[childType].map(thisChild => html`
                                  <option
                                   selected="${ifDefined(this.firstArg === thisChild ? true : undefined)}"
                                  >${thisChild}</option>
                                `)}
                              </optgroup>
                            `)}
                          </select>
                        </label>
                      </div>
                    ` : ''}
                  `)}
                  ${this.invokeMethods.length > 0 ? html`
                    <fieldset>
                      <div>
                        <label>
                          <span>Invoke Method</span>
                          <select ${ref(this.setSelInvokeMethod)} @change="${this.setInvokeMethod.bind(this)}">
                            <option value="">Choose Method...</option>
                            ${this.invokeMethods.map(method => html`
                              <option>${method.name}</option>
                            `)}
                          </select>
                        </label>
                      </div>
                      ${this._invokeMethod && this.invokeMethods.filter(method => method.name === this._invokeMethod)[0].inputs.map((arg, index) => html`
                        <div>
                          <label>
                            <span>${arg.name}</span>
                            ${arg.type === 'address' ? html`
                              <input required @change="${this.invokeParamChange.bind(this)}" name="invoke_${arg.name}" pattern="^0x[a-fA-F0-9]{40}$">
                            ` : arg.type === 'bool' ? html`
                              <input type="checkbox" @change="${this.invokeParamChange.bind(this)}" name="invoke_${arg.name}">
                            ` : html`
                              <input required @change="${this.invokeParamChange.bind(this)}" name="invoke_${arg.name}">
                            `}
                          </label>
                        </div>
                      `)}
                    </fieldset>
                  ` : ''}
                ` : ''}
              `}
              <div class="commands">
                <button type="submit">Submit Proposal</button>
              </div>
            </fieldset>
          </form>
        `
      }
    ];
  }
  async selContractChange(event) {
    this.firstArg = event.target.value;
    if(this.firstArg) {
      this._proposalMethodLoading = true;
      const childType = event.target.selectedOptions[0].parentNode.label;
      this._invokeMethod = '';
      this.invokeMethods = await this.loadAbi(childType, true);
      this._proposalMethodLoading = false;
    }
  }
  async propose(event) {
    event.preventDefault();
    const methodName = this._newProposalMethod.split(' ')[0];
    const proposalMethod = this.groupMethods.filter(method => method.name === methodName);
    const inputs = event.target.querySelectorAll('input');
    const args = proposalMethod[0].inputs.map(input => event.target.querySelector(`input[name="${input.name}"]`).value);
    if(!proposalMethod) return;
    const groupInterface = await this.loadContract('IVerifiedGroup');
    const invokeData = groupInterface.methods[methodName](...args).encodeABI();
    try {
      const events = (await this.send(this.contract.methods.propose(invokeData))).events;
      await this.route(window.location.pathname + '/' + events.NewElection.returnValues.key);
    } catch(error) {
      this.displayError(error);
    }
  }
  setNewProposalMethod(event) {
    this._newProposalMethod = event.target.value;
  }
  setSelInvokeMethod(select) {
    this._selInvokeMethod = select;
  }
  setInvokeMethod(event) {
    this._invokeMethod = event.target.value;
    this.invokeParamChange(event);
  }
  invokeParamChange(event) {
    const form = event.target.closest('form');
    const args = Array.from(form.querySelectorAll('input[name^="invoke_"]')).map(input =>
      input.type === 'checkbox' ? input.checked : input.value);
    const invokeMethod = this.invokeMethods.filter(method => method.name === this._invokeMethod)[0];
    if(args.length !== invokeMethod.inputs.length) return;
    const dataInput = form.querySelector('input[name="data"]');
    try {
      dataInput.value = app.web3.eth.abi.encodeFunctionCall(invokeMethod, args);
    } catch(error) {
      this.displayError(error);
    }
  }
}
customElements.define('proposal-list', ProposalList);
