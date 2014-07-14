angular.module('Cimba.find.view-user', ['ui.router'])

.config(function ViewUserConfig($stateProvider) {
	$stateProvider.state('view-user', {
		url: '/find/*path',
		views: {
			'main': {
				controller: 'ViewUserController',
				templateUrl: 'find/view/view-user.tpl.html'
			}
		},
		data: {}
	});
})

.controller('ViewUserController', function ViewUserController($scope, $stateParams, $location, $http) {
	console.log("view user controller");
});