import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, contractFromMeta, isAddress, isFunSig, newlyDeployed} from '/utils/index.js';
import ABIDecoder from '/utils/ABIDecoder.js';
import Input from '/components/Input.js';
import {SubProposal} from '/pages/Proposal.js';

export default class ProposalTxs extends AsyncTemplate {
  constructor(group, item, onChange, value) {
    super();
    this.set('groupAddress', group);
    this.set('itemAddress', item);
    this.set('onChange', onChange);
    this.set('initValue', value);
    this.set('entries', []);
  }
  async init() {
    if(this.initValue) {
      for(let entry of this.initValue) {
        const to = entry.slice(0,42);
        const data = '0x' + entry.slice(42);
        const decoded = await decodeTx(to, data, this.entries);
        this.entries.push({ to, data, decoded });
      }
    }
    const elections = await selfDescribingContract(this.itemAddress);
    this.set('allowedPrefixes', await elections.methods.invokePrefixes().call());

    this.set('contractInput', new Input({
      name: 'Contract',
      select: [ 'Allowed', 'Children', 'NewlyDeployed' ],
      filter: this.allowedPrefixes.map(x => x.slice(0,42).toLowerCase()),
    }, 'invoke_to', this.groupAddress, (value) => {
      this.set('addTxTo', isAddress(value) ? value : undefined);
    }));
  }
  async render() {
    const deployed = await newDeploys(this.addTxTo, this.entries);
    const addInputs = await this.fetchInputs(deployed);
    let methodFilter;
    if(this.addTxTo) {
      methodFilter = this.allowedPrefixes
        .filter(x => x.toLowerCase().startsWith(this.addTxTo.toLowerCase()))
        .map(x => '0x' + x.slice(42));
      if(methodFilter.indexOf('0x') !== -1) methodFilter = [];
    }

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
          deployed,
          contract:  this.addTxTo,
          select: [ 'Methods' ],
          filter: methodFilter,
        }, 'invoke_method', this.groupAddress, (value) => {
          this.set('addTxMethod', isFunSig(value) ? value : undefined);
          this.updateTxData(deployed);
        }, this.addTxMethod)}
        ${addInputs && addInputs.map((input, index) => html`
          ${new Input(input, 'addArg_' + index, this.groupAddress, (value) => {
            this.set('addArg_' + index, value);
            this.updateTxData(deployed);
          }, this['addArg_' + index], this.addTxTo)}
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
            <tbody>
            ${this.entries.map((entry, index) => html`
            <tr>
            <td>
              <dl>
              <dt>Contract</dt>
              <dd>${entry.to}</dd>
              ${entry.decoded ? html`
                <dt>Method</dt>
                <dd>${entry.decoded.name}</dd>
                ${entry.decoded.params.length > 0 && html`
                  <dt>Arguments</dt>
                  <dd>
                    <table>
                      <thead>
                        <th>Name</th>
                        <th>Value</th>
                      </thead>
                      <tbody>
                        ${entry.decoded.params.map(param => html`
                          <tr>
                            <td>${param.name} (${param.type})</td>
                            ${param.value instanceof SubProposal
                              ? html`
                                <td>${param.value}</td>
                                `
                              : html`
                                <td class="wrap">${param.value}</td>
                              `}
                          </tr>
                        `)}
                      </tbody>
                    </table>
                  </dd>
                `}
              ` : html`
                <dt>Transaction Data</dt>
                <dd class="wrap">${entry.data}</dd>
              `}
              </dl>
            </td>
            <td>
              <button onclick="tpl(this).removeTx(${index}); return false;">Remove</button>
            </td>
            </tr>
            `)}
            </tbody>
          </table>
        </fieldset>
      `}
    `;
  }
  async fetchInputs(deployed) {
    if(!isAddress(this.addTxTo) || !isFunSig(this.addTxMethod)) return [];
    try {
      const contract = deployed ? deployed : await selfDescribingContract(this.addTxTo);
      const method = contract.options.jsonInterface
        .filter(x => x.signature === this.addTxMethod)[0];
      const inputs = method.inputs;
      if(contract.metadata.methods && (method.name in contract.metadata.methods)) {
        const inputsMeta = contract.metadata.methods[method.name].fields;
        if(inputsMeta) {
          for(let i = 0; i < inputsMeta.length; i++) {
            Object.assign(inputs[i], inputsMeta[i]);
          }
        }
      }
      return inputs;
    } catch(error) {
      console.error(error);
      return null;
    }
  }
  async updateTxData(deployed) {
    if(!isAddress(this.addTxTo) || !isFunSig(this.addTxMethod)) return;
    try {
      const contract = deployed ? deployed : await selfDescribingContract(this.addTxTo);
      const method = contract.options.jsonInterface
        .filter(x => x.signature === this.addTxMethod)[0];
      const values = method.inputs.map((input, index) => this['addArg_' + index] || "");
      const encoded  = contract.methods[method.name](...values).encodeABI();
      this.set('addTxData', encoded);
    } catch(error) {
      console.error(error);
      this.set('addTxData', '');
    }
  }
  async addTx() {
    if(!isAddress(this.addTxTo)
        || !this.addTxData
        || !(this.addTxData.startsWith('0x') && this.addTxData.length > 10)) {
      alert('Invalid contract address or missing transaction data!');
    } else {
      this.entries.push({
        to: this.addTxTo,
        data: this.addTxData,
        decoded: await decodeTx(this.addTxTo, this.addTxData, this.entries),
      });
      this.entriesChanged();
    }
  }
  removeTx(index) {
    this.entries.splice(index, 1);
    this.entriesChanged();
  }
  entriesChanged() {
    this.onChange(this.entries.map(entry => entry.to + entry.data.slice(2)));
    this.set();
  }
}

export async function newDeploys(address, entries) {
  const whichNew = newlyDeployed().indexOf(address);
  if(whichNew === -1) return null;
  let deployNum = 0;
  for(let i = 0; i<entries.length; i++) {
    const entry = entries[i];
    if(!entry.decoded) continue;
    if(!entry.decoded.name === 'deployNew') continue;
    if(whichNew < deployNum) {
      deployNum++;
      continue;
    }
    const factory = await selfDescribingContract(entry.to);
    if(!('childMeta' in factory.methods)) return null;
    const childMeta = await factory.methods.childMeta().call();
    // Contract address doesn't matter since only used for ABI details
    const contract = await contractFromMeta(childMeta, childMeta);
    return contract;
  }
  return null;
}

export async function decodeTx(to, data, entries) {
  let decoded = null;
  try {
    const deployed = await newDeploys(to, entries);
    const contract = deployed ? deployed : await selfDescribingContract(to);
    const decoder = new ABIDecoder(contract.options.jsonInterface);
    decoded = decoder.decodeMethod(data);
    if(decoded.name === 'propose'
        && decoded.params.length === 1
        && decoded.params[0].type === 'bytes[]'
        && decoded.params[0].name === 'data') {
      decoded.params[0].value = new SubProposal(decoded.params[0].value, entries);
    }
  } catch(error) {
    // This data cannot be decoded
  }
  return decoded;
}
