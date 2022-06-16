import {Template, html} from '/utils/Template.js';

export default class Range extends Template {
  constructor(input, onChange, value) {
    super();
    if(!String(input.internalType).startsWith('uint')) {
      this.set('error', true);
      return;
    }
    this.set('input', input);
    this.set('onChange', onChange);
    this.set('min', 'min' in input ? input.min : 0);
    this.set('value', value || this.min);
    this.onChange(this.value);
    if('max' in input) {
      this.set('max', input.max);
    } else {
      const bits = Number(input.internalType.slice(4));
      if(isNaN(bits)) {
        this.set('error', true);
        return;
      } else {
        this.set('max', Math.pow(2, bits) - 1);
      }
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
            min="${this.min}"
            max="${this.max}"
            value="${this.value}"
            step="1"
          >
        </label>
        <span class="preview">${this.value}</span>
        ${this.input.hint && html`<span class="hint">${this.input.hint}</span>`}
    `
  }
}

