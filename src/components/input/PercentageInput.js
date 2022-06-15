import {Template, html} from '/utils/Template.js';

export default class PercentageInput extends Template {
  constructor(input, onChange, value) {
    super();
    if(!String(input.internalType).startsWith('uint')) {
      this.set('error', true);
      return;
    }
    this.set('input', input);
    this.set('onChange', onChange);
    this.set('value', value || 0);
    const bits = Number(input.internalType.slice(4));
    if(isNaN(bits)) {
      this.set('error', true);
      return;
    } else {
      this.set('max', Math.pow(2, bits) - 1);
    }
  }
  render() {
    return html`
      <div class="field">
        <label>
          <span>${this.input.name}</span>
          <input
            type="range"
            onchange="tpl(this).set('value', this.value).onChange(this.value)"
            min="0"
            max="${this.max}"
            value="${this.value}"
            step="1"
          >
        </label>
        <span class="preview">${Math.round(this.value/this.max * 10000)/100}%</span>
    `
  }
}
