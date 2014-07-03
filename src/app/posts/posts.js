angular.module('Cimba.posts',[
	'ui.router'
])

.config(function PostsConfig( $stateProvider ) {
	$stateProvider.state( 'posts', {
		url: '/',
		views: {
			"main": {
				controller: 'PostsController',
				templateUrl: ''
			}
		},
		data:{
			pageTitle: 'Posts'
		}
	});
})

.controller("PostsController", function PostsController( $scope, $http, $location, $sce ) {
	var webid = $scope.$parent.userProfile.webid;
	$scope.audience = {};
	$scope.audience.icon = "fa-globe"; //default value
	$scope.hideMenu = function() {
		$scope.$parent.showMenu = false;
	};

	// update account
    $scope.setChannel = function(ch) {
		console.log(webid);
		console.log($scope.users[webid]);
        for (var i in $scope.users[webid].channels) {
			if ($scope.users[webid].channels[i].title == ch) {
				$scope.defaultChannel = $scope.users[webid].channels[i];
				break;
			}
		}
    };

	// update the audience selector
	$scope.setAudience = function(v) {
		if (v=='public') {
			$scope.audience.icon = 'fa-globe';
			$scope.audience.range = 'public';
		} else if (v=='private') {
			$scope.audience.icon = 'fa-lock';
			$scope.audience.range = 'private';
		} else if (v=='friends') {
			$scope.audience.icon = 'fa-user';
			$scope.audience.range = 'friends';
		}
	};

	// post new message
	$scope.newPost = function () {
		$scope.publishing = true;
		// get the current date
		var now = Date.now();
		now = moment(now).zone('00:00').format("YYYY-MM-DDTHH:mm:ssZZ");
		
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
		g.add($rdf.sym('#author'), SIOC('account_of'), $rdf.sym(webid));
		g.add($rdf.sym('#author'), SIOC('avatar'), $rdf.sym($scope.userProfile.picture));
		g.add($rdf.sym('#author'), FOAF('name'), $rdf.lit($scope.userProfile.name));

		console.log(g); //debug
		console.log(new $rdf.Serializer(g)); //debug
		var s = new $rdf.Serializer(g).toN3(g);
		console.log(s); //debug
		var uri = $scope.defaultChannel.uri;
		var title = $scope.defaultChannel.title;
		
		var _newPost = {
			uri : '',
			channel: uri,
			chtitle: title,
			date : now,
			timeago : moment(now).fromNow(),
			userpic : $scope.userProfile.picture,
			userwebid : webid,
			username : $scope.userProfile.name,
			body : $scope.postbody.trim()
		};

		$.ajax({
			type: "POST",
			url: uri,
			contentType: "text/turtle",
			data: s,
			processData: false,
			xhrFields: {
				withCredentials: true
			},
			statusCode: {
				201: function() {
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
				}
			},
			success: function(d,s,r) {
				console.log('Success, new message was posted!');            
				// clear form
				$scope.postbody = '';
				// also display new post
				var postURI = r.getResponseHeader('Location');
				if (postURI) {
					_newPost.uri = postURI;

					if (!$scope.posts) {
						$scope.posts = {};
					}
					// append post to the local list
					$scope.channels[uri].posts.push(_newPost);
					$scope.posts[_newPost.uri] = _newPost;
					$scope.users[webid].gotposts = true;

					// set the corresponding acl
					$scope.setACL(postURI, $scope.audience.range);
					// save to local posts
					$scope.$apply();
				} else {
					console.log('Error: posting on the server did not return a Location header');
					notify('Error', 'Unable to save post on the server!');
				}
			}
		}).done(function() {
		// revert button contents to previous state
		$scope.publishing = false;
		$scope.$apply();
		});
	};

	// set the corresponding ACLs for the given post, using the right ACL URI
	$scope.setACL = function(uri, type, defaultForNew) {
		// get the acl URI first
		$.ajax({
			type: "HEAD",
			url: uri,
			xhrFields: {
				withCredentials: true
			},
			success: function(d,s,r) {
				// acl URI
				var acl = parseLinkHeader(r.getResponseHeader('Link'));
				var aclURI = acl['acl']['href'];
				// frag identifier
				var frag = '#'+basename(uri);

				var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
				var WAC = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
				var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");

				var g = $rdf.graph();
				// add document triples
				g.add($rdf.sym(''), WAC('accessTo'), $rdf.sym(''));
				g.add($rdf.sym(''), WAC('accessTo'), $rdf.sym(uri));
				g.add($rdf.sym(''),	WAC('agent'), $rdf.sym(webid));
				g.add($rdf.sym(''),	WAC('mode'), WAC('Read'));
				g.add($rdf.sym(''),	WAC('mode'), WAC('Write'));

				// add post triples
				g.add($rdf.sym(frag), WAC('accessTo'), $rdf.sym(uri));
				// public visibility
				if (type == 'public' || type == 'friends') {
					g.add($rdf.sym(frag), WAC('agentClass'), FOAF('Agent'));
					g.add($rdf.sym(frag), WAC('mode'), WAC('Read'));
				} else if (type == 'private') {
					// private visibility
					g.add($rdf.sym(frag), WAC('agent'), $rdf.sym(webid));
					g.add($rdf.sym(frag), WAC('mode'), WAC('Read'));
					g.add($rdf.sym(frag), WAC('mode'), WAC('Write'));
				}
				if (defaultForNew && uri.substring(uri.length - 1) == '/') {
					g.add($rdf.sym(frag), WAC('defaultForNew'), $rdf.sym(uri));
				}

				s = new $rdf.Serializer(g).toN3(g);
				
				if (s && aclURI) {
					$.ajax({
						type: "PUT", // overwrite just in case
						url: aclURI,
						contentType: "text/turtle",
						data: s,
						processData: false,
						xhrFields: {
							withCredentials: true
						},
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
							}
						},
						success: function(d,s,r) {
							console.log('Success! ACLs are now set.');
						}
					});
				}
			}
		});
	};

	// delete a single post
	$scope.deletePost = function (post, channeluri, refresh) {
		// check if the user matches the post owner
		if (webid == post.userwebid) {
			$.ajax({
				url: post.uri,
				type: "delete",
				xhrFields: {
					withCredentials: true
				},
				success: function (d,s,r) {
					console.log('Deleted '+post.uri);
					notify('Success', 'Your post was removed from the server!');

					// TODO: TEST THIS AGAIN!!!
					$scope.removePost(post.uri, channeluri);
					$scope.$apply();

					// also remove the ACL file
					var acl = parseLinkHeader(r.getResponseHeader('Link'));
					var aclURI = acl['acl']['href'];
					$.ajax({
						url: aclURI,
						ype: "delete",
						xhrFields: {
							withCredentials: true
						},
						success: function (d,s,r) {
							console.log('Deleted! ACL file was removed from the server.');
						}
					});
				},
				failure: function (r) {
					var status = r.status.toString();
					if (status == '403') {
						notify('Error', 'Could not delete post, access denied!');
					}
					if (status == '404') {
						notify('Error', 'Could not delete post, no such resource on the server!');
					}
				}
			});
		}
	};

	//remove the post with the given post uri and channeluri
	$scope.removePost = function(posturi, channeluri) {
		var modified = false;
		for (var p in $scope.channels[channeluri].posts) {
			var post = $scope.channels[channeluri].posts[p];
			if (posturi && post.uri == posturi) {
				delete $scope.channels[channeluri].posts[p];
			} 
			modified = true;
		}

		delete $scope.posts[posturi];
		
	};

	// remove all posts from viewer based on the given WebID
	$scope.removePostsByOwner = function(webid) {
		var modified = false;
		if ($scope.posts && !isEmpty($scope.posts)) {
			var channel = {};
			for (var p in $scope.posts) {
				var post = $scope.posts[p];
				if (webid && post.userwebid === webid) {
					delete $scope.posts[p];
					channelId = post.channel;
					for (var i in $scope.channels[post.channel].posts) {
						var chpost = $scope.channels[post.channel].posts[i];
						if (chpost.webid === webid) {
							delete $scope.channels[post.channel].posts[i];
						}
					}					
				}
			}
		}
	};

	// remove all posts from viewer based on the given channel URI
	$scope.removePostsByChannel = function(ch) {
		var modified = false;
        for (var p in $scope.posts) {
            if (ch && $scope.posts[p].channel === ch) {
                delete $scope.posts[p];
            }
        }

        $scope.channels[ch].posts = [];
	};
})

//simple directive to display new post box
.directive('postBox',function(){
    return {
    replace : true,
    restrict : 'E',
    templateUrl: 'posts/new_post.tpl.html'
    }; 
})

.directive('postChannel', function () {
	return {
		replace: true,
		restrict: 'E', 
		templateUrl: "channels/view/new_post.tpl.html"
	};
})

//simple directive to display each post
.directive('postsViewer',function(){
    return {
    replace : true,
    restrict : 'E',
    templateUrl: 'posts/posts.tpl.html'
    }; 
});