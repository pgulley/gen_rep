"gen rep" as in "generative reposatory"

A project for themfest2, with potential future applications. 
enable easy collection of audio files generated with "game" prompts.

VUE JS makes it easy to describe the games with json schemas
Those JSON Schemas are now stored in a dynamodb- right now it's only one-way, but once the basic recording 
ux is done I'll make a 'task upload' system.

The TASK db has an "entrytype" field- "T" marks recording tasks. "G" will mark groups of recording tasks. 
each "G" will get it's own url.


Big challenges:
	easily add and change game schemas.
	export game urls
	'users' how do?
	generative front end... bigger q. 

easy things:
	lambda to host upload frontend
	s3 + dynamodb to host audio content and metadata.
		 
	Use JS to get the browser to capture 5 second audio clips from the user, and replay them.
		Then, upload those clips to the s3+ddb system.

	encapsulate that interface with some modularity:
		each "recording task" has a description and a time limit. 
		each recording is attached to a task and a user. 





