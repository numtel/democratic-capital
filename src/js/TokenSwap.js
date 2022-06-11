import {html, css} from 'lit';
import {ifDefined} from 'lit/directives/if-defined.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';

export class TokenSwap extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    poolCount: {type: Number},
    _loading: {state: true},
    _details: {state: true},
    _from: {state: true},
    _to: {state: true},
  };
  constructor() {
    super();
    this._loading = true;
    this._details = {};
    this.poolCount = 0;
    this.factory = null;
    this._from = null;
    this._to = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.factory = await this.loadContract('ERC20LiquidityPoolFactory', window.config.contracts.ERC20LiquidityPoolFactory.address);
    this._details.poolAddresses = await this.childrenOfType(this.groupAddress, 'ERC20LiquidityPool');
    this._details.tokens = {};
    this._details.pools = {};
    for(let poolAddress of this._details.poolAddresses) {
      const contract = await this.loadContract('ERC20LiquidityPool', poolAddress);
      const tokens = [];
      for(let i = 0; i < 2; i++) {
        const token = await contract.methods.tokens(i).call();
        tokens.push(token);
        if(!(token in this._details.tokens)) {
          this._details.tokens[token] = {
            pools: [poolAddress],
          };
        } else {
          this._details.tokens[token].pools.push(poolAddress);
        }
      }
      this._details.pools[poolAddress] = { contract, tokens };
    }
    for(let tokenAddress of Object.keys(this._details.tokens)) {
      const token = this._details.tokens[tokenAddress];
      const contract = token.contract = await this.loadContract('IERC20', tokenAddress);
      token.name = await contract.methods.name().call();
      token.symbol = await contract.methods.symbol().call();
      token.balance = await contract.methods.balanceOf(app.accounts[0]).call();
      token.siblings = token.pools.map(poolAddress => {
        const pool = this._details.pools[poolAddress];
        return pool.tokens[0] === tokenAddress ? pool.tokens[1] : pool.tokens[0];
      });
    }
    console.log(this._details);
    this._loading = false;
  }
  render() {
    if(this._loading) return html`
      <p>Loading...</p>
    `;
    if(this._error) return html`
      <p>Invalid Contract!</p>
    `;
    return html`
      <form @submit="${this.swap}">
        <fieldset>
          <label>
            <span>From</span>
            <select @change="${this.setFrom}" value="${this._from}">
              <option
                 selected="${ifDefined(!this._from ? true : undefined)}"
              ></option>
              ${Object.keys(this._details.tokens).map(tokenAddress => html`
                <option
                 value="${tokenAddress}"
                 selected="${ifDefined(this._from === tokenAddress ? true : undefined)}"
                >${this._details.tokens[tokenAddress].symbol}</option>
              `)}
            </select>
          </label>
          ${this._from ? html`
            <label>
              <span>To</span>
              <select @change="${this.setTo}" value="${this._to}">
                <option
                   selected="${ifDefined(!this._to ? true : undefined)}"
                ></option>
                ${this._details.availableTo.map(tokenAddress => html`
                  <option
                   value="${tokenAddress}"
                   selected="${ifDefined(this._to === tokenAddress ? true : undefined)}"
                  >${this._details.tokens[tokenAddress].symbol}</option>
                `)}
              </select>
            </label>
          ` : ''}
        </fieldest>
      </form>
    `;
  }
  swap(event) {
    event.preventDefault();
  }
  async setTo(event) {
    this._to = event.target.value;

    this._loading = true;
    if(this._to) {
      const found = findSwapRoutes(this._details.tokens, this._details.pools, [this._from], this._to);
      console.log(found);

    }
    this._loading = false;
  }
  async setFrom(event) {
    this._loading = true;
    this._from = event.target.value;
    this._details.availableTo = [];
    // TODO why doesn't this work?
    this._to = '';

    if(this._from) {
      const token = this._details.tokens[this._from];
      const found = findLinkedTokens(this._details.tokens, this._details.pools, [this._from], token);
      this._details.availableTo = found.filter(x => x !== this._from);
    }

    this._loading = false;
  }
}
customElements.define('token-swap', TokenSwap);

function findLinkedTokens(tokens, pools, searched, cur) {
  for(let poolAddress of cur.pools) {
    const pool = pools[poolAddress];
    for(let i = 0; i < pool.tokens.length; i++) {
      if(searched.indexOf(pool.tokens[i]) === -1) {
        searched.push(pool.tokens[i]);
        const recurse = findLinkedTokens(tokens, pools, searched, tokens[pool.tokens[i]]);
        searched.concat(recurse.slice(searched.length));
      }
    }
  }
  return searched;
}

function findSwapRoutes(tokens, pools, route, to) {
  const routes = [];
  const token = tokens[route[route.length - 1]];
  if(token.siblings.indexOf(to) !== -1) {
    routes.push(route.concat([to]));
  } else {
    const paths = token.siblings
      .filter(branch => route.indexOf(branch) === -1)
      .map(branch => findSwapRoutes(tokens, pools, route.concat([branch]), to));
    for(let branch of paths) {
      for(let path of branch) {
        if(path[path.length - 1] === to) {
          routes.push(path);
        }
      }
    }
  }
  return routes;
}
