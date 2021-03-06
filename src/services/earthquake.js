app.factory("EarthquakeService", [
    "$http",
    function($http) {
        return {
            getEarthquakesLastHours: function(hours, getAllQuakes) {
                return $http.get("https://earthquakes-is.appspot.com/earthquakes").then(
                    function(response) {
                        var earthquakes = [];

                        if(response.status === 200) {
                            for(var i = 0; i < response.data.items.length; ++i) {
                                var currentEarthquakeData = response.data.items[i];
                                var earthquake = new Earthquake(currentEarthquakeData);
                                if(earthquake.isFromBardarbunga() || getAllQuakes) {
                                    earthquakes.push(earthquake);
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
