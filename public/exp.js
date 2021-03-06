/* Experiment */

// TOGGLE PILOT OPTIONS
var isPilot = "true"

// if (isPilot == "true") {
//
// }

/* If you want to restrict participation to certain devices, you can indicate that only Desktop, Mobile, or Tablet is allowed in the 'Audience' step of study creation.
 We will then communicate this to our participants before they take part in your study.
 However, this is not enforced automatically, they could still access the study via the non-compatible devices.
 As such, this is different from our prescreening options.
 If you indicate specific device compatibility for your study on Prolific (e.g. desktop-only) and state this requirement in your Study Description,
 participants who ignore these warnings and take part using an unsupported device do not require approval.*/

/* This is to check the new iPad Pros. */
var checkiPad = "undefined"
if (navigator.userAgent.match(/Mac/) && navigator.maxTouchPoints > 2) {
    checkiPad = "iPad"
}

if (checkiPad == "iPad" || String(browser.tablet) !== "undefined" || String(browser.mobile) !== "undefined") {
    alert("The current experiment is not compatible with tablets or mobile devices. Please switch to a laptop or desktop to do the experiment.");
    close();
}

// settings.json consist of toggles (between all files OR psudorandom files)
/* 
    {
        "isPsudoRandom": <true if want to consider a random subset of all the files, otherwise false>,
        "file_count": <number of psudorandom files to consider>
    }
*/

var practice_block = [];
$.ajax({
    url: "practice_block.json",
    async: false,
    dataType: 'json',
    success: function (data) {
        practice_block = data
    }
});

settings = {}
$.ajax({
    url: "settings.json",
    async: false,
    dataType: 'json',
    success: function (data) {
        settings = data;
    }
});

function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

var playlist = 0
httpGetAsync('/sended', (data) => {playlist = (data-1)})
console.log(playlist)

/* Get stimuli from stimuli.json created by files_to_json.py */
var stimuli_list = [];
$.ajax({
    url: "stimuli.json",
    async: false,
    dataType: 'json',
    success: function (data) {
        if(settings.isPsudoRandom){
            if(settings.file_count <= 0){
                alert("Number of files must be at least one. Set to default number = 1")
                stimuli_list = data[playlist]["recordings"].slice(0, 1);
            }
            else if(settings.file_count <= data.length){
                stimuli_list = data[playlist]["recordings"].slice(0, settings.file_count);
            }
            else{
                alert("The entered number of psudorandom audio files ("+settings.file_count+") exceeds the number of available files. It will default to maximum number of files ("+data.length+").")
                stimuli_list = data[playlist]["recordings"]
            }
        }
        else{
            stimuli_list = data[playlist]["recordings"]
        }
    }
});
stimuli_list = jsPsych.randomization.repeat(stimuli_list, 1);

/* To get the number of 20% of the stimuli. */
var percent20 = Math.round(stimuli_list.length * 0.2);

/* Select 20% of the stimuli for reliability;
assign non-zero numbers to reliability trials;
add to reliability list */
var reliability_list = [];

// reliability_diff_list = {<reliability index>: (<reliability difference>, <slider effort response>)}
var reliability_diff_list = {}
for (let i = 0; i < percent20; i++) {
    stimuli_list[i].reliability = i + 1;
    reliability_diff_list[i + 1] = [-1, -1]
    reliability_list.push(stimuli_list[i]);
}

/* Re-randomize stimuli list;
without this re-randomization, the reliability trials will be the first 20% of the stimuli. */
stimuli_list = jsPsych.randomization.repeat(stimuli_list, 1);
/* Function to get a random number between min and max.
The maximum is inclusive and the minimum is inclusive. */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* To insert the reliability trials back to stimuli list;
the distance between the same reliability trials > the number of 20% of the stimuli.
Do not randomize the list again, otherwise, distance between the same reliability trials won't be guaranteed. */
for (let i = 0; i < percent20; i++) {
    var s_index = stimuli_list.findIndex(x => x.reliability === i + 1);
    var s_right = stimuli_list.length - s_index;

    if (s_right >= s_index) {
        var insert_index = getRandomInt(s_index + percent20 + 1, stimuli_list.length);
        stimuli_list.splice(insert_index, 0, reliability_list[i]);

    } else {
        var insert_index = getRandomInt(0, s_index - percent20 - 1);
        stimuli_list.splice(insert_index, 0, reliability_list[i]);

    }
}

