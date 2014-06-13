/**
 * Login page
 */
angular.module( 'Cimba.login', [
  'ui.router'
])

/**
 * Each section or module of the site can also have its own routes. AngularJS
 * will handle ensuring they are all available at run-time, but splitting it
 * this way makes each module more "self-contained".
 */
.config(function LoginConfig( $stateProvider ) {
  $stateProvider.state( 'login', {
    url: '/login',
    views: {
      "main": {
        controller: 'LoginCtrl',
        templateUrl: 'login/login.tpl.html'
      }
    },
    data:{ pageTitle: 'Login' }
  });
})

/**
 * And of course we define a controller for our route.
 */
.controller( 'LoginCtrl', function LoginController( $scope, $http, $location, $sce ) {
 
  // login/signup widget source
  var providerURI = '//linkeddata.github.io/signup/index.html?ref=';
    
  // set the parameter in the src of iframe
  $scope.signupWidget = $sce.trustAsResourceUrl(providerURI+window.location.protocol+'//'+window.location.host);

  // login user into the app
  $scope.login = function(webid) {
    if (webid && (webid.substr(0, 4) == 'http')) {
      $scope.userProfile = {};
      $scope.userProfile.webid = webid;
      $scope.$parent.loginSuccess = true;
      // index or update current WebID on webizen.org
      $http.get('http://api.webizen.org/v1/search', {
        params: {
          q: webid
        }
      });
      // set the user in the main controller and redirect to home page
      $scope.$parent.userProfile = $scope.userProfile;
      $location.path('/home');
    } else {
      // notify('Error', 'WebID-TLS authentication failed.');
    }
    $scope.showLogin = false;
    $scope.$apply();
  };

  $scope.hideMenu = function() {
    $scope.$parent.showMenu = false;
  };

  // Event listener for login (from child iframe)
  var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
  var eventListener = window[eventMethod];
  var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

  // Listen to message from child window
  eventListener(messageEvent,function(e) {
    if (e.data.slice(0,5) == 'User:') {
      console.log(e.data);
      $scope.login(e.data.slice(5, e.data.length), true);
    }
    if (e.data.slice(0,6) == "cancel") {
      $scope.showLogin = false;
      $scope.$apply();
    }
  },false);

 });
