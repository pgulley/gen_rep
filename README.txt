"gen rep" as in "generative reposatory"

A project for themfest2, with potential future applications. 
enable easy collection of audio files generated with "game" prompts.

VUE JS makes it easy to describe the games with json schemas
Those JSON Schemas are now stored in a dynamodb- right now it's only one-way, but once the basic recording 
ux is done I'll make a 'task upload' system.

The TASK db has an "entrytype" field- "T" marks recording tasks. "G" will mark groups of recording tasks. 
each "G" will get it's own url.


Laundry List of goals
	easily add and change game schemas.
	export game urls as qr codes. 
	niceish ux. 


Generative Frontend
	Also VueJS based.
	Very simple demo for now- grab a random recording from a given task and play it.

	We'll want some different indexes on the audio table- by user, by time, by task, etc...


Another Big Question- can we validate all the features on mobile too?



