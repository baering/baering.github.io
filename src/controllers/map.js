app.controller("MapController", [
	"$scope", 
	"EarthquakeService",
	"$timeout",
	function($scope, EarthquakeService, $timeout) {
		var earthquakes = {};
		var currentChart;

		function earthquakesToCoordinates() {
			var result = [];

			var nowInUnixTime = new Date().getTime();

			var keys = Object.keys(earthquakes);
			for(var i = 0; i < keys.length; ++i) {
				var currentEarthquake = earthquakes[keys[i]];

				result.push({
					x: currentEarthquake.longitude, 
					y: currentEarthquake.depth, 
					z: currentEarthquake.latitude,
					richter: currentEarthquake.size,
					timeAgo: moment(currentEarthquake.occuredAt).fromNow(),
					marker: {
						lineColor: "#123F3F",
						lineWidth: 1,
						radius: Math.pow(0.5 + currentEarthquake.size, 2.7),
					}
				});
			}

			return result;
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

		function addNewEarthquakes(data) {
			var changed = false;

			for(var i = 0; i < data.length; ++i) {
				var currentEarthquake = data[i];

				if(earthquakes[currentEarthquake.occuredAt] === undefined) {
					earthquakes[currentEarthquake.occuredAt] = currentEarthquake;
					updateLimits(currentEarthquake.latitude, currentEarthquake.longitude, currentEarthquake.depth);
					changed = true;
				}
			}

			return changed;
		}

		function getEarthquakes() {
			EarthquakeService.getEarthquakes().then(function(data) {
				if(data.length > 0) {
					var moreWereAdded = addNewEarthquakes(data);
					if(moreWereAdded) {
						console.log("New earthquakes detected from last update. Redrawing chart.");

						var coordinates = earthquakesToCoordinates();
						makeNewChart(coordinates);
					}

					$timeout(getEarthquakes, 30000);
				}
			});
		}
		getEarthquakes();

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
					height: window.innerHeight,
					width: window.innerHeight
				},
				tooltip: {
					formatter: function () {
						var result = "";
		
						result += "<p><strong>Happend</strong> " + this.point.timeAgo + ", ";
						result += "<strong>size</strong> " + this.point.richter + "</p>";

						return result;
					}
				},
				title: {
					text: 'Bardarbunga'
				},
				subtitle: {
					text: '3d visual - updated every 30 sec'
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
					//data: [[1, 6, 5], [8, 7, 9], [1, 3, 4], [4, 6, 8], [5, 7, 7], [6, 9, 6], [7, 0, 5], [2, 3, 3], [3, 9, 8], [3, 6, 5], [4, 9, 4], [2, 3, 3], [6, 9, 9], [0, 7, 0], [7, 7, 9], [7, 2, 9], [0, 6, 2], [4, 6, 7], [3, 7, 7], [0, 1, 7], [2, 8, 6], [2, 3, 7], [6, 4, 8], [3, 5, 9], [7, 9, 5], [3, 1, 7], [4, 4, 2], [3, 6, 2], [3, 1, 6], [6, 8, 5], [6, 6, 7], [4, 1, 1], [7, 2, 7], [7, 7, 0], [8, 8, 9], [9, 4, 1], [8, 3, 4], [9, 8, 9], [3, 5, 3], [0, 2, 4], [6, 0, 2], [2, 1, 3], [5, 8, 9], [2, 1, 1], [9, 7, 6], [3, 0, 2], [9, 9, 0], [3, 4, 8], [2, 6, 1], [8, 9, 2], [7, 6, 5], [6, 3, 1], [9, 3, 1], [8, 9, 3], [9, 1, 0], [3, 8, 7], [8, 0, 0], [4, 9, 7], [8, 6, 2], [4, 3, 0], [2, 3, 5], [9, 1, 4], [1, 1, 4], [6, 0, 2], [6, 1, 6], [3, 8, 8], [8, 8, 7], [5, 5, 0], [3, 9, 6], [5, 4, 3], [6, 8, 3], [0, 1, 5], [6, 7, 3], [8, 3, 2], [3, 8, 3], [2, 1, 6], [4, 6, 7], [8, 9, 9], [5, 4, 2], [6, 1, 3], [6, 9, 5], [4, 8, 2], [9, 7, 4], [5, 4, 2], [9, 6, 1], [2, 7, 3], [4, 5, 4], [6, 8, 1], [3, 4, 0], [2, 2, 6], [5, 1, 2], [9, 9, 7], [6, 9, 9], [8, 4, 3], [4, 1, 7], [6, 2, 5], [0, 4, 9], [3, 5, 9], [6, 9, 1], [1, 9, 2]]
				}],
			});

			registerClickEventOnChart(currentChart);
		}
	}
]);