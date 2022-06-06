import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {GroupList} from './GroupList.js';
import {GroupDetails} from './GroupDetails.js';
import {DeployChild} from './DeployChild.js';
import {ChildDetails} from './ChildDetails.js';
import {ProposalDetails} from './ProposalDetails.js';

export class AppRouter extends BaseElement {
  static properties = {
    path: {type: String, reflect: true},
  };
  static routes = [
    { regex: /^\/group\/(0x[a-f0-9]{40})$/i,
      template: match => html`
        <group-details address="${match[1]}"></group-details>` },
    { regex: /^\/group\/(0x[a-f0-9]{40})\/deploy-child$/i,
      template: match => html`
        <deploy-child groupAddress="${match[1]}"></deploy-child>` },
    { regex: /^\/group\/(0x[a-f0-9]{40})\/([^\/]+)\/(0x[a-f0-9]{40})$/i,
      template: match => html`
        <child-details groupAddress="${match[1]}" childTypeStr="${match[2]}" childAddress="${match[3]}"></child-details>` },
    { regex: /^\/group\/(0x[a-f0-9]{40})\/(ElectionsByMedian)\/(0x[a-f0-9]{40})\/(0x[a-f0-9]{40})$/i,
      template: match => html`
        <proposal-details groupAddress="${match[1]}" childTypeStr="${match[2]}" childAddress="${match[3]}" proposalAddress="${match[4]}"></proposal-details>` },
    { regex: /^\/groups$/,
      template: () => html`<group-list></group-list>` },
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
