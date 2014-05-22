describe( 'MainCtrl', function() {
  describe( 'isCurrentUrl', function() {
    var MainCtrl, $location, $scope;

    beforeEach( module( 'Cimba' ) );

    beforeEach( inject( function( $controller, _$location_, $rootScope ) {
      $location = _$location_;
      $scope = $rootScope.$new();
      MainCtrl = $controller( 'MainCtrl', { $location: $location, $scope: $scope });
    }));

    it( 'should pass a dummy test', inject( function() {
      expect( MainCtrl ).toBeTruthy();
    }));
  });
});
