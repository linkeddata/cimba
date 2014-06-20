angular.module( 'Cimba.tab', [
  'ui.router'
])

.config(function TabConfig( $stateProvider ) {
  $stateProvider.state( 'tab', {
    url: '/',
    views: {
      "main": {
        controller: 'TabController',
        templateUrl: ''
      }
    },
    data:{ pageTitle: 'Tab' }
  });
})

.controller("TabController", function TabCtrl( $scope, $http, $location, $sce ) {
  this.tab = 0;
  this.badges = ["42","7","4"];
  this.setTab = function(v) {
    this.tab = v;
  };
  this.isSet = function(v) {
    return this.tab === v;
  };
  this.clearbadge = function(v) {
    this.badges[v] = null;
  };
  this.alert = function(msg) {
    alert(msg);
  };
});