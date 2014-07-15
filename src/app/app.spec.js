describe( 'Midway:Testing Modules', function() {
  describe( 'Cimba Module', function() {
    // var MainCtrl, $location, $scope;

    // beforeEach( angular.module( 'Cimba' ) );

    // beforeEach( inject( function( $controller, _$location_, $rootScope ) {
    //   $location = _$location_;
    //   $scope = $rootScope.$new();
    //   MainCtrl = $controller( 'MainCtrl', { $location: $location, $scope: $scope });
    // }));

    // it( 'should pass a dummy test', inject( function() {
    //   expect( MainCtrl ).toBeTruthy();
    // }));
    var module;

    beforeEach(function(){
      module = angular.module('Cimba');
    });

    it('should be registererd', function(){
      expect(module).not.toEqual(null);
    });

    describe("Dependencies:", function(){
      var deps;
      var hasModule = function(m){
        return deps.indexOf(m) >= 0;
      };
      beforeEach(function(){
        deps = module.value('Cimba').requires;
      });

      it('should have Cimba.login as a dependency', function(){
        expect(hasModule('Cimba.login')).toEqual(true);
      });

      it('should have Cimba.channels as a dependency', function(){
        expect(hasModule('Cimba.channels')).toEqual(true);
      });

      // it('should fail this test', function(){
      //   expect(hasModule('Cimba.fish')).toEqual(true);
      // });
    });
  });
});

