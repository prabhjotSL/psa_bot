'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

const ankurid = "1496704427010794"
const prabhjotid = "1069317166466636"

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
	// console.log(req.body)
	// console.log(req.headers)
	var message = req.body.channels["OTT-Messaging"].fb.text
	var psid = req.body.destination[0].psid[0]
	sendTextMessage(ankurid, message) // Change this PSID to PSID of the demo messenger client.
	setTimeout(function() {
		res.json({
			"response":[{
				"description":"Queued",
				"correlationid": psid + "_" + randomInt(0,10000000),
				"code":"1001",
				"transid": randomInt(0,10000000) + "_" + psid
			}]
		})
	}, 1000)
})

app.post('/imichatclosed', function(req, res) {
	// console.log(req.headers)
	// this means that the chat has been closed in imichat and we need to reset isBotEnabled to true.
	// var chatID = req.headers["Chatid"]
	// console.log(chatID)
	rooms[ankurid].isBotEnabled = true // TODO: Change this ID to ID of ALEX.
	setTimeout(function() {
		res.json({success: true})
	}, 1000)
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
		// console.log(event);
		if (event.message && event.message.text) {
			// let text = event.message.text
			// if (text === 'Generic') {
			// 	sendGenericMessage(sender)
			// 	continue
			// }
			// sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))

			// console.log(rooms)
			if(event.message.text == "reset") {
				if(rooms[sender]) {
					delete rooms[sender]
				}
			} else if(rooms[sender] && !rooms[sender].isBotEnabled) {
				sendSingleMessageToImichat(sender, event.message.text, rooms[sender].room_id)
			} else {
				console.log(event.message.text)
				sendSenderAction(sender, "mark_seen")
				sendSenderAction(sender, "typing_on")
				sendAPICall(event.message.text, sender)
			}

		}
		else if (event.postback) {
			let text = JSON.stringify(event.postback)
			console.log("POSTBACK: ", text)
			if(rooms[sender] && !rooms[sender].isBotEnabled) {
				sendSingleMessageToImichat(sender, text)
			} else if(event.postback.payload == "einstein") {
				sendTextMessage(sender, "Hi, I'm Alex from Barclays Bank. I can help you with the following queries:")
				sendInstructions(sender)
			} else if(event.postback.payload == "newton") {
				sendTextMessage(sender, "We help people achieve their ambitions – in the right way. This sits at the core of our business and underpins everything that we do.")
				setTimeout(function() {
					sendTextMessage(sender, "Let me show you a video showcasing our values..")
					sendSenderAction(sender, "typing_on")
				}, 500)
				sendVideoMessage(sender, {"url": "https://storage.googleapis.com/barclays_faq/values.mp4"})
				setTimeout(function() {
					sendSenderAction(sender, "typing_off")
				}, 5000)
			} else if(event.postback.payload == "plato") {
				sendTextMessage(sender, "We have more than 325 years of history and expertise in banking. From our beginnings in Lombard Street, London through to the launch of the world's first ATM and innovative mobile phone payments services, find out more about our achievements to date: https://timeline.barclays/")
				sendImage(sender, {"url": "http://ichef-1.bbci.co.uk/news/660/media/images/76212000/jpg/_76212103_3058166.jpg"})
			} else {
				sendSenderAction(sender, "mark_seen")
				sendSenderAction(sender, "typing_on")
				sendAPICall(event.postback.payload, sender)
			}
		}
	}
	res.sendStatus(200)
})

