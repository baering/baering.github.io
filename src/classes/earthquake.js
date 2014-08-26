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
	if(this.latitude >= 64.35 && this.latitude <= 65.2) {
		if(this.longitude >= -18 && this.longitude <= -16) {
			return true;
		}
	}
	return false;
};

Earthquake.prototype.color = function(now) {
	var diff = now - this.occuredAt;
	var hours = diff / (60 * 60 * 1000);
	var opacity = 0.75;

	if(hours <= 4) {
		return "rgba(255,0,0," + opacity + ")";
	}
	else if(hours <= 12) {
		return "rgba(255, 102, 0," + opacity + ")";
	}
	else if(hours <= 24) {
		return "rgba(255, 255, 0," + opacity + ")";
	}
	else if(hours <= 36) {
		return "rgba(51, 102, 204," + opacity + ")";
	}
	else {
		return "rgba(0, 0, 102," + opacity + ")";
	}
};