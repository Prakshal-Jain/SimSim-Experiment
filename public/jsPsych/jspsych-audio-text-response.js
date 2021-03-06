jsPsych.plugins['audio-text-response'] = (function() {
  var plugin = {};
  
	jsPsych.pluginAPI.registerPreload('audio-text-response', 'stimulus', 'audio');

  plugin.info = {
		name: 'audio-text-response',
		description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.AUDIO,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The image to be displayed'
      },
      button_label: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button label',
        default: 'Continue',
        array: false,
        description: 'Label of the button to advance.'
      },

      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: null,
        description: 'How long to show the trial.'
      },
      replay: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Replay',
        default: true,
        description: 'If true, the participant will be able to replay.'
      },
      replay_count: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Max replay count',
        default: 1,
        description: 'The maimum number of time stimuli can be replayed.'
      },
      autoplay: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Autoplay',
        default: true,
        description: 'If true, the audio will autoplay.'
      },
      questions: {
        type: jsPsych.plugins.parameterType.COMPLEX,
        array: true,
        pretty_name: 'Questions',
        default: undefined,
        nested: {
          prompt: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Prompt',
            default: undefined,
            description: 'Prompt for the subject to response'
          },
          placeholder: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Value',
            default: "",
            description: 'Placeholder text in the textfield.'
          },
          rows: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Rows',
            default: 1,
            description: 'The number of rows for the response text box.'
          },
          columns: {
            type: jsPsych.plugins.parameterType.INT,
            pretty_name: 'Columns',
            default: 40,
            description: 'The number of columns for the response text box.'
          },
          required: {
            type: jsPsych.plugins.parameterType.BOOL,
            pretty_name: 'Required',
            default: false,
            description: 'Require a response'
          },
          name: {
            type: jsPsych.plugins.parameterType.STRING,
            pretty_name: 'Question Name',
            default: '',
            description: 'Controls the name of data values associated with this question'
          }
        }
      },
      preamble: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Preamble',
        default: null,
        description: 'HTML formatted string to display at the top of the page above all the questions.'
      },
    display_button: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Button',
        default: true,
        description: 'Display the button or not'
      },

    }
  }

  plugin.trial = function(display_element, trial) {

    var start_trial_time = performance.now();

    // setup stimulus
    var context = jsPsych.pluginAPI.audioContext();
    if(context !== null){
      var source = context.createBufferSource();
      source.buffer = jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
      source.connect(context.destination);
    } else {
      var audio = jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
      audio.currentTime = 0;
    }

    // set up end event if trial needs it
    if(trial.trial_ends_after_audio){
      if(context !== null){
        source.onended = function() {
          end_trial();
        }
      } else {
        audio.addEventListener('ended', end_trial);
      }
    }

    var html = '';
    // show preamble text
    if(trial.preamble !== null){
      html += '<div id="jspsych-survey-text-preamble" class="jspsych-survey-text-preamble">'+trial.preamble+'</div>';
    }
    // start form
    html += '<form id="jspsych-survey-text-form" autocomplete="off">'

    // generate question order
    var question_order = [];
    for(var i=0; i<trial.questions.length; i++){
      question_order.push(i);
    }
    if(trial.randomize_question_order){
      question_order = jsPsych.randomization.shuffle(question_order);
    }

    // add questions
    for (var i = 0; i < trial.questions.length; i++) {
      var question = trial.questions[question_order[i]];
      var question_index = question_order[i];
      html += '<div id="jspsych-survey-text-'+question_index+'" class="jspsych-survey-text-question" style="margin: 2em 0em;">';
      html += '<p class="jspsych-survey-text">' + question.prompt + '</p>';
      var autofocus = i == 0 ? "autofocus" : "";
      var req = question.required ? "required" : "";
      if(question.rows == 1){
        html += '<input type="text" id="input-'+question_index+'"  name="#jspsych-survey-text-response-' + question_index + '" data-name="'+question.name+'" size="'+question.columns+'" '+autofocus+' '+req+' placeholder="'+question.placeholder+'"></input>';
      } else {
        html += '<textarea id="input-'+question_index+'" name="#jspsych-survey-text-response-' + question_index + '" data-name="'+question.name+'" cols="' + question.columns + '" rows="' + question.rows + '" '+autofocus+' '+req+' placeholder="'+question.placeholder+'"></textarea>';
      }
      html += '</div>';
    }

    var replay_time = 0;
    if (trial.replay == true) {
      html += '<button id="jspsych-audio-text-response-replay" class="jspsych-btn">' + '&nbsp' + '&nbsp' + 'Replay' + '&nbsp' + '&nbsp' + '</button>';
      html += '&nbsp';
      html += '&nbsp';
      html += '&nbsp';
      html += '&nbsp';
      html += '&nbsp';
    };
    html += '<input type="submit" id="jspsych-survey-text-next" class="jspsych-btn jspsych-survey-text" value="'+trial.button_label+'"></input>';
    
    html += '</form>'
    display_element.innerHTML = html;

    var response = {
        rt: null,
        replay: null,
        response: null
      };

    if (trial.replay == true) {
      display_element.innerHTML = html+"<br><div id='show_message'></div>"
      display_element.querySelector('#jspsych-audio-text-response-replay').addEventListener('click', function () {
        if(replay_time < trial.replay_count){
          display_element.querySelector('#jspsych-audio-text-response-replay').disabled = true;
          display_element.querySelector('#jspsych-survey-text-next').disabled = true;
          if (context !== null) {
            source = context.createBufferSource();
            source.buffer = jsPsych.pluginAPI.getAudioBuffer(trial.stimulus);
            source.connect(context.destination);
            source.start();
            source.onended = function () {
              display_element.querySelector('#jspsych-audio-text-response-replay').disabled = false;
              // if (movements.includes(true) == false) {
                display_element.querySelector('#jspsych-survey-text-next').disabled = false;
              // }
            }
          }
          else {
            audio.currentTime = 0;
            audio.play();
            audio.addEventListener('ended', function () {
              display_element.querySelector('#jspsych-audio-text-response-replay').disabled = false;
              // if (movements.includes(true) == false) {
                display_element.querySelector('#jspsych-survey-text-next').disabled = false;
              // }
            })
          }
          replay_time += 1;
          document.getElementById("show_message").innerHTML = `Replay ${replay_time} of ${trial.replay_count}`
        }
        else{
          display_element.querySelector('#jspsych-audio-text-response-replay').disabled = true;
          document.getElementById("show_message").innerHTML = `Maximum replay limit (${trial.replay_count}) reached. Please click continue to proceed.`
        }
      })
    };

    // backup in case autofocus doesn't work
    display_element.querySelector('#input-'+question_order[0]).focus();

    display_element.querySelector('#jspsych-survey-text-form').addEventListener('submit', function(e) {
      e.preventDefault();

      // measure response time
      var end_trial_time = performance.now();
      var response_time = end_trial_time - start_trial_time;

      // create object to hold responses
      var question_data = {};
      
      for(var index=0; index < trial.questions.length; index++){
        var id = "Q" + index;
        var q_element = document.querySelector('#jspsych-survey-text-'+index).querySelector('textarea, input'); 
        var val = q_element.value;
        var name = q_element.attributes['data-name'].value;
        if(name == ''){
          name = id;
        }        
        var obje = {};
        obje[name] = val;
        Object.assign(question_data, obje);
      }

      // save data
      response.rt = response_time;
      response.replay = replay_time;
      response.response = JSON.stringify(question_data);

      display_element.innerHTML = '';
      
      //end the trail
      end_trial();

    });

  // End trial function
  function end_trial(){

    jsPsych.pluginAPI.clearAllTimeouts();

    if(context !== null){
      source.stop();
      source.onended = function() { }
    } else {
      audio.pause();
      audio.removeEventListener('ended', end_trial);
    };

    // save data
    var trialdata = {
        "rt": response.rt,
        "stimulus": trial.stimulus,
        "response": response.response.replace(/<[^>]*>?/gm, ''),
        "replay": response.replay
        };

    display_element.innerHTML = '';

    // next trial
    jsPsych.finishTrial(trialdata);
  }


    var startTime = performance.now();
    // start audio
    if (trial.autoplay == true) {
      if (trial.replay == true) {
        display_element.querySelector('#jspsych-audio-text-response-replay').disabled = true;
      }
      display_element.querySelector('#jspsych-survey-text-next').disabled = true;
      if (context !== null) {
        startTime = context.currentTime;
        source.start(startTime);
        source.onended = function () {
          if (trial.replay == true) {
            display_element.querySelector('#jspsych-audio-text-response-replay').disabled = false;
          }
          display_element.querySelector('#jspsych-survey-text-next').disabled = false;

        }
      }
      else {
        audio.play();
        audio.addEventListener('ended', function () {
          if (trial.replay == true) {
            display_element.querySelector('#jspsych-audio-text-response-replay').disabled = false;
          }
          display_element.querySelector('#jspsych-survey-text-next').disabled = false;
        })
      }
    } else {
      if (context !== null) {
        startTime = context.currentTime;
      }
      display_element.querySelector('#jspsych-survey-text-next').disabled = false;
    }

  // end trial if trial_duration is set
  if (trial.trial_duration !== null) {
    jsPsych.pluginAPI.setTimeout(function() {
      end_trial();
    }, trial.trial_duration);
  }
  
};

  return plugin;
})();