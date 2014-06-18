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
    $scope.channelKeys = {};
    if ($scope.$parent.userProfile.storagespace !== undefined) {
        var storage = $scope.$parent.userProfile.storagespace;
        var webid = $scope.$parent.userProfile.webid;

        $scope.channelKeys = $scope.$parent.getChannels(storage, webid, true, false);

    }
    console.log($scope.channelKeys);
});