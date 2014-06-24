
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
	$location.url($location.path());
});