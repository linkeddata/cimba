
angular.module('Cimba.channels.view', ['ui.router'])

.config(function ChannelsConfig($stateProvider) {
	$stateProvider.state('view', {
		url: '/channels/view/*path', 
		views: {
			'main': {
				controller: 'ChannelViewCtrl',	
				templateUrl: 'channels/view/channel-view.tpl.html'
			}
		},
		data: {}
	});
})

.controller('ChannelViewCtrl', function ChannelViewController($scope, $stateParams, $location, $http) {	
	$scope.path = $stateParams.path;
	$scope.channel = {};
	
	for (var chan in $scope.$parent.channels) {
		var ch = $scope.$parent.channels[chan];		
		if (ch.safeUri === $scope.path) {
			console.log("found safeUri");
			$scope.channel = ch;
		}
	}

	if (!isEmpty($scope.channel)) {
		console.log($scope.channel);
		$scope.$parent.pageTitle = $scope.channel.title;
		$scope.channelUri = $scope.channel.uri;
		$scope.channelTitle = $scope.channel.title;	

		//get posts
		$scope.$parent.getPosts($scope.channel.uri, $scope.channel.title);
		// console.log($scope.$parent.channels[$scope.channel.uri]);
	}

	// $location.url($location.path());
})

.directive('listPosts', function () {
	return {
		replace: true,
		restrict: 'E',
		templateUrl: 'channels/view/posts.tpl.html'
	};
});