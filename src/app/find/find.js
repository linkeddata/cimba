angular.module('Cimba.find',[
    'ui.router',
    'Cimba.find.view-user'
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

    $scope.prepareSearch = function(webid, name) {
        $scope.search.selected = true;
        $scope.search.loading = true;
        $scope.search.webid = webid;
        $scope.search.query = name;
        $scope.getUsers(); //force refresh of channel subscriptions in case it changed
        $scope.getInfo(webid, false, false);
        $scope.webidresults = [];
        var safeUri = $scope.safeUri(webid);
        $location.path("/find/" + safeUri);
    };
})

.directive('searchUsers', function() {
    return {
        replace: true, 
        restrict: 'E', 
        templateUrl: 'find/search.tpl.html'
    };
})

.directive('subscriptionView', function() {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: 'find/subscribe/subscribe.tpl.html'
    };
})

//simple directive to display list of search results
.directive('searchResults', function(){
    return {
        replace: true,
        restrict: 'E',
        templateUrl: 'find/subscribe/search_results.tpl.html'
    }; 
});