var xbmcApp = angular.module('xbmc', [ 'ngRoute' ] );

//var xbmchost = 'http://localhost:9090';
var xbmchost = 'http://maggie:8080';
var clickCount = 0;
var serviceUrl = xbmchost + '/jsonrpc';

var defSelected = { id: '', isPlaying : '', filenameandpath: '', plot:'', title:'' };
var defRequest = { url: '' };

function shallowCopy(objTo,objFrom) {
	if (typeof obj != 'undefined' && objTo != null)
		for (var member in objTo) delete objTo[member];
	
	if (typeof def != 'undefined' && objFrom != null)
		for (var member in objFrom) objTo[member] = objFrom[member];
}

//===================================================================
// Root controller for global scope
//===================================================================

xbmcApp.controller('rootController', function($scope, $http) {
	// To be complete selected needs:
	//  1) An id
	//  2) A filenameandpath to the file that we can play
	//  3) A plot to display in the details dialog
	//  4) A title for display in the details dialog
	$scope.selected = {}; // use an object in the parent
	shallowCopy($scope.selected,defSelected);
	$scope.request = {};
	shallowCopy($scope.request,defRequest);
	
	$scope.setSelected = function(id,filenameandpath,plot,title){
		$scope.selected.id = id;
		$scope.selected.filenameandpath = filenameandpath;
		$scope.selected.plot = plot;
		$scope.selected.title = title;
	};
		
	$scope.sendRequest = function(req) {
		$scope.request.url = serviceUrl + '?count=' + clickCount + '&request=' + req;
		clickCount = clickCount + 1;
	};
		
	$scope.stripThe = function(ttl) {
		var title = ttl.title;
		return (title.indexOf('The ') == 0 ? title.substring(4) : title);
	};
	
	$scope.playSelected = function() {	
		if ($scope.selected.id != '') {
			$scope.selected.isPlaying = $scope.selected.id;
			$scope.sendRequest('{ "jsonrpc": "2.0", "method": "Player.Open", "params": { "item": { "file": "' + $scope.selected.filenameandpath + '" } }, "id": 1 }');
		}
	};

	// This stores a reference to the currently selected element so that it can be cleared
	// when a new element is selected. This should all be moved to a directive but not right now
	$scope.selectedElement = null;
	$scope.selectedMediaEntry = null;
	
	$scope.select = function(media,e,scrollMe) {
		// if we passed an event then we need to set the background color of the selected element.
		// Yes, yes - this is a terrible thing to do from a controller.
		var elem = null;
		if (typeof e != 'undefined')
		{
			if ($scope.selectedElement != null)
				$scope.selectedElement.css({ 'background-color' : ''});

			elem = angular.element(e.currentTarget);
			elem.css({ 'background-color': 'rgba(107,142,35,0.5)' });
			$scope.selectedElement = elem;
		}

		$http.get('data/details/' + media.id + '.json').
		success(function(data,status,headers,config){
			if ($scope.selectedMediaEntry != null) $scope.selectedMediaEntry.isSelected = false;
			$scope.setSelected(media.id,data.filenameandpath, data.plot, media.title);
			$scope.selectedMediaEntry = media;
			$scope.selectedMediaEntry.isSelected = true;
			if (elem != null && scrollMe) {
				$( elem[0] ).scrollintoview();
			}
		});
	};
});

// Make sure the local xbmc box isn't blocked in angular ... this is stupid on angulars part
xbmcApp.config( function($sceDelegateProvider) {
	$sceDelegateProvider.resourceUrlWhitelist(['self', xbmchost + "/**" ]);
});

//===================================================================
// Nav bar
//===================================================================

xbmcApp.controller('navController',function ($scope, $location) {
	$scope.go = function(path) {
		shallowCopy($scope.selected,defSelected);
		shallowCopy($scope.request,defRequest);
		$location.path(path);
	};
	
	$scope.stopPlayer = function() {
		$scope.selected.isPlaying = '';
		$scope.sendRequest('{ "jsonrpc": "2.0", "method": "Player.Stop", "params": { "playerid": 1 }, "id": 1 }');
	};
	
	$scope.pauseResumePlayer = function() {
		if ($scope.selected.isPlaying == $scope.selected.id)
			$scope.sendRequest('{ "jsonrpc": "2.0", "method": "Player.PlayPause", "params": { "playerid": 1 }, "id": 1 }');
		else
			$scope.playSelected();
	};
	
});

xbmcApp.config(
  function ($routeProvider) {
	$routeProvider
	.when('/main', {
		templateUrl: 'partials/main.html',
	})
	.when("/movies", {
		templateUrl: 'partials/movies.html',
		controller: 'movieController'
	})
	.when("/tvshows", {
		templateUrl: 'partials/tvshows.html',
		controller: 'tvController'
	})			
	.when('/', { redirectTo: '/main' })
	.otherwise({ redirectTo: '/main' });
});

//===================================================================
// Tv Shows
//===================================================================
xbmcApp.controller('tvEpisodeController', function ($scope, $http) {
});

xbmcApp.controller('tvController', function ($scope, $http) {
	$scope.prevTvShow = null;
	
	$scope.selectTvShow = function(tvshow,e) {
		$scope.select(tvshow,e,true);
		
		$http.get('data/details/' + tvshow.id + '.json').
		success(function(data,status,headers,config) {
			var dup = $scope.prevTvShow != null && $scope.prevTvShow.id == tvshow.id;
			if ($scope.prevTvShow != null) {
				delete $scope.prevTvShow.episodes;
			}
			if (dup)
				$scope.prevTvShow = null;
			else {
				tvshow.episodes = data.episodes;
				$scope.prevTvShow = tvshow;
			}
		});
	};
	
	$http.get('data/tvshows.json').
	success(function(data,status,headers,config) {
		$scope.tvshows = data.video.tvshow;
		
		$.each($scope.tvshows, function(index, val) { val.isSelected = false; val.index = index; });
	});
});

//===================================================================
// Movies
//===================================================================

xbmcApp.controller('movieController', function ($scope, $http) {
	$http.get('data/movies.json').
	success(function(data,status,headers,config) {
		$scope.movies = data.video.movie;
	});
	
});

//===================================================================
// Directives
//===================================================================

xbmcApp.directive('xbmcBackImg', function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			scope.$watch(attrs.watch, function(v) {
				var url = attrs.xbmcBackImg;
				element.css({
					'background-image': 'url(' + url +')'
				});
			});
		}
	};
});

xbmcApp.directive('xbmcSeason', function() {
	return {
		restrict: 'A',
		templateUrl: 'partials/episodes.html'
	};
});


