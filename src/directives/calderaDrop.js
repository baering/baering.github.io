app.directive("calderaDrop", [
	"$timeout",
	function($timeout) {
		return {
			restrict: "E",
			scope: {},
			templateUrl: "templates/caldera-drop.html",
			link: function(scope, element, attrs) {
				scope.randomReloadNumber = 0;
				var reloadTime = 60 * 5 * 1000;
				
				function reloadImg() {
					scope.randomReloadNumber = Math.random();
					$timeout(reloadImg, reloadTime);
				}
				$timeout(reloadImg, reloadTime);
			}
		};
	}
]);