function sendSingleMessageToImichat(sender, message, roomId) {
	console.log(message, sender, roomId)
	var dateMsg = new Date()
	var reqBody = {
	    "submittedOn": dateMsg.getTime(),
	    "appId": "a_20170106",
	    "ts": dateMsg.toISOString().toString(),
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
	    "tid": roomId + "_" + sender + "_" + randomInt(0,10000000),
	    "profile_pic": "https://scontent.xx.fbcdn.net/v/t1.0-1/1918189_124190034639475_6618885323877539072_n.jpg?oh=43229a43531ce83576125f6e53cbfb23&oe=5917A3E8",
	    "channel": "fb"
	}
	// console.log(reqBody)
	var reqParams = {
		teamid: 12,
		servicekey: "B2160D34-E8D5-4C7A-A7A4-E2367F1ED2E2"
	}
	// console.log(reqParams)
	request({
		url: "https://notify.imichat.io/ngmp2chat/imiconnectFB.aspx?teamid=12&servicekey=B2160D34-E8D5-4C7A-A7A4-E2367F1ED2E2",
		// params: reqParams,
		headers: {
			'content-type': 'application/json'
		},
		method: "POST",
		json: reqBody
	}, function(error, response, body) {
		// console.log(body)
		if (error) {
			console.log('Error sending single message to IMIChat: ', error)
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
				if(messages[i].message && messages[i].message.length > 0){
					single_message.text = messages[i].message[0].text ? messages[i].message[0].text : "Alright, let me direct you to the best person to handle your query. We will get back to you shortly."
				} else {
					single_message.text = "Alright, let me direct you to the best person to handle your query. We will get back to you shortly." // fix this.
				}
				if(!single_message.text) {
					single_message.text = "Alright, let me direct you to the best person to handle your query. We will get back to you shortly." // fix this.
				}
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
		console.log(error, output)
		if (error) {
			console.log('Error sending messages to IMIChat: ', error)
			sendTextMessage(sender, "Sorry I will connect you to our customer support executive.")
		}	else {
			// console.log("Sending message of customer agent back to the bot: ", body, sender)
			rooms[body.consumer.facebookId].isBotEnabled = false
			// console.log(body.generated_msg)
			var msg = body.generated_msg[0].texts ? body.generated_msg[0].texts[randomInt(0,body.generated_msg[0].texts.length)] : body.generated_msg[0].text
			sendTextMessage(sender, msg)
		}
	})
}


function sendMessages(messages, i, sender) {
	console.log(messages, i)
	if(typeof messages == "string") {
		sendTextMessage(sender, messages)
	} else {
		if(i < messages.length) {
			if(messages[i].type) {
				if(messages[i].type == "facebook_text") {
					// Only Text
					var randomNumber = randomInt(0, messages[i].texts.length)
					sendTextMessage(sender, messages[i].texts[randomNumber])
				} else if(messages[i].type == "facebook_audio") {
					// Text + Audio
					var randomNumber = randomInt(0,messages[i].texts.length)
					sendTextMessage(sender, messages[i].texts[randomNumber])
					if(messages[i].audio) {
						sendAudioMessage(sender, messages[i].audio[randomNumber])
					}
				} else if(messages[i].type == "facebook_video") {
					var randomNumber = randomInt(0, messages[i].texts.length)
					sendTextMessage(sender, messages[i].texts[randomNumber])
					if(messages[i].video) {
						sendSenderAction(sender, "typing_on")
						sendVideoMessage(sender, messages[i].video)
					}
				} else if(messages[i].type == "facebook_image"){
					sendImage(sender, messages[i].image)
				} else if(messages[i].type == "facebook_quick_reply") {
					sendQuickReply(sender, messages[i].quickReply)
				} else if(messages[i].type == "facebook_button") {
					sendDynamicMessage(sender, messages[i].buttons)
				} else if(messages[i].type == "facebook_instruction") {
					sendTextMessage(sender, "Hi, I'm Alex from Barclays Bank. I can help you with the following queries:")
					sendInstructions(sender)
				} else {
						// Change i and try the next message.
						// sendTextMessage(sender, messages[i].text)
				}
			} else {
				// Change i and try the next message.
			}
			i += 1
			sendSenderAction(sender, "typing_on")
			setTimeout(function() {
				sendSenderAction(sender, "typing_off")
				sendMessages(messages, i, sender)
			}, 2000)
		}
	}
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
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		} else if (!error && response.statusCode == 200) {
			request({
				url: 'http://botman.ai/api/v1/bots/imichatstatus/584e90ca275cbe37db390ffa',
				method: 'GET',
				headers: {
					"api-key": "54asdkj1209nksnda"
				}
			}, function(error, response, body_imichat) {
					sendSenderAction(sender, "typing_off")
					console.log(body) // Show the HTML for the Google homepage.

					var enableIMIChatIntegration = body_imichat.status
					enableIMIChatIntegration = JSON.parse(body_imichat).status
					console.log("GOT IMIChat Status", body_imichat, typeof body_imichat, enableIMIChatIntegration)

					if(!rooms[body.consumer.facebookId]) {
						rooms[body.consumer.facebookId] = {}
						rooms[body.consumer.facebookId].room_id = body.room._id // This has to be stored and retrieved from Mongo and not in Memory.
						rooms[body.consumer.facebookId].isBotEnabled = true
					}
					if(body.sendtoagent && enableIMIChatIntegration) {
						// Here we will send all the messages of the room (max 15), to imichat, and on confirmation of that send a message to user saying connected to an agent.
						// If the imichat api call fails, then send a message saying we will get back to you soon, our customer executives are busy.
						// Send is isBotEnabled to false. So next time the message can go to imichat.
						sendMessagesToImichat(sender, body, body.messages)
						// rooms[body.consumer.facebookId].isBotEnabled = false
					}
					else if(body.generated_msg) {
						// We get a facebook array here.
						sendMessages(body.generated_msg, 0, sender)

					} else {
						sendTextMessage(sender, "Alright, let me direct you to the best person to handle your query. We will get back to you shortly.")
					}
					// sendTextMessage(sender, body.generated_msg || "No Response")

			})
		}
	})
}

