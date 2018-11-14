# FullMeanStack
Hints for creating a full MEAN stack application 

In this tutorial you will create an Angular application with a node back end and mongoose database interface.
First create an express project
```
express comment
cd comment
npm install
export PORT=4200
npm start
```
This will start a web server on port 4200. Make sure you can see the default view for an express app.

Lets get started with a simple Angular application with the following view "index.html" that we will create inside of the "public" directory.  The application has a form that allows you to submit a comment and then lists the comments by upvotes.  You have seen this before, so lets start here.
```
<html>

<head>
    <title>Comments</title>
    <link href="//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css" rel="stylesheet">
    <script src="//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js"></script>
    <script src="javascripts/comment.js"></script>

</head>

<body ng-app="comment" ng-controller="MainCtrl">
    <div class="row">
        <div class="col-md-6 col-md-offset-3">
            <div class="page-header">
                <h1>Comments </h1>
            </div>

            <form ng-submit="addComment()" style="margin-top30px;">
                <input type="text" ng-model="formContent"></input>
                <button type="submit">Add Comment</button>
            </form>
            <div ng-repeat="comment in comments | orderBy: '-upvotes'">
                <span class="glyphicon glyphicon-thumbs-up" ng-click="incrementUpvotes(comment)"></span> {{comment.title}} - upvotes: {{comment.upvotes}}
            </div>
        </div>
    </div>
</body>

</html>
```
Now create the controller in "public/javascripts/comment.js" and add the comments array of objects and add the "addComment()" function and the "incrementUpvotes(comment)" function.  Notice that the incrementUpvotes function is passed the comment object so we dont need to find it.
```
angular.module('comment', [])
    .controller('MainCtrl', [
        '$scope',
        function($scope) {
            $scope.comments = [];
            $scope.addComment = function() {
                var newcomment = { title: $scope.formContent, upvotes: 0 };
                $scope.formContent = '';
                $scope.comments.push(newcomment);
            };
            $scope.incrementUpvotes = function(comment) {
                comment.upvotes += 1;
            };
        }
    ]);
```

Test the front end to make sure everything is working so we can attach the back end.

Now we will install Mongoose which will provide schemas on top of mongodb.
```
npm install --save mongoose
```
The --save flag updates the packages.json file with mongoose so you can easily restore them with a "npm install" command.

We are going to add one more folder for the mongoose models. Create a new folder called "models":
```
mkdir models
```
This folder will contain our Mongoose schema definitions.

Now create the file "Comments.js" in the models directory with the following content.
```
var mongoose = require('mongoose');
var CommentSchema = new mongoose.Schema({
  title: String,
  upvotes: {type: Number, default: 0},
});
mongoose.model('Comment', CommentSchema);
```
Now add the model to your app.js file [right before require('./routes/index');] to connect to the mongod. Make sure that mongod is running on your instance using the mongo console application.
```
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/fullmeanstack', { useNewUrlParser: true });
require('./models/Comments');
var db = mongoose.connection; //Saves the connection as a variable to use
db.on('error', console.error.bind(console, 'connection error:')); //Checks for connection errors
db.once('open', function() { //Lets us know when we're connected
    console.log('Connected');
});
```
Test the mongoose connection using "npm start"

Now we need to open up REST routes to the database. We want the user to be able to perform the following tasks:
```
view comments
add a comment
upvote a comment
```
These tasks correspond to the following routes:
```
GET /comments - return a list of comments
POST /comments - create a new comment
PUT /comments/:id/upvote - upvote a comment, notice we use the comment ID in the URL
```
Lets start be opening up a GET route in routes/index.js
```
var mongoose = require('mongoose');
var Comment = mongoose.model('Comment');

router.get('/comments', function(req, res, next) {
  Comment.find(function(err, comments){
    if(err){ return next(err); }
    res.json(comments);
  });
});
```
Notice that the Comment variable refers to the Comment model we defined earlier.
Before we can test that the route works, we need data in the mongo database, so lets create a POST route in routes/index.js

