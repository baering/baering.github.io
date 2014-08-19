function Earthquake(data) {
	this.occuredAt = new Date(data.timestamp).getTime(); // notað sem lykill líka
	this.latitude = parseFloat(data.latitude);
	this.longitude = parseFloat(data.longitude);
	this.depth = parseFloat(data.depth);
	this.size = parseFloat(data.size);
	this.humanReadableLocation = data.humanReadableLocation;
	this.quality = data.quality;
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

Earthquake.prototype.color = function(now) {
	var diff = now - this.occuredAt;
	var hours = diff / (60 * 60 * 1000);

	if(hours <= 4) {
		return "#f00";
	}
	else if(hours <= 12) {
		return "#f60";
	}
	else if(hours <= 24) {
		return "#ff0";
	}
	else if(hours <= 36) {
		return "#36c";
	}
	else {
		return "#006";
	}
};