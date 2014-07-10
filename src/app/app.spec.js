describe( 'MainCtrl', function() {
  describe( 'isCurrentUrl', function() {
    var MainCtrl, $location, $root, $scope, $http, $timeout, httpBackend;


    beforeEach( module( 'Cimba' ) );

    beforeEach( inject( function( $controller, $rootScope, _$location_, $timeout, $http, $httpBackend ) {
      $location = _$location_;
      $root = $rootScope;
      $scope = $rootScope.$new();
      httpBackend = $httpBackend;
      MainCtrl = $controller( 'MainCtrl', { 
        $location: $location, 
        $scope: $scope,
        $http: $http,
        $timeout: $timeout
      });
      // userID = "https://henchill.rww.io/profile/card#m3";
      // $scope.login(userID);
    }));

    it( 'should pass a dummy test', inject( function() {
      expect( MainCtrl ).toBeTruthy();
    }));

    it('should redirect to login page', inject(function($timeout) {
      $scope.login();
      expect($location.$$path).toEqual('/login');
    }));
  });
});
