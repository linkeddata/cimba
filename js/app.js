// some config
var PROXY = "https://rww.io/proxy?uri={uri}";
var ngCimba = angular.module('CimbaApp', ['ui','ui.filters']);

var ggg = undefined;

// Main angular controller
function CimbaCtrl($scope, $timeout) {
	// default values
	$scope.appuri = window.location.hostname+window.location.pathname;
	$scope.loggedin = false;
	$scope.audience = 'icon-globe';
	$scope.webid = undefined;
	$scope.myname = undefined;
	$scope.mypic = 'img/photo.png';
	$scope.storagespace = undefined;
	// show loading spinner
	$scope.loading = false;
	// posts
	$scope.Items = [];

	// cache user credentials in localStorage to avoid double sign in
	$scope.storeLocalCredentials = function () {
		var cimba = {};
		var _user = {};
		_user.webid = $scope.webid;
		_user.myname = $scope.myname;
		_user.mypic = $scope.mypic;
		_user.storagespace = $scope.storagespace;
		cimba.user = _user;
		localStorage.setItem($scope.appuri, JSON.stringify(cimba));
	}

	// retrieve from localStorage
	$scope.getLocalCredentials = function () {
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));
			$scope.webid = cimba.user.webid;
			$scope.myname = cimba.user.myname;
			$scope.mypic = cimba.user.mypic;
			$scope.storagespace = cimba.user.storagespace;
			$scope.loggedin = true;
		} else {
			console.log('Snap, localStorage is empty!');
		}
	}

	// save current posts in localStorage
	$scope.saveItems = function () {
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));			
			cimba.items = $scope.Items;
			localStorage.setItem($scope.appuri, JSON.stringify(cimba));
		}
	}

	$scope.loadItems = function () {
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));			
			$scope.Items = cimba.items
		}
	}

	// clear localStorage
	$scope.clearLocalCredentials = function () {
		localStorage.removeItem($scope.appuri);
	}

	// update my user picture	
	$scope.updateUserDOM = function () {
		$('#mypic').html('<a href="'+$scope.webid+'" target="_blank">'+
			'<img class="media-object" src="'+$scope.mypic+'" rel="tooltip" data-placement="top" width="70" title="'+$scope.myname+'"></a>');
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

	// get relevant info for a webid
	function getInfo(webid, mine) {
	    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
	    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
	    var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
	    var g = $rdf.graph();
	    var f = $rdf.fetcher(g);
	    // add CORS proxy
	    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

	    var docURI = webid.slice(0, webid.indexOf('#'));
	    var webidRes = $rdf.sym(webid);

	    // fetch user data
	    f.nowOrWhenFetched(docURI,undefined,function(){
	        // get some basic info
	        var name = g.any(webidRes, FOAF('name'));
	        var pic = g.any(webidRes, FOAF('img'));
	        var depic = g.any(webidRes, FOAF('depiction'));
	    	// get storage endpoints
	    	var storage = g.any(webidRes, SPACE('storage'));	    	

	    	// Clean up name
	        name = (name == undefined) ? 'Unknown':name.value;
	        if (name.length > 22)
	            name = name.slice(0, 18)+'...';

	        // set avatar picture
	        if (pic == undefined) {
	            if (depic)
	                pic = depic.value;
	            else
	                pic = 'img/nouser.png';
	        } else {
	            pic = pic.value;
	        }

	        // find microblogging feeds/channels
	        if (storage)
	        	$scope.getFeeds(storage.value);
	        else
	        	$scope.loading = false; // hide spinner

			var _user = {
	    		fullname: name,
				pic: pic,
				storagespace: storage
	    	}

			if (mine) {
		        $scope.myname = name;
		        $scope.mypic = pic;
		        $scope.storagespace = storage;

		    	// cache user credentials in localStorage
		    	$scope.storeLocalCredentials();
		    	// update DOM
		    	$scope.updateUserDOM();
		    	$scope.loggedin = true;
		    	$scope.$apply();
			}

	    	return _user;
	    });
	}

	// get a user's WebID profile data to personalize app
	$scope.getWebIDProfile = function() {
		$scope.loading = true;
		console.log('load='+$scope.loading);
		if ($scope.webid) {
			console.log('Found WebID: '+$scope.webid);
			getInfo($scope.webid, true);
		} else {
			console.log('No webid found!');
			// hide spinner
			$scope.loading = false;
		}

		console.log('load='+$scope.loading);
	}

	// get feeds based on a storage container
	$scope.getFeeds = function(uri) {
		var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
		var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
	    var LDP = $rdf.Namespace("http://www.w3.org/ns/ldp#");
	    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
	    var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
	    var g = $rdf.graph();
	    var f = $rdf.fetcher(g);
	    // add CORS proxy
	    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

	    // fetch user data: SIOC:Container -> SIOC:Forum -> SIOC:Post
	    f.nowOrWhenFetched(uri,undefined,function(){
	        // find all SIOC:Container
	        var ws = g.statementsMatching(undefined, RDF('type'), SIOC('Container'));
			for (var i in ws) {
				w = ws[i]['subject']['value'];
				
				// find all SIOC:Forum (using globbing)
				var ff = $rdf.fetcher(g);
				ff.nowOrWhenFetched(w+'*/*', undefined,function(){
					var posts = g.statementsMatching(undefined, RDF('type'), SIOC('Post'));
									
					for (var p in posts) {
						var uri = posts[p]['subject'];
						var useraccount = g.any(uri, SIOC('has_creator'));
						var post = g.statementsMatching(posts[p]['subject']);
						var _newItem = {
							uri : uri.value,
							date : moment(g.any(uri, DCT('created')).value).fromNow(),
							userpic : g.any(useraccount, SIOC('avatar')).value,
							username : g.any(useraccount, SIOC('account_of')).value,
							body : g.any(uri, SIOC('content')).value
						}
						console.log(_newItem);
						$scope.Items.push(_newItem);
						$scope.$apply();
					}
					// done loading, save items
					$scope.saveItems();
					// hide spinner
					$scope.loading = false;
					$scope.$apply();
				});
			}
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
			// clear previous posts
	    	jQuery('posts-viewer').empty();
		}
		$('#loginModal').modal('hide');
	},false);

	// init by retrieving user from localStorage
	$scope.getLocalCredentials();
	$scope.loadItems();
	$scope.updateUserDOM();
}

//simple directive to display each post
ngCimba.directive('postsViewer',function(){
  	return {
		replace : true,
		restrict : 'E',
		templateUrl: 'tpl/post.html'
    }; 
})

/*
// autofetch factory
ngCimba.factory('DataFeed',function($interval){

	//private storage of feed items
	var _feedItems = [];
	var feeds = [];

	// fetch posts from feed source
	// TODO: sanitize contents!
	function fetchNewData($source) {
			
		var _newItem = {
			uri : _feedItems.length + 1,
			date : new Date(),
			userpic : posts[_feedItems.length].userpic,
			username : posts[_feedItems.length].username,
			body : posts[_feedItems.length].body
		}
		_feedItems.push(_newItem);
	}

	//return the public API
	return {
	    // the data
	    items : _feedItems,
	    
	    // a public function to start the autorefresher
	    
	    //startUpdating : function(refreshInterval){
       	//	$interval(function(){ fetchNewData() },refreshInterval || 500);
	    //}
	    
	}
})


// Controller for displaying posts
ngCimba.controller('PostsCtrl', function($scope,DataFeed) {
	//attach the service data to the controller scope so the directive can use it
	$scope.feedItems = DataFeed.items;

	//attach the event click handler to the service
	DataFeed.startUpdating();

});
*/
