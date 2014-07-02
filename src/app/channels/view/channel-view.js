
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

	$scope.safeUri = function (uri) {
		return uri.replace(/^https?:\/\//,'');
	};

	var webid = $scope.$parent.userProfile.webid;
	var chanUri = "https://" + $scope.path;

	for (var c in $scope.$parent.users[webid].channels) {
		var ch = $scope.$parent.users[webid].channels[c];		
		if ($scope.safeUri(ch.uri) === $scope.path) {
			$scope.channel = ch;
		}
	}

	for (var i in $scope.$parent.users[webid].subscribedChannels) {
		var sch = $scope.$parent.users[webid].subscribedChannels[i];		
		if ($scope.safeUri(sch.uri) === $scope.path) {
			$scope.channel = sch;
		}
	}


	// TODO obtain title info without looking through users list of channels
	// Need function to extract channel info given channel id.

	if (!isEmpty($scope.channel)) {
		$scope.owner = $scope.channel.owner;

		$scope.$parent.pageTitle = $scope.channel.title;
		$scope.channelUri = $scope.channel.uri;
		$scope.channelTitle = $scope.channel.title;	

		//get posts
		$scope.$parent.getPosts($scope.channel.uri);
		// $scope.posts = $scope.$parent.users[owner].channels
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