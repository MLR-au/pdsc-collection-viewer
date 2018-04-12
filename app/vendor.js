'use strict';

import '../node_modules/font-awesome/css/font-awesome.css';
import '../node_modules/angular-material/angular-material.css';
import '../node_modules/ImageViewer/imageviewer.css';
import '../node_modules/highlight.js/styles/atom-one-dark.css';
import '../node_modules/leaflet/dist/leaflet.css';

require('angular');
require('angular-animate');
require('angular-aria');
require('angular-cookies');
require('angular-material');
require('angular-messages');
require('angular-sanitize');
require('@uirouter/angularjs');
require('moment');
require('lodash');
require('pdfjs-dist');
require('jquery');
require('esri-leaflet');
require('../node_modules/ImageViewer/imageviewer.js');
require('highlight.js');

const leaflet = require('leaflet');
delete leaflet.Icon.Default.prototype._getIconUrl;
leaflet.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

import pdflib from 'pdfjs-dist';
pdflib.PDFJS.workerSrc = 'lib/pdf.worker.min.js';
/// #if DEPLOY_TESTING
pdflib.PDFJS.workerSrc = 'test-viewer/lib/pdf.worker.min.js';
/// #endif
/// #if DEPLOY_PRODUCTION
pdflib.PDFJS.workerSrc = 'viewer/lib/pdf.worker.min.js';
/// #endif

const Clipboard = require('clipboard');
const clipboard = new Clipboard('button');
