# Wrestler

An opinionated framework with great defaults, but also has the ability to extend and override anything.

* You can CRUD anything.
    - Even supports multiple field filtering, sorting, projections, and paging.
    - Automatically adds createdAt, updatedAt, and id to every resource.

* Supports 3 database drivers (in-memory, file-based, mongodb).
    - Also, supports bringing your own driver. Only 8 methods to implement right now.
    - This means that relational data stores could potentially be supported as long as a migration strategy is in-place.
    - This could also open the door for S3, etc.

* You can whitelist/sanitize/validate anything.
    - Prevents garbage and inconsistent data. Great for document based data stores.

* Allows for complete user support.
    - Create user flow with email confirmations
        - Allows resending confirmations too.
        - Allows custom user properties too.
    - Forgot password flow with email support.
    - Change email with email support (WIP).
    - Update user properties.
    - Delete user (WIP).

* You can put Wrestler on top of an existing database.
    - As long as an appropriate driver exists.

* You can easily extend and/or override anything without learning anything new.
    - Because your application is not just a RESTful API.
    
* Can be deployed anywhere!
