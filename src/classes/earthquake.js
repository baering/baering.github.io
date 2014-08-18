function Earthquake(data) {
	this.occuredAt = new Date(data.timestamp).getTime(); // notað sem lykill líka
	this.latitude = parseFloat(data.latitude);
	this.longitude = parseFloat(data.longitude);
	this.depth = parseFloat(data.depth);
	this.size = parseFloat(data.size);
}

// Skítamix til að athuga með Bárðarbungu
Earthquake.prototype.isValid = function() {
	if(this.latitude >= 64.35 && this.latitude <= 64.95) {
		if(this.longitude >= -17.9 && this.longitude <= -16.4) {
			return true;
		}
	}
	return false;
};

Earthquake.prototype.occuredAfter = function(timestamp) {
	var unixtime = new Date(timestamp).getTime();
	return this.occuredAt < timestamp;
};