var attention_list = [
    { stimulus: "./audio/attention/attention1_70.wav", test: false, choices: ['Who did you meet there?', 'When did you buy it?', 'What do you want?', 'Will she come?', "What's that?"], correct: 4 },
    { stimulus: "./audio/attention/attention2_70.wav", test: false, choices: ["That's a good idea.", "He's a good person.", 'I have no idea what you mean.', "It's a good question.", 'Is that true?'], correct: 0 },
    { stimulus: "./audio/attention/attention3_70.wav", test: false, choices: ['Take care of yourselves!', "I don't have any children.", 'She took care of the children.', 'We should be very careful.', 'She bought a toy for her child.'], correct: 2 }
];

var stimuli_w_attention_list = [...stimuli_list];
for (let i = 0; i < attention_list.length; i++) {
    var insert_index = getRandomInt(0, stimuli_w_attention_list.length);
    stimuli_w_attention_list.splice(insert_index, 0, attention_list[i]);
}

var check_list = [
    { stimulus: "./audio/attention/check1_70.wav", choices: ['Tell me the truth.', 'I agree with you.', 'Show me an example.', 'Tell me a joke.', 'Please come in.'], correct: 3 },
    { stimulus: "./audio/attention/check2_70.wav", choices: ['I gave him a book.', 'She borrowed the book from him.', 'May I borrow your car?', 'Give me another example.', 'She sold him her car.'], correct: 1 }
];


/* Used to check if a subject has given consent to participate. */
var check_consent = function (elem) {
    if (document.getElementById('consent_checkbox').checked) {
        fetch('/sended', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(true),
        })
        return true;
    }
    else {
        alert("If you wish to participate, you must check the box next to the statement 'I agree to participate in this study.'");
        return false;
    }
    return false;
};




/* create timeline */
var timeline = [];

/* init connection with pavlovia.org */
// var pavlovia_init = {
//     type: "pavlovia",
//     command: "init"
// };
// timeline.push(pavlovia_init);

/* generate a random subject ID with 16 characters */
//var participant_id = jsPsych.randomization.randomID(16);

/* add the subject ID to my experiment  making it a property*/
/*jsPsych.data.addProperties({
    participant: participant_id
});*/

jsPsych.data.addProperties({
    browser_name: browser.name, browser_version: browser.version,
    os_name: browser.osname, os_version: browser.osversion,
    screen_resolution: screen.width + ' x ' + screen.height,
    //tablet: String(browser.tablet), mobile: String(browser.mobile),
    // convert explicitly to string so that "undefined" (no response) does not lead to empty cells in the datafile
    //window_resolution: window.innerWidth + ' x ' + window.innerHeight,
});

/* check consent */
var consent_form = {
    type: 'external-html',
    url: "consent_2020-05-12.html",
    cont_btn: "start",
    check_fn: check_consent
};
timeline.push(consent_form);

/* define welcome message trial */
var welcome_block = {
    type: "html-button-response",
    stimulus: "<h2>Welcome to the perception experiment. </h2> <p>In this experiment, you will be asked to listen to audio recordings of speech samples. You will be asked to type what you heard the person say and rate how much effort it took to understand the speech. <br> While you do have the option to replay the utterance, please do not press replay unless there was some reason you could not hear the utterance (for example, if there was an unexpected loud noise outside). <br> Once the experiment has started, you will be asked not to further adjust your volume or your screen until it has finished.</p>",
    choices: ['Continue']
};
timeline.push(welcome_block);