```
router.post('/comments', function(req, res, next) {
  var comment = new Comment(req.body);
  comment.save(function(err, comment){
    if(err){ return next(err); }
    res.json(comment);
  });
});
```
Notice that we created a Comment object from the req.body and saved it to the mongo database using the mongoose connection to the mongo database.
Now lets test the routes using curl from your instance. First type cntrl-C to kill your server, then "npm start" to start it up again.
```
curl --data 'title=test' http://localhost:4200/comments
```
This should return something like this:
```
$ curl --data 'title=test' http://localhost:3000/comments
{"__v":0,"title":"test","_id":"563ba5ac1a761cf149c0b258","upvotes":0}
```
Now lets test the GET route.
```
curl http://localhost:4200/comments
```
Should return something like this
```
[{"_id":"563ae37a13190ba93fc96a34","title":"test","__v":0,"upvotes":1}]
```
You can also access the GET route through the URL in your browser. Test it to make sure everything is working.
Notice that the upvote REST interface requires us to find a particular comment before operating on it. In order to make this easier, we can create a route to preload a comment object in routes/index.js using the express param function.
```
router.param('comment', function(req, res, next, id) {
  Comment.findById(id, function (err, comment){
    if (err) { return next(err); }
    if (!comment) { return next(new Error("can't find comment")); }
    req.comment = comment;
    return next();
  });
});
```
Now, whenever we create a route with :comment in it, this function will be run first to get the comment out of the database. The router.param allowed us to define this [middleware](http://expressjs.com/en/guide/using-middleware.html) that is passed to the route. We use the query interface for mongoose to simplify the access.
Lets use this middleware function to create a route for returning a single comment

```
router.get('/comments/:comment', function(req, res) {
  res.json(req.comment);
});
```
Since the :comment part of the route was interpreted by the middleware that put the result from mongoose into the req.comment object, all we have to do is to return the JSON back to the client.
The :comment part of the URL will be the ID given to the comment in mongo. So, you should be able to enter a URL like this to test your setup:

```
http://YOURIP:4200/comments/54f4b19425b53f6a052851ce
```
Now let's implement the route to allow upvoting. We will use our middleware to identify the comment and then open up a route on this comment to upvote it. Add the upvote method to the models/Comments.js schema.
```
CommentSchema.methods.upvote = function(cb) {
  this.upvotes += 1;
  this.save(cb);
};
```
Then create a PUT route in routes/index.js
```
router.put('/comments/:comment/upvote', function(req, res, next) {
  req.comment.upvote(function(err, comment){
    if (err) { return next(err); }
    res.json(comment);
  });
});
```
You should now be able to test your route using curl. First access the route to GET all of the comments. Find the id of one of the comments, and use curl to upvote it.
```
curl -X PUT http://localhost:4200/comments/<COMMENT ID>/upvote
```
Now use the URL to make sure that the upvote count was incremented.
Now that our backend is working, we just need to wire it up to our angular frontend. First we will create a getAll() function to retrieve comments from our REST service in public/javascripts/app.js.
```
  $scope.getAll = function() {
    return $http.get('/comments').success(function(data){
      angular.copy(data, $scope.comments);
    });
  };
  $scope.getAll();
```
You will need to inject the $http service into your controller.
```
angular.module('comment', [])
.controller('MainCtrl', [
  '$scope','$http',
  function($scope,$http){
```
Upon success, we will copy the data from the GET REST service into our $scope comments array. The angular.copy function will update the view. Now we just need to find a way to call getAll at the right time.  Lets add it right after we define it.  And delete the initialization of your comments array.

Now that you have implemented one backend interface, the others should be easy. Lets modify the addComment function to write the output to the mongo database.
Once you have created the object, send it to the post route in the backend. Since the backend returns the object with the ID in it, we can use this to upvote the comment.
```
            $scope.addComment = function() {
                var newcomment = { title: $scope.formContent, upvotes: 0 };
                $http.post('/comments', newcomment).success(function(data) {
                    $scope.comments.push(data);
                });
                $scope.formContent = '';
            };
```
Test this function to make sure you can create new comments and see them displayed. You should be able to refresh the page and still see them.
Now you need to be able to save the upvoting for your comments. Follow the same process of calling the put verb on your HTTP route.  You need to pass the ID in the route to the backend.
```
            $scope.incrementUpvotes = function(comment) {
                $http.put('/comments/' + comment._id + '/upvote')
                    .success(function(data) {
                        console.log("upvote worked");
                        comment.upvotes += 1;
                    });
            };
```

Test to make sure the upvotes are maintained across refreshes.

Now lets implement the last piece of a CRUD (Create, Read, Update, Delete) RESTful service, Delete.  First, add the delete button to your html code
```
  <div ng-repeat="comment in comments | orderBy: '-upvotes'">
    <span class="glyphicon glyphicon-remove" ng-click="delete(comment)"></span>
    <span class="glyphicon glyphicon-thumbs-up" ng-click="incrementUpvotes(comment)"></span>
    {{comment.title}} - upvotes: {{comment.upvotes}}
  </div>
```

And add the delete() function to your controller. Notice that we call getAll() after the delete to refresh the list in our model.  We could have deleted the record from the list if we didnt want to do this.
```
    $scope.delete = function(comment) {
      $http.delete('/comments/' + comment._id )
        .success(function(data){
          console.log("delete worked");
        });
      $scope.getAll();
    };
```

Now we need to implement the delete verb in our back end.
```
router.delete('/comments/:comment', function(req, res) {
  console.log("in Delete");
  req.comment.remove();
  res.sendStatus(200);
});
```
