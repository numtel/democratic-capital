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
  render() {
    return html`
      <a href="/${this.address}" $${this.link}>Back to ${this.contract.metadata.name}</a>
      <h2>${this.contract.metadata.name}: ${this.method}</h2>
      <form onsubmit="tpl(this).submit(); return false">
        <fieldset>
          ${this.inputs.map((input, index) =>
            'hidden' in input ? html`
              <input
                type="hidden"
                name="arg_${index}"
                value="${givenValues(input.hidden)}">
            ` : html`
              <div>
                <label>
                  <span>${input.name}</span>
                  <input name="arg_${index}">
                </label>
                ${'hint' in input && html`
                  <span class="hint">${input.hint}</span>
                `}
              </div>
            `)}
          <div class="commands">
            <button type="submit">Submit</button>
          </div>
        </fieldset>
      </form>
    `;
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
}

function givenValues(identifier) {
  if(identifier === 'Verification') {
    return config.contracts.MockVerification.address;
  }
  return '';
}