/* background info, e.g., prolific ID */
var background1 = {
    type: 'survey-text',
    /*preamble: '<h2>A few questions about you</strong></h2>' +
        "<p>Before we can start, we need some information.</p>" +
        "<p>Please answer the following questions.</p>",*/
    questions: [
        {
            name: 'participant',
            prompt: '<p><strong>1.</strong>Please enter your Prolific ID / Participant ID:</p>',
            placeholder: "enter your Prolific ID here",
            required: true
        },
        {
            name: 'age',
            prompt: '<p><strong>2.</strong> What is your age?</p>',
            placeholder: "enter your age here",
            required: true
        },
        {
            name: 'disorder',
            prompt: '<p><strong>3.</strong> To your knowledge, do you have any history of a hearing, speech, language, or neurological difficulties?</p>',
            placeholder: "respond with yes or no",
            required: true
        },
        {
            name: 'language',
            prompt: '<p><strong>4.</strong> Did you grow up speaking North American English?</p>',
            placeholder: "respond with yes or no",
            required: true
        },

    ],
    button_label: "Continue",
    on_finish: function (data) {
        jsPsych.data.addProperties({
            participant: data.participant,
            age: data.age,
            disorder: data.disorder,
            language: data.language,
        });
    },
}
timeline.push(background1);

/*check audio*/
var soundcheck = {
    type: "html-button-response",
    stimulus: " <p>Thanks! Now let's check if the sound works properly and is set at a comfortable volume.</p>",
    choices: ['Continue']
};
timeline.push(soundcheck);

var soundcheck1 = {
    type: 'audio-button-response',
    stimulus: check_list[0].stimulus,
    prompt: '<p> Does your sound work properly and is your volume adjusted? You may replay this sound as many times as you like in order to adjust your volume, since you will be asked to NOT adjust your volume once you begin the experiment.</p> <p>When you are ready, click the "Continue" button. If not, adjust the volume and then click "Replay" to listen to the audio again. </p>',
    choices: ['Continue'],
    replay: true
}
timeline.push(soundcheck1)


var soundcheck1_response = {
    type: 'html-button-response',
    stimulus: "<p>Please select the sentence you just heard:</p>" + "<p></p>",
    choices: check_list[0].choices,
    on_finish: function (data) {
        if (data.button_pressed == check_list[0].correct) {
            data.soundcheck = true;
        } else {
            data.soundcheck = false;
        }
    }
};
timeline.push(soundcheck1_response);

var soundcheck2 = {
    type: 'audio-button-response',
    stimulus: check_list[1].stimulus,
    prompt: "<p>Let's try again! Does your sound work properly? </p>" + '<p>If yes, click the "Continue" button. If not, adjust the volume and then click "Replay" to listen to the audio again. </p>',
    choices: ['Continue'],
    replay: true
}

var soundcheck2_response = {
    type: 'html-button-response',
    stimulus: "<p>Please select the sentence you just heard:</p>" + "<p></p>",
    choices: check_list[1].choices,
    on_finish: function (data) {
        if (data.button_pressed == check_list[1].correct) {
            data.soundcheck = true;
        } else {
            data.soundcheck = false;
        }
    }
};

/* if passing soundcheck1, proceed to experiment; else, proceed to soundcheck2 */
var check_if_node = {
    timeline: [soundcheck2, soundcheck2_response],
    conditional_function: function () {
        var last_trial_correct = jsPsych.data.get().last(1).values()[0].soundcheck;
        if (last_trial_correct) {
            return false;
        } else {
            return true;
        }
    }
}
timeline.push(check_if_node)

/* loop soundcheck2 until it's passed */
var check_loop_node = {
    timeline: [check_if_node],
    loop_function: function (data) {
        if (jsPsych.data.get().last(1).values()[0].soundcheck) {
            return false;
        } else {

            return true;
        }
    },
}
timeline.push(check_loop_node)

/*switch to full screen*/
var fullscreen_trial = {
    type: 'fullscreen',
    message: '<p>Great! Now the experiment will switch to full screen mode.</p> <p>Please press the button to continue.</p>',
    fullscreen_mode: true
};
timeline.push(fullscreen_trial);


var scount = 2;
var slabels = [['Very easy to understand', 'Very difficult to understand']];
var sprompts = ['what the speaker is saying and type exactly what you hear', 'the effort required to understand what the speaker is saying'];
var snames = ['Transcription', 'Effort'];


