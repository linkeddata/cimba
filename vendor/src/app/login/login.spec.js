/**
 * Tests sit right alongside the file they are testing, which is more intuitive
 * and portable than separating `src` and `test` directories. Additionally, the
 * build process will exclude all `.spec.js` files from the build
 * automatically.
 */
describe('login section', function() {
  beforeEach( module( 'Cimba.login' ) );
  var LoginCtrl, $location, $scope;

  beforeEach( inject( function( $controller, _$location_, $rootScope ) {
    $location = _$location_;
    $scope = $rootScope.$new();
    LoginCtrl = $controller( 'LoginCtrl', { $location: $location, $scope: $scope });
  }));


});