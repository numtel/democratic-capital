import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, isAddress, applyDecimals, reverseDecimals} from '/utils/index.js';
import ERC20 from '/utils/ERC20.js';
import Input from '/components/Input.js';
import TopMenu from '/components/TopMenu.js';

export default class Details extends AsyncTemplate {
  constructor(address, method, parent) {
    super();
    this.set('address', address);
    this.set('method', method);
    this.set('parent', parent);
    this.set('needsApproval', null);
    this.set('insufficientBalance', null);
  }
  async init() {
    const BN = app.web3.utils.BN;
    this.contract = await selfDescribingContract(this.address);
    this.methodMeta = this.contract.metadata.methods[this.method];
    this.inputs = this.contract.options.jsonInterface
      .filter(x => x.name === this.method)[0].inputs
      .map((input, index) =>
        Object.assign(input,
          'fields' in this.methodMeta
          ? this.methodMeta.fields[index] : {}));
    this.tokens = []
    this.set('needsApproval', null);
    this.set('insufficientBalance', null);
    this.inputTokens = [];
    for(let i=0; i < this.inputs.length; i++) {
      const input = this.inputs[i];
      if('decimals' in input) {
        let token;
        if(input.decimals === 'this') {
          token = new ERC20(this.address);
        } else if(typeof input.decimals === 'number') {
          // Refers to field index
          this.inputTokens[i] = input.decimals;
        } else if(Array.isArray(input.decimals)) {
          // Method with arguments
          token = new ERC20(await this.contract.methods[input.decimals[0]](...input.decimals.slice(1)).call());
        } else if(typeof input.decimals === 'string') {
          // Refers to method name
          token = new ERC20(await this.contract.methods[input.decimals]().call());
        }
        if(token) {
          const decimals = await token.decimals();
          const symbol = await token.symbol();
          this.tokens[i] = { approval: null, balance: null, decimals, symbol, token };
        }
      }
    }
    if(this.methodMeta.approve) {
      for(let tokenAddress of this.methodMeta.approve) {
        let args = [];
        if(Array.isArray(tokenAddress)) {
          args = tokenAddress.slice(1);
          tokenAddress = tokenAddress[0];
        }
        if(tokenAddress in this.contract.methods) {
          tokenAddress = await this.contract.methods[tokenAddress](...args).call();
        }
        if(!isAddress(tokenAddress)) {
          this.tokens.push(null);
          continue;
        }
        const accounts = await app.wallet.accounts;
        const token = new ERC20(tokenAddress);
        const approval = await token.allowance(accounts[0], this.address);
        const balance = await token.balanceOf(accounts[0]);
        const decimals = await token.decimals();
        const symbol = await token.symbol();
        let value;
        if(('approveAmount' in this.methodMeta)
            && this.methodMeta.approveAmount[this.tokens.length]) {
          const amountFun = this.methodMeta.approveAmount[this.tokens.length];
          value = new BN(await this.contract.methods[amountFun]().call());
        } else {
          value = new BN(reverseDecimals(this[`arg_${this.tokens.length}`], decimals) || 0);
        }
        if((new BN(balance)).lt(value)) {
          this.set('insufficientBalance', this.tokens.length);
        }
        if((new BN(approval)).lt(value)) {
          this.set('needsApproval', this.tokens.length);
        }
        this.tokens.push({ token, approval, balance, value, decimals, symbol });
      }
    }
    if('thisToken' in this.methodMeta) {
      const accounts = await app.wallet.accounts;
      const token = new ERC20(this.address);
      const balance = await token.balanceOf(accounts[0]);
      const decimals = await token.decimals();
      const value = new BN(reverseDecimals(this[`arg_${this.thisToken}`], decimals) || 0);
      const symbol = await token.symbol();
      this.tokens[this.methodMeta.thisToken] = {token,approval:null,balance,value,decimals,symbol};
      if((new BN(balance)).lt(value)) {
        this.set('insufficientBalance', this.methodMeta.thisToken);
      }
    }
    document.title =`${this.contract.metadata.name}: ${this.method}`;
  }
  async render() {
    const BN = app.web3.utils.BN;
    const inputTpls = [];
    for(let index = 0; index < this.inputs.length; index++) {
      const input = this.inputs[index];
      if(this.tokens[index] && this.tokens[index].balance !== null &&  !('hint' in input)) {
        input.hint = 'Balance: ' + applyDecimals(this.tokens[index].balance, this.tokens[index].decimals);
      }
      if(!(`arg_${index}` in this)) {
        this[`arg_${index}`] = input.internalType.endsWith('[]') ? [] : '';
      }
      inputTpls.push(new Input(
        input,
        `arg_${index}`,
        this.parent || this.address,
        (value) => {
          this[`arg_${index}`] = value;
          if(this.tokens[index]) {
            const amount = reverseDecimals(value, this.tokens[index].decimals);
            this.tokens[index].value = new BN(amount);
          }
          this.set('needsApproval', null);
          this.set('insufficientBalance', null);
          for(let i = 0; i<this.tokens.length; i++) {
            const token = this.tokens[i];
            if(!token) continue;
            if(token.balance !== null && (new BN(token.balance)).lt(token.value)) {
              this.set('insufficientBalance', i);
            }
            if(token.approval !== null && (new BN(token.approval)).lt(token.value)) {
              this.set('needsApproval', i);
            }
          }
        },
        this[`arg_${index}`],
        this.address
      ));
    }
    let parentUrl = '/' + this.address;
    if(this.parent) parentUrl = '/' + this.parent + parentUrl;
    return html`
      ${new TopMenu(html`
        <a href="${parentUrl}" $${this.link}>Back to ${this.contract.metaname}</a>
      `)}
      <div class="white window">
        <form onsubmit="tpl(this).submit(); return false">
          <fieldset>
            <legend>${this.contract.metadata.name}: ${this.method}</legend>
            ${inputTpls}
            <div class="commands">
              ${this.insufficientBalance !== null ? html`
                <button type="submit">Insufficient Balance (${applyDecimals(this.tokens[this.insufficientBalance].value, this.tokens[this.insufficientBalance].decimals)} ${this.tokens[this.insufficientBalance].symbol})</button>
              ` : this.needsApproval !== null ? html`
                <button type="submit">Approve Spend (${applyDecimals(this.tokens[this.needsApproval].value, this.tokens[this.needsApproval].decimals)} ${this.tokens[this.needsApproval].symbol})</button>
              ` : html`
                <button type="submit">Submit</button>
              `}
            </div>
          </fieldset>
        </form>
      </div>
    `;
  }
  async submit() {
    try {
      const keys = Object.keys(this)
        .filter(key => key.startsWith('arg_'));
      const args = [];
      for(let i = 0; i<keys.length; i++) {
        if(this.inputTokens[i]) {
          const tokenAddress = this[`arg_${this.inputTokens[i]}`];
          if(!isAddress(tokenAddress))
            throw new Error('Missing token address!');
          const token = new ERC20(tokenAddress);
          const decimals = await token.decimals();
          const raw = this[keys[i]];
          args.push(reverseDecimals(raw, decimals));
        } else if(this.tokens[i]) {
          args.push(this.tokens[i].value);
        } else {
          args.push(this[keys[i]]);
        }
      }
      if(this.insufficientBalance !== null) {
        alert('Insufficient Balance!');
      } else if(this.needsApproval !== null) {
        const approval = this.tokens[this.needsApproval];
        await approval.token.approve(this.address, approval.value);
        await this.superInit();
      } else {
        await app.wallet.send(this.contract.methods[this.method](...args));
        let parentUrl = '/' + this.address;
        if(this.parent) parentUrl = '/' + this.parent + parentUrl;
        app.router.goto(parentUrl);
      }
    } catch(error) {
      alert(error);
    }
  }
}
