angular.module('Cimba.channels',[
    'ui.router',
    'Cimba.channels.view',
    'Cimba.channels.viewPost',
    'Cimba.channels.manage'
    ])

.config(function ChannelsConfig($stateProvider){
    $stateProvider
    .state('channels', {
        url:'/channels',
        views:{
            'main':{
                controller: 'ChannelsCtrl',
                templateUrl: 'channels/list.tpl.html'
            }
        },
        data:{
            pageTitle:'Channels'
        }
    });
})

.controller('ChannelsCtrl', function ChannelsController($scope, $http, $location, $sce){    
    if ($scope.$parent.userProfile.storagespace !== undefined) {
        console.log("beginning channel fetch");    
        $scope.$parent.loading = true;
        var storage = $scope.$parent.userProfile.storagespace;
        var webid = $scope.$parent.userProfile.webid;
        console.log(webid);
        $scope.$parent.getChannels(storage, webid, true, false, false);        
    } else {
        $scope.$parent.gotstorage = false;
    }
    $scope.$parent.loading = false;
});