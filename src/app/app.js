// Globals
var PROXY = "https://rww.io/proxy?uri={uri}";
var AUTH_PROXY = "https://rww.io/auth-proxy?uri=";
var TIMEOUT = 90000;
var DEBUG = true;

// Angular
angular.module( 'Cimba', [
  'templates-app',
  'templates-common',
  'Cimba.tab',
  'Cimba.posts',
  'Cimba.home',
  'Cimba.login',
  'Cimba.about',
  'Cimba.channels',
  'Cimba.find',
  'ui.router',
  'ngProgress'
])

.config( function CimbaConfig ( $stateProvider, $urlRouterProvider ) {
  $urlRouterProvider.otherwise( '/home' );
})

// replace dates with moment's "time ago" style
.filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  };
})

// parse markdown text to html
.filter('markdown', function ($sce) {
    var converter = new Showdown.converter();
  return function (str) {
        return converter.makeHtml(str);
    };
})

// turn http links in text to hyperlinks
.filter('makeLinks', function ($sce) {
    return function (str) {
        return $sce.trustAsHtml(str.
                                replace(/</g, '&lt;').
                                replace(/>/g, '&gt;').
                                replace(/(http[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
                               );
    };
})

// order function for ng-repeat using lists instead of arrays
.filter('orderObjectBy', function(){
 return function(input, attribute) {
    if (!angular.isObject(input)) {
      return input;
    }

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
 };
})

// filter array of objects by property
.filter('unique', function() {
  return function(collection, keyname) {
    var output = [], 
    keys = [];

    angular.forEach(collection, function(item) {
      var key = item[keyname];
      if(keys.indexOf(key) === -1) {
        keys.push(key);
        output.push(item);
      }
    });

    return output;
  };
})

.controller( 'MainCtrl', function MainCtrl ($scope, $rootScope, $location, $timeout, ngProgress, $http ) {
    // Some default values
    $scope.appuri = window.location.hostname+window.location.pathname;
    $scope.loginSuccess = false;
    $scope.userProfile = {};
    $scope.userProfile.picture = 'assets/generic_photo.png';
    $scope.channels = [];
    $scope.allPosts = {};//aggregate list of all posts by channel uri
    $scope.posts = []; //aggregate list of all posts (flat list)
    $scope.users = {};
    $scope.search = {}; 

    $rootScope.userProfile = {};

    $scope.login = function () {
        $location.path('/login');
    };

    $scope.logout = function () {
        // Logout WebID (only works in Firefox and IE)
        if (document.all == null) {
            if (window.crypto) {
                try {
                    window.crypto.logout(); //firefox ok -- no need to follow the link
                } catch (err) {//Safari, Opera, Chrome -- try with tis session breaking
               
                }
            }
        } else { // MSIE 6+dsd
            document.execCommand('ClearAuthenticationCache');
        }

        // clear sessionStorage
        $scope.clearLocalCredentials();
        $scope.userProfile = {};
        $rootScope.userProfile = $scope.userProfile;
        $location.path('/login');
    };

    // cache user credentials in sessionStorage to avoid double sign in
    $scope.saveCredentials = function () {
        var cimba = {};
        var _user = {};
        cimba.userProfile = $scope.userProfile;
        sessionStorage.setItem($scope.appuri, JSON.stringify(cimba));
    };

    // retrieve from sessionStorage
    $scope.loadCredentials = function () {
        if (sessionStorage.getItem($scope.appuri)) {
            var cimba = JSON.parse(sessionStorage.getItem($scope.appuri));
            if (cimba.userProfile) {
                if (!$scope.userProfile) {
                    $scope.userProfile = {};                    
                }
                $scope.userProfile = cimba.userProfile;
                $scope.loggedin = true;
                if ($scope.userProfile.channels) {
                    $scope.defaultChannel = $scope.userProfile.channels[0];
                }
                // load from PDS (follows)
                if ($scope.userProfile.mbspace && (!$scope.users || $scope.users.length === 0)) {
                    //$scope.getUsers();
                }
                // refresh data
                $scope.getInfo(cimba.userProfile.webid, true);                
            } else {
                // clear sessionStorage in case there was a change to the data structure
                sessionStorage.removeItem($scope.appuri);                
            }
        }
        $rootScope.userProfile = $scope.userProfile;
    };

    // clear sessionStorage
    $scope.clearLocalCredentials = function () {
        sessionStorage.removeItem($scope.appuri);
    };

    $scope.$watch('loginSuccess', function(newVal, oldVal) {
        if (newVal === true && $scope.userProfile.webid) {
            $scope.getInfo($scope.userProfile.webid, true, false);
        }
    });

    // get relevant info for a webid
    $scope.getInfo = function(webid, mine, update) {
        if (DEBUG) {
            console.log("Getting user info for: "+webid);
        }

        // start progress bar
        ngProgress.start();

        if (mine) {
            $scope.loading = true;
        }

        $scope.found = true;

        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");        
        var ACL = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
        var g = $rdf.graph();
        var f = $rdf.fetcher(g, TIMEOUT);
        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        var docURI = webid.slice(0, webid.indexOf('#'));
        var webidRes = $rdf.sym(webid);

        // fetch user data
        f.nowOrWhenFetched(docURI,undefined,function(ok, body) {
            if (!ok) {
                if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
                  notify('Warning', 'WebID profile not found.');
                  $scope.found = false;
                  $scope.searchbtn = 'Search';
                  // reset progress bar
                  ngProgress.reset();
                  $scope.$apply();
                }
            } 
            // get some basic info
            var name = g.any(webidRes, FOAF('name'));
            var pic = g.any(webidRes, FOAF('img'));
            var depic = g.any(webidRes, FOAF('depiction'));

            // get storage endpoints
            var storage = g.any(webidRes, SPACE('storage')).value;

            // get list of delegatees
            var delegs = g.statementsMatching(webidRes, ACL('delegatee'), undefined);
            /*
            if (delegs.length > 0) {
                jQuery.ajaxPrefilter(function(options) {
                options.url = AUTH_PROXY + encodeURIComponent(options.url);
                options.crossDomain = true;
                options.accepts = "text/turtle";
                });
            }
            */

            // Clean up name
            name = (name) ? name.value : 'No name found';

            // set avatar picture
            if (pic) {
                pic = pic.value;
            } else {
                if (depic) {
                    pic = depic.value;
                } else {
                    pic = 'assets/generic_photo.png';
                }
            }

            var _user = {
                webid: webid,
                name: name,
                picture: pic,
                storagespace: storage

            };

            /*
            // add to search object if it was the object of a search
            if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
                $scope.search = _user;
            }*/

            $scope.users[webid] = {};
            $scope.users[webid].mine = mine;

            if (update) {
                $scope.refreshinguser = true;
                $scope.users[webid].name = name;
                $scope.users[webid].picture = pic;
                $scope.users[webid].storagespace = storage;
            }

            if (storage === undefined) { 
                $scope.gotstorage = false;
            }

            if (mine) { // mine
                $scope.userProfile.webid = webid;
                $scope.userProfile.name = name;
                $scope.userProfile.picture = pic;
                $scope.userProfile.storagespace = storage;
                $scope.users[webid].name = name; //for displaying delete button in posts.tpl.html
                $scope.users[webid].picture = pic; //resolves issue of not displaying profile picture that the above line creates

                // find microblogging feeds/channels
                if (!storage) {
                  $scope.loading = false; // hide spinner
                }

                // cache user credentials in sessionStorage
                $scope.saveCredentials();

                // update DOM
                $scope.loggedin = true;
                $scope.profileloading = false;
                ngProgress.complete();
                $scope.$apply();
            }
            if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
                $scope.getChannels(storage, webid, false, false, false);
            }
        });
        if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
            $scope.searchbtn = 'Search';
        }
    };

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
        if ( angular.isDefined( toState.data.pageTitle ) ) {
            $scope.pageTitle = toState.data.pageTitle + ' | Cimba' ;
        }
    });

    // initialize by retrieving user info from sessionStorage
    $scope.loadCredentials();

    $scope.getChannels = function(uri, webid, mine, update, loadposts) {
        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");

        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");

        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");

        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

        var g = $rdf.graph();

        var f = $rdf.fetcher(g, TIMEOUT);
        
        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        // fetch user data: SIOC:Space -> SIOC:Container -> SIOC:Post
        f.nowOrWhenFetched(uri,undefined,function(){

            // find all SIOC:Container
            var ws = g.statementsMatching(undefined, RDF('type'), SIOC('Space'));

            if (ws.length > 0) {
                // set a default Microblog workspace
                if (mine) {
                    // set default Microblog space
                    $scope.users[webid].mbspace = ws[0]['subject']['value'];
                }

                var func = function() {

                    var chs = g.statementsMatching(undefined, RDF('type'), SIOC('Container'));
                  
                    if (chs.length > 0) {                        
                        $scope.channels = [];
                        // clear list first
                        $scope.users[webid].channels = [];
          
                        for (var ch in chs) {
                            var channel = {};                            
                            channel['uri'] = chs[ch]['subject']['value'];
                            var title = g.any(chs[ch]['subject'], DCT('title')).value;

                            if (title) {
                                channel['title'] = title;
                            } else {
                                channel['title'] = channeluri;
                            }

                            channel["owner"] = webid;

                            // add channel to the list
                            $scope.channels.push(channel);                            

                            /* uncomment to get posts for any channel (not just my own)
                            // get posts for that channel
                            if (loadposts === true) {
                                $scope.getPosts(channel.uri, channel.title);
                            }
                            */

                            $scope.users[webid].channels.push(channel);

                            // mine
                            if (mine) {
                                //get posts for my channel
                                if (loadposts === true) {
                                    $scope.getPosts(channel.uri, channel.title);
                                }

                                //this dictionary pairs channels with their owner and the posts they contain
                                $scope.users[webid].chspace = true;
                            }

                            // update
                            if (update) {
                                var exists = findWithAttr($scope.users[webid].channels, 'uri', channeluri);
                                if (exists === undefined) {
                                    $scope.users[webid].channels.push(channel);
                                }
                            }

                        }

                        // set a default channel for the logged user
                        if (mine) {
                            $scope.defaultChannel = $scope.users[webid].channels[0];
                        }

                        // done refreshing user information -> update view
                        if (update) {
                            $scope.addChannelStyling(webid, $scope.users[webid].channels);
                            delete $scope.users[webid].refreshing;
                            $scope.$apply();
                        }
                    } else {
                        console.log('No channels found!');
                        if (mine) {
                            // hide loader
                            $scope.loading = false;
                            $scope.users[webid].chspace = false;
                        }
                    }

                    // also save updated users & channels list
                    if (update) { 
                        $scope.saveUsers();
                    }

                    // if we were called by search
                    if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
                        $scope.search.channels = $scope.channels;
                        $scope.drawSearchResults();
                        $scope.searchbtn = 'Search';
                        $scope.search.loading = false;
                        $scope.$apply();
                        //
                    }
                           
                    if (mine) {
                        $scope.saveCredentials();
                        $scope.$apply();
                    }
                };

                for (var i in ws) {
                    w = ws[i]['subject']['value'];

                    // find the channels info for the user (from .meta files)
                    f.nowOrWhenFetched(w+'.*', undefined,func);
                }

            } else { // no Microblogging workspaces found!

                // we were called by search
                if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
                    $scope.drawSearchResults();
                }

                if (mine) {
                    console.log('No microblog found!');
                    $scope.gotmb = false;
                    $scope.users[webid].mbspace = false;
                    $scope.users[webid].chspace = false;
                    $scope.users[webid].channels = [];
                    $scope.saveCredentials();

                    // hide loader
                    $scope.loading = false;

                    $scope.$apply();
                }
            }
        });
        
    };

    $scope.getPosts = function(channel, title) {
        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");

        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");

        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");

        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

        var g = $rdf.graph();

        var f = $rdf.fetcher(g, TIMEOUT);

        $scope.allPosts[channel] = [];

        // add CORS proxy
        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

        // get all SIOC:Post (using globbing)
        f.nowOrWhenFetched(channel+'*', undefined, function(){

            var posts = g.statementsMatching(undefined, RDF('type'), SIOC('Post'));

            if (posts.length > 0) {
                // console.log("found some posts");
                // console.log(posts.length);
                for (var p in posts) {

                    var uri = posts[p]['subject'];
                    var useraccount = g.any(uri, SIOC('has_creator'));
                    var post = g.statementsMatching(posts[p]['subject']);
                    var body = '';
                    var username = '';
                    var userpic = 'assets/generic_photo.png';
                    var userwebid;
                    var date = '';

                    if (g.any(uri, DCT('created'))) {
                        var d = g.any(uri, DCT('created')).value;
                        date = moment(d).zone('00:00');
                    }

                    if (g.any(useraccount, SIOC('account_of'))) {
                        userwebid = g.any(useraccount, SIOC('account_of')).value;
                    } else {
                        userwebid = undefined;
                    }

                    // try using the picture from the WebID first

                    if (userwebid) {
                        userpic = $scope.users[userwebid].picture;
                    }
                    else if (g.any(useraccount, SIOC('avatar'))) {

                      userpic = g.any(useraccount, SIOC('avatar')).value;

                    }
                    else {

                      userpic = 'assets/generic_photo.png';

                    }

                    // try using the name from the WebID first

                    if (userwebid) {
                        username = $scope.users[userwebid].name;
                    } else if (g.any(useraccount, FOAF('name'))) {
                        username = g.any(useraccount, FOAF('name')).value;
                    } else {
                        username = '';
                    }

                    if (g.any(uri, SIOC('content'))) {
                        body = g.any(uri, SIOC('content')).value;                    
                    } else {
                        body = '';
                    }

                    uri = uri.value;

                    // check if we need to overwrite instead of pushing new item

                    var _newPost = {
                        uri : uri,
                        channel: channel,
                        chtitle: title,
                        date : date,
                        userwebid : userwebid,
                        userpic : userpic,
                        username : username,
                        body : body
                    };


                    // console.log("new post created");
                    // console.log(_newPost);

                    // if (!$scope.posts) {
                    //     $scope.posts = {};
                    // }
                    
                    // filter post by language (only show posts in English or show all) 
                    //not implemented yet ^, currently a redundant if/else statement        
                    if ($scope.filterFlag && testIfAllEnglish(_newPost.body)) {
                        // add/overwrite post
                        $scope.allPosts[channel].push(_newPost);
                        $scope.posts.push(_newPost);
                        // $scope.posts[uri] = _newPost;                        
                        $scope.$apply();
                    } else {
                        $scope.allPosts[channel].push(_newPost);
                        $scope.posts.push(_newPost);
                        $scope.$apply();
                    }

                    $scope.users[$scope.userProfile.webid].gotposts = true;
                }

            } else {
                if (isEmpty($scope.allPosts || $scope.posts)) {
                    $scope.users[$scope.userProfile.webid].gotposts = false;
                }
            }

            // hide spinner
            $scope.loading = false;
            $scope.$apply();

        });
    };

    /////-----todo: put it find controller
    
    // attempt to find a person using webizen.org
    $scope.lookupWebID = function(query) {
        if (query.length > 0) {
            $scope.gotresults = false;
            $scope.search.selected = false;
            // get results from server
            $http.get('http://api.webizen.org/v1/search', {
                params: {
                    q: query
                }
            }).then(function(res){
                $scope.webidresults = [];
                angular.forEach(res.data, function(value, key) {
                    value.webid = key;
                    if (!value.img) {
                        value.img = ['assets/generic_photo.png'];
                    }
                    value.host = getHostname(key);
                    $scope.webidresults.push(value);
                });
                return $scope.webidresults;
            });
        }
    };

    $scope.prepareSearch = function(webid, name) {
        $scope.search.selected = true;
        $scope.search.loading = true;
        $scope.search.webid = webid;
        $scope.search.query = name;
        $scope.getInfo(webid, false, false);
        $scope.webidresults = [];
    };

    // refresh the channels for a given user
    $scope.refreshUser = function(webid) {
        $scope.getInfo(webid, false, true);
    };

    
    // remove a given user from the people I follow
    $scope.removeUser = function (webid) {
        if (webid) {
            // remove user from list
            delete $scope.users[webid];
            // remove posts for that user
            $scope.removePostsByOwner(webid);
            notify('Success', 'The user was been removed.');
            // save new list of users
            $scope.saveUsers();
        }
    };

    // save the list of users + channels
    $scope.saveUsers = function () {
        // save to PDS
        // TODO: try to discover the followURI instead?
        var channels = []; // temporary channel list (will load posts from them once this is done)
        var followURI = ''; // uri of the preferences file
        var mywebid = $scope.userProfile.webid;
        if ($scope.users[mywebid].mbspace && $scope.users[mywebid].mbspace.length > 1) {
            followURI = $scope.users[mywebid].mbspace+'following';
        }

        var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
        var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
        var g = $rdf.graph();

        // set triples
        g.add($rdf.sym(followURI), RDF('type'), SIOC('Usergroup'));        
        g.add($rdf.sym(followURI), DCT('created'), $rdf.lit(Date.now(), '', $rdf.Symbol.prototype.XSDdateTime));
        // add users
        var i=0;        
        for (var key in $scope.users) {
            var user = $scope.users[key];
            var uid = '#user_'+i;
            // add hash id to main graph
            g.add($rdf.sym(followURI), SIOC('has_member'), $rdf.sym(uid));

            g.add($rdf.sym(uid), RDF('type'), SIOC('UserAccount'));
            g.add($rdf.sym(uid), SIOC('account_of'), $rdf.sym(user.webid));
            g.add($rdf.sym(uid), SIOC('name'), $rdf.lit(user.name));
            g.add($rdf.sym(uid), SIOC('avatar'), $rdf.sym(user.pic));
            // add each channel
            if (user.channels) {
                for (var j=0;j<user.channels.length;j++) {
                    var ch = user.channels[j];
                    var ch_id = '#channel_'+i+'_'+j;
                    // add the channel uri to the list
                    channels.push(ch.uri);

                    // add the channel reference back to the user
                    g.add($rdf.sym(uid), SIOC('feed'), $rdf.sym(ch_id));
                    // add channel details
                    g.add($rdf.sym(ch_id), RDF('type'), SIOC('Container'));
                    g.add($rdf.sym(ch_id), SIOC('link'), $rdf.sym(ch.uri));
                    g.add($rdf.sym(ch_id), DCT('title'), $rdf.lit(ch.title));
                    // add my WebID if I'm subscribed to this channel
                    if (ch.action == 'Unsubscribe') {
                        g.add($rdf.sym(ch_id), SIOC('has_subscriber'), $rdf.sym(mywebid));
                    }
                }
            }
            i++;
        }
        // serialize graph
        var s = new $rdf.Serializer(g).toN3(g);
        // PUT the new file on the PDS
        if (s.length > 0) {
            $.ajax({
                type: "PUT",
                url: followURI,
                contentType: "text/turtle",
                data: s,
                processData: false,
                xhrFields: {
                    withCredentials: true
                },
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
                    console.log('Success! Your channel subscription has been updated.');
                    notify('Success', 'Your user and channel subscription has been updated!');
                }
            });
        }
    };

    // remove all posts from viewer based on the given channel URI
    $scope.removePostsByChannel = function(ch) {
        var modified = false;
        if ($scope.allPosts && !isEmpty($scope.allPosts)) {
            for (var p in $scope.allPosts[ch]) {
                delete $scope.allPosts[ch][p];
                modified = true;
            }
            for (var i in $scope.posts) {
                var post = $scope.posts[i];
                if (ch && ch == post.channel) {
                    delete $scope.posts[p];
                    modified = true;
                }
            }
        }
    };

    // update the view with new posts
    $scope.updatePosts = function() {
        if ($scope.users[$scope.userProfile.webid] && $scope.users[$scope.userProfile.webid].channels && $scope.users[$scope.userProfile.webid].channels.length > 0) {
            // add my posts
            $scope.loading = true;
            for (var c in $scope.users[$scope.userProfile.webid].channels) {
                $scope.getPosts($scope.users[$scope.userProfile.webid].channels[c].uri, $scope.users[$scope.userProfile.webid].channels[c].title);
            }
        }

        // add posts from people I follow
        if ($scope.users) {
            for (var webid in $scope.users) {
                _user = $scope.users[webid];
                for (var i in _user.channels) {
                    var ch = _user.channels[i].uri;
                    if (ch) {
                        $scope.getPosts(ch, _user.channels[i].title);
                    }
                }
            }
        }
    };

    // toggle selected channel for user
    $scope.channelToggle = function(ch, user) {
        // we're following this user
        if ($scope.users && $scope.users[user.webid]) {
            var channels = $scope.users[user.webid].channels;
            var idx = findWithAttr(channels, 'uri', ch.uri);
            // already have the channel
            if (idx !== undefined) {
                var c = channels[idx];
                // unsubscribe
                if (c.action == 'Unsubscribe') {
                    c.action = ch.action = 'Subscribe';
                    c.button = ch.button = 'fa-square-o';
                    c.css = ch.css = 'btn-info';
                    $scope.removePostsByChannel(ch.uri);
                } else {
                // subscribe
                    c.action = ch.action = 'Unsubscribe';
                    c.button = ch.button = 'fa-check-square-o';
                    c.css = ch.css = 'btn-success';
                    $scope.getPosts(ch.uri, ch.title);
                }
            } else {
                // subscribe
                ch.action = 'Unsubscribe';
                ch.button = 'fa-check-square-o';
                ch.css = 'btn-success';
                $scope.getPosts(ch.uri, ch.title);
            }
            // also update the users list in case there is a new channel
            $scope.users[user.webid] = user;
            $scope.saveUsers();
        } else {
            // subscribe (also add user + channels)
            ch.action = 'Unsubscribe';
            ch.button = 'fa-check-square-o';
            ch.css = 'btn-success';         
            if (!$scope.users) {
                $scope.users = {};
            }
            $scope.users[user.webid] = user;
            $scope.saveUsers();
            $scope.getPosts(ch.uri, ch.title);
        }
    };

    // lookup a WebID to find channels
    $scope.drawSearchResults = function(webid) {
        $scope.gotresults = true;
        $scope.addChannelStyling(webid, $scope.search.channels);
        $scope.searchbtn = 'Search';
        $scope.search.loading = false;
        $scope.$apply();
    };
    
    // add html elements to channels 
    $scope.addChannelStyling = function(webid, channels) {
        for (i=0;i<channels.length;i++) {
            // find if we have the channel in our list already
            var ch = channels[i];
            // check if it's a known user
            if ($scope.users && $scope.users[webid]) {
                var idx = findWithAttr($scope.users[webid].channels, 'uri', ch.uri);
                var c = $scope.users[webid].channels[idx];
                // set attributes
                if (idx !== undefined) {
                    ch.button = (c.button)?c.button:'fa-square-o';
                    ch.css = (c.css)?c.css:'btn-info';
                    ch.action = (c.action)?c.action:'Subscribe';
                } else {
                    c.action = ch.action = 'Subscribe';
                    c.button = ch.button = 'fa-square-o';
                    c.css = ch.css = 'btn-info';
                }
            } else {
                if (!ch.button) {
                    ch.button = 'fa-square-o';
                }
                if (!ch.css) {
                    ch.css = 'btn-info';
                }
                if (!ch.action) {
                    ch.action = 'Subscribe';
                }
            }
        }
    };

    /////-----
})


.run( function run ($rootScope, $location) {
    $rootScope.userProfile = {};
    // register listener to watch route changes
    $rootScope.$on( "$locationChangeStart", function(event, next, current) {
        if ( !$rootScope.userProfile.webid) {
            // no logged user, we should be going to #login
            if ( next.templateUrl == "login/login.tpl.html" ) {
              // already going to #login, no redirect needed
            } else {
              // not going to #login, we should redirect now
              $location.path( "/login" );
            }
        }
    });
});

