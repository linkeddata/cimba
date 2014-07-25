/**
 * Tests sit right alongside the file they are testing, which is more intuitive
 * and portable than separating `src` and `test` directories. Additionally, the
 * build process will exclude all `.spec.js` files from the build
 * automatically.
 */
describe('login section', function() {
  beforeEach(module('Cimba.login'));
  var LoginCtrl, $location, $root, $scope, $http, $sce, httpBackend;

  beforeEach(inject(function($controller, _$location_, $http, $sce, $rootScope, $httpBackend) {
    $location = _$location_;
    $root = $rootScope;
    $scope = $rootScope.$new();
    httpBackend = $httpBackend;
    LoginCtrl = $controller('LoginCtrl', {
      $scope: $scope,
      $http: $http,
      $location: $location,
      $sce: $sce
    });
  }));

	it('should pass a dummy test', inject(function() {
    expect(LoginCtrl).toBeTruthy();
  }));

  it('should not have an empty signup widget link', inject(function() {
    expect($scope.signupWidget.length).not.toBeGreaterThan(0);
  }));

  it('should set the userProfile to the value of the WebID', inject(function() {
    var webid = '//deiu.rww.io/profile/card#me';
    // AngularJS does not encode : anymore so we have to hack around it
    httpBackend.expectGET('http://api.webizen.org/v1/search?q='+'https:'+encodeURIComponent(webid)).respond(200, '');

    $scope.login('https:'+webid);
    expect($scope.userProfile.webid).toEqual('https:'+webid);
    expect($location.$$path).toEqual('/home');
    expect($scope.showLogin).toBeFalsy();
    expect($root.loginSuccess).toBeTruthy();
    httpBackend.flush();
  }));

});