app.controller("VisualizationController", [
	"$scope",
	"$timeout",
	"EarthquakeService",
	function($scope, $timeout, EarthquakeService) {
		$scope.loading = true;

		var scene, renderer, camera, controls, projector, raycaster;
		var mouse = {
			x: 0,
			y: 0
		};
		var iceland;
		var icelandLoaded = false;

		var pointClouds;

		var earthquakes = {};

		$scope.hoursBack = 48;
		function getLatestEarthquakes() {
			earthquakeLimitTimeout = undefined;
			EarthquakeService.getEarthquakesLastHours($scope.hoursBack, true).then(function(data) {
				var quakes = data;
				for(var i = 0; i < quakes.length; ++i) {
					var quake = quakes[i];

					earthquakes[quake.occuredAt] = quake;
				}

				addEarthquakes(quakes);
			});
		}

		var earthquakeLimitTimeout;
		$scope.earthquakeLimitChanged = function() {
			if(earthquakeLimitTimeout) {
				$timeout.cancel(earthquakeLimitTimeout);
			}
			earthquakeLimitTimeout = $timeout(getLatestEarthquakes, 1000);
		};

		var LONGITUDE_MIN = -25.6;
		var LONGITUDE_MAX = -12.49595;
		var LONGITUDE_DIFF = Math.abs(LONGITUDE_MAX - LONGITUDE_MIN);
		var LONGITUDE_MID_POINT = LONGITUDE_MIN + (LONGITUDE_DIFF / 2);

		var LATITUDE_MIN = 62.35;
		var LATITUDE_MAX = 67.638815;
		var LATITUDE_DIFF = Math.abs(LATITUDE_MAX - LATITUDE_MIN);
		var LATITUDE_MID_POINT = LATITUDE_MIN + (LATITUDE_DIFF / 2);

		var HEIGHT_MAP = [];
		var ICELAND_MIN_BOUND = -2.5;
		var HEIGHT_MAP_PRECISION = 100;

		function createHeightmapReference(iceland) {
			for(var i = 0; i < iceland.geometry.vertices.length; ++i) {
				
				var currentVertex = iceland.geometry.vertices[i];

				// Reduce accuracy - no need for all decimal places since the map of iceland is so big
				var x = parseFloat(parseInt((currentVertex.x * HEIGHT_MAP_PRECISION), 10), 10) / HEIGHT_MAP_PRECISION;
				var z = parseFloat(parseInt((currentVertex.z * HEIGHT_MAP_PRECISION), 10), 10) / HEIGHT_MAP_PRECISION;

				if(HEIGHT_MAP[x] === undefined) {
					HEIGHT_MAP[x] = [];
				}

				HEIGHT_MAP[x][z] = currentVertex.y;
			}
		}

		function longitudeToXCoordinate(longitude) {
			if(longitude === LONGITUDE_MID_POINT) {
				return 0;
			}

			var diff = Math.abs(longitude - LONGITUDE_MIN);
			var ratio = diff / LONGITUDE_DIFF;

			return -8 + (ratio * 16);
		}

		function latitudeToYCoordinate(latitude) {
			if(latitude === LATITUDE_MID_POINT) {
				return 0;
			}
			
			var diff = latitude - LATITUDE_MIN;
			var ratio = diff / LATITUDE_DIFF;

			return - (-8 + (ratio * 16));
		}

		function mapCoordinatesToVector2(long, lat) {
			return {
				x: longitudeToXCoordinate(long),
				z: latitudeToYCoordinate(lat)
			};
		}

		function sortEarthquakesBySize(a, b) {
			return a.size - b.size;
		}

		function getMapHeightAtLocation(x, z) {
			x = x / 3;
			z = z / 3;

			x = parseFloat(parseInt((x * HEIGHT_MAP_PRECISION), 10), 10) / HEIGHT_MAP_PRECISION;
			z = parseFloat(parseInt((z * HEIGHT_MAP_PRECISION), 10), 10) / HEIGHT_MAP_PRECISION;

			var height;
			if(HEIGHT_MAP[x]) {
				height = HEIGHT_MAP[x][z];
			}

			if(height === undefined) {
				return 0;
			}
			else {
				return height * 3;
			}
		}

		function addEarthquakeToPointCloud(earthquake, indexInCloud, geometry, colors, nowInUnixtime) {
			var coordinates = mapCoordinatesToVector2(earthquake.longitude, earthquake.latitude);
			var depth = ((15 / 610) * earthquake.depth);

			var mapHeightAtLocation = getMapHeightAtLocation(coordinates.x, coordinates.z);

			var pX = coordinates.x;
			var pY = mapHeightAtLocation - depth;
			var pZ = coordinates.z;
			var particle = new THREE.Vector3(pX, pY, pZ);

			particle.isEarthquake = true;
			particle.earthquakeId = earthquake.occuredAt;

			geometry.vertices.push(particle);
			colors[indexInCloud] = new THREE.Color(earthquake.colorHex(nowInUnixtime));
		}

		function createPointcloudFromEarthquakeInformation(magnitudeLimit, geometry, colors) {
			geometry.colors = colors;
			var pMaterial = new THREE.PointCloudMaterial({
				size: 0.008 + (Math.pow(0.3 + magnitudeLimit, 3.5) / 1000),
				map: THREE.ImageUtils.loadTexture("img/quake.png"),
				vertexColors: true,
				transparent: true,
				alphaTest: 0.5,
			});
			return new THREE.PointCloud(geometry, pMaterial);
		}

		function createPointCloudsFromEarthquakes(quakes, start, stepSize) {
			var now = new Date().getTime();

			var sortedEarthquakes = quakes.sort(sortEarthquakesBySize);
			var pointClouds = [];

			var currentPointCloudGeometry = new THREE.Geometry();
			var currentPointCloudColors = [];
			var earthquakeIndexInPointCloud = 0;

			var largestEarthquakeSize = sortedEarthquakes[sortedEarthquakes.length-1].size;
			var earthquakeIndexToStartAt = 0;

			var currentMagnitudeLimit;
			for(currentMagnitudeLimit = start; currentMagnitudeLimit <= largestEarthquakeSize; currentMagnitudeLimit += stepSize) {
				for(var i = earthquakeIndexToStartAt; i < sortedEarthquakes.length; ++i) {
					var currentEarthquake = sortedEarthquakes[i];
					var quakeMagnitude = currentEarthquake.size;

					if(quakeMagnitude <= currentMagnitudeLimit) {
						addEarthquakeToPointCloud(currentEarthquake, earthquakeIndexInPointCloud, currentPointCloudGeometry, currentPointCloudColors, now);
						++earthquakeIndexInPointCloud;
					}
					// We need to raise the limit since the magnitude of the current earthquake is larger than the limit
					else if(quakeMagnitude > currentMagnitudeLimit) {
						if(currentPointCloudColors.length > 0) {
							var pointCloud = createPointcloudFromEarthquakeInformation(currentMagnitudeLimit, currentPointCloudGeometry, currentPointCloudColors);
							pointClouds.push(pointCloud);

							currentPointCloudGeometry = new THREE.Geometry();
							currentPointCloudColors = [];
							earthquakeIndexInPointCloud = 0;
						}

						// Start right at this index to save time - earthquakes are all sorted so we can do that
						earthquakeIndexToStartAt = i;

						// If this is the correct limit to place the current earthquake in

						if(quakeMagnitude - stepSize <= currentMagnitudeLimit) {
							addEarthquakeToPointCloud(currentEarthquake, earthquakeIndexInPointCloud, currentPointCloudGeometry, currentPointCloudColors, now);
							++earthquakeIndexInPointCloud;
						}
						break;
					}
				}
			}

			// Remember to create the cloud with the biggest earthquakes
			if(currentPointCloudColors.length > 0) {
				var pointCloud = createPointcloudFromEarthquakeInformation(currentMagnitudeLimit, currentPointCloudGeometry, currentPointCloudColors);
				pointClouds.push(pointCloud);
			}

			return pointClouds;
		}

		function removeCurrentEarthquakes() {
			if(pointClouds) {
				for(var i = 0; i < pointClouds.length; ++i) {
					var currentCloud = pointClouds[i];
					scene.remove(currentCloud);
					delete currentCloud;
				}
				delete pointClouds;
			}
		}

		function addEarthquakes(quakes) {
			removeCurrentEarthquakes();

			pointClouds = createPointCloudsFromEarthquakes(quakes, 0.4, 0.1);
			for(var i = 0; i < pointClouds.length; ++i) {
				scene.add(pointClouds[i]);
			}

			$scope.numberOfEarthquakes = quakes.length;
			//addRandomQuake();
		}

		function loadIcelandModel(scale) {
			if(!scale) {
				scale = 1;
			}
			var loader = new THREE.JSONLoader();

			loader.load("models/iceland.js", function (geometry) {
				var material = new THREE.MeshLambertMaterial({
					map: THREE.ImageUtils.loadTexture("models/iceland.png"),
					colorAmbient: [0.480000026226044, 0.480000026226044, 0.480000026226044],
					colorDiffuse: [0.480000026226044, 0.480000026226044, 0.480000026226044],
					colorSpecular: [0.8999999761581421, 0.8999999761581421, 0.8999999761581421]
				});

				iceland = new THREE.Mesh(
					geometry,
					material
				);

				iceland.scale.x = iceland.scale.y = iceland.scale.z = scale;

				scene.add(iceland);

				icelandLoaded = true;
				iceland.material.side = THREE.DoubleSide;
				iceland.material.transparent = true;
				iceland.material.opacity = 0.7;
				iceland.material.needsUpdate = true;

				createHeightmapReference(iceland);

				controls.addEventListener('change', render);

				getLatestEarthquakes();
				$scope.loading = false;
				$scope.$apply();
			});
		}

		function render() {
			renderer.render(scene, camera);
		}

		function newActiveEarthquake(active) {
			var previous = $scope.earthquakeActive;
			$scope.earthquakeActive = active;

			if(previous !== active) {
				$scope.activeEarthquake = earthquakes[$scope.earthquakeActive];
				$scope.$apply();
			}
		}

		var clock;
		var timeSinceLastIntersectionCheck = 0;
		function checkIfEarthquakeIsBeingHovered() {
			var vector = new THREE.Vector3(mouse.x, mouse.y, 1);

			projector.unprojectVector( vector, camera );

			raycaster.ray.set(camera.position, vector.sub(camera.position).normalize());

			var intersections;
			if(timeSinceLastIntersectionCheck > 15 && pointClouds) {
				intersections = raycaster.intersectObjects(pointClouds);
			}
			if(intersections) {
				var intersection;
				if(intersections.length > 0) {
					intersection = intersections[intersections.length - 1];
				}

				if(intersection) {
					var vertices = intersection.object.geometry.vertices;
					var vertex = vertices[intersection.index];

					newActiveEarthquake(vertex.earthquakeId);
					timeSinceLastIntersectionCheck = 0;
				}
			}
			else {
				if ($scope.earthquakeActive) {
					$scope.earthquakeActive = undefined;
					$scope.$apply();
				}
			}

			timeSinceLastIntersectionCheck += clock.getDelta();
		}
		function visualizationLoop() {
			if(icelandLoaded) {
				controls.update();

				camera.updateProjectionMatrix(true);
			}
			render();

			requestAnimationFrame(function(){
				visualizationLoop();
			});
		}

		function updateMousePosition(event) {
			event.preventDefault();

			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
		}

		function resizeScene() {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();

			renderer.setSize( window.innerWidth, window.innerHeight );
		}

		function setUpScene() {
			clock = new THREE.Clock();

			renderer = new THREE.WebGLRenderer();
			renderer.setClearColor(0x000000);
			renderer.setSize(window.innerWidth, window.innerHeight);
			document.body.appendChild(renderer.domElement);

			scene = new THREE.Scene();

			camera = new THREE.PerspectiveCamera(
				60,         // Field of view
				window.innerWidth / window.innerHeight,  // Aspect ratio
				.1,         // Near
				10000       // Far
			);

			camera.position.set(6, 2, 3);

			controls = new THREE.OrbitControls(camera);
			controls.target = new THREE.Vector3( 2.7, -0.2, 0.5 );

			loadIcelandModel(3);

			var sunlight = new THREE.PointLight(0xffffff, 1);
			sunlight.position.set(10, 100, 10);
			scene.add(sunlight);

			var magmalight0 = new THREE.PointLight(0xffffff, 0.5);
			magmalight0.position.set(0, -2, 0);

			scene.add(magmalight0);

			projector = new THREE.Projector();
			raycaster = new THREE.Raycaster();

			window.addEventListener("resize", resizeScene, false);
			window.addEventListener("mousemove", updateMousePosition, false );

			var sphereGeometry = new THREE.SphereGeometry( 0.01, 0.01, 0.01 );
			var sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, shading: THREE.FlatShading } );

			visualizationLoop();
		}

		if(!Detector.webgl) {
			$scope.hasWebGl = false;
			Detector.addGetWebGLMessage();
		}
		else {
			$scope.hasWebGl = true;
			setUpScene();
		}
	}
]);