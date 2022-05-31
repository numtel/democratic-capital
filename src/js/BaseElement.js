import {html, css, LitElement} from './lit-all.min.js';

export class BaseElement extends LitElement {
  constructor() {
    super();
  }
  createRenderRoot() {
    return this;
  }
  async route(event) {
    event.preventDefault();
    window.history.pushState({}, '', event.target.attributes.href.value);
    document.querySelector('app-router').path = event.target.attributes.href.value;
  }
}

