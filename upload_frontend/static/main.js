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
  		blob = new Blob([e.data], { 'type' : 'audio/ogg;codecs=opus' })
  		recorded_tasks[active_task] = blob
  		s3_upload_loop(active_task)
	}
})


function s3_upload_loop(task_id){
	$.ajax({
			url:window.location.href+"/get_s3_upload_url",
			data:{task:task_id}
	}).done(function(resp){

		blobData = recorded_tasks[task_id]
		
		fetch(resp.uploadURL,{
			method:"PUT",
			body:blobData
		}).then(function(resp){
			if(resp.status == 200){
				$.ajax({
					url:window.location.href+"/put_job_record_ddb",
					data:{location:resp.url.split("?")[0]}
				}).done(function(resp){			
					console.log("Finished upload loop")
				})
			}	
		})
	})
}


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


get_tasks = function(){
		$.ajax({
			url:window.location.href+"/tasks"
		}).done(function(resp){
			console.log(resp)
			var app1 = new Vue({
				el:"#recording-tasks",
				data:{
				tasklist:resp.data

			}	
		})
		
	})
}
get_tasks()






