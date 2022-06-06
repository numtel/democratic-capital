import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {PaginatedList} from './PaginatedList.js';
import {AppTabs} from './AppTabs.js';

export class GroupComments extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    itemAddress: {type: String},
    _loading: {state: true},
    _details: {state: true},
  };
  constructor() {
    super();
    this._loading = true;
    this._details = {};
    this.contract = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    this.contract = await this.loadContract('VerifiedGroup', this.groupAddress);
    this._loading = false;
  }
  async count() {
    return Number(await this.contract.methods.commentCount(this.itemAddress).call());
  }
  async fetch(index) {
    return await this.contract.methods.comments(this.itemAddress, index).call();
  }
  renderComments(comments) {
    return html`
      <ul class="comments">
        ${comments.map(comment => html`
          <li>
            <div class="meta">
              <a @click="${this.open}"
                class="author"
                  href="${this.explorer(comment.author)}">
                ${this.ellipseAddress(comment.author)}
              </a>
              <span class="timestamp">${(new Date(comment.timestamp * 1000)).toString()}</span>
            </div>
            <div class="body">${comment.text}</div>
          </li>
        `)}
      </ul>
    `;
  }
  renderEmpty() {
    return html`
      <p>No Comments Yet!</p>
    `;
  }
  renderLoading() {
    return html`
      <p>Loading...</p>
    `;
  }
  tabSections() {
    return [
      { name: 'Comments',
        render: () => html`
          <paginated-list
            .count=${this.count.bind(this)}
            .fetchOne=${this.fetch.bind(this)}
            .renderer=${this.renderComments.bind(this)}
            .emptyRenderer=${this.renderEmpty.bind(this)}
            .loadingRenderer=${this.renderLoading.bind(this)}
          ></paginated-list>
        `},
      { name: 'Post New Comment',
        render: () => html`
          <form @submit="${this.postComment.bind(this)}">
            <textarea></textarea>
            <button type="submit">Submit</button>
          </form>
        `},
    ];
  }
  async postComment(event) {
    event.preventDefault();
    const text = event.target.querySelector('textarea').value;
    if(text) {
      try {
        await this.send(this.contract.methods.postComment(this.itemAddress, text));
        event.target.closest('group-comments').querySelector('app-tabs').setTab(0);
      } catch(error) {
        this.displayError(error);
      }
    }
  }
  render() {
    if(this._loading) {
      return html`
        <main><p>Loading...</p></main>
      `;
    }
    return html`
      <main>
        <app-tabs .tabs=${this.tabSections()}></app-tabs>
      </main>
    `;
  }
}
customElements.define('group-comments', GroupComments);
