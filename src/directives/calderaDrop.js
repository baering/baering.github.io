app.directive("calderaDrop", [
	"$timeout",
	function($timeout) {
		return {
			restrict: "E",
			scope: {},
			templateUrl: "templates/caldera-drop.html",
			link: function(scope, element, attrs) {
				scope.randomReloadNumber = 0;
				function reloadImg() {
					scope.randomReloadNumber = Math.random();
					$timeout(reloadImg, 60000);
				}
				$timeout(reloadImg, 60000);
			}
		};
	}
]);