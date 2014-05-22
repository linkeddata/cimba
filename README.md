[![Build Status](https://travis-ci.org/linkeddata/cimba.png)](https://travis-ci.org/linkeddata/cimba)

<img src="http://social-webarch.github.io/cimba/img/cimba-logo.png">

Client-Integrated Micro-Blogging Architecture application
------

Note: if you just want to get down to business, you can skip directly to the [dev section](#Components).


CIMBA for End-Users
====
CIMBA is a privacy-friendly, decentralized microblogging application that runs in your browser. It is built using the latest HTML5 technologies and Web standards. With CIMBA, people get a microblogging app that behaves like Twitter, built entirely out of parts they can control.

To use CIMBA, people must have an account at some Data Server (also called a “personal data store”) which implements the [Linked Data Platform](http://www.w3.org/TR/ldp/) (LDP) Web standard with appropriate extensions. Users may choose to run their own Data Server, use one provided by an employer/school/government, or even pay for a Data Server service. Whatever their choice, they can easily switch to another Data Server whenever they want or even concurrently use different Data Servers for different aspects of their life.

Basically, if you don't like CIMBA anymore, or if there is a better microblogging Web app that you want to use, you just need to replace the Web app, which only acts as the UI component of the system. The data you have created will not be affected by the change!

Once the app has been loaded into your browser, all communications will take place between you (the actual app running in the browser) and your personal Data Server, or the Data Servers of the people to which you have subscribed. Whatever data/content CIMBA produces will also be stored on your Data Server.

In other words:

 * open protocol: CIMBA clients and servers communicate entirely using open standard protocols, formats, and vocabularies. New elements may not yet have been standardized, but we fully support them becoming open standards. This means anyone can read the specs and make a drop-in replacement client or server.

 * open source: our implementation of CIMBA, including all its libraries and the Data Server code, are available under an Open Source license (MIT). Creating your own fork is easy and also encouraged!

 * open data: as a Crosscloud application, CIMBA stores its data under user control, so if the user runs an alternative client, they have access to exactly the same data. Users can even use multiple compatible clients at the same time, seeing the same content.

 * open network: since social connections are modeled as more data, when users switch clients, they keep their social networks. New CIMBA-compatible applications start off already having a critical mass of users, instead of starting as a “ghost town”, populated only by the most intrepid early adopters. 

 * open platform: because the essential functionality is provided by the (application-agnostic) Data Servers, new clients can be deployed as just static files (html, css, js). Developers do not need to code up any back-end or have any operational support -- any generic web hosting is fine.

 * extensible: because CIMBA’s data model is RDF triples, modified versions can extend the model with their own arbitrary data, such a geographic or demographic data. When necessary, modified versions can also use LDP extensions. If properly designed, these extension will be available to the people using the extended software, but have a graceful fall-back for everyone else.

 * independent: CIMBA forks and CIMBA-compatible applications are not subject to the control of any 3rd party, such as a company that might come to view your software as competition, or a foreign government. You don’t need anyone’s permission to run your own CIMBA-compatible clients or Data Management servers.


CIMBA for Developers
====
For software developers, CIMBA presents a *radically open* alternative to platforms like Twitter and Facebook.

<a name="Components"></a>Components
-----

* Being 100% decentralized and free of application-specific back-ends, CIMBA uses HTTP to communicate with generic Data Servers, though HTTPS support on the Data Servers is strongly recommended.

* The client is built using the latest HTML5 technologies. We're also using [AngularJS](http://www.angularjs.org/)!

* To identify users, CIMBA relies on [WebID](www.w3.org/2005/Incubator/webid/spec/identity/) (a work-in-progress open standard at W3C).

* For authentication, a mix between [WebID-TLS](http://www.w3.org/2005/Incubator/webid/spec/tls) and WebID delegated access ([link to paper](http://hal.archives-ouvertes.fr/docs/00/74/53/55/PDF/paper.pdf)) is used.

* Access control policies on the Data Server are written using [WebAccessControl](http://www.w3.org/wiki/WebAccessControl), a decentralized system for allowing different users and groups various forms of access to resources where users and groups are identified by HTTP URIs (WebIDs in our case).


Architecture - overview
-----

CIMBA only requires one starting point, the user's WebID. Here is an example WebID: ```https://user.name/card#me```. From the WebID, CIMBA follows [Linked Data principles](http://www.w3.org/DesignIssues/LinkedData.html) to discover where the user's posts are, as well as where to fetch posts from the people the user has subscribed to. You can use the following pseudo-algorithm as reference:

```
Get WebID -> find <Storage endpoint>
    |-> from <Storage endpoint> -> get all [Workspaces]
        |-> for each <workspace> in [Worspaces] -> is sioc:Space?
            |-> if True
                |-> from <workspace> -> get all [Channels]
                    |-> for each <channel> in [Channels] -> get [Posts]
                        |-> display [Posts] and allow new posts from user
            |-> if all False (no microblogging workspaces found)
                |-> suggest (create) <new workspace> under <Storage endpoint>
                |-> suggest (create) <new channel> under <new workspace>
                    |-> set <new channel> as default and allow new posts from user
```

Architecture - detailed
-----

When we started designing CIMBA, we wanted it to work in a very generic way, to allow it to be more interoperable. Here are some very important concepts we came up with:
 
 * All content (data) generated by CIMBA will be stored on the user's Data Server in a workspace dedicated to microblogging. The [Space](http://www.w3.org/ns/pim/space) vocabulary is used to describe workspaces.
 
 * CIMBA uses the SIOC vocabulary to express microblogging posts and to save the feeds that it has to follow in order to fetch data from outside sources (i.e. people you subscribe to).

 * Linked Data principles are used to link from the profile to the actual Data Server that is used as generic storage. In other words, CIMBA will then look for a specific relation which indicates that the user has attached a Data Server to his/her profile. The triple looks like this: 

  ```<#me> <http://www.w3.org/ns/pim/space#storage> <https://example.org/data/> .```
  
 * From the generic storage space, CIMBA will try to find the workspace dedicated to microblogging by doing an ```HTTP GET``` on ```https://example.org/data/```. If no microblogging workspace is found, CIMBA assumes the user does not use microblogging and it will automatically create a workspace by doing an ```HTTP POST``` to ```https://example.org/data/```, which is an LDP Container. Here is an example of the request (abstracting prefixes):

    REQUEST:
    ```
    POST /data/ HTTP/1.1
    Host: example.org
    Content-Type: text/turtle
    Slug: microblog
    Link: <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"
    
    <>  a ldp:BasicContainer;
        dc:title "Microblogging workspace" .
    ```

    RESPONSE:
    ```
    HTTP/1.1 201 Created
    Location: https://example.org/data/microblog/
    Link: <https://example.org/data/microblog/.acl>; rel=acl
    Link: <https://example.org/data/microblog/.meta>; rel=meta
    ```

    CIMBA used LDP to create a new container, which is the microblogging workspace. A very interesting feature is the rel=acl Link header. This header is returned by the server to indicate where the client (CIMBA) can POST access control policies for the newly created resource.
 
 * Unlike Twitter, CIMBA introduces the concept of *channels*, to be used as categories for different kinds of content (i.e. personal posts, work-related, family, etc.). To create channels, the same procedure is used as was the case earlier for the microblog workspace.

    REQUEST:
    ```
    POST /data/microblog/ HTTP/1.1
    Host: example.org
    Content-Type: text/turtle
    Slug: channel
    Link: <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"
    
    <>  a ldp:BasicContainer;
        dc:title "Main channel" .
    ```

    RESPONSE:
    ```
    HTTP/1.1 201 Created
    Location: https://example.org/data/microblog/channel/
    Link: <https://example.org/data/microblog/channel/.acl>; rel=acl
    Link: <https://example.org/data/microblog/channel/.meta>; rel=meta
    ```
 
 * Because CIMBA encourages users to have multiple channels, users can then define different ACL policies as they sit fit. The ACL policies apply by default to all posts (content) created within. However, CIMBA allows users to override the default ACLs by setting a specific policy for new posts. Using the link in the rel=acl Link header, CIMBA can easily post a default ACL policy:
    REQUEST:
    ```
    POST /data/microblog/channel/.acl HTTP/1.1
    Host: example.org
    Content-Type: text/turtle

    <>
        <http://www.w3.org/ns/auth/acl#accessTo> <>, <.> ;
        <http://www.w3.org/ns/auth/acl#agent> <https://user.name/card#me> ;
        <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write> .
    
    <#channel>
        <http://www.w3.org/ns/auth/acl#accessTo> <.> ;
        <http://www.w3.org/ns/auth/acl#agentClass> foaf:Agent ;
        <http://www.w3.org/ns/auth/acl#defaultForNew> <.> ;
        <http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read> .
    ```
    RESPONSE:
    ```
    HTTP/1.1 200 OK
    ```

    This policy basically states that user ```https://user.name/card#me``` can Read/Write the *.acl* resource, while anyone that is a foaf:Agent (any user) can Read resources from ```https://example.org/data/microblog/channel/```.

 * A user can subscribe to other users' channels. To do so, CIMBA basically follows the same procedure as it did for the owner. At the end, if it finds any channels, it will save them in a resource called *follows*, under the microblogging workspace: ```https://example.org/data/microblog/follows```. Finally, it will proceed to fech posts from each remote channel.
