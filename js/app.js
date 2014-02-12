// some config
var PROXY = "https://rww.io/proxy?uri={uri}";
var ngCimba = angular.module('CimbaApp', ['ui','ui.filters']);

function CimbaCtrl($scope, $timeout) {
	// default values
	$scope.appuri = window.location.hostname+window.location.pathname;
	$scope.loggedin = false;
	$scope.audience = 'icon-globe';
	$scope.webid = undefined;
	$scope.myname = undefined;
	$scope.mypic = 'img/photo.png';

	// cache user credentials in localStorage to avoid double sign in
	$scope.storeLocalCredentials = function () {
		var cimba = {};
		cimba.webid = $scope.webid;
		cimba.myname = $scope.myname;
		cimba.mypic = $scope.mypic;
		localStorage.setItem($scope.appuri, JSON.stringify(cimba));
	}

	// retrieve from localStorage
	$scope.getLocalCredentials = function () {
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));
			$scope.webid = cimba.webid;
			$scope.myname = cimba.myname;
			$scope.mypic = cimba.mypic;
			$scope.loggedin = true;
		} else {
			console.log('Snap, localStorage is empty!');
		}
	}

	// clear localStorage
	$scope.clearLocalCredentials = function () {
		localStorage.removeItem($scope.appuri);
	}

	// update my user picture	
	$scope.updateUserDOM = function () {
		$('#mypic').html('<img class="media-object" src="'+$scope.mypic+'" rel="tooltip" data-placement="top" width="70" title="'+$scope.myname+'">');
	}

	// logout (clear localStorage)
	$scope.clearSession = function () {
		$scope.clearLocalCredentials();
		$scope.loggedin = false;
	}

	// update the audience selector
	$scope.setAudience = function(v) {
		if (v=='public')
			$scope.audience = 'icon-globe';
		else if (v=='private')
			$scope.audience = 'icon-lock';
		else if (v=='friends')
			$scope.audience = 'icon-user';
	}

	// get a user's WebID profile to personalize app
	$scope.getWebIDProfile = function() {
		if ($scope.webid) {
			console.log('Found WebID: '+$scope.webid);
			$scope.userInfo();
		} else {
			console.log('No webid found!');
		}
	}

	// Fetech the profile using rdflib.js
	$scope.userInfo = function () {
	    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
	    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
	    var MB = $rdf.Namespace("http://rdfs.org/sioc/types#");
	    var g = $rdf.graph();
	    var f = $rdf.fetcher(g);
	    // add CORS proxy
	    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

	    var docURI = $scope.webid.slice(0, $scope.webid.indexOf('#'));
	    var webidRes = $rdf.sym($scope.webid);

	    // fetch user data
	    f.nowOrWhenFetched(docURI,undefined,function(){
	        // export the user graph
	        mygraph = g;
	        // get some basic info
	        var name = g.any(webidRes, FOAF('name'));
	        var pic = g.any(webidRes, FOAF('img'));
	        var depic = g.any(webidRes, FOAF('depiction'));
        	// get microblogging endpoints
        	var mb = g.an(ywebidRes, MB('Microblog'));

	        name = (name == undefined) ? 'Unknown':name.value;
	        if (name.length > 22)
	            name = name.slice(0, 18)+'...';
	        $scope.myname = name;

	        if (pic == undefined) {
	            if (depic)
	                pic = depic.value;
	            else
	                pic = 'img/nouser.png';
	        } else {
	            pic = pic.value;
	        }
	        $scope.mypic = pic;

        	// cache user credentials in localStorage
        	$scope.storeLocalCredentials();
        	// update DOM
        	$scope.updateUserDOM();
        	$scope.loggedin = true;
        	$scope.$apply();
	    });
	}

	// Event listener for login (from child iframe)
	var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
	var eventListener = window[eventMethod];
	var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

	// Listen to message from child window
	eventListener(messageEvent,function(e) {
		var u = e.data;
		if (e.data.slice(0,5) == 'User:') {
			$scope.webid = e.data.slice(5, e.data.length);
			$scope.getWebIDProfile();
		}
		$('#loginModal').modal('hide');
	},false);

	// init by retrieving user from localStorage
	$scope.getLocalCredentials();
	$scope.updateUserDOM();
}


var posts = {};
posts[0] = {time: 1111111, 
			body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer sem sapien, elementum sagittis erat at, tempus tincidunt nulla. In fringilla eleifend tortor vitae blandit. Maecenas ultricies sem quis lectus feugiat, at tincidunt nisi elementum. Aliquam erat volutpat. Praesent condimentum metus eget nibh pharetra porttitor. Duis a elit sit amet felis dignissim imperdiet. Sed tristique nunc in sem semper congue.',
			userpic: 'img/pic1.jpg',
			username: 'Test Name 1'
			};
posts[1] = {time: 2222222,
			body: 'If you\'re looking for help with Bootstrap code, the <code>twitter-bootstrap</code> tag at <a href="http://stackoverflow.com/questions/tagged/twitter-bootstrap">Stackoverflow</a> is a good place to find answers.',
			userpic: 'img/pic2.jpg',
			username: 'Test Name 2'
			};


// autofetch factory
ngCimba.factory('DataFeed',function($interval){

	//private storage of feed items
	var _feedItems = []

	//fake data fetcher, would go to your API
	function fakeFetchNewData(){
		var _newFakeItem = {
			id : _feedItems.length + 1,
			date : new Date()
		}
		if (_newFakeItem.id < 3) // limit for tests
			_feedItems.push(_newFakeItem)
	}

	//return the public API
	return {
	    //the data
	    items : _feedItems,
	    
	    //a public function to start the autorefresher
	    startUpdating : function(refreshInterval){
       		$interval(function(){ fakeFetchNewData() },refreshInterval || 1000);
	    }
	}
})

//simple directive to display each post
ngCimba.directive('postsViewer',function(){
  	return {
		replace : true,
		restrict : 'E',
		templateUrl: 'tpl/post.html'
    }; 
})


// Controller for displaying posts
ngCimba.controller('PostsCtrl', function($scope,DataFeed) {
	//attach the service data to the controller scope so the directive can use it
	$scope.feedItems = DataFeed.items;

	//attach the event click handler to the service
	DataFeed.startUpdating();

});


/*
function PostsCtrl($scope, $timeout, $http) {
	$scope.posts = posts;
	
	for (var p in posts) {
		$.get("tpl/post.html", function(data){
		    $('#posts').children("div:first").html(data);
		});
		console.log(p);
	}

	$('#posts').html('<div ng-include="tpl/post.html"></div>');
}
*/
/*

1. get all posts in a container

2. for each post -> fetch independently

3. (try to sort?)

4. append to #posts


*/



/*

<#n8624715161>
    <http://purl.org/dc/terms/created> "2013-07-15T12:51:48Z" ;
    <http://rdfs.org/sioc/ns#content> "test" ;
    <http://rdfs.org/sioc/ns#has_creator> <https://deiu.rww.io/profile/card#me> ;
    a <http://rdfs.org/sioc/types#MicroblogPost> .

*/