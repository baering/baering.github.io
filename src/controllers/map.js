app.controller("MapController", [
	"$scope", 
	"EarthquakeService",
	"$timeout",
	function($scope, EarthquakeService, $timeout) {
		var earthquakes = {};
		var currentChart;

		$scope.numberOfEarthquakesDisplayedInTable = 50;

		$scope.graphDisplayHours = 16;
		$scope.graphDisplayQuakeSize = 0;
		$scope.graphDisplayOnlyVerified = true;

		$scope.refreshRate = 60;

		$scope.earthquakes = [];

		function earthquakeIsEqualOrLargerThanFilter(earthquake) {
			return earthquake.size >= $scope.graphDisplayQuakeSize;
		}

		function earthquakeOccuredInLessThanHours(earthquake, now) {
			var hoursInMs = $scope.graphDisplayHours * 3600 * 1000;
			var hoursAgo = now - hoursInMs;

			if(earthquake.occuredAt >= hoursAgo) {
				return true;
			}
			return false;
		}

		function earthquakeMatchesFilters(earthquake, now) {
			if(earthquakeOccuredInLessThanHours(earthquake, now)) {
				if(earthquakeIsEqualOrLargerThanFilter(earthquake)) {
					if(!$scope.graphDisplayOnlyVerified) {
						return true;
					}
					else {
						return earthquake.verified;
					}
				}
			}
			return false;
		}

		function redrawWithFilter() {
			var earthquakesMatchingFilter = getChartCoordinatesForEarthquakes($scope.earthquakes);
			makeNewChart(earthquakesMatchingFilter);
		}

		var redrawTimeout;
		$scope.graphFilterChange = function() {
			if(redrawTimeout) {
				$timeout.cancel(redrawTimeout);
				redrawTimeout = undefined;
			}
			redrawTimeout = $timeout(redrawWithFilter, 1000);
		};

		function getChartCoordinatesForEarthquakes(data) {
			var nowInUnixTime = new Date().getTime();

			var result = [];
			for(var i = 0; i < data.length; ++i) {
				var currentEarthquake = data[i];

				var drawRadius = Math.pow(0.8 + currentEarthquake.size, 2);

				if(earthquakeMatchesFilters(currentEarthquake, nowInUnixTime)) {
					result.push({
						x: currentEarthquake.longitude, 
						y: currentEarthquake.depth, 
						z: latitudeLimits.min + (latitudeLimits.max -currentEarthquake.latitude),
						richter: currentEarthquake.size,
						timeAgo: $scope.timeSince(currentEarthquake.occuredAt),
						marker: {
							fillColor: currentEarthquake.color(nowInUnixTime),
							lineColor: "#123F3F",
							lineWidth: 1,
							radius: drawRadius
						}
					});
				}
			}

			return result.reverse();
		}

		function addEarthquakesToChart(data, firstDraw) {
			if(!currentChart) {
				return;
			}

			var coordinates = getChartCoordinatesForEarthquakes(data);
			for(var i = 0; i < coordinates.length; ++i) {
				currentChart.series[0].addPoint(coordinates[i], !firstDraw);
			}

			if(firstDraw) {
				currentChart.redraw();
			}
		}

		var latitudeLimits = {
			min: 100000000,
			max: -100000000
		};

		var longitudeLimits = {
			min: 100000000,
			max: -100000000
		};

		var depthLimits = {
			min: 100000000,
			max: -100000000
		};

		function updateLimitsForObject(value, limit) {
			if(value < limit.min) {
				limit.min = value;
			}
			if(value > limit.max) {
				limit.max = value;
			}
		}

		function updateLimits(latitude, longitude, depth) {
			updateLimitsForObject(latitude, latitudeLimits);
			updateLimitsForObject(longitude, longitudeLimits);
			updateLimitsForObject(depth, depthLimits);
		}

		$scope.allowShaking = true;
		$scope.shaking = false;

		// To not shake the webcam at page load
		var firstShake = true;

		function shakeWebCam(magnitude) {
			if(firstShake) {
				firstShake = false;
				return;
			}

			if($scope.allowShaking) {
				if(!$scope.shaking) {
					$scope.shaking = true;
					$timeout(function() {
						$scope.shaking = false;
					}, 1000 * magnitude);
				}
			}
		}

		function registerNewEarthquakes(data) {
			var biggestNewEarthquakeMagnitude = -100000;
			var newEarthquake = false;

			for(var i = 0; i < data.length; ++i) {
				var currentEarthquake = data[i];

				if(earthquakes[currentEarthquake.occuredAt] === undefined) {
					newEarthquake = true;

					if(currentEarthquake.size > biggestNewEarthquakeMagnitude) {
						biggestNewEarthquakeMagnitude = currentEarthquake.size;
					}

					$scope.earthquakes.push(currentEarthquake);
					earthquakes[currentEarthquake.occuredAt] = currentEarthquake;
					updateLimits(currentEarthquake.latitude, currentEarthquake.longitude, currentEarthquake.depth);
				}
			}

			if(newEarthquake) {
				shakeWebCam(biggestNewEarthquakeMagnitude);
			}
		}

		function updateEarthquake(oldVersion, newVersion) {
			for(var key in oldVersion) {
				if(oldVersion.hasOwnProperty(key)) {
					oldVersion[key] = newVersion[key];
				}
			}
		}

		function newEarthquakes(data) {
			var result = [];

			for(var i = 0; i < data.length; ++i) {
				var currentEarthquake = data[i];

				if(earthquakes[currentEarthquake.occuredAt] === undefined) {
					result.push(currentEarthquake);
				}
				else {
					var currentEarthquakeVerified = currentEarthquake.verified;
					var currentVersionOfThisEarthquakeVerified = earthquakes[currentEarthquake.occuredAt].verified;

					if(currentEarthquakeVerified && !currentVersionOfThisEarthquakeVerified) {
						console.log("An earthquake has been verified, updating it's fields.");
						updateEarthquake(earthquakes[currentEarthquake.occuredAt], currentEarthquake);
					}
				}
			}

			registerNewEarthquakes(data);

			return result;
		}

		function getEarthquakes() {
			EarthquakeService.getEarthquakesLastHours(1).then(function(data) {
				if(data.length > 0) {
					var quakes = newEarthquakes(data);
					if(quakes.length > 0) {
						console.log("New earthquakes detected from last update. Updating chart.");

						addEarthquakesToChart(quakes);
					}

					$timeout(getEarthquakes, $scope.refreshRate * 1000);
				}
			});
		}

		function setInitialEarthquakeData(data) {
			var quakes = newEarthquakes(data);
			makeNewChart([]);
			if(quakes.length > 0) {
				addEarthquakesToChart(quakes, true);
			}

			$scope.loading = false;
		}

		$scope.loading = true;
		function init() {
			EarthquakeService.getEarthquakesLastHours(48).then(function(data) {
				setInitialEarthquakeData(data);
				$timeout(getEarthquakes, $scope.refreshRate * 1000);
			});
		}
		init();

		function registerClickEventOnChart(chart) {
			$(chart.container).bind('mousedown.hc touchstart.hc', function (e) {
				e = chart.pointer.normalize(e);

				var posX = e.pageX,
				posY = e.pageY,
				alpha = chart.options.chart.options3d.alpha,
				beta = chart.options.chart.options3d.beta,
				newAlpha,
				newBeta,
				sensitivity = 5; // lower is more sensitive

				$(document).bind({
					'mousemove.hc touchdrag.hc': function (e) {
						// Run beta
						newBeta = beta + (posX - e.pageX) / sensitivity;
						newBeta = Math.min(100, Math.max(-100, newBeta));
						chart.options.chart.options3d.beta = newBeta;

						// Run alpha
						newAlpha = alpha + (e.pageY - posY) / sensitivity;
						newAlpha = Math.min(100, Math.max(-100, newAlpha));
						chart.options.chart.options3d.alpha = newAlpha;

						chart.redraw(false);
					},
					'mouseup touchend': function () {
						$(document).unbind('.hc');
					}
				});
			});
		}

		function makeNewChart(data) {
			if(currentChart) {
				currentChart.destroy();
			}

			currentChart = new Highcharts.Chart({
				chart: {
					renderTo: 'volcano-chart',
					margin: 100,
					type: 'scatter',
					options3d: {
						enabled: true,
						alpha: 10,
						beta: 30,
						depth: 275,
						viewDistance: 5,

						frame: {
							bottom: { size: 1, color: 'rgba(0,0,0,0.02)' },
							back: { size: 1, color: 'rgba(0,0,0,0.04)' },
							side: { size: 1, color: 'rgba(0,0,0,0.06)' }
						}
					},
					height: window.innerHeight - 90,
				},
				tooltip: {
					formatter: function () {
						var result = "";
		
						result += "<p><strong>Happened</strong> " + this.point.timeAgo + ", ";
						result += "<strong>magnitude</strong> " + this.point.richter + "</p> ";

						return result;
					}
				},
				title: {
					text: 'Bardarbunga'
				},
				subtitle: {
					text: "3d visual - updated every " + $scope.refreshRate+ " sec"
				},
				plotOptions: {
					scatter: {
						width: 10,
						height: 10,
						depth: 10,
						marker: {
							states: {
								hover: {
									enabled: false,
									radius: null,
									radiusPlus: 0,
									lineWidth: null,
									lineWidthPlus: 0,
									fillColor: "#0f0",
								}
							}
						}
					}
				},
				yAxis: {
					reversed: true,
					min: depthLimits.min,
					max: depthLimits.max,
					labels: {
						format: '{value} km',
						enabled: true
					},
					title: "Depth"
				},
				xAxis: {
					min: longitudeLimits.min,
					max: longitudeLimits.max,
					labels: {
						enabled: true
					},
					gridLineWidth: 1,
					title: {
						text: "Longitude"
					}
				},
				zAxis: {
					min: latitudeLimits.max,
					max: latitudeLimits.min
				},
				legend: {
					enabled: false
				},
				series: [{
					name: 'Earthquake location',
					colorByPoint: false,
					data: data,
					turboThreshold: 13337
				}],
			});

			registerClickEventOnChart(currentChart);
		}

		$scope.earthquakeTableColor = function(earthquake) {
			if(earthquake.size >= 3) {
				return "danger";
			}
			else if(earthquake.size >= 2) {
				return "warning";
			}
			else {
				return "";
			}
		};

		$scope.timeSince = function(unix) {
			return moment(unix).fromNow();
		};

		// I know jQuery in angular controllers is a sin, sorry.
		$(".webcam-wrapper").height($(".webcam-wrapper").width() * 0.56);
	}
]);