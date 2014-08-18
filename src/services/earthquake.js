app.factory("EarthquakeService", [
    "$http",
    function($http) {
        return {
            getEarthquakes: function(data) {
                return $http.get("http://apis.is/earthquake/is").then(
                    function(response) {
                        var earthquakes = [];

                        if(response.status === 200) {
                            for(var i = 0; i < response.data.results.length; ++i) {
                                var currentEarthquakeData = response.data.results[i];
                                var earthquake = new Earthquake(currentEarthquakeData);
                                if(earthquake.isValid()) {
                                    earthquakes.push(new Earthquake(currentEarthquakeData));
                                }
                            }
                        }
                        
                        return earthquakes;
                    }
                );
            }
        }
    }
]);