
Vue.component('task-group', {
  	props:["group"],
  	template: `<div class="task-group" v-bind:id=group.id>
			<h2><a :href=href>{{ group.title }}</a></h2>

			<div class="group-description">
				{{ group.description}}
			</div>
			</div>`,
	data:function(){
		return {
			id:this.group.id,
			href: get_url(`/group/${this.group.id}`)
		}
	}

})


function get_url(target){
	stage = $("body").attr("stage")
	if(stage == "None"){
		return target
	}else{
		return "/"+stage+target
	}
}

get_groups = function(){
	
	$.ajax({
		url:get_url("/all_groups")
	}).done(function(resp){
		console.log(resp)
		var app1 = new Vue({
			el:"#task-groups",
			data:{
			grouplist:resp.data
			}
		})
		vueapp = app1
	})
}
get_groups()
$("#author_link").attr("href", get_url("/author"))