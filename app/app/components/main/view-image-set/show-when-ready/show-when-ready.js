'use strict';

angular.module('pdsc')
  .directive('showWhenReady', [ 
    function () {
    return {
      template: '',
      restrict: 'A',
      link: function postLink(scope, element) {
          element.on('load', function() {
              scope.$apply(function() {
                  scope.setTransform();
                  scope.showImage = true;
              });
          });
      }
    };
  }]);