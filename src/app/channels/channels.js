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
    if ($scope.$parent.userProfile.storagespace !== undefined) {
        $scope.$parent.loading = true;
        var storage = $scope.$parent.userProfile.storagespace;
        var webid = $scope.$parent.userProfile.webid;
<<<<<<< HEAD
        $scope.$parent.getChannels(storage, webid, true, false, false);
    }
=======

        $scope.channelKeys = $scope.$parent.getChannels(storage, webid, true, false);

    } else {
        $scope.$parent.gotstorage = false;
    }
    $scope.$parent.loading = false;
>>>>>>> 9858ad3b8df6d66056914cb09655c5a35246c913
});