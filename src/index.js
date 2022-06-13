import {selfDescribingContract} from '/utils/index.js';
import Router from '/app/Router.js';
import Loader from '/components/Loader.js';

window.app = {
  cacheABI: false,
  web3: new Web3(config.rpc),
  router: new Router({
    element: document.getElementById('app'),
    loader: new Loader,
    routes: [
      { regex: /^\/(0x[a-f0-9]{40})$/i,
        template: '/pages/Details.js',
        constructor: match => [ match[1] ] },
      { regex: /^\//, // catch all others
        template: '/pages/Home.js' },
    ],
  }),
};

