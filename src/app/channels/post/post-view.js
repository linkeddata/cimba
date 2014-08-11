
angular.module('Cimba.channels.viewPost', ['ui.router'])

.config(function ChannelsConfig($stateProvider) {
	$stateProvider.state('viewPost', {
		url: '/channels/view-post?postName&postUri', 
		views: {
			'main': {
				controller: 'PostViewCtrl',	
				templateUrl: 'channels/post/post-view.tpl.html'
			}
		},
		data: {
			pageTitle: "View Post"
		}
	});
})

.controller('PostViewCtrl', function PostViewController($scope, $stateParams, $location, $http) {	
	$scope.postUri = $stateParams.postUri;
	$location.url($location.path());
});