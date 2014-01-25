var xbmcApp = angular.module('xbmc', [ 'ngRoute' ] );

//var xbmchost = 'http://localhost:9090';
var xbmchost = 'http://maggie:8080';
var clickCount = 0;
var serviceUrl = xbmchost + '/jsonrpc';

var defSelected = { id: '', isPlaying : '', filenameandpath: '' };
var defRequest = { url: '' };

function clear(obj,def)
{
	if (typeof obj != 'undefined' && obj != null)
		for (var member in obj) delete obj[member];
	
	if (typeof def != 'undefined' && def != null)
		for (var member in def) obj[member] = def[member];
}

//===================================================================
// Root controller for global scope
//===================================================================

xbmcApp.controller('rootController', function($scope, $http)	{
	$scope.mobile = true;
	
	$scope.selected = {}; // use an object in the parent
	clear($scope.selected,defSelected);
	$scope.request = {};
	clear($scope.request,defRequest);
	
	$scope.selectedElement = null;
	
	$scope.setSelected = function(id,filenameandpath){
		$scope.selected.id = id;
		$scope.selected.filenameandpath = filenameandpath;
	};
		
	$scope.sendRequest = function(req)
	{
		$scope.request.url = serviceUrl + '?count=' + clickCount + '&request=' + req;
		clickCount = clickCount + 1;
	};
		
	$scope.nop = function() {};

	$scope.stripThe = function(ttl)
	{
		var title = ttl.title;
		return (title.indexOf('The ') == 0 ? title.substring(4) : title);
	};
	
	$scope.playSelected = function()
	{	
		if ($scope.selected.id != '')
		{
			$scope.selected.isPlaying = $scope.selected.id;
			$scope.sendRequest('{ "jsonrpc": "2.0", "method": "Player.Open", "params": { "item": { "file": "' + $scope.selected.filenameandpath + '" } }, "id": 1 }');
		}
	};
	
	$scope.selectDetails = function(media,e,handler)
	{
		// if we passed an event then we need to set the background color of the selected element.
		// Yes, yes - this is a terrible thing to do from a controller.
		if (typeof e != 'undefined')
		{
			if ($scope.selectedElement != null)
				$scope.selectedElement.css({ 'background-color' : ''});

			var elem = angular.element(e.currentTarget);
			elem.css({ 'background-color': 'rgba(107,142,35,0.5)' });
			$scope.selectedElement = elem;
		}

		if (handler != null) {
			$http.get('data/details/' + media.id + '.json').
			success(function(data,status,headers,config){
				handler(data,status,headers,config);
				if (typeof data.filenameandpath != 'undefined' && data.filenameandpath != null && data.filenameandpath != '')
					$scope.setSelected(media.id,data.filenameandpath);
			});
		}
		else if (typeof media.filenameandpath != 'undefined' && media.filenameandpath != null && media.filenameandpath != '')
			$scope.setSelected(media.id,media.filenameandpath);
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
		clear($scope.selected,defSelected);
		clear($scope.request,defRequest);
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
	$scope.episodeDetails = function(episode,event) { 
		$scope.selectDetails(episode,event,null);
		
		if ($scope.currentTvshow != null)
		{
			var t = $scope.currentTvshow;
			t.id = episode.id;
			t.plot = episode.plot;
			t.title = (t.tvtitle ? (t.tvtitle + ' - ') : '') + ' Season ' + episode.season + 
			    ' Ep ' + episode.episode + ' - ' + episode.title;
		}
	};
});

xbmcApp.controller('tvController', function ($scope, $http) {
	$http.get('data/tvshows.json').
	success(function(data,status,headers,config)
	{
		$scope.tvshows = data.video.tvshow;
		
		$.each($scope.tvshows, function(index, val) { val.selected = false; val.index = index; });
	});
	
	$scope.currentTvshow = null;

	$scope.tvshowDetails = function(tvshow,event) { 
		$scope.selectDetails(tvshow,event,function(data,status,headers,config) {
			var selectedTvShow = $scope.tvshows[tvshow.index];
			if ($scope.currentTvshow != null)
				$scope.currentTvshow.selected = false;
			selectedTvShow.selected = true;
			$scope.currentTvshow = selectedTvShow;

			$scope.currentTvshow.id = tvshow.id;
			$scope.currentTvshow.title = tvshow.title;
			$scope.currentTvshow.tvtitle = tvshow.title;
			$scope.currentTvshow.plot = data.plot;
			$scope.currentTvshow.episodes = data.episodes;
		});
	};
});

xbmcApp.directive('xbmcSeason', function() {
	return {
		restrict: 'A',
		templateUrl: 'partials/episodes.html'
	};
});

//===================================================================
// Movies
//===================================================================

xbmcApp.controller('movieController', function ($scope, $http) {
	$http.get('data/movies.json').
	success(function(data,status,headers,config)
	{
		$scope.movies = data.video.movie;
	});
	
	// initialize some model values.
	$scope.currentMovie = {};
	
	$scope.movieDetails = function(movie,event) { 
		$scope.selectDetails(movie,event,function(data,status,headers,config) {
			$scope.currentMovie.id = movie.id;
			$scope.currentMovie.title = movie.title;
			$scope.currentMovie.plot = data.plot;
		});
	};
	
	$scope.startMovie = function(movie)
	{
		$scope.movieDetails(movie);
		$scope.playSelected();
	};
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

