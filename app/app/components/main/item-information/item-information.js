'use strict';

angular.module('pdsc')
  .directive('itemInformation', [ 
    '$location', 
    '$timeout', 
    function ($location, $timeout) {
        return {
          templateUrl: 'app/components/main/item-information/item-information.html',
          restrict: 'E',
          scope: {
              itemData: '=',
          },
          link: function postLink(scope, element, attrs) {

              scope.url = $location.absUrl();

              $timeout(function() {
                  scope.show = true;
              }, 80);
          }
        };
  }]);
