'use strict';

angular
  .module('pdsc', [
    'ngAnimate',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'moment',
    'underscore',
    'pdfjs',
    'ngMaterial',
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/:collectionId?/:itemId/:itemInstance?', {
        templateUrl: 'app/components/main/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
