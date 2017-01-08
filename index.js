'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

let rooms = {} // {"facebook_id": {room_id: room_id, isBotEnabled: true}}

app.set('port', (process.env.PORT || 5000))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

app.use(express.static('audio'))
// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
	res.send('hello world i am a secret bot.')
})

app.post('/imichatmt', function(req, res) {
	// request for message from Agent comes here.
	console.log(req.body)
	console.log(req.headers)
	var message = req.body.channels["OTT-Messaging"].fb.text
	var psid = req.body.destination[0].psid[0]
	sendTextMessage(psid, message) // Change this PSID to PSID of the demo messenger client.
	setTimeout(function() {
		res.json({success: true})
	}, 2000)
})

app.post('/imichatclosed', function(req, res) {
	// console.log(req.headers)
	// this means that the chat has been closed in imichat and we need to reset isBotEnabled to true.
	// var chatID = req.headers["Chatid"]
	// console.log(chatID)
	rooms["1069317166466636"].isBotEnabled = true
	setTimeout(function() {
		res.json({success: true})
	}, 2000)
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
	// console.log(req);
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
			if(rooms[sender] && !rooms[sender].isBotEnabled) {
				sendSingleMessageToImichat(sender, event.message.text, rooms[sender].room_id)
			} else {
				sendSenderAction(sender, "mark_seen")
				sendSenderAction(sender, "typing_on")
				sendAPICall(event.message.text, sender)
			}

		}
		else if (event.postback) {
			let text = JSON.stringify(event.postback)
			if(rooms[sender] && !rooms[sender].isBotEnabled) {
				sendSingleMessageToImichat(sender, text)
			} else {
				sendSenderAction(sender, "mark_seen")
				sendSenderAction(sender, "typing_on")
				sendAPICall(text, sender)
			}
		}
	}
	res.sendStatus(200)
})

function sendSingleMessageToImichat(sender, message, roomId) {
	var dateMsg = new Date()
	var reqBody = {
	    "submittedOn": dateMsg.getTime(),
	    "appId": "a_20170106",
	    "ts": dateMsg.toISOString(),
	    "locale": "en_GB",
	    "psid": "1069317166466636",
	    "masterProfile": "Sandbox_cpms_1",
	    "message": message,
	    "timestamp": dateMsg.getTime().toString(),
	    "timezone": 5.5,
	    "tenant": "1",
	    "event": "MO",
	    "name": "Imimobile Hyd",
	    "gender": "male",
	    "fetchedOn": dateMsg.getTime(),
	    "tid": roomId + "_" + randomInt(0,10000000),
	    "profile_pic": "https://scontent.xx.fbcdn.net/v/t1.0-1/1918189_124190034639475_6618885323877539072_n.jpg?oh=43229a43531ce83576125f6e53cbfb23&oe=5917A3E8",
	    "channel": "fb"
	}
	var reqParams = {
		teamid: 12,
		servicekey: 'B2160D34-E8D5-4C7A-A7A4-E2367F1ED2E2'
	}
	request({
		url: 'https://notify.imichat.io/ngmp2chat/imiconnectFB.aspx',
		params: reqParams,
		headers: {
			'content-type': 'application/json'
		},
		json: reqBody
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending single message to IMIChat: ', error)
		} else if (response.body.error) {
			console.log('Error in IMIChat: ', response.body.error)
		} else if (!error && response.statusCode == 200) {
			console.log("Sent Single Message to IMIChat")
		}
	})
}

function formatMessagesForIMIChat(messages) {
	console.log("Messages: ", messages)
	var new_messages = []
    for(var i=0; i<messages.length; i++) {
      var date_iso_format = (new Date(messages[i].createdAt)).toISOString()
      var single_message = {
        date: date_iso_format
      }

      if(messages[i].userType == "bot") {
        single_message.type = "MT"
				single_message.text = messages[i].message.text // fix this.
        new_messages.push(single_message)
      } else if(messages[i].userType == "human") {
        single_message.type = "MO"
				single_message.text = messages[i].message
        new_messages.push(single_message)

        // date_agent_iso_format = (new Date(messages[i].createdAt + 2000)).toISOString()
        // var single_message = {
        //   date: date_agent_iso_format,
        //   text: messages[i].message,
        //   type: "MT"
        // }
        // new_messages.push(single_message)
      }

    }
		console.log(new_messages)
    return new_messages
}

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function sendMessagesToImichat(sender, body, messages) {
	var messages = formatMessagesForIMIChat(messages)
	var reqBody = {
	    "customerid": "",
	    "account" : "prabhjot",
	    "chatid": body.room._id + "_" + randomInt(0, 10000000),
	    "channel": "facebook",
	    "fbpageid":"1656282471307602",
	    "message": messages
	}

	request({
		url: 'https://demo.imichat.io/chatapi/createchat',
		headers: {
			'X-IMI-AUTHKEY': '67183aaf-b7e8-422e-afc3-eb4cacc214fe',
			'content-type': 'application/json'
		},
		method: 'POST',
		json: reqBody
	}, function(error, response, output) {
		console.log("GOT A RESPONSE BACK!!")
		console.log(error, response, output)
		if (error) {
			console.log('Error sending messages to IMIChat: ', error)
			sendTextMessage(sender, body.generated_msg)
		}	else {
			console.log("Sending message of customer agent back to the bot: ", body, sender)
			rooms[body.consumer.facebookId].isBotEnabled = false
			sendTextMessage(sender, body.generated_msg.text)
		}
	})
}


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
			room_id: rooms[sender] ? rooms[sender].room_id : null
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
				rooms[body.consumer.facebookId] = {}
				rooms[body.consumer.facebookId].room_id = body.room._id // This has to be stored and retrieved from Mongo and not in Memory.
				rooms[body.consumer.facebookId].isBotEnabled = true
			}
			if(body.sendtoagent) {
				// Here we will send all the messages of the room (max 15), to imichat, and on confirmation of that send a message to user saying connected to an agent.
				// If the imichat api call fails, then send a message saying we will get back to you soon, our customer executives are busy.
				// Send is isBotEnabled to false. So next time the message can go to imichat.
				sendMessagesToImichat(sender, body, body.messages)
				// rooms[body.consumer.facebookId].isBotEnabled = false
			}
			else if(body.generated_msg) {
				if(body.generated_msg.type) {
					if(body.generated_msg.type == "facebook_button") {
						sendDynamicMessage(sender, body.generated_msg.buttons)
						if(body.generated_msg.audio) {
							sendAudioMessage(sender, body.generated_msg.audio)
						}
					} // other cases come here like audio, quick_reply, etc.
					else if(body.generated_msg.type == "facebook_text") {
						sendTextMessage(sender, body.generated_msg.text, true)
						if(body.generated_msg.audio) {
							sendAudioMessage(sender, body.generated_msg.audio)
						}
					}
					else if(body.generated_msg.type == "facebook_audio") {
						sendTextMessage(sender, body.generated_msg.text)
						if(body.generated_msg.audio) {
							sendAudioMessage(sender, body.generated_msg.audio)
						}
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
			}, 5000)
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
