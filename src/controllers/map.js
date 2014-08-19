app.controller("MapController", [
	"$scope", 
	"EarthquakeService",
	"$timeout",
	function($scope, EarthquakeService, $timeout) {
		var earthquakes = {};
		var currentChart;

		$scope.numberOfEarthquakesDisplayedInTable = 50;
		$scope.graphDisplayHours = 16;
		$scope.refreshRate = 60;

		$scope.earthquakes = [];

		function sortEarthquakes(a, b) {
			return a.occuredAt < b.occuredAt;
		}

		function earthquakeOccuredInLessThanHours(earthquake, hours, now) {
			var hoursInMs = hours * 3600 * 1000;
			var hoursAgo = now - hoursInMs;

			if(earthquake.occuredAt >= hoursAgo) {
				return true;
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
			redrawTimeout = $timeout(redrawWithFilter, 1500);
		};

		function getChartCoordinatesForEarthquakes(data) {
			//data = data.sort(sortEarthquakes);

			var nowInUnixTime = new Date().getTime();

			var result = [];
			for(var i = 0; i < data.length; ++i) {
				var currentEarthquake = data[i];

				if(earthquakeOccuredInLessThanHours(currentEarthquake, $scope.graphDisplayHours, nowInUnixTime)) {
					result.push({
						x: currentEarthquake.longitude, 
						y: currentEarthquake.depth, 
						z: currentEarthquake.latitude,
						richter: currentEarthquake.size,
						timeAgo: $scope.timeSince(currentEarthquake.occuredAt),
						marker: {
							fillColor: currentEarthquake.color(nowInUnixTime),
							lineColor: "#123F3F",
							lineWidth: 1,
							radius: Math.pow(0.5 + currentEarthquake.size, 2.7),
						}
					});
				}
			}

			return result;
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

		function registerNewEarthquakes(data) {
			for(var i = 0; i < data.length; ++i) {
				var currentEarthquake = data[i];

				if(earthquakes[currentEarthquake.occuredAt] === undefined) {
					$scope.earthquakes.push(currentEarthquake);
					earthquakes[currentEarthquake.occuredAt] = currentEarthquake;
					updateLimits(currentEarthquake.latitude, currentEarthquake.longitude, currentEarthquake.depth);
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
			}

			registerNewEarthquakes(data);

			return result;
		}

		function getEarthquakes() {
			EarthquakeService.getEarthquakes().then(function(data) {
				if(data.length > 0) {
					var quakes = newEarthquakes(data);
					if(quakes.length > 0) {
						console.log("New earthquakes detected from last update. Redrawing chart.");

						addEarthquakesToChart(quakes);
					}

					$timeout(getEarthquakes, $scope.refreshRate * 1000);
				}
			});
		}

		$scope.loading = true;
		function init() {
			EarthquakeService.getEarthquakes().then(function(data) {
				if(data.length > 0) {
					var quakes = newEarthquakes(data);
					makeNewChart([]);
					if(quakes.length > 0) {
						addEarthquakesToChart(quakes, true);
					}

					$scope.loading = false;
					$timeout(getEarthquakes, $scope.refreshRate * 1000);
				}
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
						depth: 250,
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
						result += "<strong>size</strong> " + this.point.richter + "</p>";

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
					gridLineWidth: 1
				},
				zAxis: {
					labels: {
						enabled: true
					},
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