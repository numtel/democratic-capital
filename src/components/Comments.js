import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, explorer, ellipseAddress} from '/utils/index.js';
import Paging from '/components/Paging.js';

export default class Comments extends AsyncTemplate {
  constructor(item, group) {
    super();
    this.set('item', item);
    this.set('groupAddress', group);
  }
  async init() {
    this.contract = await selfDescribingContract(config.contracts.FactoryBrowser.address);
    this.group = await selfDescribingContract(this.groupAddress);
  }
  async count() {
    return Number(await this.group.methods.commentCount(this.item).call());
  }
  async fetch(start, count) {
    return await this.contract.methods.commentsMany(
      this.groupAddress, this.item, start, count
    ).call();
  }
  async render() {
    return html`
      <div class="white window">
        <form onsubmit="tpl(this).submit(); return false">
          <fieldset>
            <legend>Post a Comment</legend>
            <textarea></textarea>
            <div class="commands">
              <button type="submit">Submit</button>
            </div>
          </fieldset>
        </form>
        ${new Paging(this.count.bind(this), this.fetch.bind(this), (result, options) => html`
          <fieldset>
            <legend>Comments</legend>
            ${options}
            <ul class="comments">
            ${result.map(comment => html`
              <li>
                <div class="meta">
                  <a href="${explorer(comment.author)}" $${this.link}>${ellipseAddress(comment.author)}</a>
                  <span class="created">
                    ${(new Date(comment.timestamp * 1000)).toLocaleString()}
                  </span>
                </div>
                <div class="body">
                  ${comment.text}
                </div>
              </li>
            `)}
            </ul>
          </fieldset>
        `)}
      </div>
    `;
  }
  async submit() {
    const text = this.element.querySelector('textarea').value;
    try {
      await app.wallet.send(this.group.methods.postComment(this.item, text));
      await this.superInit();
    } catch(error) {
      alert(error);
    }
  }
}
