const { createApp, ref } = Vue

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

//Add root vue app for cursor and keyboard input management. 
app = createApp({
	data(){
		return {
			tasklist: [],
			cols: 7,
			selectedTask: 0,
		}
	},

	template:`
	<div class="heading"  tabindex="0">
		<h1>Ludens 0: Loops</h1>
		<div class="info"> wasd: select | enter: toggle loop | arrow up/down: volume | m: mute </div> 
	</div>
	<div id="recording-tasks" :style="styleObject">
		<task-playback-node
				 v-for="(item, index) in tasklist"
				 v-bind:task='item'
				 v-bind:key="index"
				 :is-selected="selectedTask === index">
				 	
		</task-playback-node>
	</div>
	`,

	computed:{
		styleObject() {
			return {
			 	"display":"inline-grid",
			 	"grid-template-columns": "auto ".repeat(this.cols),
			}
		}
	},

	methods: {
		async get_tasks(){
			group_id = $("body").attr('id')
			res = await fetch(
					get_url(`/all_tasks`), {
						body: JSON.stringify({group_id:group_id}),
						method: "post"
					})

			json_ = await res.json()
			this.tasklist = json_.data
		},

		navUp(){
			if(this.selectedTask > this.cols){
				this.selectedTask -= this.cols
			}
			
		},
		navDown(){
			if(this.selectedTask <= this.tasklist.length){
				this.selectedTask += this.cols
			}	
		},
		navLeft(){
			this.selectedTask -= 1
		},
		navRight(){
			this.selectedTask += 1
		},

		handleKeydown(event){
			event.preventDefault()
			if(event.key == "w"){
				this.navUp()
			} else if(event.key == "s"){
				this.navDown()
			} else if(event.key == "a"){
				this.navLeft()
			} else if( event.key == "d"){
				this.navRight()
			}

		},

	},

	

	mounted(){
		this.get_tasks()

		window.addEventListener('keydown', this.handleKeydown);
	}
})


app.component('task-playback-node', {
	props:["task", "isSelected"],
	template:`<div class="task-playback" :class="{ 'selected': isSelected }"> 
			<div class="task-title">{{ task.title }}</div> 

			<div>
				Loop Time (sec): <input class="lt-input" v-bind:id=lt_id  v-on:change=changeTime type="number" v-bind:value=loopTimeDisplay> </input>
			</div>
			<div class="gain">
				<span class="material-icons"> volume_up </span>
				<input type="range" class="gain_range" v-model="gainValue" v-bind:min="gainMin" v-bind:max="gainMax" step=0.01 v-on:change="onGainChange">
			</div>
			<div class="play_progress">
				<div class="play_button">
					<button class="play_button" v-on:click="toggle_loop" v-bind:class="{isLooping:loop}"> <span class="material-icons"> play_circle</span> </button>
					
				</div>
				<div v-bind:id=pb_id class="pb_container"> </div>
			</div>
			</div>`,
	data:function(){
		return{
			id:this.task.id,
			loop: false,
			loopTime: this.task.rec_time,
			gainValue: 1,
			gainMin:0,
			gainMax:2,
		}
	},
	computed:{
		pb_id:function(){
			return `p-${this.task.id}` 
		},
		lt_id:function(){
			return `lt-${this.task.id}`
		},
		gain_id:function(){
			return `gain-${this.task.id}`
		},
		loopTimeDisplay:function(){
			return this.loopTime / 1000
		}
	},
	methods:{
		onGainChange:function(){
			input_v = this.gainValue
			output_v = input_v
			if(input_v > 1){
				output_v = input_v ** 3
			}
			this.gain_node.gain.setValueAtTime(output_v, audioCtx.currentTime)
		},

		changeTime:function(){
			v = $(`#${this.lt_id}`).val()
			console.log(v)
			this.loopTime = v * 1000
		},

		toggle_loop: function(){
			this.loop = !this.loop
			this.loop_state()
		},

		update_loop:function(){
			audio_locations[this.id] = []
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
			//Right now this just connects to a single very simple pipeline- many inputs to one output. 
			src = audioCtx.createMediaElementSource($(`#${rec_id}`)[0])
			src.connect(this.gain_node) 
			srcs.push(src)
			$(`#${rec_id}`)[0].play()
		},

		loop_state(){
			if(this.loop){
				this.play_loop()
			}
		},

		play_loop:function(){
			this.pb.set(0)
			if(this.loop){
				this.play_random_recording()
				this.pb.animate(1.0, {
					duration:this.loopTime
				})
				if(this.loop){
					setTimeout(this.play_loop, this.loopTime)
				}
			}	
		},

		handleKeydown(event){
			
			if(this.isSelected){
				if(event.code == "Enter"){
					this.toggle_loop()
				}
				if(event.code == "ArrowUp"){
					this.gainValue = Math.min(this.gainValue + .1, this.gainMax)
					this.onGainChange()
				}
				if(event.code == "ArrowDown"){
					this.gainValue = Math.max(this.gainValue - .1, this.gainMin)
					this.onGainChange()
				}
				if(event.key == "m"){
					this.gainValue = 0 
					this.onGainChange()
				}
			}

		}

	},

	created:function(){
		this.update_loop()
		this.gain_node = audioCtx.createGain()
		this.gain_node.connect(audioCtx.destination)
	},

	mounted:function(){
		window.addEventListener('keydown', this.handleKeydown);
		this.pb = new ProgressBar.Circle(`#${this.pb_id}`,{
			strokeWidth: 10,
			width:"100px",
			easing: 'linear',
			color: "#3d3d3d",
			trailColor: '#eee',
			trailWidth: 1,
		})
		
	}
})


app.mount("#main")