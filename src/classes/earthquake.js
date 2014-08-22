function Earthquake(data) {
	this.occuredAt = new Date(parseInt(data.date * 1000)).getTime(); // used as a key
	this.latitude = parseFloat(data.lat);
	this.longitude = parseFloat(data.long);
	this.depth = parseFloat(data.depth);
	this.size = parseFloat(data.size);
	this.verified = data.verified;

	var humanReadable = "";
	humanReadable += data.loc_dist + " ";
	humanReadable += data.loc_dir + " ";
	humanReadable += data.loc_name + " ";
	this.humanReadableLocation = humanReadable;
	
	this.quality = data.quality;
}

// Checking if gps coordinates are near Bardarbunga
Earthquake.prototype.isFromBardarbunga = function() {
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