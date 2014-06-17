angular.module('Cimba.channels',['ui.router'])

.config(function ChannelsConfig($stateProvider){
    $stateProvider.state('list', {
        url:'/channels',
        views:{
            'main':{
                controller: 'ChannelsCtrl',
                templateUrl: 'channels/list.tpl.html'
            }
        },
        data:{
            pageTitle:'channels'
        }
    });
})

.controller('ChannelsCtrl', function ChannelsController($scope, $http, $location, $sce){
    console.log($scope.$parent.userProfile);
    $scope.channelKeys = $scope.$parent.channels; 
    console.log($scope.channelKeys);
});