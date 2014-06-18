// Globals
var PROXY = "https://rww.io/proxy?uri={uri}";
var AUTH_PROXY = "https://rww.io/auth-proxy?uri=";
var TIMEOUT = 90000;
var DEBUG = true;

// Angular
angular.module( 'Cimba', [
  'templates-app',
  'templates-common',
  'Cimba.home',
  'Cimba.login',
  'Cimba.about',
  'Cimba.channels',
  'ui.router',
  'ngProgress'
])

.config( function CimbaConfig ( $stateProvider, $urlRouterProvider ) {
  $urlRouterProvider.otherwise( '/login' );
})

.run( function run () {
})

.controller( 'MainCtrl', function MainCtrl ( $scope, $location, $timeout, ngProgress ) {
  // Some default values
  $scope.appuri = window.location.hostname+window.location.pathname;
  $scope.loginSuccess = false;
  $scope.userProfile = {};
  $scope.userProfile.picture = 'assets/generic_photo.png';
  $scope.channels = {};
  $scope.me = {};

  $scope.login = function () {
    $location.path('/login');
  };

  $scope.logout = function () {
    // Logout WebID (only works in Firefox and IE)
    if (document.all == null) {
      if (window.crypto) {
          try{
              window.crypto.logout(); //firefox ok -- no need to follow the link
          } catch (err) {//Safari, Opera, Chrome -- try with tis session breaking
          }
      }
    } else { // MSIE 6+
      document.execCommand('ClearAuthenticationCache');
    }

    // clear sessionStorage
    $scope.clearLocalCredentials();
    $scope.userProfile = {};
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
    console.log(SPACE);
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
      console.log(SPACE);
      console.log(webidRes);
      console.log(SPACE("storage"));
      var storage = g.any(webidRes, SPACE('storage')).value;
      // get list of delegatees
      var delegs = g.statementsMatching(webidRes, ACL('delegatee'), undefined);
      /*
      if (delegs.length > 0) {
        jQuery.ajaxPrefilter(function(options) {
          options.url = AUTH_PROXY + encodeURIComponent(options.url);
        });
      }
      */
      // Clean up name
      name = (name)?name.value:'';

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
      console.log(_user);

      // add to search object if it was the object of a search
      if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
        $scope.search = _user;
      }

      if (update) {
        $scope.refreshinguser = true;
        $scope.users[webid].name = name;
        $scope.users[webid].picture = pic;
        $scope.users[webid].storagespace = storage;
      }
      ///$scope.getChannels('https://asnoakes.rww.io/storage','https://asnoakes.rww.io',mine, update)

      // get channels for the user
      if (storage !== undefined) { 
        // get channels for user
        // $scope.getChannels(storage, webid, mine, update);
      } else {
        $scope.gotstorage = false;
      }

      if (mine) { // mine
        $scope.userProfile.name = name;
        $scope.userProfile.picture = pic;
        $scope.userProfile.storagespace = storage;

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


  $scope.getChannels = function(uri, webid, mine, update) {
<<<<<<< HEAD

    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

    var DCT = $rdf.Namespace("http://purl.org/dc/terms/");

    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");

    var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");

    var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

    var g = $rdf.graph();

    var f = $rdf.fetcher(g, TIMEOUT);


    //$scope.channelsWPosts = {};

    // add CORS proxy

    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

    // fetch user data: SIOC:Space -> SIOC:Container -> SIOC:Post

    console.log(uri);
    f.nowOrWhenFetched(uri,undefined,function(){

      // find all SIOC:Container

      var ws = g.statementsMatching(undefined, RDF('type'), SIOC('Space'));



      if (ws.length > 0) {

        // set a default Microblog workspace
        if (mine) {
          // set default Microblog space
          $scope.me.mbspace = ws[0]['subject']['value'];

          // get the list of people I'm following + channels + posts
          //$scope.getUsers(true);

        }
        var func = function(){

          var chs = g.statementsMatching(undefined, RDF('type'), SIOC('Container'));
=======

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

    console.log(uri);
    f.nowOrWhenFetched(uri,undefined,function(){

      // find all SIOC:Container
      var ws = g.statementsMatching(undefined, RDF('type'), SIOC('Space'));

      if (ws.length > 0) {
        // set a default Microblog workspace
        if (mine) {
          // set default Microblog space
          $scope.me.mbspace = ws[0]['subject']['value'];
        }

        var func = function() {

          var chs = g.statementsMatching(undefined, RDF('type'), SIOC('Container'));
          
          if (chs.length > 0) {
            // clear list first
            if (mine) {
              $scope.me.channels = [];
            }

            if (update) { 
              $scope.users[webid].channels = [];
            }
  
            for (var ch in chs) {
              var channel = {};
              var channeluri = chs[ch]['subject']['value'];
              var title = g.any(chs[ch]['subject'], DCT('title')).value;
             
              if (title) {
                channel['title'] = title;
              } else {
                channel['title'] = channeluri;
              }

              channel["owner"] = webid;

              // add channel to the list
              $scope.channels[channeluri] = channel;
  
              // mine
              if (mine) {
                $scope.me.channels.push(channel);

                //this dictionary pairs channels with their owner and the posts they contain
                $scope.me.chspace = true;
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
              $scope.defaultChannel = $scope.me.channels[0];
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
              $scope.me.chspace = false;
            }
          }

          // also save updated users & channels list
          if (update) { 
            $scope.saveUsers();
          }

          // if we were called by search
          if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {
              $scope.search.channels = channels;
              $scope.drawSearchResults();
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
          $scope.me.mbspace = false;
          $scope.me.chspace = false;
          $scope.me.channels = [];
          $scope.saveCredentials();

          // hide loader
          $scope.loading = false;

          $scope.$apply();
        }
      }
    });
    return $scope.channels;
  };

  $scope.getPosts = function(channel, title) {

      var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");

      var DCT = $rdf.Namespace("http://purl.org/dc/terms/");

        var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");

        var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");

        var SPACE = $rdf.Namespace("http://www.w3.org/ns/pim/space#");

        var g = $rdf.graph();

        var f = $rdf.fetcher(g, TIMEOUT);

        // add CORS proxy

        $rdf.Fetcher.crossSiteProxyTemplate=PROXY;
>>>>>>> e26fc5ad2e57f77f4d783e1a5b4303bd9728bffd

          if (chs.length > 0) {

<<<<<<< HEAD
              // clear list first

            if (mine)
              {$scope.me.channels = [];}
            
            if (update)
              {$scope.users[webid].channels = [];}
=======
      // get all SIOC:Post (using globbing)

      f.nowOrWhenFetched(channel+'*', undefined,function(){

        var posts = g.statementsMatching(undefined, RDF('type'), SIOC('Post'));
>>>>>>> e26fc5ad2e57f77f4d783e1a5b4303bd9728bffd


<<<<<<< HEAD

              for (var ch in chs) {

                var channel = {};

                var channeluri = chs[ch]['subject']['value'];

                var title = g.any(chs[ch]['subject'], DCT('title')).value;



                if (title)

                  {channel['title'] = title;}

                else

                  {channel['title'] = channeluri;}

                channel["owner"] = webid;

                // add channel to the list
            
                $scope.channels[channeluri] = channel;



                // mine

                if (mine) {

                  $scope.me.channels.push(channel);

                      // force get the posts for my channels

                     //$scope.channelsWPosts = {channel.title:{owner:webid,posts:$scope.getPosts(channeluri, channel.title)}};

                      //this dictionary pairs channels with their owner and the posts they contain
                  $scope.me.chspace = true;

                }


                // update

                if (update) {

                  var exists = findWithAttr($scope.users[webid].channels, 'uri', channeluri);

                  if (exists === undefined) {

                    $scope.users[webid].channels.push(channel);
=======
        if (posts.length > 0) {

          for (var p in posts) {

            var uri = posts[p]['subject'];

            var useraccount = g.any(uri, SIOC('has_creator'));

            var post = g.statementsMatching(posts[p]['subject']);

            var body = '';
            var username = '';
            var userpic = 'img/generic_photo';
            var userwebid;
            if (g.any(uri, DCT('created'))) {

              var d = g.any(uri, DCT('created')).value;

              $scope.date = moment(d).zone('00:00');

            } else {

              $scope.date = undefined;

            }

            if (g.any(useraccount, SIOC('account_of'))) {

              userwebid = g.any(useraccount, SIOC('account_of')).value;
>>>>>>> e26fc5ad2e57f77f4d783e1a5b4303bd9728bffd

            } else {

              userwebid = undefined;

<<<<<<< HEAD
              }



              // set a default channel for the logged user

            if (mine)

                {$scope.defaultChannel = $scope.me.channels[0];}



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

              $scope.me.chspace = false;

            }

          }

          // also save updated users & channels list
=======
            }

            // try using the picture from the WebID first

            if (userwebid) {

              if ($scope.me.webid && $scope.me.webid == userwebid)

                {userpic = $scope.me.pic;
}
              else if ($scope.users[userwebid])

                {userpic = $scope.users[userwebid].pic;
}
            } else if (g.any(useraccount, SIOC('avatar'))) {

              userpic = g.any(useraccount, SIOC('avatar')).value;

            } else {

              userpic = 'img/generic_photo.png';

            }

            // try using the name from the WebID first

            if (userwebid) {

              if ($scope.me.webid && $scope.me.webid == userwebid)

                {username = $scope.me.name;}

              else if ($scope.users[userwebid])

                {username = $scope.users[userwebid].name;}

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
>>>>>>> e26fc5ad2e57f77f4d783e1a5b4303bd9728bffd

          if (update)

<<<<<<< HEAD
            {$scope.saveUsers();}



          // if we were called by search

          if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {

            $scope.search.channels = channels;

            $scope.drawSearchResults();

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

      } else { 
        // no Microblogging workspaces found!

        // we were called by search
        if ($scope.search && $scope.search.webid && $scope.search.webid == webid) {

          $scope.drawSearchResults();

        }



        if (mine) {

          console.log('No microblog found!');

          $scope.gotmb = false;

          $scope.me.mbspace = false;

          $scope.me.chspace = false;

          $scope.me.channels = [];

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

    // add CORS proxy

    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;



    // get all SIOC:Post (using globbing)

    f.nowOrWhenFetched(channel+'*', undefined,function(){

      var posts = g.statementsMatching(undefined, RDF('type'), SIOC('Post'));
=======
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

            }
;
  

            if (!$scope.posts)

              {$scope.posts = {};}
            // filter post by language (only show posts in English or show all)         

            if ($scope.filterFlag && testIfAllEnglish(_newPost.body)) {

              // add/overwrite post

              $scope.posts[uri] = _newPost;

              $scope.$apply();

            } else {

              $scope.posts[uri] = _newPost;

              $scope.$apply();

            }

  

            $scope.me.gotposts = true
;
          }

        } else {

          if (isEmpty($scope.posts))

            {$scope.me.gotposts = false;}

        }

        // hide spinner

        $scope.loading = false;

        $scope.$apply();

      });

    };
>>>>>>> e26fc5ad2e57f77f4d783e1a5b4303bd9728bffd



      if (posts.length > 0) {

        for (var p in posts) {

          var uri = posts[p]['subject'];

          var useraccount = g.any(uri, SIOC('has_creator'));

          var post = g.statementsMatching(posts[p]['subject']);

          var body = '';
          var username = '';
          var userpic = 'img/generic_photo';
          var userwebid;
          if (g.any(uri, DCT('created'))) {

            var d = g.any(uri, DCT('created')).value;

            $scope.date = moment(d).zone('00:00');

          } else {

            $scope.date = undefined;

          }

          if (g.any(useraccount, SIOC('account_of'))) {

            userwebid = g.any(useraccount, SIOC('account_of')).value;

          } else {

            userwebid = undefined;

          }

          // try using the picture from the WebID first

          if (userwebid) {

            if ($scope.me.webid && $scope.me.webid == userwebid)

              {userpic = $scope.me.pic;}

            else if ($scope.users[userwebid])

              {userpic = $scope.users[userwebid].pic;}

          } else if (g.any(useraccount, SIOC('avatar'))) {

            userpic = g.any(useraccount, SIOC('avatar')).value;

          } else {

            userpic = 'img/generic_photo.png';

          }

          // try using the name from the WebID first

          if (userwebid) {

            if ($scope.me.webid && $scope.me.webid == userwebid)

              {username = $scope.me.name;}

            else if ($scope.users[userwebid])

              {username = $scope.users[userwebid].name;}

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


          if (!$scope.posts)

            {$scope.posts = {};}
          // filter post by language (only show posts in English or show all)         

          if ($scope.filterFlag && testIfAllEnglish(_newPost.body)) {

            // add/overwrite post

            $scope.posts[uri] = _newPost;

            $scope.$apply();

          } else {

            $scope.posts[uri] = _newPost;

            $scope.$apply();

          }



          $scope.me.gotposts = true;
        }

      } else {

        if (isEmpty($scope.posts))

          {$scope.me.gotposts = false;}

      }

      // hide spinner

      $scope.loading = false;

      $scope.$apply();

    });
  };
});
