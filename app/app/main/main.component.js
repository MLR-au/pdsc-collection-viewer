'use strict';

const {includes, isEmpty, isUndefined} = require('lodash');

module.exports = {
  template: require('./main.component.html'),
  bindings: {},
  controller: Controller,
  controllerAs: 'vm'
};

Controller.$inject = [
  '$state',
  '$transitions',
  '$rootScope',
  'dataService',
  '$mdSidenav'
];

function Controller($state, $transitions, $rootScope, dataService, $mdSidenav) {
  var vm = this;

  var onSuccessHandler;

  vm.showItemInformation = false;
  vm.levelUp = false;

  vm.$onInit = init;
  vm.$onDestroy = destroy;
  vm.toggleItemInformation = toggleItemInformation;

  function init() {
    onSuccessHandler = $transitions.onSuccess({}, function(transition) {
      if (transition.$to().name === 'main') {
        loadItem();
      }
    });
    loadItem();
  }

  function destroy() {
    onSuccessHandler();
  }

  function loadItem() {
    vm.collectionId = $state.params.collectionId;
    vm.itemId = $state.params.itemId;
    vm.loadingData = true;
    return dataService.getItem(vm.collectionId, vm.itemId).then(resp => {
      vm.itemData = resp;
      vm.loadingData = false;
      loadViewer();
    });
  }

  function toggleItemInformation() {
    $mdSidenav('left').toggle();
  }

  function loadViewer() {
    // load a viewer if we're at the item root
    if (
      !isUndefined(vm.itemData) &&
      !isEmpty(vm.itemData) &&
      $state.current.name === 'main'
    ) {
      if (!isEmpty(vm.itemData.images)) {
        $state.go('main.images');
      } else if (!isEmpty(vm.itemData.media)) {
        $state.go('main.media');
      } else {
        $state.go('main.documents');
      }
    }
  }
}