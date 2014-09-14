app.controller("MapController", [
	"$scope", 
	"EarthquakeService",
	"$timeout",
	function($scope, EarthquakeService, $timeout) {
		var earthquakes = {};

		var current3dChart;
		var current2dChart;

		$scope.numberOfEarthquakesDisplayedInTable = 50;

		$scope.graphDisplayHours = 16;
		$scope.graphDisplayQuakeSize = 0;
		$scope.graphDisplayOnlyVerified = true;

		$scope.refreshRate = 60;

		$scope.earthquakes = [];

		function earthquakeIsEqualOrLargerThanFilter(earthquake) {
			return earthquake.size >= $scope.graphDisplayQuakeSize;
		}

		function earthquakeOccuredInLessThanHours(earthquake, nowInUnixTime) {
			var hoursInMs = $scope.graphDisplayHours * 3600 * 1000;
			var hoursAgo = nowInUnixTime - hoursInMs;

			if(earthquake.occuredAt >= hoursAgo) {
				return true;
			}
			return false;
		}

		function earthquakeMatchesFilters(earthquake, nowInUnixTime) {
			if(earthquakeOccuredInLessThanHours(earthquake, nowInUnixTime)) {
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
			makeNew3dChart(earthquakesMatchingFilter);
			makeNew2dChart(get3dCoordinatesAs2d(earthquakesMatchingFilter));
		}

		var redrawTimeout;
		$scope.graphFilterChange = function() {
			if(redrawTimeout) {
				$timeout.cancel(redrawTimeout);
				redrawTimeout = undefined;
			}
			redrawTimeout = $timeout(redrawWithFilter, 1000);
		};

		function create2dCoordinateFrom3dCoordinate(coordinate3d) {
			var result = {
				x: coordinate3d.x,
				y: latitudeLimits.min + (latitudeLimits.max - coordinate3d.z),
				depth: coordinate3d.y,
				richter: coordinate3d.richter,
				timeAgo: coordinate3d.timeAgo,
				marker: angular.copy(coordinate3d.marker)
			};
			result.marker.radius = 1 + (coordinate3d.richter / 6) * 8;
			return result;
		}

		function get3dCoordinatesAs2d(data) {
			var result = [];

			for(var i = 0; i < data.length; ++i) {
				var currentCoordinate = data[i];
				var coordinate2d = create2dCoordinateFrom3dCoordinate(currentCoordinate);

				result.push(coordinate2d);
			}

			return result;
		}

		function createCoordinateFromEarthquake(earthquake, nowInUnixTime) {
			var drawRadius = Math.pow(0.8 + earthquake.size, 2);
			return {
				x: earthquake.longitude, 
				y: earthquake.depth, 
				z: latitudeLimits.min + (latitudeLimits.max -earthquake.latitude),
				richter: earthquake.size,
				timeAgo: $scope.timeSince(earthquake.occuredAt),
				marker: {
					fillColor: earthquake.color(nowInUnixTime),
					lineColor: "#123F3F",
					lineWidth: 1,
					radius: drawRadius
				}
			}
		}

		function getChartCoordinatesForEarthquakes(data) {
			var nowInUnixTime = new Date().getTime();

			var result = [];
			for(var i = 0; i < data.length; ++i) {
				var currentEarthquake = data[i];

				if(earthquakeMatchesFilters(currentEarthquake, nowInUnixTime)) {
					earthquakes[currentEarthquake.occuredAt].coordinateId = result.length;

					result.push(createCoordinateFromEarthquake(currentEarthquake, nowInUnixTime));
				}
			}

			return result.reverse();
		}

		function addEarthquakesToChart(data, firstDraw) {
			if(!current3dChart || !current2dChart) {
				return;
			}

			var coordinates = getChartCoordinatesForEarthquakes(data);
			var coordinates2d = get3dCoordinatesAs2d(coordinates);

			for(var i = 0; i < coordinates.length; ++i) {
				current3dChart.series[0].addPoint(coordinates[i], !firstDraw);
				current2dChart.series[0].addPoint(coordinates2d[i], !firstDraw);
			}

			if(firstDraw) {
				current3dChart.redraw();
				current2dChart.redraw();
			}
			else {
				$scope.graphFilterChange();
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

		function updateEarthquake(earthquakeInMemory, newData) {
			earthquakeInMemory.size = newData.size;
			earthquakeInMemory.longitude = newData.longitude;
			earthquakeInMemory.latitude = newData.latitude;
			earthquakeInMemory.depth = newData.depth;
			earthquakeInMemory.humanReadableLocation = newData.humanReadableLocation;
			earthquakeInMemory.verified = newData.verified;
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

					// If the new version of this earthquake is not verified - but the one in memory is, skip it
					if(!currentEarthquakeVerified && currentVersionOfThisEarthquakeVerified) {
						continue;
					}

					updateEarthquake(earthquakes[currentEarthquake.occuredAt], currentEarthquake);
					if(currentEarthquakeVerified && !currentVersionOfThisEarthquakeVerified) {
						console.log("Previously unverified earthquake has been verified, updating it's fields.");

						if($scope.graphDisplayOnlyVerified) {
							result.push(currentEarthquake);
						}
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

						addEarthquakesToChart(quakes, false);
					}

					$timeout(getEarthquakes, $scope.refreshRate * 1000);
				}
			});
		}

		function setInitialEarthquakeData(data) {
			var quakes = newEarthquakes(data);
			makeNew3dChart([]);
			makeNew2dChart([]);
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

		$scope.mouseOverEarthquake = function(earthquake) {
			var nowInUnixTime = new Date().getTime();

			if(earthquakeMatchesFilters(earthquake, nowInUnixTime)) {
				var index = (current3dChart.series[0].data.length-1) - earthquake.coordinateId;
				var coordinate3d = createCoordinateFromEarthquake(earthquake, nowInUnixTime);

				coordinate3d.marker.fillColor = "#33CC33";
				coordinate3d.marker.radius *= 1.5;

				current3dChart.series[0].data[index].update(coordinate3d);

				var coordinate2d = create2dCoordinateFrom3dCoordinate(coordinate3d);
				coordinate2d.marker.radius *= 2;
				current2dChart.series[0].data[index].update(coordinate2d);
			}
		}

		$scope.mouseOutEarthquake = function(earthquake) {
			var nowInUnixTime = new Date().getTime();

			if(earthquakeMatchesFilters(earthquake, nowInUnixTime)) {
				var index = (current3dChart.series[0].data.length-1) - earthquake.coordinateId;

				var coordinate3d = createCoordinateFromEarthquake(earthquake, nowInUnixTime);
				current3dChart.series[0].data[index].update(coordinate3d);

				var coordinate2d = create2dCoordinateFrom3dCoordinate(coordinate3d);
				current2dChart.series[0].data[index].update(coordinate2d);
			}
		}

		var alphaOn3dGraph, betaOn3dGraph;
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

						alphaOn3dGraph = newAlpha;
						betaOn3dGraph = newBeta;

						chart.redraw(false);
					},
					'mouseup touchend': function () {
						$(document).unbind('.hc');
					}
				});
			});
		}

		function makeNew3dChart(data) {
			if(current3dChart) {
				current3dChart.destroy();
			}

			if(!alphaOn3dGraph && !betaOn3dGraph) {
				alphaOn3dGraph = 10;
				betaOn3dGraph = 30;
			}

			current3dChart = new Highcharts.Chart({
				chart: {
					renderTo: 'volcano-chart',
					margin: 100,
					type: 'scatter',
					options3d: {
						enabled: true,
						alpha: alphaOn3dGraph,
						beta: betaOn3dGraph,
						depth: 275,
						viewDistance: 5,

						frame: {
							bottom: { size: 1, color: 'rgba(0,0,0,0.02)' },
							back: { size: 1, color: 'rgba(0,0,0,0.04)' },
							side: { size: 1, color: 'rgba(0,0,0,0.06)' }
						}
					},
					height: window.innerHeight - 160,
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
					text: null
				},
				plotOptions: {
					scatter: {
						animation: false,
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

			registerClickEventOnChart(current3dChart);
		}

		function makeNew2dChart(data) {
			if(current2dChart) {
				current2dChart.destroy();
			}

			current2dChart = new Highcharts.Chart({
				chart: {
					renderTo: "volcano-chart-satellite",
					type: "scatter",
					events: {
						load: function() {
							this.renderer.image("http://maps.googleapis.com/maps/api/staticmap?center=64.775,-17&zoom=7&size=320x320&maptype=satellite", 57, 10, 260, 260).add();
						}
					},
					width: 320,
					height: 320,
				},
				title: {
					text: null
				},
				xAxis: {
					min: -18.74489,
					tickInterval: 1,
					max: -15.24208,
					title: {
						enabled: true,
						text: 'Longitude'
					},
					startOnTick: false,
					endOnTick: false,
					showLastLabel: false
				},
				yAxis: {
					min: 64.015257,
					tickInterval: 0.5,
					max: 65.522508,
					title: {
						text: 'Latitude'
					},
					startOnTick: false,
					endOnTick: false,
					showLastLabel: false
				},
				legend: {
					enabled: false
				},
				plotOptions: {
					scatter: {
						marker: {
							states: {
								hover: {
									enabled: false,
								}
							}
						}
					}
				},
				tooltip: {
					formatter: function () {
						var result = "";
		
						result += "<p><strong>Happened</strong> " + this.point.timeAgo + ", ";
						result += "<strong>magnitude</strong> " + this.point.richter + "</p>, ";
						result += "<strong>depth</strong> " + this.point.depth + "km</p> ";

						return result;
					}
				},
				series: [{
					name: 'Earthquakes',
					color: 'rgba(223, 83, 83, .5)',
					data: data,
					turboThreshold: 13337
				}]
			});
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