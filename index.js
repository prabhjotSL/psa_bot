'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

let rooms = {}

app.set('port', (process.env.PORT || 5000))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

app.use(express.static('audio'))
// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
	res.send('hello world i am a secret bot')
})

// for facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
		res.send(req.query['hub.challenge'])
	}
	res.send('Error, wrong token')
})

// to post data
app.post('/webhook/', function (req, res) {
	let messaging_events = req.body.entry[0].messaging
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]
		let sender = event.sender.id
		console.log(event);
		if (event.message && event.message.text) {
			// let text = event.message.text
			// if (text === 'Generic') {
			// 	sendGenericMessage(sender)
			// 	continue
			// }
			// sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))

			console.log(rooms)
			sendSenderAction(sender, "mark_seen")
			sendSenderAction(sender, "typing_on")
			sendAPICall(event.message.text, sender)

		}
		else if (event.postback) {
			let text = JSON.stringify(event.postback)
			sendSenderAction(sender, "mark_seen")
			sendSenderAction(sender, "typing_on")
			sendAPICall(text, sender)
		}
	}
	res.sendStatus(200)
})


// recommended to inject access tokens as environmental variables, e.g.
// const token = process.env.PAGE_ACCESS_TOKEN
// const token = "EAAFWMtduDzYBABWlnAZCgF2ms8wTPBrHfFUrETnlpLfNF6jZBZA80ryFPGleXS2crzx5m9r1fiUbnTstWJoI9y9OC3cK6t8IJARu6aEgyBRaBLgllEkxIpthM1S6mKGFCkb6KRh1gioeC9Q00HHGmFx06CiTshlN0leA5prwQZDZD"
const token = process.env.FB_PAGE_ACCESS_TOKEN

function sendAPICall(text, sender) {
	request({
		url: 'http://botman.ai/api/v1/send',
		method: 'POST',
		headers: {
			"api-key": "54asdkj1209nksnda"
		},
		json: {
			// bot_id: "583a94490ffe3461496a8f4c", // PSA bot
			bot_id: "584e90ca275cbe37db390ffa", // Barclays bot
			consumer: {
				facebookId: sender
			},
			msg: text,
			type: "human",
			platform: "facebook",
			room_id: rooms[sender] ? rooms[sender] : null
		}
	}, function(error, response, body) {
		sendSenderAction(sender, "typing_off")
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		} else if (!error && response.statusCode == 200) {
			console.log(body) // Show the HTML for the Google homepage.

			if(!rooms[body.consumer.facebookId]) {
				rooms[body.consumer.facebookId] = body.room._id // This has to be stored and retrieved from Mongo and not in Memory.
			}
			if(body.generated_msg) {
				if(body.generated_msg.type) {
					if(body.generated_msg.type == "facebook_button") {
						sendDynamicMessage(sender, body.generated_msg.buttons)
					} // other cases come here like audio, quick_reply, etc.
					else if(body.generated_msg.type == "facebook_text") {
						sendTextMessage(sender, body.generated_msg.text, true)
						if(body.generated_msg.audio) {
							sendAudioMessage(sender, body.generated_msg.audio)
						}
					}
					else if(body.generated_msg.type == "facebook_audio") {
						sendTextMessage(sender, body.generated_msg.text)
						sendAudioMessage(sender, body.generated_msg.audio)
					}
				} else {
					sendTextMessage(sender, body.generated_msg)
				}
			} else {
				sendTextMessage(sender, "No Response")
			}
			// sendTextMessage(sender, body.generated_msg || "No Response")
		}
	})
}

function setPersistentMenu() {
	request({
		url: 'https://graph.facebook.com/v2.6/me/thread_settings',
		qs: {access_token:token},
		method: 'POST',
		json: {
			setting_type : "call_to_actions",
			thread_state : "existing_thread",
			call_to_actions:[
		    {
		      "type":"postback",
		      "title":"Cheque related queries",
		      "payload":"cheque"
		    },
		    {
		      "type":"postback",
		      "title":"Payment and Transactions",
		      "payload":"payments and transactions"
		    },
				{
		      "type":"postback",
		      "title":"Account related queries",
		      "payload":"account"
		    },
				{
		      "type":"postback",
		      "title":"Direct Debit",
		      "payload":"direct debit"
		    },
				{
		      "type":"postback",
		      "title":"Debit/Credit Card",
		      "payload":"card"
		    }
		  ]
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendSenderAction(sender, action) {

	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			sender_action: action
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendQuickReply(sender) {
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message:{
		    "text":"Was this answer helpful?",
		    "quick_replies":[
		      {
		        "content_type":"text",
		        "title":"Yes",
		        "payload":"yes"
		      },
		      {
		        "content_type":"text",
		        "title":"No",
		        "payload":"no"
		      }
		    ]
		  }
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendTextMessage(sender, text, quick_reply) {
	let messageData = { text:text }

	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
		if(quick_reply) {
			setTimeout(function() {
				sendQuickReply(sender)
			}, 1000)
		}
	})
}

function sendAudioMessage(sender, data) {
	let messageData = {
		"attachment": {
			"type": "audio",
			"payload": data
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendDynamicMessage(sender, data) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": data
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendGenericMessage(sender, data) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": "First card",
					"subtitle": "Element #1 of an hscroll",
					"image_url": "http://messengerdemo.parseapp.com/img/rift.png",
					"buttons": [{
						"type": "web_url",
						"url": "https://www.messenger.com",
						"title": "web url"
					}, {
						"type": "postback",
						"title": "Postback",
						"payload": "Payload for first element in a generic bubble",
					}],
				}, {
					"title": "Second card",
					"subtitle": "Element #2 of an hscroll",
					"image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
					"buttons": [{
						"type": "postback",
						"title": "Postback",
						"payload": "Payload for second element in a generic bubble",
					}],
				}]
			}
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

setPersistentMenu()

// spin spin sugar
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
