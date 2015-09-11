var Configs = (function() {

	return {
		washer_status: ['Offline','Online','Enroute','Washing'],
		request_status:['None','Requested','Accepted','Begun','Finished','Rated','Cancelled'],
		available_times: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
		
		mapbox_id: "ziyez.c75bdcd3",
		mapbox_token: "pk.eyJ1Ijoieml5ZXoiLCJhIjoiMjUzMDkyNDBiOTEwYTgxZjBmZjg1YjM1Zjg1NmVjODEifQ.vEdtm3GsRSpabmqh4okspQ",

		server_dev:  'http://184.73.117.45/ios/server_api',
		server_prod: 'https://stampreward.com/server_api',
		text_api: '/send_text_message_by_transaction',
		push_api: '/send_push_notification_by_transaction',
		assign_api: '/assign',
		set_status_api: '/set_status',
		server_error_msg: 'Server_Error',

		update_interval: 3000,

		search_field_map: {
			'Transaction ID' : 'transaction_id',
			'Plate No.' : 'car_plate',
			'User ID' : 'user_id',
			'Car ID' : 'car_id'
		}
	}

})();