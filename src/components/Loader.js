import {Template, html} from '/utils/Template.js';

export default class Loader extends Template {
  render() {
    return html`
      <div class="loader">
        <span class="loader"></span>
      </div>
    `;
  }
  new() {
    return new Loader;
  }
}

