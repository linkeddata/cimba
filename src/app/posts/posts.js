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

.controller("PostsController", function PostsController( $scope, $http, $location, $sce, noticesData) {
	//puts the post information that is saved in local storage into the text box
	if(sessionStorage.getItem($scope.$parent.postData[$scope.currentUrl])&&sessionStorage.getItem($scope.$parent.postData[$scope.currentUrl])!='undefined'){
        $scope.postbody = sessionStorage.getItem($scope.$parent.postData[$scope.currentUrl]);
    }else{
        $scope.postbody = '';
    }
    $scope.currentUrl = $location.absUrl();

    $scope.listAudiences = ['Public', 'Private', 'Friends'];

    $scope.savePostData=function(postBody){
        var currentPost = postBody;
        sessionStorage.setItem($scope.$parent.postData[$scope.currentUrl], currentPost, $scope.currentUrl);
    };

    //clears post data from local storage
    $scope.clearPostData=function(){
        sessionStorage.removeItem($scope.$parent.postData[$scope.currentUrl]);
    };

	var webid = $scope.$parent.userProfile.webid;
	$scope.audience = {};
	$scope.audience.icon = "fa-globe"; //default value

	$scope.hideMenu = function() {
		$scope.$parent.showMenu = false;
	};

	// update the audience selector
	$scope.setAudience = function(audience) {
		v = audience.toLowerCase();
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
	$scope.newPost = function (currentChannel) {
		if (currentChannel) {
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

			//console.log(g); //debug
			//console.log(new $rdf.Serializer(g)); //debug
			var s = new $rdf.Serializer(g).toN3(g);
			//console.log(s); //debug

			var uri = currentChannel.uri;
			var title = currentChannel.title;
			
			var _newPost = {
				uri : '',
				channel: uri,
				chtitle: title,
				date : now,
				timeago : moment(now).fromNow(),
				userpic : $scope.userProfile.picture,
				userwebid : webid,
				username : $scope.userProfile.name,
				body : $scope.postbody.trim(),
				readMore : false
			};

			if(_newPost.body.length > 150) {
				_newPost.readMore = true;
			}
			
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
						noticesData.add('error', 'Unauthorized! You need to authentify before posting.');
					},
					403: function() {
						console.log("403 Forbidden");
						noticesData.add('error', 'Forbidden! You are not allowed to post to the selected channel.');
					},
					406: function() {
						console.log("406 Contet-type unacceptable");
						noticesData.add('error', 'Content-type unacceptable.');
					},
					507: function() {
						console.log("507 Insufficient storage");
						noticesData.add('error', 'Insuffifient storage left! Check your server storage.');
					}
				},
				success: function(d,s,r) {
					console.log('Success, new message was posted!');            
					// clear form
					$scope.postbody = '';
					// also display new post
					var postURI = r.getResponseHeader('Location');
					var ah = parseLinkHeader(r.getResponseHeader('Link'));
					var aclURI = ah['acl']['href'];

					if (postURI) {
						_newPost.uri = postURI;

						if (!$scope.posts) {
							$scope.posts = {};
						}
						// append post to the local list
						if ($scope.channels[uri].posts === undefined) {
							$scope.channels[uri].posts = [];
						}
						$scope.channels[uri].posts.push(_newPost);
						$scope.posts[_newPost.uri] = _newPost;
						$scope.users[webid].gotposts = true;

						// set the corresponding acl
						$scope.setACL(aclURI, postURI, $scope.audience.range);
						// save to local posts
						$scope.$apply();
					} else {
						console.log('Error: posting on the server did not return a Location header');
						notify('Error', 'Unable to save post on the server!');
					}
				}
			}).error(function (data, status) {
				
				$scope.publishing = false;
				$scope.$apply();
			}).done(function() {
				// revert button contents to previous state
				$scope.publishing = false;
				$scope.$apply();
			});
		} else {
			noticesData.add("error", "please select a channel to post to");
		}
	};


	// set the corresponding ACLs for the given post, using the right ACL URI
    $scope.setACL = function(acl, uri, type) {
        var frag = '#'+basename(uri);
        var owner = '#owner';

        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var WAC = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");

        var g = $rdf.graph();
        // add document triples
        g.add($rdf.sym(owner), RDF('type'), WAC('Authorization'));
        g.add($rdf.sym(owner), WAC('accessTo'), $rdf.sym(''));
        g.add($rdf.sym(owner), WAC('accessTo'), $rdf.sym(uri));
        g.add($rdf.sym(owner), WAC('agent'), $rdf.sym($scope.$parent.userProfile.webid));
        g.add($rdf.sym(owner), WAC('mode'), WAC('Read'));
        g.add($rdf.sym(owner), WAC('mode'), WAC('Write'));
        g.add($rdf.sym(owner), WAC('mode'), WAC('Control'));

        // add post triples
        if (type == 'public' || type == 'friends') {
            g.add($rdf.sym(frag), RDF('type'), WAC('Authorization'));
            g.add($rdf.sym(frag), WAC('accessTo'), $rdf.sym(uri));
            // public visibility
            g.add($rdf.sym(frag), WAC('agentClass'), FOAF('Agent'));
            g.add($rdf.sym(frag), WAC('mode'), WAC('Read'));
        }

        console.log(g.toNT());
        console.log(acl);
        s = new $rdf.Serializer(g).toN3(g);

        if (s && s.length > 0 && acl.length > 0) {
            $.ajax({
                type: "PUT", // overwrite just in case
                url: acl,
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
                        notify('Error', 'Unauthorized! You need to authenticate before posting.');
                    },
                    403: function() {
                        console.log("403 Forbidden");
                        notify('Error', 'Forbidden! You are not allowed to update the selected profile.');
                    },
                    406: function() {
                        console.log("406 Content-type unacceptable");
                        notify('Error', 'Content-type unacceptable.');
                    },
                    507: function() {
                        console.log("507 Insufficient storage");
                        notify('Error', 'Insufficient storage left! Check your server storage.');
                    }
                },
                success: function(d,s,r) {
                    console.log('Success! ACLs are now set.');
                }
            });
        }
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
							//reset
							$scope.deletePostStatus = false;
							$scope.postToDelete = [];
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
					//reset
					$scope.deletePostStatus = false;
					$scope.postToDelete = [];
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

		if (isEmpty($scope.posts)) {
			$scope.users[$scope.userProfile.webid].gotposts = false;
		}
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
		if (isEmpty($scope.posts)) {
			$scope.users[$scope.userProfile.webid].gotposts = false;
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
        if (isEmpty($scope.posts)) {
			$scope.users[$scope.userProfile.webid].gotposts = false;
		}
	};

	$scope.setChannel = function(channelUri) {		
		if ($scope.userProfile.channels && $scope.userProfile.channels[channelUri]) {
			$scope.defaultChannel = $scope.userProfile.channels[channelUri];
		}
		else {
            noticesData.add("Could not set channel to: " + channelUri);
        }
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