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
	$scope.webid = "https://" + $stateParams.path;
	console.log($scope.webid);

	$scope.$parent.loadChannels[$scope.webid] = $scope.webid;
	// $scope.search.selected = true;
    // $scope.search.loading = true;
    // $scope.search.webid = webid;
    // $scope.search.query = name;
    // $scope.getUsers(); //force refresh of channel subscriptions in case it changed
    $scope.getInfo($scope.webid, false, true);    
    // $scope.webidresults = [];
    // var safeUri = $scope.safeUri(webid);
    // $location.path("/find/" + safeUri);

});