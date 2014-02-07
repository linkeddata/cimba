// some config
var PROXY = "https://rww.io/proxy?uri={uri}";

var ngCimba = angular.module('CimbaApp', ['ui','ui.filters']);

function CimbaCtrl($scope, $timeout, $http) {
	// default values
	$scope.audience = 'icon-globe';
	$scope.webid = undefined;
	$scope.fullname = undefined;
	$scope.userpic = 'img/photo.png';

	// cache user credentials in localStorage to avoid double sign in
	$scope.storeLocalCredentials = function () {
		var cimba = {};
		cimba.webid = $scope.webid;
		cimba.fullname = $scope.fullname;
		cimba.userpic = $scope.userpic;
		console.log(cimba);
		localStorage.setItem('cimba', JSON.stringify(cimba));
		console.log(JSON.parse(localStorage.getItem( 'cimba')));
	}

	// retrieve from localStorage
	$scope.getLocalCredentials = function () {
		if (localStorage.getItem('cimba')) {
			var cimba = JSON.parse(localStorage.getItem('cimba'));
			$scope.webid = cimba.webid;
			$scope.fullname = cimba.fullname;
			$scope.userpic = cimba.userpic;
		} else {
			console.log('localStorage is empty!');
		}
	}

	// clear localStorage
	$scope.clearLocalCredentials = function () {
		localStorage.removeItem('cimba');
		console.log(JSON.parse(localStorage.getItem('cimba')));
	}

	// update my user picture	
	$scope.updateUserDOM = function () {
		$('#mypic').html('<img class="media-object" src="'+$scope.userpic+'" rel="tooltip" data-placement="top" width="70" title="'+$scope.fullname+'">');
	}

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

	        name = (name == undefined) ? 'Unknown':name.value;
	        if (name.length > 22)
	            name = name.slice(0, 18)+'...';
	        $scope.fullname = name;

	        if (pic == undefined) {
	            if (depic)
	                pic = depic.value;
	            else
	                pic = 'img/nouser.png';
	        } else {
	            pic = pic.value;
	        }
	        $scope.userpic = pic;

        	// cache user credentials in localStorage
        	$scope.storeLocalCredentials();
        	$scope.updateUserDOM();
	    });
	}

	// Event listener (from child iframe)
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

	// retrieve user from localStorage
	$scope.getLocalCredentials();
	$scope.updateUserDOM();
}


