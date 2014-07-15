describe('Channels section', function() {
  beforeEach(module('Cimba.channels'));
  //var ChannelsCtrl, $location, $root, $scope, $http, $sce, httpBackend;

  // beforeEach(inject(function($controller, _$location_, $http, $sce, $rootScope, $httpBackend) {
  //   $location = _$location_;
  //   $root = $rootScope;
  //   $scope = $rootScope.$new();
  //   httpBackend = $httpBackend;
  //   ChannelsCtrl = $controller('ChannelsCtrl', {
  //     $scope: $scope, 
  //     $http: $http, 
  //     $location: $location, 
  //     $sce: $sce
  //   });
  // }));

  it('should pass a dummy test', inject(function() {
    expect(ChannelsCtrl).toBeTruthy();
  }));

});

  // it('newChannel should add a channel to '){
  //    var webid = '';
  //    httpBackend.expectGET('http://api.webizen.org/v1/search?q='+'https:'encodeURIComponent(webid)).respond(200,'');
     
  // }
