angular.module('comment', [])
.controller('MainCtrl', [
  '$scope','$http',
  function($scope,$http){
    $scope.test = 'Hello world!';
	$scope.comments = [
      {title:'Comment 1', upvotes:5},
      {title:'Comment 2', upvotes:6},
      {title:'Comment 3', upvotes:1},
      {title:'Comment 4', upvotes:4},
      {title:'Comment 5', upvotes:3}
    ];
    $scope.create = function(comment) {
      return $http.post('/comments', comment).success(function(data){
        $scope.comments.push(data);
      });
    };
	$scope.addComment = function() {
	  $scope.create({title:$scope.formContent,upvotes:0});
      $scope.formContent='';
    };
    $scope.upvote = function(comment) {
      return $http.put('/comments/' + comment._id + '/upvote')
        .success(function(data){
          console.log("upvote worked");
          comment.upvotes = data.upvotes;
        });
    };
	$scope.incrementUpvotes = function(comment) {
	  $scope.upvote(comment);
    };
    $scope.getAll = function() {
      return $http.get('/comments').success(function(data){
        angular.copy(data, $scope.comments);
      });
    };
    $scope.getAll();

  }
]);
