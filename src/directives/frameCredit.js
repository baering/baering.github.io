app.directive("frameCredit", [
	function() {
		return {
			restrict: "E",
			scope: {},
			templateUrl: "templates/frame-credit.html",
			link: function(scope, element, attrs) {
				// http://stackoverflow.com/a/326076
				function inIFrame() {
					try {
						return window.self !== window.top;
					} catch (e) {
						return true;
					}
				}

				if(inIFrame()) {
					scope.inFrame = true;
				}
				else {
					scope.inFrame = false;
				}
			}
		};
	}
]);