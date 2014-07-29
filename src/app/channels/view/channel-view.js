
angular.module('Cimba.channels.view', ['ui.router'])

.config(function ChannelsConfig($stateProvider) {
	$stateProvider.state('view', {
		url: '/channels/view/*path', 
		views: {
			'main': {
				controller: 'ChannelViewCtrl',	
				templateUrl: 'channels/view/channel-view.tpl.html'
			}
		},
		data: {}
	});
})

.controller('ChannelViewCtrl', function ChannelViewController($scope, $stateParams, $location, $http, noticesData) {	
	//console.log("channel view ctrl"); //debug
	$scope.path = $stateParams.path;
	$scope.currentUrl = $location.absUrl();
	if(sessionStorage.getItem($scope.$parent.postData[$scope.currentUrl])){
		postbody = sessionStorage.getItem($scope.$parent.postData[$scope.currentUrl]);
	}

	$scope.safeUri = function (uri) {
		return uri.replace(/^https?:\/\//,'');
	};	

	var webid = $scope.$parent.userProfile.webid;
	$scope.chanUri = "https://" + $scope.path;
	if($scope.channels[$scope.chanUri]) {
		console.log("found");
		var ch = $scope.channels[$scope.chanUri];
		$scope.$parent.getPosts(ch.uri, ch.title);
	} else {
		console.log("not found");
		$scope.$parent.getChannel($scope.chanUri);
	}

	$scope.savePostData=function(postBody){
		var currentPost = postBody;
		sessionStorage.setItem($scope.$parent.postData[$scope.currentUrl], JSON.stringify(currentPost));
		console.log("This is supposed to save the post data in local storage");
		console.log(sessionStorage.getItem($scope.$parent.postData[$scope.currentUrl]));
	};
	$scope.clearPostData=function(){
		sessionStorage.setItem();
	};

	// //manual setChannel
 //    if ($scope.users[webid].channels && $scope.users[webid].channels[$scope.chanUri]) {
 //        $scope.defaultChannel = $scope.users[webid].channels[$scope.chanUri];
 //        //console.log("defaultChannel set to "); //debug
 //        //console.log($scope.defaultChannel); //debug
 //    }
 //    else {
 //        console.log("Error: cannot set channel to " + $scope.chanUri);
 //    }
	
})

.directive('listPosts', function () {
	return {
		replace: true,
		restrict: 'E',
		templateUrl: 'channels/view/posts.tpl.html'
	};
});