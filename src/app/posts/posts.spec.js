describe('posts section', function() {
	beforeEach(module('Cimba.posts'));

	var PostsCtrl, $location, $root, $scope, $http, $sce, httpBackend;

	var webid, _channel;
	beforeEach(inject(function($controller, _$location_, $http, $sce, $rootScope, $httpBackend) {
		$location = _$location_;
		$root = $rootScope;
		$scope = $rootScope.$new();
		httpBackend = $httpBackend;
		PostsCtrl = $controller('PostsController', {
			$scope: $scope,
			$http: $http,
			$location: $location,
			$sce: $sce
		});

		webid = '//henchill.rww.io/profile/card#me';
		_channel = {
			uri: 'https://henchill.rww.io/storage/myfirstblog/ch1/',
			title: 'Channel1',
			owner: webid
		};

		$scope.login('https:' + webid);

	}));
/*
	it('should set the default channel', inject(function() {
		// expect($scope.defaultChannel).toBeUndefined();
		
		var chUri = _channel.uri;
		
		$scope.users = {
			webid: {
				channels: {
					chUri: _channel
				}
			}
		};
		$scope.setChannel(_channel.uri);
		expect($scope.defaultChannel).toBe(_channel);

	}));*/
});