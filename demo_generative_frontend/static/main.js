
function get_url(target){
	stage = $("body").attr("stage")
	if(stage == "None"){
		return target
	}else{
		return "/"+stage+target
	}
}

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
audio_locations = {}
srcs = []

Vue.component('task-playback-node', {
	props:["task"],
	template:`<div class="task-playback"> 
			<div class="task-title">{{ task.title }}</div> 

			<div>
				<input v-on:change="loop_state" v-model=loop type="checkbox" id="scales">
  				<label for="scales">Play Samples</label>
			</div>
			<div>
				<label for="loop_time"> Loop Time (milliseconds)</label>
				<input id="loop_time" v-model="loopTime" type="number"> </input>
			</div>
			</div>`,
	data:function(){
		return{
			id:this.task.id,
			loop: false,
			loopTime: this.task.rec_time
		}
	},
	methods:{
		update_loop:function(){
			audio_locations[task_id] == []
			this.get_recording_meta()
			//get the metadata fresh every 10 minutes. 
			setTimeout(this.get_recording_meta, 1000 * 60 * 10)
		},
		get_recording_meta:function(){
			$.ajax({
				url:get_url("/get_task_audio"),
				data:{task_id:this.id}
			}).done(function(resp){
				if(resp.data.length > 0){
					task_id = resp.data[0].task_id
					for(rec in resp.data){
						rec = resp.data[rec]
						audio_locations[task_id].push( rec._id )
					}
					
					
				}
			})
		},
		play_random_recording:function(){	
			if(audio_locations[this.id].length > 0){
				random_id = audio_locations[this.id][Math.floor(Math.random() * audio_locations[this.id].length)]
				if($(`#${random_id}`).length == 0){
					this.get_recording(random_id)
				}
				else{
					$(`#${random_id}`)[0].play()
				}
				
			}
		},
		get_recording:function(rec_id){
			vm = this
			$.ajax({
				url:get_url("/get_signed_s3_url"),
				data:{rec_id:rec_id}
			}).done(function(resp){
				aud = document.createElement("audio")
				audio_element = `<audio src=${resp.get_url} type="audio/wav" crossorigin="anonymous" id=${resp.rec_id}>`
				$("body").append(audio_element)
				vm.get_audio_source(rec_id)
				
			})
		},
		get_audio_source:function(rec_id){

			src = audioCtx.createMediaElementSource($(`#${rec_id}`)[0])
			src.connect(audioCtx.destination) //Right now this just connects to a single very simple pipeline- many inputs to one output. 
			srcs.push(src)
			$(`#${rec_id}`)[0].play()

		},
		loop_state(){
			if(this.loop){
				this.play_loop()
			}
		},
		play_loop:function(){
			this.play_random_recording()
			if(this.loop){
				setTimeout(this.play_loop, this.loopTime)
			}
			
		}

	},
	created:function(){
		this.update_loop()
	}
})


get_tasks = function(){
	group_id = $("body").attr('id')
	$.ajax({
		url:get_url(`/all_tasks`),
		data:{group_id:group_id}
	}).done(function(resp){

		var app1 = new Vue({
			el:"#recording-tasks",
			data:{
			tasklist:resp.data
			}
		})
		vueapp = app1
	})
}
get_tasks()