// ================ practice Block =================
var practice_instruction = {
    type: 'instructions',
    pages: [
        `This is a practice block consisting of ${practice_block.length} recordings. Please feel free to practice here before starting the actual experiment.`,
    ],
    button_label_next: 'Continue',
    show_clickable_nav: true
}
timeline.push(practice_instruction);

for (let i = 0; i < practice_block.length; i++) {//loop through the silmuli list
    var j = i + 1;
    var trial_start = {
        type: "html-keyboard-response",
        stimulus: "Next clip ("+j+" of " + practice_block.length + " in total)",
        trial_duration: 1000,
        choices: jsPsych.NO_KEYS,
    };
    timeline.push(trial_start);
    
    for (let n = 0; n < scount; n++) {//loop through the silders
        var focus = {
            type: "html-keyboard-response",
            stimulus: "<h2> </h2>" + '<p><font size="6">Please focus on <b></p><p>' + sprompts[n] + ".</p><p></b> </font></p>",
            trial_duration: 1800,
            choices: jsPsych.NO_KEYS,
        }
        timeline.push(focus);
    
            // For every part, first section will be transcription, and second will be Effort scale.
            if(n % 2 == 1){
                var audio_trial = {
                    type: 'audio-slider-response',
                    stimulus: practice_block[i].stimulus,
                    replay: true,
                    replay_count: settings.replay_count,
                    autoplay: true,
                    //require_movement: true,
                    labels: slabels[0],
                    slider_width: 500,
                    prompt: snames[n],
                    preamble: '<p>Please use the scale below to indicate <b>' + sprompts[n] + '.</b></p>' + '<p>Remember: <br>- Please do NOT adjust your volume <br>- Please only use the Replay button if there was a distraction or loud noise that made it impossible to hear the audio clip.</p><p>Trial #: ' + j + ' of ' + practice_block.length + '</p>',
                    slider_name: snames[n],
                    on_finish: function (data) {
                        data.window_resolution = window.innerWidth + ' x ' + window.innerHeight;
                        const effort = parseInt(data.Effort)
                        if('reliability' in practice_block[i]){
                            const diff = reliability_diff_list[practice_block[i].reliability]
                            if(diff[1] == -1){
                                reliability_diff_list[practice_block[i].reliability] = [0, effort]
                                data.effort_reliability = reliability_diff_list[practice_block[i].reliability][1]
                                data.reliability_index = `${practice_block[i].reliability}-1`
                            }
                            else{
                                reliability_diff_list[practice_block[i].reliability] = [effort-diff[1], effort]
                                data.reliability_effort_difference = reliability_diff_list[practice_block[i].reliability][0]
                                data.effort_reliability = reliability_diff_list[practice_block[i].reliability][1]
                                data.reliability_index = `${practice_block[i].reliability}-2`
                            }
                        }
                    }
                };
                timeline.push(audio_trial);
            }
            // For Odd counts (Transcription), we display audio-text-response.
            else if(n % 2 == 0){
                var text_response = {
                    type: 'audio-text-response',
                    stimulus: practice_block[i].stimulus,
                    replay: true,
                    replay_count: settings.replay_count,
                    autoplay: true,
                    //require_movement: true,
                      questions: [
                            {
                                prompt: "", 
                                name: snames[n],
                                placeholder: "Transcribe the audio file here",
                                required: true,
                                rows: 5, 
                                columns: 40
                            }, 
                        ],
                    preamble: '<p>Please type exactly what you heard the speaker say. If you are unsure, just type what you think you heard. If you have no idea, just type NA.</p>' + '<p>Remember: <br>- Please do NOT adjust your volume <br>- Please ONLY use the Replay button if there was a distraction or loud noise that made it impossible to hear the audio clip.</p><p>Trial #: ' + j + ' of ' + practice_block.length + '</p>',
                    // on_load: function() {
                    //     const sound = new Audio()
                    //     sound.src = stimuli_list[i].stimulus
                    //     sound.play()
                    // },
                    on_finish: function (data) {
                        data.window_resolution = window.innerWidth + ' x ' + window.innerHeight;
                    }
                };
                timeline.push(text_response);
            }
    
        }
    }


