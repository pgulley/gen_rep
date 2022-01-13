//For the record, and for future legibility
// This system operates with two parallel ledgers- the VUE object contains all of the rendering 
// bizniz and the UX stuff, and the 'recorded_task' object is a dictionary containing all of the recordings
// so that they're available for play-back. 
// the media recorder object is the go-between. 


mediaRecorder = null
active_task = null
recorded_tasks = {}

navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
	mediaRecorder = new MediaRecorder(stream);
	mediaRecorder.ondataavailable = function(e) {
  		blob = new Blob([e.data], { 'type' : 'audio/ogg; codecs=opus' })
  		recorded_tasks[active_task] = blob
  		var blobURL = window.URL.createObjectURL(blob);
	}
})


Vue.component('rec-task', {
  	props:["task"],
  	template: `<div id="test_rec">
			<h2>{{ task.title }}</h2>
			<button v-on:click="record">Record</button>
			<button v-on:click="play">Play</button>

		</div>`,
	data:function(){
		return {
			id:this.task.id,
			rec_time:this.rec_time

		}
	},
	methods:{
		record:function(){
			console.log(this.task.rec_time)
			mediaRecorder.start()
			active_task = this.id
			setTimeout(this.stop_rec, this.task.rec_time)
		},
		stop_rec:function(){
			mediaRecorder.stop()
			console.log('ready')
		
		},
		play:function(){
			var blobURL = window.URL.createObjectURL(recorded_tasks[this.task.id])
			var audio0 = new Audio(blobURL)
			audio0.play()
		}
	}
	

})


var app1 = new Vue({
	el:"#recording-tasks",
	data:{
		tasklist:[
			{ id:0, title: "This is a recording task", rec_time:1000},
			{ id:1, title: "This is another one", rec_time:3000}
		]

	}
})



