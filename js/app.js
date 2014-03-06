/* TODO: 
	* add ACLs!
	* display the "Snap" messages only after we're sure there are no channels/posts.
*/

// some config
var PROXY = "https://rww.io/proxy?uri={uri}";
// add filters
var ngCimba = angular.module('CimbaApp', ['ui','ui.filters']);
// replace dates with moment's "time ago" style
ngCimba.filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  }
});
// order function for ng-repeat using lists instead of arrays
ngCimba.filter('orderObjectBy', function(){
 return function(input, attribute) {
    if (!angular.isObject(input)) return input;

    var array = [];
    for(var objectKey in input) {
        array.push(input[objectKey]);
    }

	array.sort(function(a, b){
		var alc = a[attribute].toLowerCase();
		var blc = b[attribute].toLowerCase();
		return alc > blc ? 1 : alc < blc ? -1 : 0;
	});
	return array;
 }
});

// Main angular controller
function CimbaCtrl($scope, $filter) {
	// default values
	// show loading spinner
	$scope.loading = false;
	// posts array
	$scope.posts = [];
	$scope.channels = [];
	$scope.users = {};
	$scope.defaultChannel = {};	
	// misc
	$scope.appuri = window.location.hostname+window.location.pathname;
	$scope.loggedin = false;
	$scope.profileloading = false;
	$scope.testwebid = false;
	$scope.publishing = false;
	$scope.gotresults = false;
	$scope.addstoragebtn = 'Add';
	$scope.createbtn = 'Create';
	$scope.searchbtn = 'Search';
	$scope.audience = 'fa-globe';
	// user object
	$scope.user = {};
	$scope.user.webid = undefined;
	$scope.user.myname = undefined;
	$scope.user.mypic = 'http://cimba.co/img/photo.png';
	$scope.user.storagespace = undefined;
	$scope.user.mbspace = true;
	$scope.user.chspace = true;
	$scope.user.channels = [];

	// cache user credentials in localStorage to avoid double sign in
	$scope.saveCredentials = function () {
		var cimba = {};
		var _user = {};
		_user.webid = $scope.user.webid;
		_user.myname = $scope.user.myname;
		_user.mypic = $scope.user.mypic;
		_user.storagespace = $scope.user.storagespace;
		_user.channels = $scope.user.channels;
		_user.mbspace = $scope.user.mbspace;
		_user.chspace = $scope.user.chspace;
		cimba.user = _user;
		localStorage.setItem($scope.appuri, JSON.stringify(cimba));
	}

	// retrieve from localStorage
	$scope.loadCredentials = function () {
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));
			$scope.user.webid = cimba.user.webid;
			$scope.user.myname = cimba.user.myname;
			$scope.user.mypic = cimba.user.mypic;
			$scope.user.storagespace = cimba.user.storagespace;
			$scope.user.mbspace = cimba.user.mbspace;
			$scope.user.chspace = cimba.user.chspace;
			$scope.user.channels = cimba.user.channels;
			$scope.loggedin = true;
			if ($scope.user.channels)
				$scope.defaultChannel = $scope.user.channels[0];
		} else {
			console.log('Snap, localStorage is empty!');
		}
	}

	// save the list of users + channels
	$scope.saveUsers = function () {
		// save to localStorage
		if (localStorage.getItem($scope.appuri))
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));
		else
			var cimba = {};
		
		cimba.users = $scope.users;
		localStorage.setItem($scope.appuri, JSON.stringify(cimba));

		// also save to PDS
	}
	// load the list of users + channels from localStorage
	$scope.loadUsers = function () {
		$scope.users = {};
		// load from localStorage
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));			
			$scope.users = cimba.users;
		} else {
			// load from PDS
			//$scope.getUsers();
		}
	}

	// save current posts in localStorage
	$scope.savePosts = function () {
		if (localStorage.getItem($scope.appuri))
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));
		else
			var cimba = {};

		cimba.posts = $scope.posts;
		localStorage.setItem($scope.appuri, JSON.stringify(cimba));
	}
	// load the posts from localStorage
	$scope.loadPosts = function () {
		$scope.posts = [];
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));
			$scope.posts = cimba.posts;
		}
	}

	// clear localStorage
	$scope.clearLocalCredentials = function () {
		localStorage.removeItem($scope.appuri);
	}

	// update my user picture	
	$scope.updateUserDOM = function () {
		$('#mypic').html('<a href="'+$scope.user.webid+'" target="_blank">'+
			'<img class="media-object thumb-pic" src="'+$scope.user.mypic+'" rel="tooltip" data-placement="top" width="70" title="'+$scope.user.myname+'"></a>');
	}

	// logout (clear localStorage)
	$scope.clearSession = function () {
		$scope.clearLocalCredentials();
		$scope.user = {};
		$scope.posts = [];
		$scope.loggedin = false;
		// hide loader
		$scope.loading = false;
	}

	// update account
    $scope.setChannel = function(ch) {
        for (var i in $scope.user.channels) {
        	if ($scope.user.channels[i].title == ch) {
        		$scope.defaultChannel = $scope.user.channels[i];
        		break;
    		}
        }
    }

	// update the audience selector
	$scope.setAudience = function(v) {
		if (v=='public')
			$scope.audience = 'fa-globe';
		else if (v=='private')
			$scope.audience = 'fa-lock';
		else if (v=='friends')
			$scope.audience = 'fa-user';
	}
	
	// create a new channel
	// prepare the triples for new storage
	$scope.newChannel = function() {
		$scope.createbtn = 'Creating...';

		var churi = ($scope.channeluri)?$scope.channeluri:'ch';
		// append full URI (storage space URI)
		// TODO: let the user select the uBlog workspace too
		churi = $scope.user.mbspace+churi;

	    $.ajax({
	        type: "MKCOL",
	        url: churi+'/',
	        processData: false,
	        statusCode: {
	            201: function(data) {
	                console.log("201 Created");
	            },
	            401: function() {
	                console.log("401 Unauthorized");
	                notify('Error', 'Unauthorized! You need to authentify!');
	            },
	            403: function() {
	                console.log("403 Forbidden");
	                notify('Error', 'Forbidden! You are not allowed to create new channels.');
	            },
	            406: function() {
	                console.log("406 Contet-type unacceptable");
	                notify('Error', 'Content-type unacceptable.');
	            },
	            507: function() {
	                console.log("507 Insufficient storage");
	                notify('Error', 'Insuffifient storage left! Check your server storage.');
	            },
	        },
	        success: function(d,s,r) {
	            console.log('Success! Created new channel at '+churi+'/');
	            // create the meta file
	           	var meta = parseLinkHeader(r.getResponseHeader('Link'));
				var metaURI = meta['meta']['href'];

				var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
				var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
			    var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
			    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
				var g = $rdf.graph();
				
				// add uB triple (append trailing slash since we got dir)
		        g.add($rdf.sym(churi+'/'), RDF('type'), SIOC('Container'));
		        g.add($rdf.sym(churi+'/'), DCT('title'), $rdf.lit($scope.channeltitle));
		        var s = new $rdf.Serializer(g).toN3(g);

		        if (s.length > 0) {
				    $.ajax({
				        type: "POST",
				        url: metaURI,
				        contentType: "text/turtle",
				        data: s,
				        processData: false,
				        statusCode: {
				            201: function(data) {
				                console.log("201 Created");				                
				            },
				            401: function() {
				                console.log("401 Unauthorized");
				                notify('Error', 'Unauthorized! You need to authentify before posting.');
				            },
				            403: function() {
				                console.log("403 Forbidden");
				                notify('Error', 'Forbidden! You are not allowed to create new containers.');
				            },
				            406: function() {
				                console.log("406 Contet-type unacceptable");
				                notify('Error', 'Content-type unacceptable.');
				            },
				            507: function() {
				                console.log("507 Insufficient storage");
				                notify('Error', 'Insuffifient storage left! Check your server storage.');
				            },
				        },
				        success: function(d,s,r) {
				            console.log('Success! New channel created.');
                        	notify('Success', 'Your new "'+$scope.channeltitle+'" channel was succesfully created!');
			            	// clear form
			            	$scope.channeluri = '';
							$scope.channeltitle = '';
							$scope.createbtn = 'Create';							
							// close modal
							$('#newChannelModal').modal('hide');
							// reload user profile when done
							$scope.getInfo($scope.user.webid, true);
				        }
				    });
		        }
	    	}
	    });
	}

	// prepare the triples for new storage
	$scope.newMB = function() {
		$scope.createbtn = 'Creating...';

		var mburi = ($scope.mburi)?$scope.mburi:'mb';
		// append full URI (storage space URI)
		mburi = $scope.user.storagespace+mburi;

	    $.ajax({
	        type: "MKCOL",
	        url: mburi+'/',
	        processData: false,
	        statusCode: {
	            201: function(data) {
	                console.log("201 Created");
	            },
	            401: function() {
	                console.log("401 Unauthorized");
	                notify('Error', 'Unauthorized! You need to authentify!');
	            },
	            403: function() {
	                console.log("403 Forbidden");
	                notify('Error', 'Forbidden! You are not allowed to create new resources.');
	            },
	            406: function() {
	                console.log("406 Contet-type unacceptable");
	                notify('Error', 'Content-type unacceptable.');
	            },
	            507: function() {
	                console.log("507 Insufficient storage");
	                notify('Error', 'Insuffifient storage left! Check your server storage.');
	            },
	        },
	        success: function(d,s,r) {
	            console.log('Success! Created new uB directory at '+mburi+'/');
	            // create the meta file
	           	var meta = parseLinkHeader(r.getResponseHeader('Link'));
				var metaURI = meta['meta']['href'];

				var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
				var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
			    var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
			    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
				var g = $rdf.graph();
				
				// add uB triple (append trailing slash since we got dir)
		        g.add($rdf.sym(mburi+'/'), RDF('type'), SIOC('Space'));
		        g.add($rdf.sym(mburi+'/'), DCT('title'), $rdf.lit("Microblogging workspace"));
		        var s = new $rdf.Serializer(g).toN3(g);	        
		        if (s.length > 0) {
				    $.ajax({
				        type: "POST",
				        url: metaURI,
				        contentType: "text/turtle",
				        data: s,
				        processData: false,
				        statusCode: {
				            201: function(data) {
				                console.log("201 Created");
				            },
				            401: function() {
				                console.log("401 Unauthorized");
				                notify('Error', 'Unauthorized! You need to authentify before posting.');
				            },
				            403: function() {
				                console.log("403 Forbidden");
				                notify('Error', 'Forbidden! You are not allowed to create new resources.');
				            },
				            406: function() {
				                console.log("406 Contet-type unacceptable");
				                notify('Error', 'Content-type unacceptable.');
				            },
				            507: function() {
				                console.log("507 Insufficient storage");
				                notify('Error', 'Insuffifient storage left! Check your server storage.');
				            },
				        },
				        success: function(d,s,r) {
				            console.log('Success! uBlog space created.');
                        	notify('Success', 'uBlog space created.');                        	
			            	// clear form
							$scope.mburi = '';
							$scope.createbtn = 'Create';							
							// close modal
							$('#newMBModal').modal('hide');
							// reload user profile when done
							$scope.getInfo($scope.user.webid, true);
				        }
				    });
		        }
	    	}
	    });
	}

	// prepare the triples for new storage
	$scope.newStorage = function() {
		$scope.addstoragebtn = 'Adding...';

		var storage = ($scope.storageuri)?$scope.storageuri:'shared/';

		var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
		var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
	    var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
	    var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
	    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
		var g = $rdf.graph();
		
		// add storage triple
        g.add($rdf.sym($scope.user.webid), SPACE('storage'), $rdf.sym(storage));

        var s = new $rdf.Serializer(g).toN3(g);
        console.log(s);
        if (s.length > 0) {
		    $.ajax({
		        type: "POST",
		        url: $scope.user.webid,
		        contentType: "text/turtle",
		        data: s,
		        processData: false,
		        statusCode: {
		            200: function(data) {
		                console.log("200 Created");
		            },
		            401: function() {
		                console.log("401 Unauthorized");
		                notify('Error', 'Unauthorized! You need to authentify before posting.');
		            },
		            403: function() {
		                console.log("403 Forbidden");
		                notify('Error', 'Forbidden! You are not allowed to update the selected profile.');
		            },
		            406: function() {
		                console.log("406 Contet-type unacceptable");
		                notify('Error', 'Content-type unacceptable.');
		            },
		            507: function() {
		                console.log("507 Insufficient storage");
		                notify('Error', 'Insuffifient storage left! Check your server storage.');
		            },
		        },
		        success: function(d,s,r) {
		            console.log('Success! Added a new storage relation to your profile.');
		            notify('Success', 'Your profile was succesfully updated!');
	            	// clear form
					$scope.storageuri = '';
					$scope.addstoragebtn = 'Add';
					// close modal
					$('#newStorageModal').modal('hide');
					// reload user profile when done
					$scope.getInfo($scope.user.webid, true);
		        }
		    });
		}
	}

	// post new message
	$scope.newPost = function () {
		$scope.publishing = true;
		// get the current date
		var now = Date.now();
		now = moment(now).format("YYYY-MM-DDTHH:mm:ssZZ");

		var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
		var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
	    var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
	    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
		var g = $rdf.graph();
		
		// set triples
        g.add($rdf.sym(''), RDF('type'), SIOC('Post'));
        g.add($rdf.sym(''), SIOC('content'), $rdf.lit($scope.postbody.trim()));
        g.add($rdf.sym(''), SIOC('has_creator'), $rdf.sym('#author'));
    	g.add($rdf.sym(''), DCT('created'), $rdf.lit(now, '', $rdf.Symbol.prototype.XSDdateTime));
        // add author triples
        g.add($rdf.sym('#author'), RDF('type'), SIOC('UserAccount'));
        g.add($rdf.sym('#author'), SIOC('account_of'), $rdf.sym($scope.user.webid));
        g.add($rdf.sym('#author'), SIOC('avatar'), $rdf.sym($scope.user.mypic));
        g.add($rdf.sym('#author'), FOAF('name'), $rdf.lit($scope.user.myname));

    	var s = new $rdf.Serializer(g).toN3(g);
    	var uri = $scope.defaultChannel.uri;
    	
		var _newPost = {
			uri : '',
			date : now,
			timeago : moment(now).fromNow(),
			userpic : $scope.user.mypic,
			userwebid : $scope.user.webid,
			username : $scope.user.myname,
			body : $scope.postbody.trim()
		}

		postNew(uri, s, _newPost);
	}

	function postNew(uri, data, post) {
	    $.ajax({
	        type: "POST",
	        url: uri,
	        contentType: "text/turtle",
	        data: data,
	        processData: false,
	        statusCode: {
	            201: function(data) {
	                console.log("201 Created");
	                notify('Post', 'Your post was succesfully submitted and created!');
	            },
	            401: function() {
	                console.log("401 Unauthorized");
	                notify('Error', 'Unauthorized! You need to authentify before posting.');
	            },
	            403: function() {
	                console.log("403 Forbidden");
	                notify('Error', 'Forbidden! You are not allowed to post to the selected channel.');
	            },
	            406: function() {
	                console.log("406 Contet-type unacceptable");
	                notify('Error', 'Content-type unacceptable.');
	            },
	            507: function() {
	                console.log("507 Insufficient storage");
	                notify('Error', 'Insuffifient storage left! Check your server storage.');
	            },
	        },
	        success: function(d,s,r) {
	            console.log('Success!');
            	// clear form
				$scope.postbody = '';
            	// also display new post
	            newURI = r.getResponseHeader('Location');
	            post.uri = newURI;		
				if ($scope.posts)
					$scope.posts.push(post);
				else
					notify('Error', 'Cannot append the new post to the viewer!');
				$scope.publishing = false;
				$scope.$apply();
				$scope.savePosts();
	        }
	    });
	}

	// delete post
	$scope.deletePost = function (post, refresh) {
		// check if the user matches the post owner
		if ($scope.user.webid == post.userwebid) {
			$scope.removePost(post.uri);
			$scope.savePosts();
			$.ajax({
				url: post.uri,
		        type: "delete",
		        success: function () {
		        	console.log('Deleted '+post.uri);
		        	notify('Success', 'Your post was removed from the server!')
		        	// TODO: also delete from local posts
					
					$scope.savePosts();
		        },
		        failure: function (r) {
		            var status = r.status.toString();
		            if (status == '403')
		                notify('Error', 'Could not delete post, access denied!');
		            if (status == '404')
		            	notify('Error', 'Could not delete post, no such resource on the server!');
		        }
		    });
		}
	}

	$scope.removePost = function (uri) {
		for (i=$scope.posts.length - 1; i>=0; i--) {    
		    if($scope.posts[i].uri == uri)
		    	$scope.posts.splice(i,1);
		}
	}

	// force refresh the view
	$scope.updatePosts = function() {
		if ($scope.user.channels.length > 0) {
			// clear previous posts
			$scope.posts = [];
			for (c in $scope.user.channels) {
				console.log('Getting feed posts for '+$scope.user.channels[c].uri);
				$scope.getPosts($scope.user.channels[c].uri);
			}
		}
	}

	// lookup a WebID to find channels
    $scope.drawSearchResults = function() {
		$scope.gotresults = true;
    	for (i=0;i<$scope.search.channels.length;i++) {
    		// find if we have the channel in our list already
    		var ch = $scope.search.channels[i];
    		// check if it's a known user
			if ($scope.users && $scope.users[$scope.search.webid]) {
	    		var idx = findWithAttr($scope.users[$scope.search.webid].channels, 'uri', ch.uri);
	    		var c = $scope.users[$scope.search.webid].channels[idx];    		
	    		// set attributes
	    		if (idx != undefined) {
	    			ch.button = c.button;
		    		ch.css = c.css;
		    		ch.action = c.action;
	    		} else {
		    		ch.button = 'fa-eye';
		    		ch.css = 'btn-info';
		    		ch.action = 'Subscribe';
	    		}
    		} else {
    			if (!ch.button)
	    			ch.button = 'fa-eye';
	    		if (!ch.css)
	    			ch.css = 'btn-info';
	    		if (!ch.action)
	    			ch.action = 'Subscribe';
    		}
    	}
    	$scope.searchbtn = 'Search';
    	$scope.$apply();

    }
    // toggle selected channel for user
	$scope.channelToggle = function(ch, user) {
		// we're following this user
		if ($scope.users && $scope.users[user.webid]) {
			var channels = $scope.users[user.webid].channels;
			var idx = findWithAttr(channels, 'uri', ch.uri);
			// already have the channel
			if (idx != undefined) {
				var c = channels[idx];
				// unsubscribe
				if (c.action == 'Unsubscribe') {
					c.action = ch.action = 'Subscribe';
					c.button = ch.button = 'fa-eye';
			    	c.css = ch.css = 'btn-info';
		    	} else {
	    		// subscribe
					c.action = ch.action = 'Unsubscribe';
					c.button = ch.button = 'fa-eye-slash';
			    	c.css = ch.css = 'btn-success';
		    	}
	    	} else {
	    		// subscribe
	    		ch.action = 'Unsubscribe';
				ch.button = 'fa-eye-slash';
		    	ch.css = 'btn-success';
	    	}
	    	// also update the users list in case there is a new channel
	    	$scope.users[user.webid] = user;
	    	$scope.saveUsers();
		} else {
			// subscribe (also add user + channels)
			ch.action = 'Unsubscribe';
			ch.button = 'fa-eye-slash';
	    	ch.css = 'btn-success';	    	
			if (!$scope.users)
				$scope.users = {};
			$scope.users[user.webid] = user;
			$scope.saveUsers();
		}
	}

	// get a user's WebID profile data to personalize app
	$scope.authenticate = function(webid, mine) {		
		if (webid && (webid.substr(0, 4) == 'http')) {
			if (mine) {
				$scope.user = {};
				$scope.user.webid = webid;
				$scope.profileloading = true;
			}
			console.log('Found WebID: '+webid);
			$scope.getInfo(webid, mine);
		} else {
			console.log('No webid found!');
			if (mine) {
				notify('Error', 'WebID-TLS authentication failed.');
				$scope.testwebid = true;
				// hide spinner
				$scope.profileloading = false;
				$scope.$apply();
			}
		}
	}

	// get relevant info for a webid
	$scope.getInfo = function(webid, mine) {
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
	    	if (storage != undefined)
	    		storage = storage.value;

	    	// Clean up name
	        name = (name)?name.value:'Unknown';

	        // set avatar picture
	        if (pic) {
	        	pic = pic.value
        	} else {
	            if (depic)
	                pic = depic.value;
	            else
	                pic = 'http://cimba.co/img/photo.png';
	        }

	        var _user = {
					webid: webid,
		    		name: name,
					pic: pic,
					storagespace: storage,
					channels: new Array()
		    	}

    		// add to search object if it was the object of a search
    		if ($scope.searchwebid && $scope.searchwebid == webid)
	   			$scope.search = _user;

	   		// get channels for user
	    	$scope.getChannels(storage, webid, mine);

			if (mine) { // mine
		        $scope.user.myname = name;
		        $scope.user.mypic = pic;
		        $scope.user.storagespace = storage;

				// find microblogging feeds/channels
		        if (!storage)
		        	$scope.loading = false; // hide spinner

		    	// cache user credentials in localStorage
		    	$scope.saveCredentials();
		    	// update DOM
		    	$scope.updateUserDOM();
		    	$scope.loggedin = true;
		    	$scope.profileloading = false;
	    		$scope.$apply();
			}
	    });
	}

	// get channel feeds based on a storage container
	$scope.getChannels = function(uri, webid, mine) {
		var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
		var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
	    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
	    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
	    var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
	    var g = $rdf.graph();
	    var f = $rdf.fetcher(g);
	    // add CORS proxy
	    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;
	    // fetch user data: SIOC:Space -> SIOC:Container -> SIOC:Post
	    f.nowOrWhenFetched(uri,undefined,function(){
	        // find all SIOC:Container
	        var ws = g.statementsMatching(undefined, RDF('type'), SIOC('Space'));
	        
	        if (ws.length > 0) {
				$scope.loading = true;
				// set a default uBlog workspace
				$scope.user.mbspace = ws[0]['subject']['value'];
				for (var i in ws) {
					w = ws[i]['subject']['value'];

					// find the channels info for the user
		        	f.nowOrWhenFetched(w+'.meta*', undefined,function(){
			        	var chs = g.statementsMatching(undefined, RDF('type'), SIOC('Container'));
			        	var channels = [];
			        	
			        	if (chs.length > 0) {
				        	// clear list first
				        	if (mine)
				        		$scope.user.channels = [];
			        	
				        	for (var ch in chs) {
		        				var channel = {};
		        				channel.uri = chs[ch]['subject']['value'];
			        			var title = g.any(chs[ch]['subject'], DCT('title')).value;
			        			
			        			if (title)
			        				channel.title = title;
			        			else
			        				channel.title = channel.uri;
			        						        			
								channels.push(channel);

								// mine
								if (mine) {									
									$scope.user.channels.push(channel);
		        					// force get the posts for my channels
		        					$scope.getPosts(channel.uri);
									$scope.user.chspace = true;
								}
				        	}

	    					if (mine)
					        	$scope.defaultChannel = $scope.user.channels[0];
				        } else {
				        	console.log('No channels found!');
				        	if (mine)
				        		$scope.user.chspace = false;
				        }
						
				        // if we were called by search
			        	if ($scope.searchwebid && $scope.searchwebid == webid) {
							$scope.search.channels = channels;
							$scope.drawSearchResults();
			        	}

				        if (mine) {
							$scope.saveCredentials();
					        // hide loader
					        $scope.loading = false;
					        $scope.$apply();
				        }
		        	});
				}
			} else {
				// no uBlogging workspaces found!

		        // we were called by search
	        	if ($scope.searchwebid && $scope.searchwebid == webid) {
					$scope.drawSearchResults();
				}

				if (mine) {
					console.log('No microblog found!');
					$scope.user.mbspace = false;
					$scope.user.chspace = false;
					$scope.saveCredentials();
					// hide loader
			        $scope.loading = false;
			        $scope.$apply();
				}
			}
	    });
	}

	// get all posts for a given microblogging workspace
	$scope.getPosts = function(channel) {
		var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
		var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
	    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
	    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
	    var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
	    var g = $rdf.graph();
	    var f = $rdf.fetcher(g);
	    // add CORS proxy
	    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

		// get all SIOC:Post (using globbing)
		f.nowOrWhenFetched(channel+'*', undefined,function(){
			var posts = g.statementsMatching(undefined, RDF('type'), SIOC('Post'));

			for (var p in posts) {
				var uri = posts[p]['subject'];
				var useraccount = g.any(uri, SIOC('has_creator'));
				var post = g.statementsMatching(posts[p]['subject']);
				if (g.any(uri, DCT('created'))) {
					var date = g.any(uri, DCT('created')).value;					
				} else {
					var date = undefined;
				}
				if (g.any(useraccount, SIOC('account_of'))) {
					var userwebid = g.any(useraccount, SIOC('account_of')).value;
				} else {
					var userwebid = 'Unknown';
				}
				if (g.any(useraccount, SIOC('avatar'))) {
					var userpic = g.any(useraccount, SIOC('avatar')).value;
				} else {
					var userpic = 'Unknown';
				}
				if (g.any(useraccount, FOAF('name'))) {
					var username = unescape(g.any(useraccount, FOAF('name')).value);
				} else {
					var username = userwebid;
				}
				if (g.any(uri, SIOC('content'))) {
					var body = g.any(uri, SIOC('content')).value;
				} else {
					var body = '';
				}
				uri = uri.value;

				// check if we need to overwrite instead of pushing new item
				var _newPost = {
					uri : uri,
					date : date,
					userwebid : userwebid,
					userpic : userpic,
					username : username,
					body : body
				}
				
				// remove if it exists
				$scope.removePost(post.uri);
				// append post
				$scope.posts.push(_newPost);
				$scope.$apply();
			}
			// done loading, save posts to localStorage
			$scope.savePosts();
			// hide spinner
			$scope.loading = false;
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
			$scope.authenticate(e.data.slice(5, e.data.length), true);
			// clear previous posts
	    	jQuery('posts-viewer').empty();
		}
		$('#loginModal').modal('hide');
	},false);

	// init by retrieving user from localStorage
	$scope.loadCredentials();
	$scope.loadUsers();
	$scope.loadPosts();
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

//simple directive to display list of channels
ngCimba.directive('channelslist',function(){
  	return {
		replace : true,
		restrict : 'E',
		templateUrl: 'tpl/channel-list.html'
    }; 
})
