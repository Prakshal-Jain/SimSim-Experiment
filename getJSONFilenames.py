# Python Code to generate a list of all the stimuli (sound filenames) and save in stimuli.json

# input --> path: path of the directory in which all the sound files are stored.

from os import listdir
from os.path import isfile, join
import json

def generateJSON(path, output):
    onlyfiles = [{"stimulus": path+"/"+f} for f in listdir(path) if isfile(join(path, f))]
    with open(output, 'w') as outfile:
        json.dump(onlyfiles, outfile, indent=2)

generateJSON("./audio", 'stimuli.json')
# generateJSON("./audio/attention", 'practice_block.json')