import {html, css} from 'lit';
import {ifDefined} from 'lit/directives/if-defined.js';
import {BaseElement} from './BaseElement.js';

export class PaginatedList extends BaseElement {
  static properties = {
    updateIndex: {type: Number, reflect: true},
    count: {type: Object},
    fetchOne: {type: Object},
    renderer: {type: Object},
    emptyRenderer: {type: Object},
    loadingRenderer: {type: Object},
    page: {type: Number, reflect: true},
    perPage: {type: Number, reflect: true},
    _loading: {state: true},
    _count: {state: true},
    _page: {state: true},
  };
  constructor() {
    super();
    this.page = 1;
    this.perPage = 10;
    this._loading = true;
    this._count = 0;
    this._page = [];
  }
  async loadPage() {
    this._loading = true;
    this._page = [];
    this._count = await this.count();
    if(this._count === 0) {
      this._loading = false;
      return;
    }
    const start = this._count - (this.page - 1) * this.perPage - 1;
    let end = start - this.perPage + 1;
    if(end < 0) end = 0;
    for(let i = start; i >= end; i--) {
      this._page.push(await this.fetchOne(i));
    }
    this._loading = false;
  }
  render() {
    if(this._loading) return this.loadingRenderer();
    if(this._count === 0) return this.emptyRenderer();
    const pageOptions = [];
    const pageCount = Math.floor(this._count / this.perPage);
    for(let i = 0; i <= pageCount; i++) {
      pageOptions.push(html`
        <option selected="${ifDefined(this.page === i + 1 ? true : undefined)}">${i + 1}</option>
      `);
    }
    return html`
      <select class="page" @change="${this.setPage}">
        ${pageOptions}
      </select>
      <select class="perpage" @change="${this.setPerPage}">
        ${[ 10, 25, 100 ].map(perPage => html`
          <option selected="${ifDefined(this.perPage === perPage ? true : undefined)}">
            ${perPage}
          </option>
        `)}
      </select>
      ${this.renderer(this._page)}
    `;
  }
  async update(changedProperties) {
    super.update();
    if(changedProperties.has('updateIndex'))
      await this.loadPage();
  }
  async setPage(event) {
    this.page = Number(event.target.value);
    await this.loadPage();
  }
  async setPerPage(event) {
    this.perPage = Number(event.target.value);
    this.page = 1;
    await this.loadPage();
  }
}

customElements.define('paginated-list', PaginatedList);
