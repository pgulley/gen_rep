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
			isGlobalMuted:false,
			isStopped:false
		}
	},

	template:`
	<div class="heading"  tabindex="0">
		<h1>Ludens 0: Loops 				
				<span @click="this.toggleGlobalMute()">
					<div v-if="isGlobalMuted" class="material-icons"> volume_off </div>
					<div v-else class="material-icons"> volume_up </div>
				</span>
		</h1>
		<div class="info"> wasd: select | enter: toggle loop | arrow up/down: volume | arrow l/r: pan l/r | m: mute task | space: global mute | #s: edit loop time | l: reset loop time | esc: stop loops </div> 
	</div>
	<div id="recording-tasks" :style="styleObject">
		<task-playback-node
				 v-for="(item, index) in tasklist"
				 v-bind:task='item'
				 v-bind:key="index"
				 :cols=cols
				 :is-selected="selectedTask === index"
				 :globalctx=global_mute_node
				 :is-stopped="isStopped">
				 	
		</task-playback-node>
	</div>
	`,

	computed:{
		styleObject: function() {
			return {
			 	"display":"inline-grid",
			 	"grid-template-columns": "auto ".repeat(this.cols),
			 	"column-gap":"5px",
			 	"row-gap":"5px"
			}
		},
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
			if(this.selectedTask > this.cols-1){
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

		toggleGlobalMute(){
			this.isGlobalMuted = !this.isGlobalMuted
			this.global_mute_node.gain.setValueAtTime(this.isGlobalMuted ? 0 : 1, audioCtx.currentTime)
		},

		handleKeydown(event){
			//prevent defaults on anything bound to something with a custom behavior
			if(["Space", "Enter", "ArrowUp", "ArrowDown", "keyW", "keyA", "keyS", "keyD", "keyL", "keyM"].includes(event.code)){
				event.preventDefault()
			}
			if(event.key == "w"){
				this.navUp()
			} else if(event.key == "s"){
				this.navDown()
			} else if(event.key == "a"){
				this.navLeft()
			} else if( event.key == "d"){
				this.navRight()
			} else if (event.code == "Space"){
				this.toggleGlobalMute()
			} else if (event.code == "Escape"){
				//We only watch for /change/ of this value, so toggling the bool is fine. 
				this.isStopped = !this.isStopped
			}

		},
	},

	created(){
		this.global_mute_node = audioCtx.createGain()
		this.global_mute_node.connect(audioCtx.destination) 
	},

	mounted(){
		this.get_tasks()
		window.addEventListener('keydown', this.handleKeydown);
	}
})

