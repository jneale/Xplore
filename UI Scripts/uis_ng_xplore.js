var xplore = angular.module('xplore', []);

/**
	summary:
		Configure the routes for this application.
		Templates are sourced using the processor and UI macros
**/
xplore.config(['$routeProvider', '$locationProvider',
function ($routeProvider, $locationProvider) {
	$routeProvider.
	when('/:page', {
		templateUrl: '?template=snd_xplore_script',
		controller: 'ScriptCtrl'
	}).
	when('/schema', {
		templateUrl: '?template=snd_xplore_schema',
		controller: 'SchemaCtrl'
	})
}]);

xplore.controller('Xplore',
['$scope', '$location', function ($scope, $location) {

	$scope.mainTabs = buffer;
})

/**
	summary:
		The buffer acts as a memory store for any object.
**/
xplore.service('buffer', ['$rootScope', '$location', function ($rootScope, $location) {
	var buffer = function () {
		objects: [],

		add: function (obj) {
			buffer.objects.push(obj);
		}
	}
}]);


xplore.service('panes', ['$rootScope', '$location', function ($rootScope, $location) {
	var panes = function () {
		this.panes = [];
		this.active = null;
	}
}]);


xplore.factory('panes', [function () {

	var panes = {

		panes: [],

		addPane: function (pane) {
			panes.panes.push(pane);
		},

		toggle: function (pane) {
			angular.forEach(panes.panes, function (comparePane) {
				comparePane.active = comparePane === pane;
			});
		}
	};

	return panes;

}]);

xplore.factory('RequestService', [])

xplore.factory('codeTabs', ['$rootScope', 'buffer', function ($rootScope, buffer) {

	var codeTabs = {

		tabs: buffer,

		addTab: function (options) {
			codeTabs.tabs.push(options);
		},

		removeTab: function (index) {
			codeTabs.tabs.splice(index, 1);
		}

		saveState: function () {
			sessionStorage.snd_xplore_codeTabs = angular.toJson(codeTabs.tabs);
		},

		restoreState: function () {
			codeTabs.tabs = angular.fromJson(sessionStorage.snd_xplore_codeTabs);
		}
	};

	$rootScope.$on('saveState', service.saveState);
	$rootScope.$on('restoreState', service.restoreState);

	return codeTabs;
}]);

xplore.factory('footerTabs', ['buffer', function (buffer) {

	var footerTabs = {

		tabs: buffer.objects,
		activeTab: null,

		add: function () {
			buffer.add({

			});
		},

		activate: function (tab) {
			footerTabs.activeTab = tab;
		}
	}


}]);

xplore.controller('XploreTabCtrl', [
'$scope', 'codeTabs', function ($scope) {

	$scope.tabs = codeTabs.tabs;

	$scope.tabIndex = 0;

	$scope.viewTab = function (index) {
		codeTabs.saveState();
		$scope.tabIndex = 1;
	};

}]);

xplore.controller('XploreCtrl', [
'$scope', 'panes', 'codeTabs', function ($scope, panes, codeTabs) {

	$scope.codeTabs = codeTabs;

	$scope.panes = panes;

	$scope.quickBar = [
		{}
	];

	$scope.sidePanels = ;
	$scope.activePanel = -1;

}])
