
angular.module('Cimba.channels.view', ['ui.router'])

.config(function ChannelsConfig($stateProvider) {
	$stateProvider.state('view', {
		url: '/channels/view/{channelName}?channelUri', 
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
	
	$scope.$parent.pageTitle = $stateParams.channelName;
	$scope.channelUri = $stateParams.channelUri;
	$scope.channelTitle = $stateParams.channelName;	

	//get posts
	$scope.$parent.getPosts($scope.channelUri, $scope.channelName);

	// $location.url($location.path());
})

.directive('listPosts', function () {
	return {
		replace: true,
		restrict: 'E',
		templateUrl: 'channels/view/posts.tpl.html'
	};
});