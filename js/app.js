/* TODO: 
	* add ACLs!
*/

// some config
var PROXY = "https://rww.io/proxy?uri={uri}";
// add filters
var ngCimba = angular.module('CimbaApp', ['ui','ui.filters']).filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  }
});

// Main angular controller
function CimbaCtrl($scope, $filter) {
	// default values
	// show loading spinner
	$scope.loading = false;
	// posts array
	$scope.posts = [];
	$scope.defaultChannel = {};	
	// misc
	$scope.appuri = window.location.hostname+window.location.pathname;
	$scope.loggedin = false;
	$scope.profileloading = false;
	$scope.testwebid = false;
	$scope.publishing = false;
	$scope.addstoragebtn = 'Add';
	$scope.createbtn = 'Create';
	$scope.audience = 'icon-globe';
	// user object
	$scope.user = {};
	$scope.user.webid = undefined;
	$scope.user.myname = undefined;
	$scope.user.mypic = 'http://cimba.co/img/photo.png';
	$scope.user.storagespace = undefined;
	$scope.user.mbspace = undefined;
	$scope.user.chspace = undefined;
	$scope.user.channels = [];

	// cache user credentials in localStorage to avoid double sign in
	$scope.storeLocalCredentials = function () {
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
	$scope.getLocalCredentials = function () {
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

	// save the list of channels in localStorage
	$scope.saveChannels = function () {
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));			
			cimba.user.channels = $scope.user.channels;
			cimba.user.mbspace = $scope.user.mbspace;
			cimba.user.chspace = $scope.user.chspace;
			localStorage.setItem($scope.appuri, JSON.stringify(cimba));
		}
	}
	// load the list of channels from localStorage
	$scope.loadChannels = function () {
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));			
			$scope.user.channels = cimba.user.channels;
			$scope.user.mbspace = cimba.user.mbspace;
			$scope.user.chspace = cimba.user.chspace;
		}
	}

	// save current posts in localStorage
	$scope.savePosts = function () {
		if (localStorage.getItem($scope.appuri)) {
			var cimba = JSON.parse(localStorage.getItem($scope.appuri));			
			cimba.posts = $scope.posts;
			localStorage.setItem($scope.appuri, JSON.stringify(cimba));
		}
	}
	// load the posts from localStorage
	$scope.loadPosts = function () {
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
			$scope.audience = 'icon-globe';
		else if (v=='private')
			$scope.audience = 'icon-lock';
		else if (v=='friends')
			$scope.audience = 'icon-user';
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
		        g.add($rdf.sym(churi+'/'), RDF('type'), SIOC('Forum'));
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
							$scope.getWebIDProfile($scope.user.webid);
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
		        g.add($rdf.sym(mburi+'/'), RDF('type'), SIOC('Container'));
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
							$scope.getWebIDProfile($scope.user.webid);
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
					$scope.getWebIDProfile($scope.user.webid);
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
				$scope.posts.push(post);
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
		console.log('Removing post '+uri+' from viewer.');
		for (i=$scope.posts.length - 1; i>=0; i--) {    
		    if($scope.posts[i].uri == uri)
		    	$scope.posts.splice(i,1);
		}
		$scope.savePosts();
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
	        name = (name == undefined) ? 'Unknown':name.value;
	        if (name.length > 22)
	            name = name.slice(0, 18)+'...';

	        // set avatar picture
	        if (pic == undefined) {
	            if (depic)
	                pic = depic.value;
	            else
	                pic = 'http://cimba.co/img/photo.png';
	        } else {
	            pic = pic.value;
	        }

	        // find microblogging feeds/channels
	        if (storage)
	        	$scope.getChannels(storage, mine);
	        else
	        	$scope.loading = false; // hide spinner

			var _user = {
	    		fullname: name,
				pic: pic,
				storagespace: storage
	    	}

			if (mine) {
		        $scope.user.myname = name;
		        $scope.user.mypic = pic;
		        $scope.user.storagespace = storage;
		    	// cache user credentials in localStorage
		    	$scope.storeLocalCredentials();
		    	// update DOM
		    	$scope.updateUserDOM();
		    	$scope.loggedin = true;
			}
	    	$scope.profileloading = false;
	    	$scope.$apply();

	    	return _user;
	    });
	}

	// get a user's WebID profile data to personalize app
	$scope.getWebIDProfile = function(webid) {		
		if (webid && (webid.substr(0, 4) == 'http')) {
			$scope.user = {};
			$scope.user.webid = webid;
			console.log('Found WebID: '+$scope.user.webid);	
			$scope.profileloading = true;		
			$scope.getInfo($scope.user.webid, true);
		} else {
			console.log('No webid found!');
			notify('Error', 'WebID-TLS authentication failed.');
			$scope.testwebid = true;
			// hide spinner
			$scope.profileloading = false;
			$scope.$apply();
		}
	}

	// get feeds based on a storage container
	$scope.getChannels = function(uri, mine) {
		var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
		var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
	    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
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
	        
	        if (ws.length > 0) {
				$scope.loading = true;
				// set a default uBlog workspace
				$scope.user.mbspace = ws[0]['subject']['value'];
				for (var i in ws) {
					w = ws[i]['subject']['value'];

					// find the channels info for the user
		        	f.nowOrWhenFetched(w+'.meta*', undefined,function(){
			        	var chs = g.statementsMatching(undefined, RDF('type'), SIOC('Forum'));
			        	if (chs.length > 0) {
				        	for (var ch in chs) {
		        				var channel = {};
		        				channel.uri = chs[ch]['subject']['value'];
			        			var title = g.any(chs[ch]['subject'], DCT('title')).value;
			        			// force get the posts for this channel
		        				$scope.getPosts(channel.uri, true);

			        			console.log('ch='+ch+' | u='+channel.uri+' | t='+title);
			        			if (title)
			        				channel.title = title;
			        			else
			        				channel.title = channel.uri;

								if (mine) {
				        			if ($scope.user.channels == undefined)
				        				$scope.user.channels = [];
									$scope.user.channels.push(channel);
								}
				        	}
	    					if (mine) {
					        	$scope.defaultChannel = $scope.user.channels[0];
					        	$scope.user.chspace = true;
				        	}
				        } else {
				        	console.log('No channels found!');
				        	$scope.user.chspace = false;
				        }
						$scope.saveChannels();
				        // hide loader
				        $scope.loading = false;
				        $scope.$apply();
		        	});
				}
			} else {
				// no uBlogging workspaces found!
				console.log('No microblog found!');
				$scope.user.mbspace = false;
				$scope.user.chspace = false;
				$scope.saveChannels();
				// hide loader
		        $scope.loading = false;
		        $scope.$apply();
			}
	    });
	}

	// get all posts for a given microblogging workspace
	$scope.getPosts = function(channel, forced) {
		forced = true;
        if (forced) {
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

					// check if we need to overwrite instead of pushing new item
					var _newPost = {
						uri : uri.value,
						date : date,
						userwebid : userwebid,
						userpic : userpic,
						username : username,
						body : body
					}
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
	}

	// Event listener for login (from child iframe)
	var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
	var eventListener = window[eventMethod];
	var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

	// Listen to message from child window
	eventListener(messageEvent,function(e) {
		var u = e.data;
		if (e.data.slice(0,5) == 'User:') {
			$scope.getWebIDProfile(e.data.slice(5, e.data.length));
			// clear previous posts
	    	jQuery('posts-viewer').empty();
		}
		$('#loginModal').modal('hide');
	},false);

	// init by retrieving user from localStorage
	$scope.getLocalCredentials();
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

