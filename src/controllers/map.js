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

		function get3dCoordinatesAs2d(data) {
			var result = [];

			for(var i = 0; i < data.length; ++i) {
				var currentCoordinate = data[i];

				var coordinate = {
					x: currentCoordinate.x,
					y: latitudeLimits.min + (latitudeLimits.max - currentCoordinate.z),
					depth: currentCoordinate.y,
					richter: currentCoordinate.richter,
					timeAgo: currentCoordinate.timeAgo,
					marker: angular.copy(currentCoordinate.marker)
				}

				coordinate.marker.radius = 1 + (coordinate.richter / 6) * 8;
				
				result.push(coordinate);
			}

			return result;
		}

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

						addEarthquakesToChart(quakes);
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

		function makeNew3dChart(data) {
			if(current3dChart) {
				current3dChart.destroy();
			}

			current3dChart = new Highcharts.Chart({
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