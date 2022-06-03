import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {GroupList} from './GroupList.js';
import {GroupDetails} from './GroupDetails.js';
import {DeployChild} from './DeployChild.js';
import {ChildDetails} from './ChildDetails.js';

export class AppRouter extends BaseElement {
  static properties = {
    path: {type: String, reflect: true},
  };
  static routes = [
    { regex: /^\/group\/(0x[a-f0-9]{40})$/i,
      template: match => html`
        <main><group-details address="${match[1]}"></group-details></main>` },
    { regex: /^\/group\/(0x[a-f0-9]{40})\/deploy-child$/i,
      template: match => html`
        <main><deploy-child groupAddress="${match[1]}"></deploy-child></main>` },
    { regex: /^\/group\/(0x[a-f0-9]{40})\/([^\/]+)\/(0x[a-f0-9]{40})$/i,
      template: match => html`
        <main><child-details groupAddress="${match[1]}" childType="${match[2]}" childAddress="${match[3]}"></child-details></main>` },
    { regex: /^\/groups$/,
      template: () => html`<main><group-list></group-list></main>` },
    { regex: /^\/verify$/,
      template: () => html`<main><app-verify></app-verify></main>` },
    { regex: /^\/docs/,
      template: () => html`<main><app-docs></app-docs></main>` },
    { regex: /^\//, // catch all others
      template: () => html`<app-home></app-home>` },
  ];
  constructor() {
    super();
    this.path = window.location.pathname;
    this.popstate = this.popstate.bind(this);
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this.popstate);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.popstate);
  }
  popstate(event) {
    this.path = window.location.pathname;
  }
  render() {
    for(let route of AppRouter.routes) {
      const match = this.path.match(route.regex);
      if(match) return route.template(match);
    }
  }
}
customElements.define('app-router', AppRouter);