// if(body.generated_msg.type) {
// 	if(body.generated_msg.type == "facebook_button") {
// 		sendDynamicMessage(sender, body.generated_msg.buttons)
// 		if(body.generated_msg.audio) {
// 			sendAudioMessage(sender, body.generated_msg.audio)
// 		}
// 	} // other cases come here like audio, quick_reply, etc.
// 	else if(body.generated_msg.type == "facebook_text") {
// 		var randomNumber = randomInt(0,body.generated_msg.texts.length)
// 		sendTextMessage(sender, body.generated_msg.texts[randomNumber])
// 		if(body.generated_msg.audio) {
// 			sendAudioMessage(sender, body.generated_msg.audio[randomNumber])
// 		}
// 	}
// 	else if(body.generated_msg.type == "facebook_audio") {
// 		var randomNumber = randomInt(0,body.generated_msg.texts.length)
// 		sendTextMessage(sender, body.generated_msg.texts[randomNumber])
// 		if(body.generated_msg.audio) {
// 			sendAudioMessage(sender, body.generated_msg.audio[randomNumber])
// 		}
// 	}
// 	else if(body.generated_msg.type == "facebook_video") {
// 		var randomNumber = randomInt(0, body.generated_msg.texts.length)
// 		sendTextMessage(sender, body.generated_msg.texts[randomNumber])
// 		if(body.generated_msg.video) {
// 			sendSenderAction(sender, "typing_on")
// 			sendVideoMessage(sender, body.generated_msg.video)
// 		}
// 	}
// } else {
// 	sendTextMessage(sender, body.generated_msg)
// }

function setDefaultMessage() {
	request({
		url: 'https://graph.facebook.com/v2.6/me/thread_settings',
		qs: {access_token:token},
		method: 'POST',
		json: {
			"setting_type":"greeting",
		  "greeting":{
		    "text":"Hi {{user_first_name}}, a copy of this chat will be recorded and stored by Barclays and Facebook. Please do not disclose any personal or account information, such as a password or card number, when using this service."
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

function setGreetingText() {
	request({
		url: 'https://graph.facebook.com/v2.6/me/thread_settings',
		qs: {access_token:token},
		method: 'POST',
		json: {
			"setting_type":"call_to_actions",
		  "thread_state":"new_thread",
		  "call_to_actions":[
		    {
		      "payload":"einstein"
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
		      "title":"How can you help me?",
		      "payload":"einstein"
		    },
		    {
		      "type":"postback",
		      "title":"Our Purpose and Values",
		      "payload":"newton"
		    },
				{
		      "type":"postback",
		      "title":"Our History",
		      "payload":"plato"
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

function sendQuickReply(sender, data) {
	let messageData = data
	console.log(messageData, "Quick Reply")
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData
			// message:{
		  //   "text":"Was this answer helpful?",
		  //   "quick_replies":[
		  //     {
		  //       "content_type":"text",
		  //       "title":"Yes",
		  //       "payload":"yes"
		  //     },
		  //     {
		  //       "content_type":"text",
		  //       "title":"No",
		  //       "payload":"no"
		  //     }
		  //   ]
		  // }
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

function sendImage(sender, data) {
	let messageData = {
		"attachment": {
			"type": "image",
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

function sendTextMessage(sender, text) {
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
		// if(quick_reply) {
		// 	setTimeout(function() {
		// 		sendQuickReply(sender)
		// 	}, 5000)
		// }
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

function sendVideoMessage(sender, data) {
	let messageData = {
		"attachment": {
			"type": "video",
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
		sendSenderAction(sender, "typing_off")
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

function sendInstructions(sender) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": "Cheque Related Queries",
					"image_url": "https://cdn2.techworld.com/cmsdata/features/3590133/Cheque_thumb800.jpg",
					"buttons": [{
						"type": "postback",
						"title": "Ask Now",
						"payload": "cheque",
					}],
				}, {
					"title": "Account Related Queries",
					"image_url": "https://static.standard.co.uk/s3fs-public/thumbnails/image/2015/10/30/20/Barclays3010c.jpg",
					"buttons": [{
						"type": "postback",
						"title": "Ask Now",
						"payload": "account",
					}],
				}, {
					"title": "Payments or Transactions",
					"image_url": "http://iamnewtolondon.com/barclaysassets/last7transactions.jpg",
					"buttons": [{
						"type": "postback",
						"title": "Ask Now",
						"payload": "payments",
					}],
				}, {
					"title": "Direct Debits",
					"image_url": "https://d13yacurqjgara.cloudfront.net/users/270549/screenshots/1186023/iphonetransactions_1x.jpg",
					"buttons": [{
						"type": "postback",
						"title": "Ask Now",
						"payload": "Direct Debits",
					}],
				}, {
					"title": "Debit and Credit Cards",
					"image_url": "https://home.barclaycardus.com/content/dam/bcuspublic/card-plastic/card-angled/apple2_ns.png",
					"buttons": [{
						"type": "postback",
						"title": "Ask Now",
						"payload": "card",
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
setDefaultMessage()
setGreetingText()

// spin spin sugar
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
