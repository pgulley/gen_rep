
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
	template:'<div class="task-playback"> {{ task.title }} <button v-on:click="play_random_recording"> play </button></div>',
	data:function(){
		return{
			id:this.task.id,
		}
	},
	methods:{
		get_recording_meta:function(){
			$.ajax({
				url:get_url("/get_task_audio"),
				data:{task_id:this.id}
			}).done(function(resp){
				if(resp.data.length > 0){
					task_id = resp.data[0].task_id
					console.log(resp)
					console.log(resp.data)
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
				this.get_recording(random_id)
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
			src.connect(audioCtx.destination)
			srcs.push(src)
			$(`#${rec_id}`)[0].play()

		}
	},

	created:function(){
		audio_locations[this.id] = []
		this.get_recording_meta()
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