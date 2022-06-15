import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, isAddress, isFunSig} from '/utils/index.js';
import Input from '/components/Input.js';

export default class ProposalTxs extends AsyncTemplate {
  constructor(group, onChange) {
    super();
    this.set('groupAddress', group);
    this.set('onChange', onChange);
    this.set('entries', []);
  }
  async init() {
    this.set('contractInput', new Input({
      name: 'Contract',
      select: [ 'Allowed', 'Children' ],
    }, 'invoke_to', this.groupAddress, (value) => {
      this.set('addTxTo', isAddress(value) ? value : undefined);
    }));
  }
  async render() {
    const addInputs = await this.fetchInputs();
    return html`
      <fieldset>
        <legend>Add Transaction</legend>
        ${this.contractInput}
        ${new Input({
          name: 'Transaction Data',
        }, 'add_tx', this.groupAddess, (value) => {
          this.set('addTxData', value)
        }, this.addTxData)}
        ${this.addTxTo && new Input({
          name: 'Method',
          contract:  this.addTxTo,
          select: [ 'Methods' ],
        }, 'invoke_method', this.groupAddress, (value) => {
          this.set('addTxMethod', isFunSig(value) ? value : undefined);
          this.updateTxData();
        }, this.addTxMethod)}
        ${addInputs && addInputs.map((input, index) => html`
          ${new Input(input, 'addArg_' + index, this.groupAddress, (value) => {
            this.set('addArg_' + index, value);
            this.updateTxData();
          }, this['addArg_' + index])}
        `)}
        <div class="commands">
          <button onclick="tpl(this).addTx(); return false;">Add to Proposal</button>
        </div>
      </fieldset>
      ${this.entries.length === 0 ? html`
        <p>Please add at least one transaction.</p>
      ` : html`
        <fieldset>
          <legend>Proposal Transactions</legend>
          <table>
            ${JSON.stringify(this.entries, null, 2)}
          </table>
        </fieldset>
      `}
    `;
  }
  async fetchInputs() {
    if(!isAddress(this.addTxTo) || !isFunSig(this.addTxMethod)) return [];
    try {
      const contract = await selfDescribingContract(this.addTxTo);
      const method = contract.options.jsonInterface
        .filter(x => x.signature === this.addTxMethod)[0];
      const inputs = method.inputs;
      if(contract.metadata.methods && (method.name in contract.metadata.methods)) {
        const inputsMeta = contract.metadata.methods[method.name].fields;
        for(let i = 0; i < inputsMeta.length; i++) {
          Object.assign(inputs[i], inputsMeta[i]);
        }
      }
      return inputs;
    } catch(error) {
      console.error(error);
      return null;
    }
  }
  async updateTxData() {
    if(!isAddress(this.addTxTo) || !isFunSig(this.addTxMethod)) return;
    try {
      const contract = await selfDescribingContract(this.addTxTo);
      const method = contract.options.jsonInterface
        .filter(x => x.signature === this.addTxMethod)[0];
      const values = method.inputs.map((input, index) => this['addArg_' + index] || "");
      const encoded  = contract.methods[method.name](...values).encodeABI();
      this.set('addTxData', encoded);
    } catch(error) {
      console.error(error);
      this.set('addTxData', '');
      alert('Invalid transaction data!');
    }
  }
  async addTx() {
    const values = Array.from(this.element.querySelectorAll('input'))
      .map(input => input.value);
    if(!isAddress(this.addTxTo)
        || !this.addTxData
        || !(this.addTxData.startsWith('0x') && this.addTxData.length > 10)) {
      alert('Invalid contract address or missing transaction data!');
    } else {
      this.entries.push({ to: this.addTxTo, data: this.addTxData });
      this.entriesChanged();
    }
  }
  entriesChanged() {
    this.onChange(this.entries.map(entry => entry.to + entry.data.slice(2)));
    this.set();
  }
}
