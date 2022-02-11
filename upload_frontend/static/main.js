//For the record, and for future legibility
// This system operates with two parallel ledgers- the VUE object contains all of the rendering 
// bizniz and the UX stuff, and the 'recorded_task' object is a dictionary containing all of the recordings
// so that they're available for play-back. 
// the media recorder object is the go-between. 


mediaRecorder = null
active_task = null
recorded_tasks = {}
vueapp = null

function get_url(target){
	stage = $("body").attr("stage")
	if(stage == "None"){
		return target
	}else{
		return "/"+stage+target
	}
}


navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
	mediaRecorder = new MediaRecorder(stream);
	mediaRecorder.ondataavailable = function(e) {
  		blob = new Blob([e.data], { 'type' : 'audio/wav;codecs=0' })
  		recorded_tasks[active_task] = blob
  		
	}
})


function s3_upload_loop(task_id){
	$.ajax({
			url:get_url("/get_s3_upload_url"),
			data:{task:task_id}
	}).done(function(resp){

		blobData = recorded_tasks[task_id]
		
		fetch(resp.uploadURL,{
			method:"PUT",
			body:blobData
		}).then(function(resp){
			if(resp.status == 200){
				$.ajax({
					url:get_url("/put_job_record_ddb"),
					data:{location:resp.url.split("?")[0],task_id:active_task},
				}).done(function(resp){			
					$(`#${task_id}`).find(".task-btn.upl").prop('disabled', true)
					console.log("Finished upload loop")
				})
			}	
		})
	})
}





Vue.component('rec-task', {
  	props:["task"],
  	template: `<div class="recording-task" v-bind:id=task.id>
			<h2>{{ task.title }}</h2>

			<div class="task-rectime">
				{{ task.rec_time / 1000 }} Seconds
			</div>
			<div class="task-description">
				{{ task.description }}
			</div>

			<button class="task-btn rec" v-on:click="record">
				<div class="progress rec-bar" > </div><div class='btn-text'>Record</div>
			</button>
			<button class="task-btn play" v-on:click="play" disabled>
				<div class="progress play-bar"> </div> <div class='btn-text'>Play</div>
			</button>

			<button class="task-btn upl" v-on:click="upload" disabled>Upload</button>

		</div>`,
	data:function(){
		return {
			id:this.task.id,
			rec_time:this.task.rec_time,
		}
	},
	methods:{
		record:function(){
			console.log(this.task.rec_time)
			mediaRecorder.start()
			active_task = this.id
			$(`#${this.id}`).find(".progress.rec-bar").animate({
				width:"100%"
				}, parseInt(this.task.rec_time), 'linear', function(){
					console.log(this)
					$(this).css({'width':"0%"})
				
			})
			setTimeout(this.stop_rec, this.task.rec_time)
		},
		stop_rec:function(){
			mediaRecorder.stop()
			//enable 'play' and 'upload' 
			$(`#${this.id}`).find(".task-btn.play").prop('disabled', false)
			$(`#${this.id}`).find(".task-btn.upl").prop('disabled', false)
			console.log('ready')
		
		},
		play:function(){
			var blobURL = window.URL.createObjectURL(recorded_tasks[this.task.id])
			var audio0 = new Audio(blobURL)
			audio0.play()
			$(`#${this.id}`).find(".progress.play-bar").animate({
				width:"100%"
				}, parseInt(this.task.rec_time), 'linear', function(){

					$(this).css({'width':"0%"})
				
			})
		},
		upload:function(){
			s3_upload_loop(this.task.id)
		}
	}
	

})


get_tasks = function(){
	group_id = $("body").attr('id')
	$.ajax({
		url:get_url(`/tasks`),
		data:{group_id:group_id}
	}).done(function(resp){
		console.log(resp)
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

if($('body').attr('user') == "None"){
	console.log("no user")
	$('#login_modal').quickModal('open');
}

function submit_user(email, sharing){
	$.ajax({
		url:get_url("/login"),
		data:{email:email, sharing:sharing}
	}).done(function(resp){
		$('#login_modal').quickModal('close');
		$('body').attr('user_id',resp['user_id'])
		$('body').attr("user_share_preference", resp["user_share_preference"])
	})
}

$(document).ready(function(){
	$("#user-submit").click(function(){
		submit_user($("#user-email").val(), $("#user-share_default").is(":checked"))
	})

	$("#user-anon").click(function(){
		$('#login_modal').quickModal('open');
	})

	
	$("#logout_link").click(function(){
		$.ajax({
			url:get_url("/logout")
		}).done(function(resp){
			window.location.reload()
		})
	})

	$("#user_link").attr('href', get_url("/user"))
		
})





