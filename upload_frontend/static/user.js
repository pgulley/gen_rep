all_recs = []
all_tasks = {}
vueapp = null

function get_url(target){
	stage = $("body").attr("stage")
	if(stage == "None"){
		return target
	
	}else{
		return "/"+stage+target
	}
}

Vue.component('rec', {
	props:["rec"],
	template:`<div class="recording" v-bind:id=rec._id> 
			<button class="task-btn play user" v-on:click="play">
				<div class="progress play-bar"> </div> <div class='btn-text'>Play</div>
			</button>

			Public: <input class="public_check" type="checkbox" v-model="rec.is_public" v-on:change="change_pub"></input>
		</div>`,
	data:function(){
		return {
			id:this.rec._id,
			loc:this.rec.upload_location
		}
	},
	methods:{
		play:function(){
			url = $(`#a-${this.id}`).attr("src")
			var audio0 = new Audio(url)
			audio0.play()
			$(`#${this.id}`).find(".progress.play-bar").animate({
				width:"100%"
				}, parseInt(this.$parent.rec_time), 'linear', function(){

					$(this).css({'width':"0%"})
				
			})
		},
		get_recording:function(){
			$.ajax({
				url:get_url("/get_s3_download_url"),
				data:{rec_id:this.id, location:this.loc}
			}).done(function(resp){
				aud = document.createElement("audio")
				audio_element = `<audio src=${resp.get_url} type="audio/wav" crossorigin="anonymous" id=a-${resp.rec_id}>`
				$("body").append(audio_element)			
			})
		},
		change_pub:function(){
			new_pub = $(`#${this.id}`).find(".public_check").is(":checked")
			$.ajax({
				url:get_url("/toggle_public"),
				data:{id:this.id, is_public:new_pub}
			}).done(function(r){
				console.log(r)
			})
		}
	},
	mounted:function(){
		this.get_recording()
	}
})

Vue.component('rec-task', {
  	props:["task"],
  	template: `<div class="recording-task" v-bind:id=task.id>
			<h2>{{ task.title }}</h2>

			<div class="task-rectime">
				{{ task.rec_time / 1000}} Seconds
			</div>
			<div class="task-description">
				{{ task.description}}
			</div>
				<div class="task-recs">
					<rec
						v-for="item in recordings"
						v-bind:rec='item'
						v-bind:key="item.id"
					></rec>
				</div>
			</div>`,
	data:function(){
		id = this.task.id
		return {
			id:this.task.id,
			rec_time:this.task.rec_time,
			recordings: this.recordings
		}
	},
	created:function(){
		//filter out the recs that are relevant to this task
		this.recordings = all_recs.filter(function(r){
				return r["task_id"] == id})
	},
	mounted:function(){
		if(this.recordings.length == 0){
			$(`#${this.id}`).hide()
		}
	}

})

Vue.component('rec-group',{
	props:["group"],
	template:`
		<div v-bind:id='group.id' class="task-rec">

			<div class="task-group" v-bind:id=group.id>
			<h2><a v-bind:href=href_>{{ group.title }}</a></h2>

			<div class="group-description">
				{{ group.description}}
			</div>
			</div>
			<ul class="tasks">
				<rec-task
				 v-for="item in tasklist"
				 v-bind:task='item'
				 v-bind:key="item.id"></rec-task>
			</ul>
		<hr>	
		</div>
		`,
	data:function(){
		return {
			group_id:this.group.id,
			tasklist:this.group.taskslist,
			href_:get_url(`/group/${this.group.id}`)
		}
	},
	created:function(){
		vm = this
		all_tasks[this.group_id] = this
		$.ajax({
			url:get_url(`/tasks`),
			data:{group_id:this.group_id}
		}).done(function(resp){
			if(resp.data.length > 0){
				all_tasks[resp.data[0]["taskGroup"]].tasklist = resp.data
				all_tasks[resp.data[0]["taskGroup"]].is_mounted(resp.data)
			}
		})
	},
	methods:{
		is_mounted:function(tasklist){
			counts = tasklist.map(function(task){
				return all_recs.filter(function(r){
					return r["task_id"] == task["id"]}).length
			})
			if(counts.reduce(function(t,n){return t+n}) == 0){
				$(`#${this.group_id}`).hide()
			}
		}
	}
})


get_groups = function(){
	$.ajax({
		url:get_url("/all_groups")
	}).done(function(resp){
		if(vueapp == null){
			var app1 = new Vue({
				el:"#RecordingGroups",
				data:{
				grouplist:resp.data
				}
			})
			vueapp = app1
		}else{
			vueapp.grouplist = resp.data
		}
	})
}

get_recs = function(cb){
	$.ajax({
		url:get_url("/user_recs"),
		data:{user:$("body").attr("user")}
	}).done(function(resp){
		all_recs = resp['recs']
		cb()
	})
	
}

get_recs(get_groups)
