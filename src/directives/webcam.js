app.directive("webcam", [
	"$window",
	function($window) {
		return {
			restrict: "E",
			scope: {

			},
			templateUrl: "templates/webcam-template.html",
			link: function(scope, element, attrs) {
				function resize() {
					var upperTopRightHeight = $("#upper-top-right").height();
					var newHeight = $window.innerHeight - (upperTopRightHeight + 50);
					var newWidth = newHeight / 0.56;

					if(newWidth > $(".webcam-wrapper").width()) {
						newHeight = $(".webcam-wrapper").width() * 0.56;
						newWidth = newHeight / 0.56;
					}

					$(".webcam-content").height(newHeight);
					$(".webcam-content").width(newWidth);
				}
				resize();

				angular.element($window).bind("resize", resize);
			}
		};
	}
]);