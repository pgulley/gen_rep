console.log("authoring")


vueapp = null


Vue.component('author-interface',{
	template:`<div class="author-interface">
			
			<label for="task-name">Task Name</label>
			<input id="task-name" v-model="title" v-on:change="validate" type="text" placeholder="scream task"> </input>
			<label for="task-description">Task Description</label>
			<textarea id="task-description" v-model="description" v-on:change="validate" type="text" placeholder="scream for five seconds"></textarea>
			<label for="task-rec-time">Task Recording Time (in seconds)</label>
			<input id="task-rec-time" v-model="recTime" v-on:change="validate" type="number" placeholder="5"> </input>
			
			<button v-on:click="submitTask" id="task-submit" disabled>Submit</button>
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
				rec_time:this.recTime * 1000
			}
			$.ajax({
				url:"/submitTask",
				data:{task:JSON.stringify(new_task)}
			}).done(function(resp){
				get_tasks()
			})
		},
		validate:function(){
			
			if(this.title != "" && this.description != "" && this.recTime > 0 ){
				$('#task-submit').prop('disabled', false)
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
			</div>`,
	data:function(){
		return {
			id:this.task.id,
			rec_time:this.task.rec_time,
		}
	},

})


get_tasks = function(){
	$.ajax({
		url:"/tasks"
	}).done(function(resp){
		console.log(resp)
		var app1 = new Vue({
			el:"#task-author",
			data:{
			tasklist:resp.data
			}
		})
		vueapp = app1
	})
}
get_tasks()