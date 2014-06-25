angular.module('Cimba.find',[
    'ui.router'
])

.config(function FindConfig($stateProvider){
    $stateProvider.state('find', {
        url:'/find',
        views:{
            'main':{
                controller: 'FindController',
                templateUrl: 'find/find.tpl.html'
            }
        },
        data:{
            pageTitle:'Find'
        }
    });
})

.controller('FindController', function FindController($scope, $http, $location, $sce){
    $scope.search = $scope.$parent.search;
    $scope.hideMenu = function() {
        $scope.$parent.showMenu = false;
    };
})


.directive('subscribeModal', function() {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: 'find/subscribe/subscribe.tpl.html'
    };
})

//simple directive to display list of search results
.directive('searchResults',function(){
    return {
        replace: true,
        restrict: 'E',
        templateUrl: 'find/subscribe/search_results.html'
    }; 
});