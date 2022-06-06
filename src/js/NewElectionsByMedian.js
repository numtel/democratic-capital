import {html, css} from 'lit';
import {ifDefined} from 'lit/directives/if-defined.js';
import {ref} from 'lit/directives/ref.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';

export class NewElectionsByMedian extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    prefixes: {type: String, reflect: true},
    _loading: {state: true},
    _curAddPrefix: {state: true},
    _groupChildren: {state: true},
    _groupHasChildren: {state: true},
    _selContractValue: {state: true},
    _selMethodValue: {state: true},
    _groupMethods: {state: true},
  };
  constructor() {
    super();
    this.prefixes = '';
    this._loading = true;
    this._curAddPrefix = '';
    this._selAddPrefix = null;
    this._inputData = null;
    this._groupChildren = {};
    this._groupMethods = [];
    this.reverseMethods = {};
    this._groupHasChildren = false;
    this._selContract = null;
    this._selContractValue = '';
  }
  async connectedCallback() {
    super.connectedCallback();
    await app.initialized;
    this._groupMethods = await this.loadAbi('VerifiedGroup', true);
    this.reverseMethods = this._groupMethods.reduce((out, method) => {
        const selector = app.web3.eth.abi.encodeFunctionSignature(method);
        out[selector] = method;
        return out;
      }, {});
    this._loading = false;
  }
  selAddPrefix(select) {
    this._selAddPrefix = select;
  }
  inputData(input) {
    this._inputData = input;
  }
  selContract(select) {
    this._selContract = select;
  }
  addPrefix(event) {
    event.preventDefault();
    if(!this._selAddPrefix.value) return;
    const newPrefixes = this.prefixes.split(',').filter(x => !!x);
    let newPrefix = this._selAddPrefix.value;
    const selectorSpacing = '000000000000000000000000'; // 24 zeros
    if(this._curAddPrefix === 'invoke') {
      if(this._selContractValue === 'other') {
        if(!this.isAddress(this._inputData.value))
          return alert('Invalid contract address!');
        newPrefix += selectorSpacing + this._inputData.value.slice(2);
      } else if(this.isAddress(this._selContractValue)) {
        newPrefix += selectorSpacing + this._selContractValue.slice(2);
      }
    }
    if(newPrefixes.indexOf(newPrefix) !== -1) return;
    newPrefixes.push(newPrefix);
    this._selAddPrefix.value = '';
    this._curAddPrefix = '';
    this.prefixes = newPrefixes.join(',');
  }
  removePrefix(event) {
    event.preventDefault();
    const toRemove = event.target.attributes['data-prefix'].value;
    const newPrefixes = this.prefixes.split(',').filter(x => x !== toRemove);
    this.prefixes = newPrefixes.join(',');
  }
  extractValues() {
    const allowedInvokePrefixes = this.prefixes.split(',').filter(x => !!x);
    return [ allowedInvokePrefixes ];
  }
  async selPrefixChange(event) {
    this._curAddPrefix = event.target.selectedOptions[0].label;
    if(this._curAddPrefix === 'invoke') {
      this._loading = true;
      this._groupChildren = await this.allGroupChildren(this.closest('deploy-child').groupAddress);
      this._groupHasChildren = Object.keys(this._groupChildren).length > 0;
      this._loading = false;
    }
  }
  async selContractChange(event) {
    this._selContractValue = event.target.value;
  }
  render() {
    return html`
      <p>Allow users to create proposals which call functions on the main group contract.</p>
      <p>The duration, majority threshold, and minimum participation parameters of these elections are set by the median values specified by each user.</p>
      <fieldset>
        <legend>Allowed Invoke Prefixes</legend>
        <fieldset class="horizontal">
          <legend>Add New Prefix</legend>
          ${this._loading ? html`
            <p>Loading...</p>
          ` : html`
            <label>
              <span>New Prefix</span>
              <select ${ref(this.selAddPrefix)} @change="${this.selPrefixChange}">
                <option
                  selected="${ifDefined(this._curAddPrefix === '' ? true : undefined)}"
                ></option>
                ${this._groupMethods.map(method => html`
                  <option
                    selected="${ifDefined(this._curAddPrefix === method.name ? true : undefined)}"
                    value="${app.web3.eth.abi.encodeFunctionSignature(method)}"
                  >${method.name}</option>
                `)}
              </select>
            </label>
            ${this._curAddPrefix === 'invoke' ? html`
              <label>
                <span>Contract</span>
                <select ${ref(this.selContract)} @change="${this.selContractChange}">
                  <option value=""
                     selected="${ifDefined(this._selContractValue === '' ? true : undefined)}"
                  >Any Contract</option>
                  <option value="other"
                     selected="${ifDefined(this._selContractValue === 'other' ? true : undefined)}"
                  >Other</option>
                  ${this._groupHasChildren ? html`
                    ${Object.keys(this._groupChildren).map(childType => html`
                      <optgroup label="${childType}">
                        ${this._groupChildren[childType].map(thisChild => html`
                          <option
                           selected="${ifDefined(this._selContractValue === thisChild ? true : undefined)}"
                          >${thisChild}</option>
                        `)}
                      </optgroup>
                    `)}
                  ` : ''}
                </select>
              </label>
              ${this._selContractValue === 'other' ? html`
                <label>
                  <span>Custom Contract</span>
                  <input ${ref(this.inputData)}>
                </label>
              ` : ''}
            ` : ''}
            <button class="right secondary" @click="${this.addPrefix}">Add Prefix</button>
          `}
        </fieldset>
        ${this.prefixes === '' ? html`
          <p>No prefixes defined, allow any proposals</p>
        ` : html`
          <div class="pagination">
          <div class="page-options">
            Elections through this contract will only be allowed to invoke the following methods:
          </div>
          <ul>
          ${this.prefixes.split(',').map(prefix => html`
            <li>
              <span>
              ${this.reverseMethods[prefix.slice(0,10)].name}
              ${prefix.length > 10 && this.reverseMethods[prefix.slice(0,10)].name === 'invoke' ? html`
                (
                <a href="${this.explorer('0x' + prefix.slice(34))}" @click="${this.route}">
                  ${this.ellipseAddress('0x' + prefix.slice(34))}
                </a>
                )
              ` :''}
              </span>
              <button @click="${this.removePrefix}" data-prefix="${prefix}" class="secondary right">Remove</button>
            </li>
          `)}
          </ul>
          </div>
        `}
      </fieldset>
    `;
  }
}
customElements.define('new-elections-by-median', NewElectionsByMedian);
