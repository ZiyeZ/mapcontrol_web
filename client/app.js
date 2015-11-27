(function (window, $, Utils, Configs) {
	var map = L.map('map', {maxZoom: 19, minZoom: 10}).setView([43.6, -79.6], 12);
 
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoieml5ZXoiLCJhIjoiMjUzMDkyNDBiOTEwYTgxZjBmZjg1YjM1Zjg1NmVjODEifQ.vEdtm3GsRSpabmqh4okspQ', {
	    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
	    maxZoom: 18,
	    id: Configs.mapbox_id,
	    accessToken: Configs.mapbox_token
	}).addTo(map);

	var washers = [];
	var requests = [];
	var washer_group = new L.FeatureGroup();
	var request_group = new L.FeatureGroup();
	var polyline;
	var selectedWasher, selectedRequest;
	var filterWasherStatus = filterRequestStatus = 'All';
	var send_api;
	var washerNames = {};

	var repeatUpdate;

	var WasherMarker = L.Marker.extend({
		initialize: function (data, options) {
			L.setOptions(this, options);
			this._latlng = L.latLng([data.current_latitude, data.current_longitude]);
			this._data = data;
		},
		washer_info: function() {
			return this._data;
		}
	});

	var RequestMarker = L.Marker.extend({
		initialize: function (data, options) {
			L.setOptions(this, options);
			this._latlng = L.latLng([data.address_latitude, data.address_longitude]);
			this._data = data;
		},
		request_info: function() {
			return this._data;
		}
	});

	var CustomIcon = L.Icon.extend({
	    options: {
	        shadowUrl: Configs.leaflet_image_path + 'marker-shadow.png',
	        shadowSize: [40, 40],
	        shadowAnchor: [11, 42],
	        iconSize: [32,37],
	        iconAnchor: [16, 37]
	    }
	});

	var updateWashers = function() {
		$.get("/update_washers", function(data) {
			if(data && data.length > 0) {
				map.removeLayer(washer_group);
				washer_group.clearLayers();

				selectedWasher = null;
				for (var i = 0; i < data.length; i++) {
					if(filterWasher(data[i])) {
						var washer_name = data[i].driver_name;
						washers[i] = new WasherMarker(data[i], {riseOnHover:true, title:'ID: ' + data[i].driver_id});
						washers[i].bindPopup(L.popup().setContent(washer_name), {autoPan: false, closeButton: false});
						washer_group.addLayer(washers[i].on('click', onClickWasher));
						if($('#washer_info').is(":visible") && $('#washer_info_name').text() === washer_name) {
							updateWasherInfo(washers[i].washer_info());
							// map.panTo(washers[i].getLatLng());
							selectedWasher = washers[i];
						}
						washerNames[data[i].driver_id] = washer_name;
					}
				}

				map.addLayer(washer_group);
				if (selectedWasher) { 
					selectedWasher.openPopup(); 
				} else {
					$('#washer_info').hide();
				}
			}
			else {
				console.log("could not get washers data from server");
			}
		})
	};

	var updateRequests = function() {
		$.get("/update_requests", function(data) {
			if(data && data.length > 0) {
				map.removeLayer(request_group);
				request_group.clearLayers();

				selectedRequest = null;
				for (i = 0; i < data.length; i++) {
					if(filterRequest(data[i])) {
						var request_address = data[i].address_string;
						if(request_address.indexOf(',') > 0) {
							request_address = request_address.substring(0, request_address.indexOf(','));
						}
						var transaction = data[i].transaction_id.toString();
						requests[i] = new RequestMarker(data[i], {riseOnHover:true, title:request_address});
						requests[i].setIcon(new CustomIcon({iconUrl: Configs.leaflet_image_path + Configs.marker_icon_map[data[i].service_type]}));
						requests[i].bindPopup(L.popup().setContent(transaction), {offset: [0, -20], autoPan: false, closeButton: false, minWidth: 10});
						request_group.addLayer(requests[i].on('click', onClickRequest));
						if($('#request_info').is(":visible") && $('#request_info_id').text() === transaction) {
							updateRequestInfo(requests[i].request_info());
							selectedRequest = requests[i];
						}
					}
				}

				map.addLayer(request_group);
				if (selectedRequest) { 
					selectedRequest.openPopup(); 
				} else {
					$('#request_info').hide();
				}
				if($('#showIDToggle').prop('checked')) {
					showPopups();
				}
			}
			else {
				console.log("could not get requests data from server");
			}
		})
	}

	var showPopups = function() {
		for(var i = 0; i < requests.length; i++) {
			if(requests[i]) {
				requests[i].openPopup();
			}
		}
	}
	var closePopups = function() {
		for(var i = 0; i < requests.length; i++) {
			if(requests[i]) {
				requests[i].closePopup();
			}
		}
	}

	var filterWasher = function(washerData) {
		var filterStatus = (filterWasherStatus === 'All' || filterWasherStatus === Configs.washer_status[washerData.current_status]);
		var filterReal = washerData.email.length <= 2;
		return filterStatus && filterReal;
	}

	var filterRequest = function(requestData) {
		var filterStatus = (filterRequestStatus === 'All' || filterRequestStatus === Configs.request_status[requestData.status]);
		
		var filterDates = function() {
			var startDate = $('#datepicker_start').datepicker('getDate');
			var endDate = $('#datepicker_end').datepicker('getDate');
			endDate.setDate(endDate.getDate() + 1);
			var requestDate  = new Date(Date.parse(requestData.estimate_start_time));
			return requestDate >= startDate && requestDate <= endDate;
		}();
		var filterShowCancelled = function() {
			if(Configs.request_status[requestData.status] === 'Cancelled') {
				return $('#showCancelledToggle').prop('checked');
			} else {
				return true;
			}
		}();
		var filterHours = function() {
			var hourStart = $('#hour_range_start').text();
			hourStart = parseInt(hourStart.substring(0, hourStart.indexOf(':')));
			var hourEnd = $('#hour_range_end').text();
			hourEnd = parseInt(hourEnd.substring(0, hourEnd.indexOf(':')));

			var requestDate  = new Date(Date.parse(requestData.estimate_start_time));
			var requestHour = requestDate.getHours();

			// alert('hourStart: ' + hourStart + '\nhourEnd' + hourEnd + '\nRequestHour' + requestHour);
			var filterStart = !hourStart || requestHour >= hourStart;
			var filterEnd   = !hourEnd   || requestHour <= hourEnd;

			return filterStart && filterEnd;
		}();

		return filterStatus && filterDates && filterShowCancelled && filterHours;
	}

	var onClickWasher = function (e) {
		if(selectedWasher) {
			selectedWasher.closePopup();
		}
		map.panTo(this.getLatLng());
		$('#washer_info').show();
		updateWasherInfo(this.washer_info());

		selectedWasher = this;

		map.removeLayer(polyline);
	};

	var onClickRequest = function (e) {
		// if(selectedRequest) {
		// 	selectedRequest.closePopup();
		// }
		// if(!$('#showIDToggle').prop('checked')) {
		// 	closePopups();
		// 	this.openPopup();
		// }
		
		// map.panTo(this.getLatLng());
		// $('#request_info').show();
		// updateRequestInfo(this.request_info());

		// selectedRequest = this;
		// this.openPopup();
		// map.removeLayer(polyline);
		goToRequest(this);
	}

	var onClickMap = function (e) {
		$('#washer_info').hide();
		$('#request_info').hide();
		selectedWasher = null;
		selectedRequest = null;

		map.removeLayer(polyline);
	};

	var goToRequest = function(request) {
		if(!$('#showIDToggle').prop('checked')) {
			closePopups();
			// request.openPopup();
		}
		
		map.panTo(request.getLatLng());
		$('#request_info').show();
		updateRequestInfo(request.request_info());

		selectedRequest = request;
		request.openPopup();
		map.removeLayer(polyline);
	}

	var updateWasherInfo = function(info) {
		// var timeSince = Utils.dateDiff(new Date(), new Date(Date.parse(info.last_update)));
		var date = new Date(Date.parse(info.last_update));

		$('#washer_info_name').text(info.driver_name);
		$('#washer_info_phone').text(info.driver_phone);
		$('#washer_info_status').text(Configs.washer_status[info.current_status]);
		// $('#washer_info_time').text(date.toISOString().slice(0,16).replace('T'," "));
		$('#washer_info_time').text(date.toLocaleString().replace(/:\d\d/g, ''));

		if(Configs.washer_status[info.current_status] === 'Online') {
			$('#assign_button').prop('disabled', false);
		} else {
			$('#assign_button').prop('disabled', true);
		}

	};

	var updateRequestInfo = function(info) {
		//var timeSince = Utils.dateDiff(new Date(), new Date(Date.parse(info.time_created)));
		var date = new Date(Date.parse(info.estimate_start_time));

		$('#request_info_address').text(info.address_string);
		$('#request_info_name').text(info.first_name + ' ' + info.last_name);
		$('#request_info_washer').text(washerNames[info.driver_id]);
		$('#request_info_phone').text(info.phone_number);
		$('#request_info_car').text(info.car_color + ' ' + info.car_make + ' ' + info.car_model);
		$('#request_info_plate').text(info.car_plate);
		$('#request_info_service').text(info.service_type);
		$('#request_info_status').text(Configs.request_status[info.status]);
		$('#request_info_time').text(date.toLocaleString().replace(/:00/g, ''));
		// $('#request_info_time').text(date.toISOString().slice(0,16).replace('T'," "));

		$('#info_row_address').hide();
	};

	var searchRequests = function(field, value) {
		// alert(field + ", " + value);
		var results = [];
		for(var i = 0; i < requests.length; i++) {
			if(requests[i]) {
				var requestInfo = requests[i].request_info();
				console.log(requestInfo[field] + ', ' + value);
				if(requestInfo[field] && requestInfo[field].toString() === value) {
					results.push(requests[i]);
				}
			}
		}
		if(results.length === 0) {
			alert('No match');
		}
		else if(results.length === 1) {
			goToRequest(results[0]);
		}
	}

	var populateHourList = function(lst) {
		for(var i in lst) {
			var li = '<li><a href="#">';
			$("#hour_start_dropdown").append(li.concat(lst[i]));
			$("#hour_end_dropdown").append(li.concat(lst[i]));
		}

		$("#hour_start_dropdown li a").click(function(){
	      var value = $(this).text();
	      $('#hour_range_start').text(value);
	      updateRequests();
	    });
	    $("#hour_end_dropdown li a").click(function(){
	      var value = $(this).text();
	      $('#hour_range_end').text(value);
	      updateRequests();
		});
	}

	var drawLine = function(pt1, pt2) {
		latLngs = [];
		latLngs.push(pt1);
		latLngs.push(pt2);

		polyline = L.polyline(latLngs, {color: 'blue'});
		map.addLayer(polyline);
	}

	var initializeFields = function() {
		var today = new Date();
		var defaultDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		$('#datepicker_start').datepicker('update', defaultDate);
		$('#datepicker_end').datepicker('update', defaultDate);

		populateHourList(_.map(Configs.available_times, function(n) { return n + ':00'}));
	}

	$('#washer_info').click(function() {
		if(selectedWasher) {
			map.panTo(selectedWasher.getLatLng());
		}
	});

	$('#request_info').click(function() {
		if(selectedRequest) {
			map.panTo(selectedRequest.getLatLng());
		}
	});

	$('#assign_button').click(function(){
		if(selectedRequest == null) {
			alert('please select a request');
		}
		var assign_api = Configs.server_prod + Configs.assign_api;
		$.ajax({
			url: assign_api,
			type: 'GET',
			data: {
				driver_id: selectedWasher.washer_info().driver_id,
				transaction_id: selectedRequest.request_info().transaction_id
			},
			dataType: 'json',
			success: function(res) {
				alert('assign success');
				drawLine(selectedWasher.getLatLng(), selectedRequest.getLatLng());
			},
			error: function(err) {
				alert(Configs.server_error_msg);
				console.log(err);
			}
		});
	});

	$('#text_button').click(function(){
		$('#CustomTextModal').modal('show');
		send_api = Configs.text_api;
	});

	$('#push_button').click(function(){
		$('#CustomTextModal').modal('show');
		send_api = Configs.push_api
	});

	$('#search_button').click(function(){
		$('#SearchModal').modal('show');
	});

	$('#doSearchBtn').click(function(){
		$('#SearchModal').modal('hide');
		var field = $('#searchField').text();
		var value = $('#inputSearch').val();
		searchRequests(Configs.search_field_map[field], value);
	});

	$("#sendTextBtn").click(function() {
		var textMsg = $('#inputMessage').val();
		var push_api = Configs.server_prod + send_api;
		$.ajax({
			url: push_api,
			type: 'GET',
			data: {
				transaction_id: selectedRequest.request_info().transaction_id,
				message: textMsg
			},
			dataType: 'json',
			success: function(res) {
				$('#CustomTextModal').modal('hide');
				alert('Message Sent');
			},
			error: function(err) {
				$('#CustomTextModal').modal('hide');
				alert(Configs.server_error_msg);
				console.log(err);
			}
		});
	});

	$("#washer_status_dropdown li a").click(function(){
	      filterWasherStatus = $(this).text();
	      $('#washer_status_filter').text('Washer: ' + filterWasherStatus);
	      updateWashers();
	});

	$("#request_status_dropdown li a").click(function(){
	      filterRequestStatus = $(this).text();
	      $('#request_status_filter').text('Request: ' + filterRequestStatus);
	      updateRequests();
	});

	$("#date_filter_dropdown li a").click(function(){
	      var field = $(this).text();
	      if($('#request_date_filter').text() != field) {
	      	$('#request_date_filter').text(field);
	      	var status = $('#datepicker_end').prop('disabled');
	      	$('#datepicker_end').prop('disabled', !status);
	      }
	});

	$("#default_msg_dropdown li a").click(function(){
	      var message = $(this).text();
	      $('#inputMessage').val(message);
	});

	$("#search_field_dropdown li a").click(function(){
	      var field = $(this).text();
	      $('#searchField').text(field);
	});

	$("#set_status_dropdown li a").click(function(){
	      var statusString = $(this).text();
	      var statusID = Configs.request_status.indexOf(statusString);
	      console.log(statusID);
	      $.ajax({
			url: Configs.server_prod + Configs.set_status_api,
			type: 'GET',
			data: {
				transaction_id: selectedRequest.request_info().transaction_id,
				status: statusID
			},
			dataType: 'json',
			success: function(res) {
				alert('Status Set');
				updateRequests();
			},
			error: function(err) {
				alert(Configs.server_error_msg);
				console.log(err);
			}
		});
	});

	$('#datepicker_range').datepicker({todayBtn: "linked", autoclose: true}).on('changeDate', function(e) {
		// $(this).datepicker('hide');
		if($('#datepicker_end').prop('disabled')) {
			$('#datepicker_end').datepicker('update', e.date);
		}
		updateRequests();
	});

	$('#automaticUpdateToggle').change(function(){
		if($(this).prop('checked')) {
			repeatUpdate = setInterval(function() {
				updateWashers();
				updateRequests();
			}, Configs.update_interval);
		}
		else {
			clearInterval(repeatUpdate);
		}
	});

	$('#todayOnlyToggle').change(function(){
		updateRequests();
	});

	$('#showCancelledToggle').change(function(){
		updateRequests();
	});

	$('#showIDToggle').change(function(){
		updateRequests();
	});

	$('#washer_info').hide();
	$('#request_info').hide();

	initializeFields();
	// repeatUpdate = setInterval(function() {
	// 			updateWashers();
	// 			updateRequests();
	// 		}, Configs.update_interval);
	updateWashers();
	updateRequests();
	
	map.on('click', onClickMap);
})(window, $, Utils, Configs);


