<img src="http://social-webarch.github.io/cimba/img/cimba-logo.png">

Client-Integrated Micro-Blogging Architecture application
----


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

Components
-----

* Being 100% decentralized and free of application-specific back-ends, CIMBA uses HTTP to communicate with generic Data Servers, though HTTPS support on the Data Servers is strongly recommended.
* The client is built using the latest HTML5 technologies. We're also using [AngularJS](http://www.angularjs.org/)!
* To identify users, CIMBA relies on [WebID](www.w3.org/2005/Incubator/webid/spec/identity/) (a work-in-progress open standard at W3C).
* For authentication, a mix between [WebID-TLS](http://www.w3.org/2005/Incubator/webid/spec/tls) and WebID delegated access ([link to paper](http://hal.archives-ouvertes.fr/docs/00/74/53/55/PDF/paper.pdf)) is used.
* Access control policies on the Data Server are written using [WebAccessControl](http://www.w3.org/wiki/WebAccessControl), a decentralized system for allowing different users and groups various forms of access to resources where users and groups are identified by HTTP URIs (WebIDs in our case).
