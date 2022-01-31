vueapp = null
all_tasks = {}

function get_url(target){
	stage = $("body").attr("stage")
	if(stage == "None"){
		return target
	}else{
		return "/"+stage+target
	}
}


Vue.component('author-task-interface',{
	props:["group_id"],
	template:`<div class="author-interface" >
			<h2 class="author"> Author a New Task </h2>
			<label for="task-name">Task Name</label>
			<input id="task-name" v-model="title" v-on:change="validate" type="text" placeholder="scream task"> </input>
			<label for="task-description">Task Description</label>
			<textarea id="task-description" v-model="description" v-on:change="validate" type="text" placeholder="scream for five seconds"></textarea>
			<label for="task-rec-time">Task Recording Time (in seconds)</label>
			<input id="task-rec-time" v-model="recTime" v-on:change="validate" type="number" placeholder="5"> </input>
			
			<button v-on:click="submitTask" class="task-submit" v-bind:id='group_id' disabled>Submit</button>
		</div>`,
	data:function(){
		return {
			title:"",
			description:"",
			recTime:0,
		}
	},
	methods:{
		submitTask:function(){
			new_task = {
				title:this.title,
				description:this.description,
				rec_time:this.recTime * 1000,
				taskGroup:this.group_id,

			}
			vm = this
			$.ajax({
				url:get_url("/submitTask"),
				data:{task:JSON.stringify(new_task)}
			}).done(function(resp){
				vm.title = ""
				vm.description = ""
				vm.recTime = 0
				$(`.task-submit#${vm.group_id}`).prop('disabled', true)
				
				$.ajax({
					url:get_url(`/tasks`),
					data:{group_id:vm.group_id}
				}).done(function(resp){
					all_tasks[resp.data[0]["taskGroup"]].tasklist = resp.data
					
				})
			})
		},
		validate:function(){
			console.log(this.group_id)
			console.log(this.title)
			console.log(this.recTime)
			console.log(this.description)
			if(this.title != "" && this.description != "" && this.recTime > 0 ){
				$(`#${this.group_id}.task-submit`).prop('disabled', false)
			}
		}
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
			</div>`,
	data:function(){
		return {
			id:this.task.id,
			rec_time:this.task.rec_time,
		}
	},

})


Vue.component('author-group-interface',{
	props:["group"],
	template:`
		<div v-bind:id='group.id' class="task-author">

			<div class="task-group" v-bind:id=group.id>
			<h2><a :href="'/group/'+group.id">{{ group.title }}</a></h2>

			<div class="group-description">
				{{ group.description}}
			</div>
			</div>
			<author-task-interface v-bind:group_id='group.id'></author-task-interface>
			<ul class="tasks">
				<rec-task
				 v-for="item in tasklist"
				 v-bind:task='item'
				 v-bind:key="item.id"></rec-task>
			</ul>
			
		</div>`,
	data:function(){
		return {
			group_id:this.group.id,
			tasklist:this.taskslist,
			href:get_url(`/group/${this.group_id}`)
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
			}
		})
	}
})

Vue.component("new-group-author",{
	template:`<div class="group-author-interface" >
			<h2 class="author"> Author a New Group </h2>
			<label for="group-name">Group Name</label>
			<input id="group-name" v-model="title" v-on:change="validate" type="text" placeholder="a nice group"> </input>
			<label for="group-description">Group Description</label>
			<textarea id="group-description" v-model="description" v-on:change="validate" type="text" placeholder="these tasks all have to do with screaming"></textarea>
			
			
			<button v-on:click="submitGroup" class="group-submit" disabled>Submit</button>
		</div>`,
	data:function(){
		return{
			title:this.title,
			description:this.description
		}
	},
	methods:{
		submitGroup:function(){
			new_task = {
				title:this.title,
				description:this.description
			}			
			$.ajax({
				url:get_url("/submitGroup"),
				data:{group:JSON.stringify(new_task)}
			}).done(function(resp){
				vm.title = ""
				vm.description = ""
				$(`.group-submit`).prop('disabled', true)
				get_groups()
			})
		},
		validate:function(){

			if(this.title != "" && this.description != ""){
				$(`.group-submit`).prop('disabled', false)
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
				el:"#AuthoringGroups",
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
get_groups()
$("#home_link").attr("href", get_url("/"))

