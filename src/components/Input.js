import {AsyncTemplate, html} from '/utils/Template.js';
import InvokeFilter from '/components/input/InvokeFilter.js';
import PercentageInput from '/components/input/PercentageInput.js';
import Range from '/components/input/Range.js';
import PreviewToken from '/components/input/PreviewToken.js';
import PreviewQuadratic from '/components/input/PreviewQuadratic.js';
import ProposalTxs from '/components/input/ProposalTxs.js';
import {selfDescribingContract, remaining, newlyDeployed} from '/utils/index.js';

export default class Input extends AsyncTemplate {
  constructor(input, name, parent, onChange, value, item) {
    super();
    this.set('input', input);
    this.set('name', name);
    this.set('parent', parent);
    this.set('item', item);
    this.set('value', value);
    this.set('onChange', onChange || (() => {}));
  }
  async init() {
  }
  async render() {
    const input = this.input, index = this.index;
    if('hidden' in input) {
      const value = await this.givenValues(input.hidden);
      this.onChange(value);
      return html`
        <input
          type="hidden"
          name="${this.name}"
          value="${value}">
      `;
    } else if(input.input === 'invokeFilter') {
      return html`${new InvokeFilter(this.parent, this.onChange)}`;
    } else if(input.input === 'txs') {
      return html`${new ProposalTxs(this.parent, this.item, this.onChange)}`;
    } else if(input.input === 'range') {
      return html`${new Range(input, this.onChange, this.value)}`;
    } else if(input.input === 'percentage') {
      return html`${new PercentageInput(input, this.onChange, this.value)}`;
    } else {
      let selector;
      if('select' in input) {
        const optgroups = [];
        for(let type of input.select) {
          const options = [];
          for(let opt of await this.givenValues(type)) {
            if(input.filter && input.filter.length
                && input.filter.indexOf(opt[1].toLowerCase()) === -1)
              continue;
            options.push(html`
              <option value="${opt[1]}"
                $${this.value === opt[1] ? 'selected' : ''}
              >${opt[0]}</option>
            `)
          }
          optgroups.push(html`
            <optgroup label="${type}">
              ${options}
            </optgroup>
          `);
        }
        selector = html`
          <select onchange="tpl(this).setVal()">
            <option value="">Choose value...</option>
            ${optgroups}
          </select>
        `;
      }
      return html`
        <div class="field">
          <label>
            <span>${input.name}</span>
            <input name="${this.name}" value="${this.value || ''}" onchange="tpl(this).set('value', value).onChange(this.value)">
          </label>
          ${selector}
          ${'hint' in input && html`
            <span class="hint">${input.hint}</span>
          `}
          ${input.preview === 'seconds' && html`
            <span class="preview">${remaining(this.value)}</span>
          `}
          ${input.preview === 'token' && html`
            ${new PreviewToken(this.value)}
          `}
          ${input.preview === 'quadratic' && html`
            ${new PreviewQuadratic(this.value, input)}
          `}
        </div>`;
     }
  }
  setVal(index) {
    this.set('value', this.element.querySelector('select').value);
    this.onChange(this.value);
  }
  async givenValues(identifier) {
    let contract, browser, count;
    switch(identifier) {
      case 'account':
        const accounts = await app.wallet.accounts;
        return accounts[0];
      case 'parent':
        if(!this.parent) throw new Error('Parent required!');
        return this.parent;
      case 'Verification':
        return config.contracts.MockVerification.address;
      case 'Factories':
        return Object.keys(config.contracts)
          .filter(type => type.endsWith('Factory'))
          .reduce((out, cur) => {
            out.push([
              cur,
              config.contracts[cur].address
            ]);
            return out;
          }, []);
      case 'Methods':
        try {
          if(this.input.deployed) {
            contract = this.input.deployed;
          } else {
            contract = await selfDescribingContract(this.input.contract);
          }
        } catch(error) {
          return [ ['Not a self-describing contract!', ''] ];
        }
        return contract.options.jsonInterface.filter(x =>
          x.type === 'function' && x.stateMutability === 'nonpayable')
          .map(method => [
            method.name, method.signature
          ]);
      case 'Children':
        browser = await selfDescribingContract(config.contracts.FactoryBrowser.address);
        const rootFactory = await selfDescribingContract(config.contracts.VerifiedGroupFactory.address);
        count = Number(await rootFactory.methods.childCount(this.parent).call());
        if(count > 0) {
          if(!this.children) {
            // TODO create paginated interface for showing >100 contracts
            this.children = browser.methods.detailsMany(
              config.contracts.VerifiedGroupFactory.address, this.parent, 0, 100
            ).call();
          }
        } else {
          this.children = Promise.resolve([]);
        }
        const children = await this.children;
        return children.map(item => [
          `${item.name} ${item.metaname} ${item.item}`,
          item.item
        ]);
      case 'Allowed':
        browser = await selfDescribingContract(config.contracts.FactoryBrowser.address);
        contract = await selfDescribingContract(this.parent);
        count = Number(await contract.methods.allowedContractCount().call());
        if(count > 0) {
          if(!this.allowed) {
            // TODO create paginated interface for showing >100 contracts
            this.allowed = browser.methods.allowedMany(
              this.parent, 0, 100
            ).call();
          }
        } else {
          this.allowed = Promise.resolve([]);
        }
        const allowed = await this.allowed;
        return allowed.map(item => [
          `${item.name} ${item.metaname} ${item.item}`,
          item.item
        ]);
      case 'NewlyDeployed':
        return newlyDeployed().map(addr => [
          'deployNew #' + addr.slice(-1),
          addr
        ]);
    }
    return '';
  }
}