app.component('task-playback-node', {
	props:["task", "isSelected", "cols", "globalctx", "isStopped"],
	template:`<div class="task-playback" :class="{ 'selected': isSelected, 'playing': isPlaying}"> 
			<div class="task-title">{{ task.title }}</div> 

			<div>
				Loop Time (sec): <input class="lt-input" v-bind:id=lt_id v-on:change=changeTime type="number" v-bind:value=loopTimeDisplay ref="loopTime"> </input>
			</div>
			<div class="gain">
				<span @click="this.toggleMute()">
					<div v-if="isMuted" class="material-icons"> volume_off </div>
					<div v-else class="material-icons"> volume_up </div>
				</span>
				<input type="range" class="gain_range" v-model="gainValue" v-bind:min="gainMin" v-bind:max="gainMax" step=0.01 v-on:change="onGainChange">
				
			</div>
			<div class="play_progress">
				<div class="play_button">
					<button class="play_button" v-on:click="toggleLoop" v-bind:class="{isLooping:loop}"> <span class="material-icons"> play_circle</span> </button>
					
				</div>
				<div v-bind:id=pb_id class="pb_container"> </div>
			</div>
			<div class="panInput">
			<input type="range" class="pan_range" v-model="panValue" min=-1 max=1 step=.1 v-on:change="onPanChange">
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
			recentlySelected:false,
			isPlaying:false,
			isMuted:false,
			panValue:0
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
		},

		styleObject: function() {
			return {
			 	"width":String(90 / this.cols) + "%"
			}
		}
	
	},
	watch:{ 
		isSelected(newVal, oldVal){
			this.recentlySelected = newVal
		},
		isStopped(newVal, oldVal){
			this.loop = false
			
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

		toggleMute:function(){
			this.isMuted = !this.isMuted
			this.mute_node.gain.setValueAtTime(this.isMuted ? 0 : 1, audioCtx.currentTime)
		},

		onPanChange:function(){
			this.pan_node.pan.setValueAtTime(this.panValue, audioCtx.currentTime)
			
		},

		changeTime:function(){
			v = $(`#${this.lt_id}`).val()
			console.log(v)
			this.loopTime = v * 1000
		},

		toggleLoop: function(){
			this.loop = !this.loop
			if(this.loop){
				this.isPlaying = true
				this.playLoop()
			}
		},

		updateLoop:function(){
			audio_locations[this.id] = []
			this.getRecordingMeta()
			//get the metadata fresh every 10 minutes. 
			setTimeout(this.getRecordingMeta, 1000 * 60 * 10)
		},

		getRecordingMeta:function(){
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
					this.getRecording(random_id)
				}
				else{
					$(`#${random_id}`)[0].play()
				}	
			}
		},

		getRecording:function(rec_id){
			vm = this
			$.ajax({
				url:get_url("/get_signed_s3_url"),
				data:{rec_id:rec_id}
			}).done(function(resp){
				aud = document.createElement("audio")
				audio_element = `<audio src=${resp.get_url} type="audio/wav" crossorigin="anonymous" id=${resp.rec_id}>`
				$("body").append(audio_element)
				vm.getAudioSource(rec_id)
				
			})
		},

		getAudioSource:function(rec_id){
			//Finds the audio element storing the relevant audio data
			src = audioCtx.createMediaElementSource($(`#${rec_id}`)[0])
			src.connect(this.gain_node) 
			srcs.push(src)
			$(`#${rec_id}`)[0].play()
		},

		checkIsPlaying(){
			//This loop checks all the loaded audio contexts for this task to see if 
			//any of them are playing by checking if they are or aren't paused. 
			checked = false
			for(audio_source of audio_locations[this.id]){
				if($(`#${audio_source}`).length != 0){
					if(! $(`#${audio_source}`)[0].paused ){
						this.isPlaying = true
						checked = true
					}
				}
			}
			if(!checked){
				this.isPlaying = false
			}
			setTimeout(this.checkIsPlaying, 1000);
		},

		playLoop:function(){
			this.pb.set(0)
			if(this.loop){
				this.play_random_recording()
				this.pb.animate(1.0, {
					duration:this.loopTime
				})
				if(this.loop){
					setTimeout(this.playLoop, this.loopTime)
				}
			}	
		},

		handleKeydown(event){
			
			if(this.isSelected){
				if(event.code == "Enter"){
					this.toggleLoop()
				} else if(event.code == "ArrowUp"){
					this.gainValue = Math.min(this.gainValue + .1, this.gainMax)
					this.onGainChange()
				} else if(event.code == "ArrowDown"){
					this.gainValue = Math.max(this.gainValue - .1, this.gainMin)
					this.onGainChange()
				} else if(event.key == "m"){
					this.toggleMute()
				} else if(event.code=="ArrowLeft"){
					if(this.panValue > -.9){
						this.panValue -= .1
						this.onPanChange()
					}
				} else if(event.code=="ArrowRight"){
					if(this.panValue < .9){
						this.panValue += .1
						this.onPanChange()
					}
				} else if(event.key == "l"){
					this.loopTime = 0
				} else if("1234567890".includes(event.key)){
					if(this.recentlySelected){
						this.loopTime = 0
						this.recentlySelected = false
					}
					loopSeconds = String(this.loopTimeDisplay).replace(/^0+/, "")
					this.loopTime = Number(loopSeconds+event.key) * 1000
				}
			}
		}
	},

	created:function(){
		//This is where we setup the audiocontext per-task!
		//Each component looks like source->gain->pan->mute
		this.updateLoop()
		this.gain_node = audioCtx.createGain()
		this.pan_node = audioCtx.createStereoPanner()
		this.mute_node = audioCtx.createGain()

		this.gain_node.connect(this.pan_node)
		this.pan_node.connect(this.mute_node)
		this.mute_node.connect(this.globalctx)
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
		this.checkIsPlaying()
		
	}
})


app.mount("#main")