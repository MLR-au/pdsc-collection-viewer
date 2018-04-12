'use strict';

import './language-viewer.css';

module.exports = angular
  .module('pdsc.languageViewer', [])
  .component(
    'pdscLanguageViewerComponent',
    require('./view-languages.component')
  );
