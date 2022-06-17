import {AsyncTemplate, html} from '/utils/Template.js';

export default class Paging extends AsyncTemplate {
  constructor(countFun, fetchFun, renderPage, renderEmpty) {
    super();
    this.set('countFun', countFun);
    this.set('fetchFun', fetchFun);
    this.set('renderPage', renderPage);
    this.set('renderEmpty', renderEmpty || (() => html``));
    this.set('page', 1);
    this.set('perPage', 10);
  }
  async init() {
  }
  async render() {
    const count = await this.countFun();
    const pageCount = Math.ceil(count / this.perPage);
    const pageOpts = [];
    for(let i = 0; i < pageCount; i++) {
      pageOpts.push(html`
        <option
          $${this.page === i+1 ? 'selected' : ''}
        >${i+1}</option>`);
    }
    let result;
    if(count === 0) {
      return this.renderEmpty();
    } else {
      const start = (this.page - 1) * this.perPage;
      let fetchCount = this.perPage;
      if(start + fetchCount > count) {
        fetchCount = count - start;
      }
      result = await this.fetchFun(start, fetchCount);
    }
    return html`
      ${this.renderPage(result, html`
        <div class="page-options">
          <label>
            <span>Page</span>
            <select onchange="tpl(this).setPage(this.value)">
              ${pageOpts}
            </select>
          </label>
          <label>
            <span>Per Page</span>
            <select onchange="tpl(this).setPerPage(this.value)">
              ${[10, 25, 100].map(pageCount => html`
                <option
                  $${this.perPage === pageCount ? 'selected' : ''}
                >${pageCount}</option>
              `)}
            </select>
          </label>
        </div>
      `)}
    `;
  }
  setPage(value) {
    this.set('page', Number(value));
  }
  setPerPage(value) {
    this.set('perPage', Number(value));
    this.set('page', 1);
  }
}