/*instructions*/
var instruction = {
    type: 'instructions',
    pages: [
        '<strong>Initiating actual experiment...</strong>',
        'Welcome to the experiment. Please listen to the speech presented to you in the following task. Sometimes there will be background noise. Your task is to: <br> 1) Type out exactly what you heard the speaker say. Type you exactly what you heard, even if you are not completely sure you are correct. If you have no idea, you can type NA. <br> 2) Rate how much effort it took to understand the speech. <br><br>Once you have begun the experiment, please <strong>DO NOT ADJUST YOUR VOLUME FURTHER.</strong>',
        'While you do have the option to replay each sentence, we ask that you <strong>DO NOT PRESS REPLAY</strong> unless something happens that has made it difficult for you to hear the item (for example, if there is a loud, unexpected sound in your environment).',
        "The experiment is self-paced. Please complete it in one sitting. It is expected to take approximately ten minutes. Click 'Continue' to start the experiment."
    ],
    button_label_next: 'Continue',
    show_clickable_nav: true
}
timeline.push(instruction);


for (let i = 0; i < stimuli_list.length; i++) {//loop through the silmuli list
//for (let i = 0; i < 5; i++) {//loop through the silmuli list
    var j = i + 1;
    var trial_start = {
        type: "html-keyboard-response",
        // stimulus: "<h1>Sound #: " + j + "</h1>",
        stimulus: "Next clip ("+j+" of " + stimuli_list.length + " in total)",
        trial_duration: 1000,
        choices: jsPsych.NO_KEYS,
    };
    timeline.push(trial_start);

    for (let n = 0; n < scount; n++) {//loop through the silders

        var focus = {
            type: "html-keyboard-response",
            // stimulus: "<h2>Sound #: " + j + "</h2>" + '<p><font size="6">Please focus on <b>' + sprompts[n] + "</b> . </font></p>",
            stimulus: "<h2> </h2>" + '<p><font size="6">Please focus on <b></p><p>' + sprompts[n] + ".</p><p></b> </font></p>",
            trial_duration: 1800,
            choices: jsPsych.NO_KEYS,
        }
        timeline.push(focus);

        // For every part, first section will be transcription, and second will be Effort scale.
        if(n % 2 == 1){
            var audio_trial = {
                type: 'audio-slider-response',
                stimulus: stimuli_list[i].stimulus,
                replay: true,
                replay_count: settings.replay_count,
                autoplay: true,
                //require_movement: true,
                labels: slabels[0],
                slider_width: 500,
                prompt: snames[n],
                preamble: '<p>Please use the scale below to indicate <b>' + sprompts[n] + '.</b></p>' + '<p>Remember: <br>- Please do NOT adjust your volume <br>- Please only use the Replay button if there was a distraction or loud noise that made it impossible to hear the audio clip.</p><p>Trial #: ' + j + ' of ' + stimuli_list.length + '</p>',
                slider_name: snames[n],
                on_finish: function (data) {
                    data.window_resolution = window.innerWidth + ' x ' + window.innerHeight;
                    const effort = parseInt(data.Effort)
                    if('reliability' in stimuli_list[i]){
                        const diff = reliability_diff_list[stimuli_list[i].reliability]
                        if(diff[1] == -1){
                            reliability_diff_list[stimuli_list[i].reliability] = [0, effort]
                            data.effort_reliability = reliability_diff_list[stimuli_list[i].reliability][1]
                            data.reliability_index = `${stimuli_list[i].reliability}-1`
                        }
                        else{
                            reliability_diff_list[stimuli_list[i].reliability] = [effort-diff[1], effort]
                            data.reliability_effort_difference = reliability_diff_list[stimuli_list[i].reliability][0]
                            data.effort_reliability = reliability_diff_list[stimuli_list[i].reliability][1]
                            data.reliability_index = `${stimuli_list[i].reliability}-2`
                        }
                    }
                }
            };
            timeline.push(audio_trial);
        }
        // For Odd counts (Transcription), we display audio-text-response.
        else if(n % 2 == 0){
            var text_response = {
                type: 'audio-text-response',
                stimulus: stimuli_list[i].stimulus,
                replay: true,
                replay_count: settings.replay_count,
                autoplay: true,
                //require_movement: true,
                  questions: [
                        {
                            prompt: "", 
                            name: snames[n],
                            placeholder: "Transcribe the audio file here",
                            required: true,
                            rows: 5, 
                            columns: 40
                        }, 
                    ],
                preamble: '<p>Please type exactly what you heard the speaker say. If you are unsure, just type what you think you heard. If you have no idea, just type NA.</p>' + '<p>Remember: <br>- Please do NOT adjust your volume <br>- Please ONLY use the Replay button if there was a distraction or loud noise that made it impossible to hear the audio clip.</p><p>Trial #: ' + j + ' of ' + stimuli_list.length + '</p>',
                // on_load: function() {
                //     const sound = new Audio()
                //     sound.src = stimuli_list[i].stimulus
                //     sound.play()
                // },
                on_finish: function (data) {
                    data.window_resolution = window.innerWidth + ' x ' + window.innerHeight;
                }
            };
            timeline.push(text_response);
        }

    }

    /* This timeline is to merge the different slider responses for the same stimulus into one row. */
    var trial_end = {
        type: "html-keyboard-response",
        // stimulus: "<h1>Sound #: " + j + " finished </h1>",
        stimulus: '<h1>Clip ' + j + ' finished. </h1>',
        trial_duration: 500,
        choices: jsPsych.NO_KEYS,
        data: {
            all: true, order: j, version: 2,
            project: stimuli_list[i].project, deviceID: stimuli_list[i].deviceID, audioID: stimuli_list[i].audioID, sentenceID: stimuli_list[i].sentenceID
        },
        on_finish: function (data) {
            data.stimulus = stimuli_list[i].stimulus;
            
            // Simplified the filtering process to filter multiple trial_type (OR logic)
            var audio_trials = jsPsych.data.get().last(2 * scount).filter(x => x.trial_type == 'audio-slider-response' || x.trial_type == 'survey-text' ).values();
            for (let x = 0; x < scount; x++) {
                data[snames[x]] = audio_trials[x][snames[x]];
            }


            // if (data.reliability !== "0") {//calculate distance between reliability trials and difference in intelligibility ratings
            //     var reliability_trials = jsPsych.data.get().filter({ reliability: stimuli_list[i].reliability, version: 2, all: true }).values();
            //     if (reliability_trials.length == 2) {
            //         data.reliability_distance = reliability_trials[1].order - reliability_trials[0].order;
            //         for (let y = 0; y < scount; y++) {
            //             var name_diff = snames[y] + '_diff';
            //             data[name_diff] = reliability_trials[1][snames[y]] - reliability_trials[0][snames[y]];
            //         }
            //     }
            // }
        }
    };
    timeline.push(trial_end);


}

var fullscreen_trial_exit = {
    type: 'fullscreen',
    fullscreen_mode: false
}
timeline.push(fullscreen_trial_exit);

/* finish connection with pavlovia.org */
// var pavlovia_finish = {
//     type: "pavlovia",
//     command: "finish"
// };
// timeline.push(pavlovia_finish);



/* start the experiment */
jsPsych.init({
    timeline: timeline,
    use_webaudio: true,
    show_progress_bar: true,
    auto_update_progress_bar: true,
    //preload_audio: stimuli_list.stimulus,
    exclusions: {
        min_width: 800,
        min_height: 600,
        audio: true
    },
    on_finish: function () {
        //jsPsych.data.displayData();

        // TOGGLE OUT FOR ACTUAL RUNNING by setting isPilot at beginning of script
        if (isPilot == "true") {
          var participant_id = jsPsych.data.get().values()[0].participant;
          jsPsych.data.get().ignore('internal_node_id').localSave('csv', 'participant_' + participant_id + '.csv');
        }

        document.body.innerHTML = '<p> Please wait. You will be redirected back to Prolific in a few moments.</p>'
        setTimeout(function () { location.href = 'thanks.html' }, 5000)
    }
});