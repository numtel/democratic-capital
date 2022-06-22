import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, applyDecimals, reverseDecimals} from '/utils/index.js';
import ERC20 from '/utils/ERC20.js';
import PreviewToken from '/components/input/PreviewToken.js';

export default class Swap extends AsyncTemplate {
  constructor(group) {
    super();
    this.set('group', group);
    this.set('from', null);
    this.set('to', null);
    this.set('slippage', 0.005);
  }
  async init() {
    let accounts;
    await Promise.all([
      (async () => {
        this.factory = await selfDescribingContract(config.contracts.ERC20LiquidityPoolFactory.address);
        this.set('count', Number(await this.factory.methods.groupPoolCount(this.group).call()));
        this.set('pools', this.count === 0 ? [] : await this.factory.methods.groupPools(this.group, 0, this.count).call());
      })(),
      (async () => {
        accounts = await app.wallet.accounts;
      })(),
    ]);
    let tokenTxs = []
    const tokens = {};
    for(let i = 0; i < this.pools.length; i++) {
      const pool = this.pools[i];
      for(let which of ['0', '1']) {
        const tokenAddress = pool['token' + which];
        const otherToken = pool['token' + (which === '0' ? '1' : '0')];
        const reserves = pool['reserve' + which];
        if(!(tokenAddress in tokens)) {
          const erc20 = new ERC20(tokenAddress);
          tokens[tokenAddress] = {
            address: tokenAddress,
            token: erc20,
            siblings: {
              [otherToken]: { pool: i }
            }
          };

          tokenTxs.push((async() => {
            tokens[tokenAddress].name = await erc20.name();
          })());
          tokenTxs.push((async() => {
            tokens[tokenAddress].symbol = await erc20.symbol();
          })());
          tokenTxs.push((async() => {
            tokens[tokenAddress].decimals = await erc20.decimals();
          })());
          tokenTxs.push((async() => {
            tokens[tokenAddress].balance = await erc20.balanceOf(accounts[0]);
          })());
          tokenTxs.push((async() => {
            tokens[tokenAddress].allowance = await erc20.allowance(accounts[0], config.contracts.ERC20LiquidityPoolFactory.address);
          })());
        } else {
          tokens[tokenAddress].siblings[otherToken] = { pool: i };
        }
      }
    }
    await Promise.all(tokenTxs);
    this.set('tokens', tokens);
    this.setFrom(this.from || Object.keys(tokens)[0]);
  }
  async render() {
    if(this.count === 0) return html``;
    const BN = app.web3.utils.BN;
    return html`
      <div class="white window">
        <form onsubmit="tpl(this).submit(); return false">
        <fieldset>
          <legend>Swap Tokens</legend>
          <div class="field">
            <label>
              <span>From</span>
              <select onchange="tpl(this).setFrom(this.value)">
                ${Object.keys(this.tokens).map(tokenAddress => {
                  const token = this.tokens[tokenAddress];
                  return html`
                    <option value="${token.address}"
                      $${this.from === token.address ? 'selected' : ''}
                    >
                      ${token.name} (${token.symbol}) ${token.address}
                    </option>
                  `;
                })}
              </select>
              <span class="preview">
                ${this.previewFrom}
              </span>
            </label>
          </div>
          <div class="field">
            <label>
              <span>To</span>
              <select onchange="tpl(this).setTo(this.value)">
                ${this.linked.map(tokenAddress => {
                  const token = this.tokens[tokenAddress];
                  return html`
                    <option value="${token.address}"
                      $${this.to === token.address ? 'selected' : ''}
                    >
                      ${token.name} (${token.symbol}) ${token.address}
                    </option>
                  `;
                })}
              </select>
              <span class="preview">
                ${this.previewTo}
              </span>
            </label>
          </div>
            ${this.bestRate === 0 ? html`
              <div class="rate insufficient">
                Insufficient Liquidity!
              </div>
            ` : html`
              <div class="rate">
                Rate: ${this.bestRate} ${this.tokens[this.to].symbol} per ${this.tokens[this.from].symbol}
              </div>
              <div class="field">
                <label>
                  <span>Amount (Balance: ${applyDecimals(this.tokens[this.from].balance, this.tokens[this.from].decimals)} ${this.tokens[this.from].symbol})</span>
                  <input onchange="tpl(this).setAmount(this.value)" value="${applyDecimals(this.amount || 0, this.tokens[this.from].decimals)}">
                </label>
              </div>
              <div class="received">
                Receive: ${applyDecimals(this.received, this.tokens[this.to].decimals)} ${this.tokens[this.to].symbol}
                <br />
                Minimum Received: ${applyDecimals(this.minReceived, this.tokens[this.to].decimals)} ${this.tokens[this.to].symbol}
              </div>
              <div class="commands">
                ${this.insufficientBalance ? html`
                  <button type="submit">Insufficient Balance</button>
                ` : this.needsApproval ? html`
                  <button type="submit">Approve Spend</button>
                ` : html`
                  <button type="submit">Swap</button>
                `}
              </div>
            `}
        </fieldset>
        </form>
      </div>
    `;
  }
  async submit() {
    try {
      if(this.needsApproval) {
        await this.tokens[this.from].token.approve(config.contracts.ERC20LiquidityPoolFactory.address, this.amount);
        await this.superInit();
      } else if(this.insufficientBalance) {
        alert('Insufficient Balance!');
      } else {
        await app.wallet.send(this.factory.methods.swapRouter(this.group, this.bestRoute, this.amount, this.minReceived));
        await this.superInit();
      }
    } catch(error) {
      alert(error);
    }
  }
  async setFrom(value) {
    this.set('from', value);
    this.set('previewFrom', new PreviewToken(this.from));
    this.set('linked', this.findLinkedTokens(value).filter(x => x!==value));
    this.setTo(this.linked[0]);
  }
  async setTo(value) {
    this.set('to', value);
    this.set('previewTo', new PreviewToken(this.to));
    const routes = this.findSwapRoutes(this.from, this.to);
    let bestRate = 0;
    let bestRoute;
    for(let route of routes) {
      const rate = this.findRate(route);
      if(rate > bestRate) {
        bestRate = rate;
        bestRoute = route;
      }
    }
    this.set('bestRate', bestRate);
    this.set('bestRoute', bestRoute);
    this.setAmount(applyDecimals(this.amount || 0, this.tokens[this.from].decimals));
  }
  async setAmount(value) {
    const BN = app.web3.utils.BN;
    this.set('amount', reverseDecimals(value, this.tokens[this.from].decimals));
    this.set('needsApproval', new BN(this.tokens[this.from].allowance).lt(new BN(this.amount)));
    this.set('insufficientBalance', new BN(this.tokens[this.from].balance).lt(new BN(this.amount)));
    if(this.bestRate > 0) {
      // TODO adjust best route if dependent on liquidity reserves
      this.set('received', this.findRate(this.bestRoute, this.amount));
      this.set('minReceived', Math.floor(this.received * (1-this.slippage)));
    }
  }
  findLinkedTokens(from, linked) {
    linked = linked || [];
    for(let sibling of Object.keys(this.tokens[from].siblings)) {
      if(linked.indexOf(sibling) === -1) {
        linked.push(sibling);
        const recurse = this.findLinkedTokens(sibling, linked);
        if(recurse.length > linked) {
          linked = linked.concat(recurse.slice(linked.length));
        }
      }
    }
    return linked;
  }
  findSwapRoutes(from, to, route, routes) {
    route = route || [from];
    routes = routes || [];
    const token = this.tokens[from];
    if(Object.keys(token.siblings).indexOf(to) !== -1) {
      routes.push(route.concat([to]));
    } else {
      const paths = Object.keys(token.siblings)
        .filter(branch => route.indexOf(branch) === -1)
        .map(branch => this.findSwapRoutes(branch, to, route.concat([branch])));
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
  findRate(route, inputRaw) {
    const BN = app.web3.utils.BN;
    const decimals = new BN(10).pow(new BN(20));
    const display = 100000;
    const antiDecimals = decimals.div(new BN(display));
    let input = (new BN(inputRaw || 0));
    const pools = [];
    let out = 1;
    for(let i = 0; i<route.length-1; i++) {
      const token = this.tokens[route[i]];
      const fromDecimals = new BN(10).pow(new BN(token.decimals));
      const toDecimals = new BN(10).pow(new BN(this.tokens[route[i+1]].decimals));
      const pool = this.pools[token.siblings[route[i+1]].pool];
      const reserveFrom = route[i] === pool.token0 ? pool.reserve0 : pool.reserve1;
      const reserveTo = route[i] === pool.token0 ? pool.reserve1 : pool.reserve0;
      if(reserveFrom === '0' || reserveTo === '0') return 0;
      const rate = new BN(reserveTo).mul(decimals).mul(fromDecimals).div((new BN(reserveFrom)).add(input)).div(toDecimals).div(antiDecimals).toNumber() / display;
      const fee = Number(pool.swapFee) / 0xffffffff;
      if(typeof inputRaw !== 'undefined') {
        input = input.mul(decimals).mul(toDecimals).mul(new BN(display * rate * (1-fee))).div(fromDecimals).div(new BN(display)).div(decimals);
      } else {
        out *= rate * (1-fee);
      }
      pools.push({ pool, rate, fee });
    }

    if(typeof inputRaw !== 'undefined') {
      return input.toString(10);
    }
    return out;
  }
}

