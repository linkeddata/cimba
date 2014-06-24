angular.module('Cimba.channels.manage',['ui.router'])

.config(function CreateConfig($stateProvider){
	$stateProvider.state('manage',{
		url: '/channels/manage',
		views:{
			'main':{
				controller: 'ManageCtrl',
				templateUrl: 'channels/manage/manage.tpl.html'
			}
		},
		data:{
            pageTitle:'manage'
        }
	});
})

.controller('ManageCtrl', function ManageController($scope, $http, $location, $sce){
	$scope.channels = $scope.$parent.channels;
	$scope.newChannel = {};
	$scope.newChannel.title = 'test';

});