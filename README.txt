"gen rep" as in "generative reposatory"

A project for themfest2, with potential future applications. 

enable easy collection of audio files generated with "game" prompts.

Big challenges:
	easily add and change game schemas.
	export game urls
	'users' how do?
	generative front end... bigger q. 

easy things:
	lambda to host upload frontend
	s3 + dynamodb to host audio content and metadata.
		 



TODO:
	Use JS to get the browser to capture 5 second audio clips from the user, and replay them.
		Then, upload those clips to the s3+ddb system.

	encapsulate that interface with some modularity:
		
