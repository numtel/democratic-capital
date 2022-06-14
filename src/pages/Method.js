import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract} from '/utils/index.js';

export default class Details extends AsyncTemplate {
  constructor(address, method) {
    super();
    this.set('address', address);
    this.set('method', method);
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
    this.inputs = this.contract.options.jsonInterface
      .filter(x => x.name === this.method)[0].inputs
      .map((input, index) =>
        Object.assign(input, this.contract.metadata.methods[this.method][index]));
  }
  async render() {
    const inputTpls = [];
    for(let index = 0; index < this.inputs.length; index++) {
      const input = this.inputs[index];
      if('hidden' in input) {
        inputTpls.push(html`
          <input
            type="hidden"
            name="arg_${index}"
            value="${await this.givenValues(input.hidden)}">
        `);
      } else {
        let selector;
        if('select' in input) {
          const optgroups = [];
          for(let type of input.select) {
            const options = [];
            for(let opt of await this.givenValues(type)) {
              options.push(html`
                <option value="${opt[1]}">${opt[0]}</option>
              `)
            }
            optgroups.push(html`
              <optgroup label="${type}">
                ${options}
              </optgroup>
            `);
          }
          selector = html`
            <select name="sel_${index}" onchange="tpl(this).setVal(${index})">
              <option value="">Choose value...</option>
              ${optgroups}
            </select>
          `;
        }
        inputTpls.push(html`
          <div>
            <label>
              <span>${input.name}</span>
              <input name="arg_${index}" value="${this['arg_' + index] || ''}">
            </label>
            ${selector}
            ${'hint' in input && html`
              <span class="hint">${input.hint}</span>
            `}
          </div>`);
       }
    }
    return html`
      <a href="/${this.address}" $${this.link}>Back to ${this.contract.metaname}</a>
      <h2>${this.contract.metadata.name}: ${this.method}</h2>
      <form onsubmit="tpl(this).submit(); return false">
        <fieldset>
          ${inputTpls}
          <div class="commands">
            <button type="submit">Submit</button>
          </div>
        </fieldset>
      </form>
    `;
  }
  setVal(index) {
    this.set('arg_' + index, this.element.querySelector(`select[name="sel_${index}`).value);
  }
  async submit() {
    const args = Array.from(this.element.querySelectorAll('input[name^="arg_"]'))
      .map(input => input.value);
    try {
      await app.wallet.send(this.contract.methods[this.method](...args));
      app.router.goto('/' + this.address);
    } catch(error) {
      alert(error);
    }
  }
  async givenValues(identifier) {
    switch(identifier) {
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
      case 'Children':
        return [ ['foo', '0x1234'] ];
      case 'Allowed':
        const browser = await selfDescribingContract(config.contracts.FactoryBrowser.address);
        const count = Number(await this.contract.methods.allowedContractCount().call());
        if(count > 0) {
          if(!this.allowed) {
            this.allowed = browser.methods.allowedMany(
              this.address, 0, 100
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
    }
    return '';
  }
}
