var Utils = (function() {

	var utils = {};

	utils.dateDiff = function(date1, date2) {

		var diff_string = '';
		var diff_day = (date1 - date2)/(1000*3600*24);
		if(diff_day > 1) {
			diff_string = Math.floor(diff_day) + 'd ';
		}
		var diff_hour = (diff_day - Math.floor(diff_day)) * 24;
		if(diff_hour > 1) {
			diff_string += Math.floor(diff_hour) + 'hr ';
		}
		var diff_min = (diff_hour - Math.floor(diff_hour)) * 60;
		if(diff_min > 1) {
			diff_string += Math.floor(diff_min) + 'min ';
		}
		
		return  diff_string;
	};

	return utils;
})();