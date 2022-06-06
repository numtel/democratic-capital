import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';


export class AppTabs extends BaseElement {
  static properties = {
    tabs: {type: Object},
    selected: {state: true},
  };
  constructor() {
    super();
    this.tabs = [{name: 'foo' }];
    this.selected = 0;
  }
  setTab(index) {
    this.selected = index;
  }
  render() {
    return html`
      <ul class="tabs">
        ${this.tabs.map((tab, index) => html`
          <li>
            <button @click="${this.setTab.bind(this, index)}"
              class="${this.selected === index ? 'active' :''}"
            >
              ${tab.name}
            </button>
          </li>
        `)}
      </ul>
      ${this.tabs[this.selected].render()}
    `;
  }
}
customElements.define('app-tabs', AppTabs);
